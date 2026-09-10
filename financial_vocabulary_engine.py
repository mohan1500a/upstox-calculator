#!/usr/bin/env python3
"""
Financial Vocabulary & Microstructure Engine (Level 0 Foundation)
Quantitative Trading System Architectural Foundations

Calculates:
1. Fundamental Accounting Equation (Assets = Liabilities + Equity)
2. Ownership %, Book Value Per Share (BVPS), Market Capitalization
3. Valuation Metrics (Market Equity vs Book Equity, P/B Ratio)
4. Capital Structure & Leverage Ratios (D/E Ratio)
5. Microstructure Mechanics (Bid-Ask Spread, Mid-Price, Spread bps)
6. 8-Level Learning Hierarchy Roadmap from Vocabulary to Trading Engine

Author: Antigravity AI Pair Programmer
Version: 1.0 (Level 0 Microstructure & Financial Engine)
"""

import sys
import math
from dataclasses import dataclass
from typing import Dict, Any


@dataclass(frozen=True)
class BalanceSheetCalculation:
    cash: float
    machinery_assets: float
    inventory: float
    receivables: float
    total_assets: float
    liabilities: float
    equity: float
    debt_equity_ratio: float
    equity_ratio_pct: float


@dataclass(frozen=True)
class ShareValuationCalculation:
    share_price: float
    shares_outstanding: float
    shares_owned: float
    ownership_pct: float
    market_cap: float
    book_equity: float
    book_value_per_share: float
    price_to_book_ratio: float


@dataclass(frozen=True)
class MicrostructureCalculation:
    bid_price: float
    ask_price: float
    spread: float
    mid_price: float
    spread_pct: float
    spread_bps: float


def calculate_balance_sheet(
    cash: float,
    machinery: float,
    inventory: float,
    receivables: float,
    liabilities: float
) -> BalanceSheetCalculation:
    c = max(0.0, float(cash))
    m = max(0.0, float(machinery))
    inv = max(0.0, float(inventory))
    rec = max(0.0, float(receivables))
    liab = max(0.0, float(liabilities))

    total_assets = c + m + inv + rec
    equity = total_assets - liab
    debt_equity = (liab / equity) if equity > 0 else 0.0
    equity_ratio = (equity / total_assets * 100.0) if total_assets > 0 else 0.0

    return BalanceSheetCalculation(
        cash=round(c, 2),
        machinery_assets=round(m, 2),
        inventory=round(inv, 2),
        receivables=round(rec, 2),
        total_assets=round(total_assets, 2),
        liabilities=round(liab, 2),
        equity=round(equity, 2),
        debt_equity_ratio=round(debt_equity, 2),
        equity_ratio_pct=round(equity_ratio, 2)
    )


def calculate_share_valuation(
    share_price: float,
    shares_outstanding: float,
    shares_owned: float,
    book_equity: float
) -> ShareValuationCalculation:
    p = max(0.01, float(share_price))
    n = max(1.0, float(shares_outstanding))
    owned = max(0.0, float(shares_owned))
    b_eq = float(book_equity)

    ownership_pct = (owned / n) * 100.0 if n > 0 else 0.0
    market_cap = p * n
    bvps = b_eq / n if n > 0 else 0.0
    pb_ratio = market_cap / b_eq if b_eq > 0 else 0.0

    return ShareValuationCalculation(
        share_price=round(p, 2),
        shares_outstanding=round(n, 2),
        shares_owned=round(owned, 2),
        ownership_pct=round(ownership_pct, 4),
        market_cap=round(market_cap, 2),
        book_equity=round(b_eq, 2),
        book_value_per_share=round(bvps, 2),
        price_to_book_ratio=round(pb_ratio, 2)
    )


def calculate_microstructure(
    bid_price: float,
    ask_price: float
) -> MicrostructureCalculation:
    bid = max(0.0, float(bid_price))
    ask = max(bid, float(ask_price))

    spread = ask - bid
    mid_price = (bid + ask) / 2.0
    spread_pct = (spread / mid_price * 100.0) if mid_price > 0 else 0.0
    spread_bps = spread_pct * 100.0

    return MicrostructureCalculation(
        bid_price=round(bid, 2),
        ask_price=round(ask, 2),
        spread=round(spread, 2),
        mid_price=round(mid_price, 2),
        spread_pct=round(spread_pct, 4),
        spread_bps=round(spread_bps, 2)
    )


