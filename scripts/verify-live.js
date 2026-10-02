#!/usr/bin/env node
/**
 * Compare this calculator's charges with what Upstox's own charges API returns
 * for the same order, so drift in the tariff shows up before it costs you.
 *
 *   npm run verify:live -- --instrument-key "NSE_FO|12345" --quantity 65
 *
 * Needs UPSTOX_ACCESS_TOKEN, from the environment or from .env in the repo root.
 * Upstox tokens expire every day at about 3:30 AM IST, so paste a fresh one first.
 * Option instrument keys change with every expiry; see `--help`.
 *
 * Exit codes: 0 everything matches, 1 a charge differs, 2 setup or network problem.
 * The token is never printed.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BROKERAGE_PLANS } from '../public/js/config/tariff.js';
import { DEFAULT_OPTIONS } from '../public/js/config/defaults.js';
import { legCharges } from '../public/js/engine/charges.js';
import { formatCurrency, formatNumber } from '../public/js/ui/format.js';

const API_URL = 'https://api.upstox.com/v2/charges/brokerage';
const USER_AGENT = 'Mozilla/5.0 (compatible; options-suite-verifier/2.0)';
const REQUEST_TIMEOUT_MS = 15_000;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export class VerifierError extends Error {
  constructor(message, exitCode = 2) {
    super(message);
    this.name = 'VerifierError';
    this.exitCode = exitCode;
  }
}

/** Parse KEY=value lines. Supports comments, `export`, and quoted values. */
export function parseEnv(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.length >= 2 && value.endsWith(quote)) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '');
    }
    env[match[1]] = value;
  }
  return env;
}

const HELP = `Usage: npm run verify:live -- [options]

  --instrument-key <key>   Option instrument key, e.g. "NSE_FO|12345" (env UPSTOX_INSTRUMENT_KEY)
  --quantity <n>           Units per order (default 65)
  --buy-price <price>      Premium for the buy order (default 100)
  --sell-price <price>     Premium for the sell order (default 103)
  --exchange <NSE|BSE>     Defaults to the prefix of the instrument key
  --plan <${Object.keys(BROKERAGE_PLANS).join('|')}>  Brokerage plan to compare against (default ${DEFAULT_OPTIONS.plan})
  --product <D|I>          Order product sent to the API (default D)
  --tolerance <rupees>     Largest accepted difference per charge (default 1)
  -h, --help               Show this help

Instrument keys change every expiry. Find a current one in Upstox's instruments file
(https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz), where
option contracts have segment NSE_FO or BSE_FO. Docs: https://upstox.com/developer/api-documentation/instruments/
`;

const oneOf = (values) => (value) => (values.includes(value) ? value : null);
const positive = (value) => (Number(value) > 0 ? Number(value) : null);
const FLAGS = {
  '--instrument-key': ['instrumentKey', (v) => (v.trim() ? v.trim() : null)],
  '--quantity': ['quantity', (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null)],
  '--buy-price': ['buyPrice', positive],
  '--sell-price': ['sellPrice', positive],
  '--exchange': ['exchange', oneOf(['NSE', 'BSE'])],
  '--plan': ['plan', oneOf(Object.keys(BROKERAGE_PLANS))],
  '--product': ['product', oneOf(['D', 'I'])],
  '--tolerance': ['tolerance', (v) => (v.trim() !== '' && Number(v) >= 0 ? Number(v) : null)],
};

export function parseArgs(argv, env = {}) {
  const options = {
    instrumentKey: (env.UPSTOX_INSTRUMENT_KEY ?? '').trim(),
    quantity: 65,
    buyPrice: 100,
    sellPrice: 103,
    exchange: '',
    plan: DEFAULT_OPTIONS.plan,
    product: 'D',
    tolerance: 1,
    help: false,
    errors: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }
    const equals = arg.startsWith('--') ? arg.indexOf('=') : -1;
    const flag = equals > 0 ? arg.slice(0, equals) : arg;
    const spec = FLAGS[flag];
    if (!spec) {
      options.errors.push(`Unknown option: ${arg}`);
      continue;
    }
    const raw = equals > 0 ? arg.slice(equals + 1) : argv[(i += 1)];
    if (raw === undefined) {
      options.errors.push(`${flag} needs a value.`);
      continue;
    }
    const value = spec[1](raw);
    if (value === null) options.errors.push(`${flag} does not accept "${raw}".`);
    else options[spec[0]] = value;
  }

  if (!options.exchange) {
    const prefix = options.instrumentKey.split('|')[0];
    if (prefix.startsWith('NSE')) options.exchange = 'NSE';
    else if (prefix.startsWith('BSE')) options.exchange = 'BSE';
  }
  return options;
}

const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/** Flatten Upstox's response into the same components this calculator produces. */
export function normalizeApiCharges(payload) {
  const charges = payload?.data?.charges;
  if (!charges || typeof charges !== 'object') throw new VerifierError('The response has no data.charges section.');
  const taxes = charges.taxes ?? {};
  const other = charges.other_charges ?? {};
  const gst =
    taxes.gst !== null && typeof taxes.gst === 'object'
      ? num(taxes.gst.total ?? Object.values(taxes.gst).reduce((sum, v) => sum + num(v), 0))
      : num(taxes.gst);

  return {
    total: num(charges.total),
    brokerage: num(charges.brokerage),
    stt: num(taxes.stt),
    gst,
    stamp: num(taxes.stamp_duty),
    // Upstox has folded IPFT into the transaction charge, but older responses list it separately.
    exchange: num(other.transaction) + num(other.ipft),
    sebi: num(other.sebi_turnover),
    clearing: num(other.clearing),
    others: num(other.others),
  };
}

