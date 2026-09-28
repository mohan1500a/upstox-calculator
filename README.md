# Upstox Options Target Sell Price & Compounding Velocity Suite (Official 2026 Rules)

A high-performance, real-time quantitative trading suite for calculating:
1. **Options Target Sell Price & Re-entry Engine** — Computes exact limit sell prices required to achieve target Net ROI goals after accounting for Upstox 2026 statutory taxes (STT, Exchange txn fees, SEBI, Stamp duty, GST), execution slippage, and dynamic next trade entry fees.
2. **Compounding Velocity 200-Day Target Growth Engine** — Computes exact compound trade velocity, daily/monthly trade frequency, and sensitivity allocation breakdowns (10% to 100% capital deployed) to compound initial capital into target wealth goals.

---

## ⚡ Core Features

- **Upstox Official Statutory Rates (Verified via Upstox Live API)**:
  - **Brokerage**: ₹30 / executed order (₹60 roundtrip flat).
  - **STT**: 0.15% on sell-side premium value (Buy STT = ₹0.00).
  - **Exchange Transaction Fee**: 0.0355% (NSE Options revised) on total buy + sell turnover.
  - **SEBI Turnover Fee**: 0.0001% (₹10 / crore) on total turnover.
  - **Stamp Duty**: 0.003% on buy-side premium value only.
  - **GST**: 18% on (Brokerage + Exchange fees + SEBI fees).

- **Indian Exchange Precision Rules**:
  - **₹0.05 Exchange Tick Size (NSE / BSE)**: All equity and index option contracts trade strictly in multiples of ₹0.05. Target limit sell prices and breakevens are rounded up (`ceil` mode) to the next valid ₹0.05 tick. This ensures orders are accepted by exchange Risk Management Systems (RMS) and guarantees that realized profits meet or exceed the trader's target Net ROI.
  - **Discrete Natural Number Velocity Model**: Trades are discrete physical events (cannot be executed as fractions like 1.16 or ambiguous ranges like 1–2). To complete $N$ target trades within a $D$-day limit, the engine computes the required whole daily execution rate: $\text{Daily Trades} = \max(1, \lceil N / D \rceil)$. The exact completion time is then: $\text{Days Needed} = \lceil N / \text{Daily Trades} \rceil \le D$, ensuring strict arithmetic truth without fractional anomalies (e.g. taking $2\text{ trades/day}$ completes $232\text{ trades}$ in exactly $116\text{ trading days}$, well within the $200$-day target).

- **Dynamic Index & Lot Size Caps**:
  - `NIFTY` (65 / lot, max 27 lots = 1,755 qty)
  - `BANKNIFTY` (30 / lot, max 20 lots = 600 qty)
  - `FINNIFTY` (65 / lot, max 27 lots = 1,755 qty)
  - `MIDCPNIFTY` (120 / lot, max 24 lots = 2,880 qty)
  - `SENSEX` (20 / lot, max 50 lots = 1,000 qty)
  - `BANKEX` (30 / lot, max 50 lots = 1,500 qty)

- **Compounding Growth Model**:
  - Compound Rate Formula: $R_{eff} = (\text{Deploy \%} / 100) \times (\text{Return \%} / 100)$
  - Exact Trades Formula: $N_{trades} = \frac{\ln(\text{Final Capital} / \text{Initial Capital})}{\ln(1 + R_{eff})}$
  - Caps trading days per year to 200–240 active market days.

---

## 💻 Tech Stack & Architecture

- **Frontend**: HTML5, Vanilla CSS (Lumos Dark Theme Design System), Modular ES6+ JavaScript.
- **Python Quantitative Core**: Python 3.9+ with `@dataclass(frozen=True)` and type annotations.
- **Zero Dependencies**: Pure standard library execution with zero external NPM or PyPI dependencies.

---

## 🚀 Running Locally

### 1. Web Application
To run the local web server:

```bash
python3 -m http.server 8000
```

Then navigate to:
- **Options Target Engine**: [http://localhost:8000/index.html](http://localhost:8000/index.html)
- **Compounding Velocity Engine**: [http://localhost:8000/index.html?tab=compounding](http://localhost:8000/index.html?tab=compounding)

### 2. Python Quantitative CLI
To run the Python engine CLI:

```bash
python3 scripts/options_brokerage_calculator.py
```

### 3. Live Upstox API Charges Auditor
To audit real-time brokerage and statutory taxes directly against Upstox's live production API:

1. Copy `.env.example` to `.env` and configure your Upstox API credentials.
2. Run the live auditor:

```bash
python3 scripts/upstox_live_charges_verifier.py
```

---

## 📄 License & Attribution
Designed & developed for indicative options trading analysis based on official Upstox 2026 statutory rates.
