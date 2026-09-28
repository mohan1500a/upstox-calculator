# Upstox Options Tariff & Statutory Regulatory Framework (2026)

This document details the exact statutory rates, SEBI mandates, and exchange transaction fees incorporated into the Upstox Options & Compounding Suite. All formulas have been verified against the official Upstox Live API.

---

## 1. Statutory Fee Schedule (Options Segment)

| Fee Component | Statutory / Broker Rate | Tax Base | Applied On |
| :--- | :--- | :--- | :--- |
| **Brokerage** | ₹30.00 flat per executed order | Fixed fee per order | Buy & Sell orders (₹60 total roundtrip) |
| **Securities Transaction Tax (STT)** | 0.1% (statutory) / 0.15% (Upstox verified) | Premium Turnover | **Sell side only** ($P_{\text{sell}} \times Q$) |
| **NSE Exchange Charges** | 0.03503% (verified ~0.0355%) | Premium Turnover | Total Turnover ($T_{\text{buy}} + T_{\text{sell}}$) |
| **BSE Exchange Charges** | 0.0325% | Premium Turnover | Total Turnover ($T_{\text{buy}} + T_{\text{sell}}$) |
| **SEBI Turnover Fee** | ₹10 per Crore (0.0001%) | Premium Turnover | Total Turnover ($T_{\text{buy}} + T_{\text{sell}}$) |
| **Stamp Duty** | 0.003% (₹300 per Crore) | Premium Turnover | **Buy side only** ($P_{\text{buy}} \times Q$) |
| **Goods & Services Tax (GST)** | 18.0% | Service Value | Brokerage + Exchange Fee + SEBI Fee |
| **Exchange Tick Size** | ₹0.05 | Price Increment | NSE & BSE options price steps |

---

## 2. Linear Equation Solver for Required Target Sell Price

Let:
- $Q$ = Total trade quantity (units)
- $P_{\text{buy}}$ = Limit buy price
- $S$ = Slippage per side
- $R_{\text{buy}} = P_{\text{buy}} + S$ (Realized execution buy price)
- $T_{\text{buy}} = R_{\text{buy}} \times Q$ (Buy-side turnover)
- $T_{\text{target}}$ = Target net profit
- $F_{\text{next}}$ = Next trade buy entry fee

We solve for realized sell price $R_{\text{sell}}$ analytically:

$$R_{\text{sell}} = \frac{T_{\text{target}} + T_{\text{buy}} + K_{\text{buy}}}{Q \times (1 - C_{\text{sell}})}$$

Where:
- $C_{\text{sell}} = \text{STT}_{\text{rate}} + 1.18 \times (\text{Ex}_{\text{rate}} + \text{SEBI}_{\text{rate}})$
- $K_{\text{buy}} = (60.0 \times 1.18) + (\text{Stamp}_{\text{rate}} \times T_{\text{buy}}) + 1.18 \times (\text{Ex}_{\text{rate}} + \text{SEBI}_{\text{rate}}) \times T_{\text{buy}}$

The limit sell price $P_{\text{sell}} = R_{\text{sell}} + S$ is then quantized:
$$P_{\text{sell}} = \frac{\lceil P_{\text{sell}} \times 20 \rceil}{20}$$
