#!/usr/bin/env python3
"""
Upstox Options Target Sell Price & Compounding Velocity Quantitative Suite (2026 Engine)

Calculates:
1. Upstox Options Target Sell Price, Statutory Taxes, Slippage, and Re-entry Capital.
2. Compounding Velocity, Required Trades/Day, Trades/Month, and Growth Multipliers.

Author: Antigravity AI Pair Programmer
Version: 31.0
"""

import sys
import math
from dataclasses import dataclass
from typing import Dict, Any

MAX_LOT_CAPS = {
    "NIFTY": {"lot_size": 65, "max_lots": 27, "max_qty": 1755},
    "BANKNIFTY": {"lot_size": 30, "max_lots": 20, "max_qty": 600},
    "FINNIFTY": {"lot_size": 65, "max_lots": 27, "max_qty": 1755},
    "MIDCPNIFTY": {"lot_size": 120, "max_lots": 24, "max_qty": 2880},
    "SENSEX": {"lot_size": 20, "max_lots": 50, "max_qty": 1000},
    "BANKEX": {"lot_size": 30, "max_lots": 50, "max_qty": 1500}
}


@dataclass(frozen=True)
class OptionTradeCalculation:
    index_name: str
    lot_size: int
    num_lots: int
    max_lots_allowed: int
    quantity: int
    target_buy_price: float
    slippage: float
    target_profit_pct: float
    include_next_trade_fee: bool
    
    realized_buy_price: float
    realized_sell_price: float
    required_target_sell_price: float
    
    buy_turnover: float
    sell_turnover: float
    total_turnover: float
    
    brokerage: float
    stt: float
    exchange_charges: float
    sebi_charges: float
    stamp_duty: float
    gst: float
    total_taxes_and_charges: float
    
    total_slippage_cost: float
    slippage_points_total: float
    
    gross_pnl_realized: float
    net_pnl_realized: float
    actual_net_roi_pct: float
    
    points_move_needed: float
    pct_move_needed: float
    charges_breakeven_pts: float
    total_breakeven_pts: float
    breakeven_sell_price: float
    
    dynamic_next_entry_fee: float
    next_trade_entry_cost: float
    next_trade_net_capital: float


@dataclass(frozen=True)
class CompoundingVelocityCalculation:
    initial_capital: float
    final_capital: float
    return_pct_per_trade: float
    deploy_pct_per_trade: float
    trading_days_per_year: int
    num_years: float
    
    effective_rate_per_trade: float
    total_trades_needed: int
    exact_trades_needed: float
    total_trading_days: float
    trades_per_day: float
    trades_per_month: float
    trades_per_week: float
    total_net_profit: float
    growth_multiplier: float