def print_financial_report(
    bs: BalanceSheetCalculation,
    val: ShareValuationCalculation,
    micro: MicrostructureCalculation
):
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

    print("\n" + "=" * 68)
    print(f"{BOLD}{CYAN}  LEVEL 0 — FINANCIAL VOCABULARY & MICROSTRUCTURE FOUNDATION{RESET}")
    print("=" * 68)

    print(f"\n{BOLD}1. ACCOUNTING BALANCE SHEET & CAPITAL STRUCTURE{RESET}")
    print(f"  • Total Assets       : ₹{bs.total_assets:,.2f} (Cash: ₹{bs.cash:,.2f}, Plant/Equip: ₹{bs.machinery_assets:,.2f})")
    print(f"  • Total Liabilities  : ₹{bs.liabilities:,.2f}")
    print(f"  • Equity (Net Worth) : {BOLD}{GREEN}₹{bs.equity:,.2f}{RESET} ({bs.equity_ratio_pct:.1f}% Equity Ratio)")
    print(f"  • Debt-to-Equity     : {BOLD}{YELLOW}{bs.debt_equity_ratio:.2f}x{RESET}")

    print(f"\n{BOLD}2. EQUITY VALUATION & MARKET CAPITALIZATION{RESET}")
    print(f"  • Shares Outstanding : {val.shares_outstanding:,.0f} shares")
    print(f"  • Ownership ({val.shares_owned:,.0f} sh): {BOLD}{CYAN}{val.ownership_pct:.4f}%{RESET}")
    print(f"  • Book Value / Share : ₹{val.book_value_per_share:.2f} / share (Book Equity: ₹{val.book_equity:,.2f})")
    print(f"  • Share Price        : ₹{val.share_price:.2f}")
    print(f"  • Market Cap         : {BOLD}{GREEN}₹{val.market_cap:,.2f}{RESET} (P/B Ratio: {val.price_to_book_ratio:.2f}x)")

    print(f"\n{BOLD}3. MARKET MICROSTRUCTURE & ORDER BOOK MECHANICS{RESET}")
    print(f"  • Bid Price (Buyers) : ₹{micro.bid_price:.2f}")
    print(f"  • Ask Price (Sellers): ₹{micro.ask_price:.2f}")
    print(f"  • Mid-Price          : {BOLD}{CYAN}₹{micro.mid_price:.2f}{RESET}")
    print(f"  • Bid-Ask Spread     : {BOLD}{YELLOW}₹{micro.spread:.2f}{RESET} ({micro.spread_pct:.2f}% / {micro.spread_bps:.0f} bps)")

    print(f"\n{BOLD}4. QUANTITATIVE TRADING SYSTEM HIERARCHY{RESET}")
    print("  • Level 0: Vocabulary  ➔ Money, Capital, Assets, Liabilities, Shares")
    print("  • Level 1: Accounting  ➔ Revenue, Expenses, Profit, Cash Flow")
    print("  • Level 2: Corporate   ➔ Debt, Equity, Leverage, Valuation")
    print("  • Level 3: Markets     ➔ Order Book, Bid/Ask Spread, Liquidity")
    print("  • Level 4: Quant       ➔ Returns, Probability, Volatility, Correlation")
    print("  • Level 5: Derivatives ➔ Futures, Options, Payoffs, Greeks")
    print("  • Level 6: Microstructure➔ IV Surface, Order Flow, GEX/DEX, Dealer Delta")
    print("  • Level 7: Trading Engine➔ Feature Eng, Conditional Dist, Execution & Risk")
    print("=" * 68 + "\n")


if __name__ == "__main__":
    if len(sys.argv) >= 6:
        try:
            c = float(sys.argv[1])
            m = float(sys.argv[2])
            inv = float(sys.argv[3])
            rec = float(sys.argv[4])
            liab = float(sys.argv[5])
            bs_res = calculate_balance_sheet(c, m, inv, rec, liab)
            val_res = calculate_share_valuation(100.0, 1000000.0, 10000.0, bs_res.equity)
            micro_res = calculate_microstructure(100.0, 100.10)
            print_financial_report(bs_res, val_res, micro_res)
        except Exception as e:
            print(f"Error parsing CLI arguments: {e}")
            sys.exit(1)
    else:
        # Default ABC Ltd Case Study Demo
        bs_demo = calculate_balance_sheet(cash=200000000.0, machinery=500000000.0, inventory=100000000.0, receivables=200000000.0, liabilities=400000000.0)
        val_demo = calculate_share_valuation(share_price=25.0, shares_outstanding=60000000.0, shares_owned=600000.0, book_equity=bs_demo.equity)
        micro_demo = calculate_microstructure(bid_price=100.00, ask_price=100.10)
        print_financial_report(bs_demo, val_demo, micro_demo)
