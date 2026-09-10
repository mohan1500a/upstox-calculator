# Upstox Options Target Sell Price & Compounding Velocity Suite (Official 2026 Rules)

A high-performance, real-time quantitative trading suite for calculating:
1. **Options Target Sell Price & Re-entry Engine** — Computes exact limit sell prices required to achieve target Net ROI goals after accounting for Upstox 2026 statutory taxes (STT, Exchange txn fees, SEBI, Stamp duty, GST), execution slippage, and dynamic next trade entry fees.
2. **Compounding Velocity 200-Day Target Growth Engine** — Computes exact compound trade velocity, daily/monthly trade frequency, and sensitivity allocation breakdowns (10% to 100% capital deployed) to compound initial capital into target wealth goals.

---

## ⚡ Core Features

- **Upstox 2026 Statutory Rates**:
  - **Brokerage**: ₹20 / executed order (₹40 roundtrip flat).
  - **STT**: 0.1% on sell-side premium value.
  - **Exchange Transaction Fee**: 0.0495% (NSE Options) on total buy + sell turnover.
  - **SEBI Turnover Fee**: 0.0001% (₹10 / crore) on total turnover.
  - **Stamp Duty**: 0.003% on buy-side premium value only.
  - **GST**: 18% on (Brokerage + Exchange fees + SEBI fees).

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
python3 options_brokerage_calculator.py
```

---

## 📄 License & Attribution
Designed & developed for indicative options trading analysis based on official Upstox 2026 statutory rates.