def calculate_option_target(
    quantity: int = 65,
    buy_price: float = 100.0,
    target_profit_pct: float = 0.0,
    slippage: float = 0.50,
    index_name: str = "NIFTY",
    lot_size: int = 65,
    num_lots: int = 1,
    include_next_trade_fee: bool = True
) -> OptionTradeCalculation:
    index_key = index_name.upper()
    max_lots = MAX_LOT_CAPS.get(index_key, {}).get("max_lots", 27)
    
    clamped_lots = min(max_lots, max(1, int(num_lots)))
    qty = clamped_lots * lot_size

    p_buy = max(0.0, float(buy_price))
    s_slip = max(0.0, float(slippage))
    t_pct = max(0.0, float(target_profit_pct))

    r_buy = p_buy + s_slip
    buy_turnover = r_buy * qty

    # Dynamic Next Trade Buy Entry Fee:
    next_brok = 20.0
    next_ex = 0.000495 * buy_turnover
    next_sebi = 0.000001 * buy_turnover
    next_stamp = 0.00003 * buy_turnover
    next_gst = 0.18 * (next_brok + next_ex + next_sebi)
    dynamic_next_entry_fee = next_brok + next_ex + next_sebi + next_stamp + next_gst

    target_net_pnl = (t_pct / 100.0) * buy_turnover
    if include_next_trade_fee:
        target_net_pnl += dynamic_next_entry_fee

    # Upstox Linear Tax Coefficients (Options)
    c_sell = 0.001 + (1.18 * 0.000496)
    fixed_k_buy = (40.0 * 1.18) + (0.00003 * buy_turnover) + (1.18 * 0.000496 * buy_turnover)

    denominator = qty * (1.0 - c_sell)
    r_sell = (target_net_pnl + buy_turnover + fixed_k_buy) / denominator if denominator > 0 else r_buy
    p_sell = r_sell + s_slip

    sell_turnover = r_sell * qty
    total_turnover = buy_turnover + sell_turnover

    brokerage = 40.0
    stt = 0.001 * sell_turnover
    exchange_charges = 0.000495 * total_turnover
    sebi_charges = 0.000001 * total_turnover
    stamp_duty = 0.00003 * buy_turnover
    gst = 0.18 * (brokerage + exchange_charges + sebi_charges)

    total_taxes = brokerage + stt + exchange_charges + sebi_charges + stamp_duty + gst
    total_slippage_pts = s_slip * 2
    total_slippage_cost = total_slippage_pts * qty

    gross_pnl_realized = (r_sell - r_buy) * qty
    net_pnl_realized = gross_pnl_realized - total_taxes
    actual_net_roi_pct = (net_pnl_realized / buy_turnover) * 100.0 if buy_turnover > 0 else 0.0

    points_move_needed = p_sell - p_buy
    pct_move_needed = (points_move_needed / p_buy) * 100.0 if p_buy > 0 else 0.0
    charges_breakeven_pts = total_taxes / qty
    total_breakeven_pts = charges_breakeven_pts + total_slippage_pts
    breakeven_sell_price = p_buy + total_breakeven_pts

    next_proceeds = max(0.0, sell_turnover - total_taxes)
    actual_next_stamp = 0.00003 * next_proceeds
    actual_next_entry_cost = 20.0 + (0.18 * 20.0) + (1.18 * 0.000496 * next_proceeds) + actual_next_stamp
    next_trade_net_capital = max(0.0, next_proceeds - actual_next_entry_cost)

    return OptionTradeCalculation(
        index_name=index_name,
        lot_size=lot_size,
        num_lots=clamped_lots,
        max_lots_allowed=max_lots,
        quantity=qty,
        target_buy_price=round(p_buy, 2),
        slippage=round(s_slip, 2),
        target_profit_pct=round(t_pct, 2),
        include_next_trade_fee=include_next_trade_fee,
        realized_buy_price=round(r_buy, 2),
        realized_sell_price=round(r_sell, 2),
        required_target_sell_price=round(p_sell, 2),
        buy_turnover=round(buy_turnover, 2),
        sell_turnover=round(sell_turnover, 2),
        total_turnover=round(total_turnover, 2),
        brokerage=round(brokerage, 2),
        stt=round(stt, 2),
        exchange_charges=round(exchange_charges, 2),
        sebi_charges=round(sebi_charges, 2),
        stamp_duty=round(stamp_duty, 2),
        gst=round(gst, 2),
        total_taxes_and_charges=round(total_taxes, 2),
        total_slippage_cost=round(total_slippage_cost, 2),
        slippage_points_total=round(total_slippage_pts, 2),
        gross_pnl_realized=round(gross_pnl_realized, 2),
        net_pnl_realized=round(net_pnl_realized, 2),
        actual_net_roi_pct=round(actual_net_roi_pct, 2),
        points_move_needed=round(points_move_needed, 2),
        pct_move_needed=round(pct_move_needed, 2),
        charges_breakeven_pts=round(charges_breakeven_pts, 2),
        total_breakeven_pts=round(total_breakeven_pts, 2),
        breakeven_sell_price=round(breakeven_sell_price, 2),
        dynamic_next_entry_fee=round(dynamic_next_entry_fee, 2),
        next_trade_entry_cost=round(actual_next_entry_cost, 2),
        next_trade_net_capital=round(next_trade_net_capital, 2)
    )


