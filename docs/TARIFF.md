# Rates and contract sizes

The calculator's numbers come from one file, `public/js/config/tariff.js`, with contract sizes in
`public/js/config/instruments.js`. This page explains where each figure comes from and how sure we are of it.
`npm test` fails if the tables below and the code disagree, so update both together.

Last reviewed: **2026-09-30**

## Charges on index options

Rates apply to premium turnover (price × quantity) of each order.

| Charge | Rate | Side | Status |
| --- | --- | --- | --- |
| Brokerage | ₹20 Standard, ₹30 Plus, flat per executed order | Both | Confirmed. Options are listed as a flat ₹20 per executed order; Upstox Plus is listed as "up to ₹30/order", which is what the Plus setting uses |
| STT | 0.15% | Sell | Confirmed, effective 1 April 2026 |
| Exchange fee, NSE | 0.03553% | Both | Confirmed, effective 1 March 2026. It was 0.03503% before; Upstox says IPFT is now combined into it, and the rise equals the old ₹0.50-per-lakh IPFT |
| Exchange fee, BSE | 0.0325% | Both | Confirmed |
| SEBI fee | ₹10 per crore (0.0001%) | Both | Confirmed |
| Stamp duty | 0.003% | Buy | Confirmed |
| GST | 18% of brokerage plus the exchange fee | Both | Confirmed. Upstox lists brokerage, transaction charges and IPFT as the base |
| Tick size | ₹0.05 | | Standard for index options |

Source: Upstox's brokerage charges page, <https://upstox.com/brokerage-charges/>, Equity Options column, read on 2026-09-30.

The same page still lists a residual IPFT of ₹0.01 per crore of premium. On a ₹1 lakh order that is ₹0.0001, so it is not
modelled. Options carry no DP charges.

### What changed from the earlier version of this project

- **Sensex now uses the BSE rate.** It was being charged at the NSE rate.
- **The NSE exchange fee is 0.03553%**, not the rounded 0.0355% the earlier notes called "verified ~0.0355%".
  That figure is Upstox's published one, so there is no longer any approximation to explain.
- **SEBI's turnover fee is left out of the GST base**, matching how Upstox states it. The earlier code included it.
  The difference is about ₹0.001 per order at the default size.
- **Brokerage is a choice between plans** instead of a hidden constant. Upstox Plus accounts pay the higher flat fee,
  so the right setting depends on your account. The default is Plus.
- **The old notes listed STT as "0.1% statutory / 0.15% Upstox verified".** There is one number now: 0.15% on the sell side,
  which Upstox's page gives for options from 1 April 2026.

## Contracts

| Index | Exchange | Lot size | Order limit (units) | Max lots per order |
| --- | --- | --- | --- | --- |
| Nifty 50 | NSE | 65 | 1800 | 27 |
| Bank Nifty | NSE | 30 | 600 | 20 |
| Sensex | BSE | 20 | 1000 | 50 |

What was checked against what:

- **Nifty 50 (65) and Bank Nifty (30) lot sizes:** NSE circular NSE/FAOP/70616 of 3 October 2025, read directly. It applies
  from the January 2026 expiries.
- **Sensex lot size (20) and all three freeze quantities:** broker and exchange-derived sources only. The BSE circular and
  NSE's freeze-quantity circulars were not read.

Freeze quantities are revised more often than lot sizes. The check that costs nothing is Upstox's instruments file, where each
contract carries `lot_size` and `freeze_quantity`: <https://upstox.com/developer/api-documentation/instruments/>.

Max lots is the freeze quantity divided by the lot size, rounded down. Above that an exchange splits an order into several,
each paying its own brokerage, which this calculator does not model, so the lot field stops there.

## Not modelled

- Orders above the freeze quantity, which are sliced and pay brokerage per slice.
- Holding to expiry or exercising a contract. The model is a buy and a sell before expiry. (Upstox lists the same 0.15% STT
  on the sale of an option that is exercised, but the settlement maths is a different calculation.)
- Whole-rupee rounding of STT on contract notes. Upstox's API may differ from this calculator by a few paise for that reason.
- Promotions, custom brokerage and any charge Upstox adds later. The live check below reports these when the API lists them.
- Income tax on profits.

## Keeping it current

1. Read Upstox's charges page and the instruments file.
2. Edit `tariff.js` and `instruments.js`, then set `DATA_REVIEWED_ON`.
3. Update the tables above. Run `npm test`.
4. With a fresh access token, run `npm run verify:live -- --instrument-key "<today's option key>"`.
   It compares every charge on a buy and a sell against Upstox's own calculation and exits 1 if any differ.
