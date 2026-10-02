# Architecture

## Shape

A static site. `public/` is the product: HTML, CSS and ES modules served as they are. There is no bundler, no transpiler and no
runtime dependency. Node is used only for the dev server, the live check and the tests.

## Modules

```
config/   Numbers that change: tariff.js, instruments.js, defaults.js. No logic beyond deriving max lots.
engine/   Pure functions. No DOM, no globals. All pricing rules live here.
ui/       DOM only. Formats engine results and renders them. dom.js lists every element id the scripts use.
main.js   Holds the state and wires events.
```

Imports only point one way: `config` ← `engine` ← `ui` ← `main`. A test enforces it, and another checks that every module on
disk is reachable from `main.js`, so dead files cannot hide.

## Data flow

```
input, click or keystroke  →  state (two plain objects)  →  computeTrade / computeCompounding  →  render
```

The engine normalises whatever it is given: lots are a whole number within one order's freeze limit, prices snap to the tick,
ranges are clamped, and unknown instruments or plans fall back to the defaults. The UI therefore cannot feed it a bad value, and
the engine has no hidden defaults of its own.

## The maths

**Charges on one order** are brokerage, STT (sell only), exchange fee, SEBI fee, stamp duty (buy only) and GST on
brokerage plus the exchange fee. For a fixed side and venue they are affine in turnover: `total = fixed + rate × turnover`.
`chargeCoefficients` derives `fixed` and `rate` from `legCharges` itself, so the forward calculation and the inverse below share
one formula.

**The target sell price.** You buy at `buyPrice + slippage` and sell at `sellPrice − slippage`:

```
net = sellTurnover − buyTurnover − buyCharges − (fixed + rate × sellTurnover)
sellTurnover = (net + buyTurnover + buyCharges + fixed) / (1 − rate)
sellPrice    = ceilToTick(sellTurnover / quantity + slippage)
```

Rounding up to the tick means the order you place never falls short. The required net is
`buyTurnover × target% + nextEntryFee` when the fee toggle is on.

**Breakeven** is the same solve with a required net of zero. It depends only on the trade, so it does not move when the target
or the fee toggle changes.

**Next entry fee** has one definition, the buy-leg charges at the same size. Capital ready to redeploy is
`buyTurnover + netProfit − nextEntryFee`.

**Compounding.** Each trade grows capital by `returnPct × deployPct`. Trades needed is
`ceil(ln(target / initial) / ln(1 + growth))`, with a small epsilon so a whole-number answer such as 1000 to 1331 at 10% is not
rounded up by floating point noise. Per day is the trades divided by the trading days available, rounded up; the days needed
follow from that pace. A target at or below the starting capital, or a return of zero, gives a status instead of a number.

## Input fields

Typing updates the results as soon as the value is valid and in range. An invalid value is flagged, ignored, and the last good
result stays on screen. The box is never rewritten while the cursor is in it. Leaving the field (or pressing Enter) clamps and
snaps the value, then writes it back so the box shows what the maths used.

## Security and headers

- The Content-Security-Policy in `index.html` allows only same-origin scripts and styles plus Google Fonts. There is no inline
  script, inline style or inline event handler, and nothing sets `innerHTML`.
- `_headers` adds what a `<meta>` tag cannot (`frame-ancestors`) and the usual hardening headers.
- The deploy root is `public/`, so files at the repository root, `.env` included, are never served.

## Tests

| Suite | Guards against |
| --- | --- |
| `charges`, `options` | A wrong rate or formula. Reference values come from a separate Decimal implementation. |
| `compounding` | Off-by-one trade counts and the wrong message for a bad input. |
| `format` | Wrong grouping, `-0`, `NaN` on screen. |
| `verify-live` | Misreading Upstox's response, and leaking the token. |
| `dev-server` | Serving files outside `public/`, wrong content types. |
| `contract` | Markup, CSS, config and docs drifting apart. |

## Common changes

**Add an instrument.** Add one entry to `INSTRUMENTS` in `config/instruments.js`. The chips and the rates dialog pick it up.
Add its row to `docs/TARIFF.md`, bump `DATA_REVIEWED_ON`, run `npm test`.

**Change a rate.** Edit `config/tariff.js`, update the table in `docs/TARIFF.md`, bump `DATA_REVIEWED_ON`, run `npm test`, then
run the live check.

**Add an input.** Add the element to `index.html`, its id to `IDS` in `ui/dom.js`, and a `bindNumericField` call in `main.js`.
Put its limits in `LIMITS`. The contract test will tell you if any of the three is missing.

**Serve faster on a very slow link.** Bundle the modules with a tool such as esbuild into one file and point the script tag at it.
With HTTP/2 the 14 small modules are fine, so this is not done by default.
