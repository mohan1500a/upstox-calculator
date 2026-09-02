#!/usr/bin/env python3
"""
Upstox Options Target Sell Price & Brokerage Calculator (2026 Engine)
Calculates exact Target Limit Sell Price, Real Price Move, Statutory Taxes,
Execution Slippages, and Dynamic Next Trade Capital Carryover.

Author: Antigravity AI Pair Programmer
Version: 5.0 (Pristine Ground-Up Rewrite)
"""

import sys
from dataclasses import dataclass

MAX_LOT_CAPS = {
    "NIFTY": {"lot_size": 65, "max_lots": 27, "max_qty": 1755},
    "BANKNIFTY": {"lot_size": 30, "max_lots": 20, "max_qty": 600},
    "SENSEX": {"lot_size": 20, "max_lots": 50, "max_qty": 1000}
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


def calculate_option_target(
    quantity: int,
    buy_price: float,
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
    c_sell = 0.001 + (1.18 * 0.000496) # 0.00158528
    fixed_k_buy = (40.0 * 1.18) + (0.00003 * buy_turnover) + (1.18 * 0.000496 * buy_turnover)

    denominator = qty * (1.0 - c_sell)
    r_sell = (target_net_pnl + buy_turnover + fixed_k_buy) / denominator if denominator > 0 else r_buy
    p_sell = r_sell + s_slip

    sell_turnover = r_sell * qty
    total_turnover = buy_turnover + sell_turnover

    brokerage = 40.0 # ₹20 buy + ₹20 sell
    stt = 0.001 * sell_turnover # 0.1% on sell premium
    exchange_charges = 0.000495 * total_turnover # 0.0495%
    sebi_charges = 0.000001 * total_turnover # 0.0001%
    stamp_duty = 0.00003 * buy_turnover # 0.003% buy side
    gst = 0.18 * (brokerage + exchange_charges + sebi_charges) # 18% GST

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


def print_trade_report(calc: OptionTradeCalculation):
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

    pnl_color = GREEN if calc.net_pnl_realized >= 0 else RED
    pnl_sign = "+" if calc.net_pnl_realized > 0 else ""

    print("\n" + "=" * 65)
    print(f"{BOLD}{CYAN}  UPSTOX OPTIONS TARGET CALCULATOR (2026 ENGINE){RESET}")
    print("=" * 65)

    print(f"\n{BOLD}1. INPUT OVERVIEW{RESET}")
    print(f"  • Index & Lot Size    : {calc.index_name} ({calc.num_lots}/{calc.max_lots_allowed} Lots = {calc.quantity:,} units)")
    print(f"  • Target Buy Price    : ₹{calc.target_buy_price:.2f}  | Realized Buy (with +₹{calc.slippage:.2f} slip): ₹{calc.realized_buy_price:.2f}")
    print(f"  • Target Net ROI Goal : {BOLD}{YELLOW}+{calc.target_profit_pct:.2f}%{RESET}")
    print(f"  • Include Next Fee    : {BOLD}{calc.include_next_trade_fee}{RESET} (Dynamic Buy Fee: ₹{calc.dynamic_next_entry_fee:.2f})")

    print(f"\n{BOLD}2. PRIMARY OUTPUT ENGINE{RESET}")
    print(f"  • Required Sell Price : {BOLD}{CYAN}₹{calc.required_target_sell_price:.2f}{RESET} (Realized Sell: ₹{calc.realized_sell_price:.2f})")
    print(f"  • Real Move Needed    : {BOLD}{GREEN}+{calc.points_move_needed:.2f} pts{RESET} (+{calc.pct_move_needed:.2f}% premium move)")
    print(f"  • Actual Net Profit   : {BOLD}{pnl_color}{pnl_sign}₹{calc.net_pnl_realized:,.2f}{RESET} ({pnl_color}{calc.actual_net_roi_pct:.2f}% Net ROI{RESET})")
    print(f"  • Breakeven Sell Price: ₹{calc.breakeven_sell_price:.2f} (+{calc.total_breakeven_pts:.2f} pts move needed)")

    print(f"\n{BOLD}3. NEXT TRADE DYNAMIC CARRYOVER{RESET}")
    print(f"  • Dynamic Next Entry Cost : ₹{calc.next_trade_entry_cost:.2f}")
    print(f"  • Net Reusable Capital    : {GREEN}₹{calc.next_trade_net_capital:,.2f}{RESET}")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    if len(sys.argv) >= 4:
        try:
            qty = int(sys.argv[1])
            buy = float(sys.argv[2])
            target_pct = float(sys.argv[3])
            slip = float(sys.argv[4]) if len(sys.argv) >= 5 else 0.50
            inc_fee = sys.argv[5].lower() in ['true', '1', 'yes'] if len(sys.argv) >= 6 else True
            res = calculate_option_target(qty, buy, target_pct, slip, include_next_trade_fee=inc_fee)
            print_trade_report(res)
        except Exception as e:
            print(f"CLI Error: {e}")
            sys.exit(1)
    else:
        demo = calculate_option_target(quantity=65, buy_price=100.0, target_profit_pct=0.0, slippage=0.50, include_next_trade_fee=True)
        print_trade_report(demo)