const ROWS = [
  ['Brokerage', 'brokerage'],
  ['STT', 'stt'],
  ['Exchange fee', 'exchange'],
  ['SEBI fee', 'sebi'],
  ['Stamp duty', 'stamp'],
  ['GST', 'gst'],
  ['Total', 'total'],
];

/** Line the calculator's numbers up against the API's, charge by charge. */
export function reconcile(local, api, tolerance) {
  const rows = ROWS.map(([label, key]) => {
    const diff = api[key] - local[key];
    return { label, key, local: local[key], api: api[key], diff, ok: Math.abs(diff) <= tolerance };
  });
  const unmodeled = ['clearing', 'others'].filter((key) => api[key] !== 0).map((key) => ({ key, amount: api[key] }));
  return { rows, unmodeled, ok: rows.every((row) => row.ok) };
}

async function fetchCharges({ token, instrumentKey, quantity, price, side, product, fetchImpl = fetch }) {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    instrument_token: instrumentKey,
    quantity: String(quantity),
    product,
    transaction_type: side,
    price: String(price),
  }).toString();

  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new VerifierError(`Could not reach Upstox: ${error.message}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new VerifierError(
      `Upstox rejected the access token (HTTP ${response.status}). Tokens expire every day at about 3:30 AM IST. Generate a new one and update UPSTOX_ACCESS_TOKEN.`,
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new VerifierError(`Upstox answered HTTP ${response.status} with something that is not JSON.`);
  }
  if (!response.ok || payload?.status === 'error') {
    const detail = payload?.errors?.[0]?.message ?? 'no details given';
    throw new VerifierError(`Upstox answered HTTP ${response.status}: ${detail}`);
  }
  return normalizeApiCharges(payload);
}

const pad = (text, width) => String(text).padStart(width);

function printReport(out, title, report) {
  out(`\n${title}`);
  out(`  ${'Charge'.padEnd(14)}${pad('Calculator', 12)}${pad('Upstox', 12)}${pad('Difference', 12)}`);
  for (const row of report.rows) {
    const flag = row.ok ? '' : '  <-- differs';
    out(`  ${row.label.padEnd(14)}${pad(formatNumber(row.local), 12)}${pad(formatNumber(row.api), 12)}${pad(formatNumber(row.diff), 12)}${flag}`);
  }
  for (const item of report.unmodeled) {
    out(`  Upstox also reports ${formatCurrency(item.amount)} of "${item.key}" charges, which this calculator does not model.`);
  }
}

const sumCharges = (a, b) => Object.fromEntries(Object.keys(a).map((key) => [key, a[key] + b[key]]));

/** Run the check. Returns the exit code instead of exiting, so tests can call it. */
export async function run(argv, env, { fetchImpl = fetch, out = console.log, err = console.error } = {}) {
  const options = parseArgs(argv, env);
  if (options.help) {
    out(HELP);
    return 0;
  }
  if (options.errors.length > 0) {
    err(`${options.errors.join('\n')}\n\nRun with --help for usage.`);
    return 2;
  }

  const token = (env.UPSTOX_ACCESS_TOKEN ?? '').trim();
  if (!token) {
    err('UPSTOX_ACCESS_TOKEN is not set. Copy .env.example to .env and paste today\'s access token, or export it in your shell.');
    return 2;
  }
  if (!options.instrumentKey) {
    err('No instrument key. Pass --instrument-key "NSE_FO|12345" or set UPSTOX_INSTRUMENT_KEY. Run with --help to see where to find one.');
    return 2;
  }
  if (!options.exchange) {
    err('Could not tell NSE from BSE using the instrument key. Pass --exchange NSE or --exchange BSE.');
    return 2;
  }

  const legs = [
    { side: 'BUY', price: options.buyPrice },
    { side: 'SELL', price: options.sellPrice },
  ];

  try {
    out(
      `Checking ${options.instrumentKey}: quantity ${options.quantity}, buy ${formatNumber(options.buyPrice)}, sell ${formatNumber(options.sellPrice)}, ${BROKERAGE_PLANS[options.plan].label} plan, tolerance ${formatCurrency(options.tolerance)}.`,
    );
    const reports = [];
    for (const { side, price } of legs) {
      const api = await fetchCharges({ ...options, token, price, side, fetchImpl });
      const local = legCharges(side, price * options.quantity, options.exchange, options.plan);
      const report = reconcile(local, api, options.tolerance);
      printReport(out, `${side} leg at ${formatNumber(price)} (turnover ${formatCurrency(price * options.quantity)})`, report);
      reports.push({ local, api, report });
    }

    const roundTrip = reconcile(
      sumCharges(reports[0].local, reports[1].local),
      sumCharges(reports[0].api, reports[1].api),
      options.tolerance,
    );
    printReport(out, 'Round trip', roundTrip);

    const ok = reports.every((r) => r.report.ok) && roundTrip.ok;
    out(ok ? '\nAll charges match within tolerance.' : '\nSome charges differ. Compare docs/TARIFF.md with Upstox\'s current schedule.');
    return ok ? 0 : 1;
  } catch (error) {
    if (error instanceof VerifierError) {
      err(error.message);
      return error.exitCode;
    }
    throw error;
  }
}

async function loadEnv() {
  let fromFile = {};
  try {
    fromFile = parseEnv(await readFile(path.join(ROOT, '.env'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { ...fromFile, ...process.env };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  process.exitCode = await run(process.argv.slice(2), await loadEnv());
}
