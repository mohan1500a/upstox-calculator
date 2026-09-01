# Upstox Options Target Sell Price Calculator (2026 Engine)

A modern, high-precision options brokerage, statutory tax, and required target sell price calculator built for Upstox 2026 tariff rules.

Live Web App: Built with HTML5, CSS3 (Lumos Design System), and Pure Vanilla JS.

## Key Features
- **Closed-Form Target Price Engine**: Calculates exact Required Target Limit Sell Price needed to achieve your target Net ROI % after all taxes and execution slippages.
- **Upstox 2026 Option Taxes**: Fully models Brokerage (₹40 roundtrip), STT (0.1% sell), Exchange charges (0.0495%), SEBI turnover fees (0.0001%), Stamp duty (0.003% buy), and GST (18%).
- **Dynamic Re-entry Buy Fee**: Calculates the exact dynamic buy-side entry fee for your next trade.
- **Include Next Trade Fee Toggle**: Includes your next trade's buy entry cost directly into the required sell price when turned ON.
- **Bidirectional Preset Chip Glow**: Preset profit chips (`0%`, `+1%`, `+2%`, `+3%`, `+5%`, `+10%`) glow dynamically on matching input.
- **Index Lot Sizes & Caps**: Supports NIFTY (65), BANKNIFTY (30), and SENSEX (20) with official maximum lot caps.
- **Single-Page Zero-Scroll UI**: Fits 100% inside 1 screen without scrolling.

## Local Running
```bash
python3 -m http.server 8080
```
Open `http://localhost:8080` in your browser.

## CLI Usage
```bash
python3 options_brokerage_calculator.py 65 100.00 0.0 0.50 true
```
