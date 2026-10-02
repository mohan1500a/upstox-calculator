import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_OPTIONS } from '../public/js/config/defaults.js';
import { legCharges } from '../public/js/engine/charges.js';
import {
  VerifierError,
  normalizeApiCharges,
  parseArgs,
  parseEnv,
  reconcile,
  run,
} from '../scripts/verify-live.js';

// A made-up value that can be searched for in output. Real tokens never belong in tests.
const TOKEN = 'fake-token-for-tests-0123456789';
const KEY = 'NSE_FO|12345';

/** Shape a leg's charges the way Upstox's API documents its response. */
function apiPayload(leg, { clearing = 0, ipft = 0, transactionShare = 1 } = {}) {
  return {
    status: 'success',
    data: {
      charges: {
        total: leg.total + clearing,
        brokerage: leg.brokerage,
        taxes: { gst: leg.gst, stt: leg.stt, stamp_duty: leg.stamp },
        other_charges: {
          transaction: leg.exchange * transactionShare - ipft,
          clearing,
          ipft,
          others: 0,
          sebi_turnover: leg.sebi,
        },
      },
    },
  };
}

function reply(status, body) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

/** A fake Upstox that answers with whatever `answer(side, price, quantity)` returns. */
function fakeFetch(answer) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const params = Object.fromEntries(new URL(url).searchParams);
    calls.push({ url: String(url), params, init });
    return answer(params.transaction_type, Number(params.price), Number(params.quantity));
  };
  return { fetchImpl, calls };
}

function capture() {
  const lines = [];
  return { out: (t) => lines.push(String(t)), err: (t) => lines.push(String(t)), text: () => lines.join('\n') };
}

const honest = (venue = 'NSE', plan = DEFAULT_OPTIONS.plan, extra) => (side, price, qty) =>
  reply(200, apiPayload(legCharges(side, price * qty, venue, plan), extra));

test('parseEnv handles comments, quotes, export and equals signs in values', () => {
  const env = parseEnv(
    [
      '# a comment',
      '',
      'PLAIN=abc',
      'export EXPORTED=yes',
      'QUOTED="has spaces # not a comment"',
      "SINGLE='x=y'",
      'INLINE=value # trailing comment',
      'B64=abc==',
      'EMPTY=',
      'not a pair',
    ].join('\n'),
  );
  assert.deepEqual(env, {
    PLAIN: 'abc',
    EXPORTED: 'yes',
    QUOTED: 'has spaces # not a comment',
    SINGLE: 'x=y',
    INLINE: 'value',
    B64: 'abc==',
    EMPTY: '',
  });
});

test('parseArgs: defaults, overrides and exchange detection', () => {
  const defaults = parseArgs([], { UPSTOX_INSTRUMENT_KEY: ' NSE_FO|1 ' });
  assert.equal(defaults.instrumentKey, 'NSE_FO|1');
  assert.equal(defaults.exchange, 'NSE');
  assert.equal(defaults.quantity, 65);
  assert.equal(defaults.plan, DEFAULT_OPTIONS.plan);
  assert.equal(defaults.product, 'D');
  assert.deepEqual(defaults.errors, []);

  const custom = parseArgs(['--instrument-key', 'BSE_FO|9', '--quantity=130', '--plan', 'standard', '--tolerance', '0.25', '--sell-price', '110.5']);
  assert.equal(custom.exchange, 'BSE');
  assert.equal(custom.quantity, 130);
  assert.equal(custom.plan, 'standard');
  assert.equal(custom.tolerance, 0.25);
  assert.equal(custom.sellPrice, 110.5);

  assert.equal(parseArgs(['--instrument-key', 'XYZ|1']).exchange, '');
  assert.equal(parseArgs(['--instrument-key', 'XYZ|1', '--exchange', 'BSE']).exchange, 'BSE');
});