def calculate_compounding_velocity(
    initial_capital: float = 10000.0,
    final_capital: float = 100000.0,
    return_pct_per_trade: float = 1.0,
    deploy_pct_per_trade: float = 50.0,
    trading_days_per_year: int = 200,
    num_years: float = 1.0
) -> CompoundingVelocityCalculation:
    c_init = max(1.0, float(initial_capital))
    c_final = max(c_init, float(final_capital))
    r_pct = max(0.001, float(return_pct_per_trade))
    d_pct = max(0.001, min(100.0, float(deploy_pct_per_trade)))
    days_year = max(1, min(240, int(trading_days_per_year)))
    years = max(0.01, float(num_years))

    effective_rate = (d_pct / 100.0) * (r_pct / 100.0)
    exact_trades = math.log(c_final / c_init) / math.log(1.0 + effective_rate) if (effective_rate > 0 and c_final > c_init) else 0.0

    total_trades = math.ceil(exact_trades)
    total_days = days_year * years

    trades_per_day = exact_trades / total_days if total_days > 0 else 0.0
    trades_per_month = exact_trades / (years * 12.0) if years > 0 else 0.0
    trades_per_week = exact_trades / (years * 52.0) if years > 0 else 0.0

    total_net_profit = c_final - c_init
    growth_multiplier = c_final / c_init

    return CompoundingVelocityCalculation(
        initial_capital=round(c_init, 2),
        final_capital=round(c_final, 2),
        return_pct_per_trade=round(r_pct, 2),
        deploy_pct_per_trade=round(d_pct, 2),
        trading_days_per_year=days_year,
        num_years=round(years, 2),
        effective_rate_per_trade=round(effective_rate * 100.0, 4),
        total_trades_needed=total_trades,
        exact_trades_needed=round(exact_trades, 2),
        total_trading_days=round(total_days, 1),
        trades_per_day=round(trades_per_day, 2),
        trades_per_month=round(trades_per_month, 2),
        trades_per_week=round(trades_per_week, 2),
        total_net_profit=round(total_net_profit, 2),
        growth_multiplier=round(growth_multiplier, 2)
    )


def print_suite_report(opt: OptionTradeCalculation, comp: CompoundingVelocityCalculation):
    BOLD = "\033[1m"
    GREEN = "\033[92m"
    CYAN = "\033[96m"
    YELLOW = "\033[93m"
    RESET = "\033[0m"

    print("\n" + "=" * 68)
    print(f"{BOLD}{CYAN}  UPSTOX QUANTITATIVE ENGINE SUITE (2026 OFFICIAL RULES){RESET}")
    print("=" * 68)

    print(f"\n{BOLD}1. OPTIONS TARGET SELL PRICE ENGINE{RESET}")
    print(f"  • Index & Quantity   : {opt.index_name} ({opt.num_lots}/{opt.max_lots_allowed} Lots = {opt.quantity} Qty)")
    print(f"  • Buy Price (Realized): ₹{opt.target_buy_price:.2f} (Realized +Slip: ₹{opt.realized_buy_price:.2f})")
    print(f"  • Target Limit Sell  : {BOLD}{GREEN}₹{opt.required_target_sell_price:.2f}{RESET} (Realized Sell: ₹{opt.realized_sell_price:.2f})")
    print(f"  • Real Move Needed   : {BOLD}{YELLOW}+{opt.points_move_needed:.2f} pts (+{opt.pct_move_needed:.2f}%){RESET}")
    print(f"  • Net Realized Profit: ₹{opt.net_pnl_realized:,.2f} ({opt.actual_net_roi_pct:.2f}% Net ROI)")
    print(f"  • Total Taxes & Slip : ₹{opt.total_taxes_and_charges:.2f} Tax | ₹{opt.total_slippage_cost:.2f} Slip")
    print(f"  • Next Trade Capital : ₹{opt.next_trade_net_capital:,.2f} (Next Entry Cost: ₹{opt.next_trade_entry_cost:.2f})")

    print(f"\n{BOLD}2. COMPOUNDING VELOCITY 200-DAY GROWTH ENGINE{RESET}")
    print(f"  • Capital Growth     : ₹{comp.initial_capital:,.2f} ➔ ₹{comp.final_capital:,.2f} ({comp.growth_multiplier:.2f}x Multiplier)")
    print(f"  • Profit / Deploy %  : +{comp.return_pct_per_trade:.2f}% Return @ {comp.deploy_pct_per_trade:.1f}% Capital Deployed")
    print(f"  • Effective Rate     : {comp.effective_rate_per_trade:.4f}% / trade")
    print(f"  • Total Trades Needed: {BOLD}{GREEN}{comp.total_trades_needed} trades{RESET} (exact: {comp.exact_trades_needed:.2f})")
    print(f"  • Required Velocity  : {BOLD}{CYAN}{comp.trades_per_day:.2f} trades/day{RESET} | {comp.trades_per_month:.2f} trades/month")
    print("=" * 68 + "\n")


if __name__ == "__main__":
    opt_res = calculate_option_target()
    comp_res = calculate_compounding_velocity()
    print_suite_report(opt_res, comp_res)
