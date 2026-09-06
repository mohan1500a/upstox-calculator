# Upstox Options Brokerage & Compounding Web Calculator App

This project contains the single-page web application frontend for calculating Upstox options brokerage fees, statutory charges, net PnL, and compounding velocity over 200 trading days.

---

## File Structure

```
web_app/
├── index.html   # Main HTML structure with high-contrast UI theme
├── styles.css   # Modern Glassmorphism & Lumos Dark Mode Styling
└── app.js       # Dynamic Fee Calculator & Compounding Velocity Engine
```

---

## Features

1. **Exact Statutory Fee Breakdown**:
   Calculates Brokerage ($₹20/\text{order}$ capped), STT ($0.125\%$ on sell), STT on Exercise, Exchange Turnover Charges ($0.05\%$), SEBI Charges, Stamp Duty, and GST ($18\%$).
2. **Compounding Velocity Engine**:
   Simulates capital compounding over 200 trading days with adjustable capital deployment ratios ($50\%$ default) and custom win rates.
3. **Interactive Visual Dashboard**:
   High-contrast charts, daily PnL breakdown tables, and fee percentage analytics.

---

## How to Run

Simply open `index.html` in any modern browser, or serve locally using Python:

```bash
cd web_app
python3 -m http.server 8000
```

Then navigate to `http://localhost:8000`.