test('parseArgs reports bad input instead of guessing', () => {
  assert.match(parseArgs(['--nope']).errors[0], /Unknown option/);
  assert.match(parseArgs(['--quantity']).errors[0], /needs a value/);
  assert.match(parseArgs(['--quantity', '1.5']).errors[0], /does not accept/);
  assert.match(parseArgs(['--quantity', '0']).errors[0], /does not accept/);
  assert.match(parseArgs(['--plan', 'gold']).errors[0], /does not accept/);
  assert.match(parseArgs(['--exchange', 'MCX']).errors[0], /does not accept/);
  assert.match(parseArgs(['--tolerance', '-1']).errors[0], /does not accept/);
  assert.equal(parseArgs(['--help']).help, true);
});

test('normalizeApiCharges maps the documented response', () => {
  const leg = legCharges('SELL', 6659.25, 'NSE', 'plus');
  const flat = normalizeApiCharges(apiPayload(leg));
  assert.equal(flat.total, leg.total);
  assert.equal(flat.stt, leg.stt);
  assert.equal(flat.exchange, leg.exchange);
  assert.equal(flat.sebi, leg.sebi);
  assert.equal(flat.stamp, leg.stamp);
  assert.equal(flat.gst, leg.gst);
});

test('normalizeApiCharges adds a separate IPFT line to the exchange fee and tolerates an object GST', () => {
  const leg = legCharges('BUY', 10000, 'NSE', 'plus');
  const split = normalizeApiCharges(apiPayload(leg, { ipft: 0.5 }));
  assert.ok(Math.abs(split.exchange - leg.exchange) < 1e-12);

  const payload = apiPayload(leg);
  payload.data.charges.taxes.gst = { cgst: 1, sgst: 1, igst: 0 };
  assert.equal(normalizeApiCharges(payload).gst, 2);
  payload.data.charges.taxes.gst = { cgst: 1, sgst: 1, igst: 0, total: 2 };
  assert.equal(normalizeApiCharges(payload).gst, 2);
  payload.data.charges.taxes.gst = null;
  assert.equal(normalizeApiCharges(payload).gst, 0);

  assert.throws(() => normalizeApiCharges({}), VerifierError);
  assert.throws(() => normalizeApiCharges({ data: {} }), VerifierError);
});

test('reconcile flags differences and unmodelled charges', () => {
  const leg = legCharges('SELL', 6659.25, 'NSE', 'plus');
  const api = normalizeApiCharges(apiPayload(leg));
  assert.equal(reconcile(leg, api, 0.01).ok, true);

  const off = { ...api, stt: api.stt + 5, total: api.total + 5 };
  const report = reconcile(leg, off, 1);
  assert.equal(report.ok, false);
  assert.deepEqual(report.rows.filter((row) => !row.ok).map((row) => row.key), ['stt', 'total']);
  assert.equal(reconcile(leg, off, 10).ok, true, 'a wider tolerance accepts it');

  const extra = normalizeApiCharges(apiPayload(leg, { clearing: 3 }));
  assert.deepEqual(reconcile(leg, extra, 1).unmodeled, [{ key: 'clearing', amount: 3 }]);
});

test('run: matching charges exit 0, call the API once per leg, and never print the token', async () => {
  const { fetchImpl, calls } = fakeFetch(honest());
  const io = capture();
  const code = await run(['--instrument-key', KEY, '--quantity', '65'], { UPSTOX_ACCESS_TOKEN: TOKEN }, { fetchImpl, ...io });

  assert.equal(code, 0);
  assert.match(io.text(), /All charges match/);
  assert.ok(!io.text().includes(TOKEN), 'the token must never appear in output');
  assert.deepEqual(calls.map((c) => c.params.transaction_type), ['BUY', 'SELL']);
  assert.equal(calls[0].params.instrument_token, KEY);
  assert.equal(calls[0].params.product, 'D');
  assert.equal(calls[0].params.quantity, '65');
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.match(calls[0].url, /instrument_token=NSE_FO%7C12345/);
  assert.ok(!/chrome/i.test(calls[0].init.headers['User-Agent']), 'does not pretend to be a browser');
});

test('run: BSE key and the Standard plan are compared against the matching local rates', async () => {
  const { fetchImpl } = fakeFetch(honest('BSE', 'standard'));
  const io = capture();
  const code = await run(['--instrument-key', 'BSE_FO|777', '--plan', 'standard', '--quantity', '20'], { UPSTOX_ACCESS_TOKEN: TOKEN }, { fetchImpl, ...io });
  assert.equal(code, 0, io.text());
});

test('run: a wrong plan is reported as a mismatch, not silently accepted', async () => {
  const { fetchImpl } = fakeFetch(honest('NSE', 'standard'));
  const io = capture();
  const code = await run(['--instrument-key', KEY, '--plan', 'plus'], { UPSTOX_ACCESS_TOKEN: TOKEN }, { fetchImpl, ...io });
  assert.equal(code, 1);
  assert.match(io.text(), /differs/);
});

test('run: a changed STT rate exits 1 and points at the docs', async () => {
  const { fetchImpl } = fakeFetch((side, price, qty) => {
    const leg = legCharges(side, price * qty, 'NSE', DEFAULT_OPTIONS.plan);
    if (side === 'SELL') {
      leg.stt += 7;
      leg.total += 7;
    }
    return reply(200, apiPayload(leg));
  });
  const io = capture();
  const code = await run(['--instrument-key', KEY], { UPSTOX_ACCESS_TOKEN: TOKEN }, { fetchImpl, ...io });
  assert.equal(code, 1);
  assert.match(io.text(), /STT.*differs/);
  assert.match(io.text(), /docs\/TARIFF\.md/);
});

test('run: an expired token explains the daily expiry', async () => {
  const { fetchImpl } = fakeFetch(() => reply(401, { status: 'error', errors: [{ message: 'Invalid token' }] }));
  const io = capture();
  const code = await run(['--instrument-key', KEY], { UPSTOX_ACCESS_TOKEN: TOKEN }, { fetchImpl, ...io });
  assert.equal(code, 2);
  assert.match(io.text(), /3:30 AM IST/);
  assert.ok(!io.text().includes(TOKEN));
});

test('run: API errors, bad JSON and network failures exit 2 with a readable reason', async () => {
  let io = capture();
  let code = await run(['--instrument-key', KEY], { UPSTOX_ACCESS_TOKEN: TOKEN }, {
    fetchImpl: fakeFetch(() => reply(400, { status: 'error', errors: [{ message: 'Invalid instrument key' }] })).fetchImpl,
    ...io,
  });
  assert.equal(code, 2);
  assert.match(io.text(), /Invalid instrument key/);

  io = capture();
  code = await run(['--instrument-key', KEY], { UPSTOX_ACCESS_TOKEN: TOKEN }, {
    fetchImpl: async () => ({ status: 200, ok: true, json: async () => { throw new SyntaxError('bad'); } }),
    ...io,
  });
  assert.equal(code, 2);
  assert.match(io.text(), /not JSON/);

  io = capture();
  code = await run(['--instrument-key', KEY], { UPSTOX_ACCESS_TOKEN: TOKEN }, {
    fetchImpl: async () => { throw new Error('getaddrinfo ENOTFOUND api.upstox.com'); },
    ...io,
  });
  assert.equal(code, 2);
  assert.match(io.text(), /Could not reach Upstox/);
  assert.ok(!io.text().includes(TOKEN));
});

test('run: setup problems exit 2 before any request is made', async () => {
  const { fetchImpl, calls } = fakeFetch(honest());
  const cases = [
    [[], {}, /UPSTOX_ACCESS_TOKEN is not set/],
    [[], { UPSTOX_ACCESS_TOKEN: '   ' }, /UPSTOX_ACCESS_TOKEN is not set/],
    [[], { UPSTOX_ACCESS_TOKEN: TOKEN }, /No instrument key/],
    [['--instrument-key', 'MCX_FO|1'], { UPSTOX_ACCESS_TOKEN: TOKEN }, /NSE from BSE/],
    [['--bogus'], { UPSTOX_ACCESS_TOKEN: TOKEN }, /Unknown option/],
  ];
  for (const [argv, env, pattern] of cases) {
    const io = capture();
    assert.equal(await run(argv, env, { fetchImpl, ...io }), 2, argv.join(' '));
    assert.match(io.text(), pattern);
  }
  assert.equal(calls.length, 0);
});

test('run: --help prints usage and exits 0', async () => {
  const io = capture();
  assert.equal(await run(['--help'], {}, { ...io }), 0);
  assert.match(io.text(), /Usage: npm run verify:live/);
});
