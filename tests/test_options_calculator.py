"""
Automated Unit & Regression Tests for Options Engine & Statutory Calculations
Verifies Upstox 2026 Statutory Rules, SEBI Regulations & NSE/BSE Tick Size Math.
"""

import unittest
import sys
import os

# Add scripts directory to path to test Python standalone scripts as well
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scripts')))
from options_brokerage_calculator import  calculate_option_target, round_to_tick

class TestOptionsStatutoryRules(unittest.TestCase):

    def test_brokerage_is_flat_sixty_roundtrip(self):
        """Brokerage must be flat ₹30 on Buy + ₹30 on Sell = ₹60 roundtrip."""
        trade = calculate_option_target(buy_price=100.0, target_profit_pct=0.5, num_lots=1)
        self.assertEqual(trade.brokerage, 60.0)

    def test_stt_only_on_sell_turnover(self):
        """STT must be charged on sell-side turnover at statutory rate (rounded to 2 decimal places)."""
        trade = calculate_option_target(buy_price=100.0, target_profit_pct=0.5, num_lots=1)
        expected_stt = round(0.0015 * trade.sell_turnover, 2)
        self.assertAlmostEqual(trade.stt, expected_stt, places=2)

    def test_stamp_duty_only_on_buy_turnover(self):
        """Stamp Duty must be 0.003% on buy-side turnover (rounded to 2 decimal places)."""
        trade = calculate_option_target(buy_price=100.0, target_profit_pct=0.5, num_lots=1)
        expected_stamp = round(0.00003 * trade.buy_turnover, 2)
        self.assertAlmostEqual(trade.stamp_duty, expected_stamp, places=2)

    def test_gst_is_eighteen_percent_on_services(self):
        """GST must be 18% on (Brokerage + Exchange Charges + SEBI Charges)."""
        trade = calculate_option_target(buy_price=100.0, target_profit_pct=0.5, num_lots=1)
        expected_gst = round(0.18 * (trade.brokerage + trade.exchange_charges + trade.sebi_charges), 2)
        self.assertAlmostEqual(trade.gst, expected_gst, places=2)

    def test_round_to_tick_ceiling(self):
        """Tick rounding in ceil mode must snap up to nearest 0.05 increment."""
        self.assertEqual(round_to_tick(102.31, 0.05, 'ceil'), 102.35)
        self.assertEqual(round_to_tick(102.30, 0.05, 'ceil'), 102.30)
        self.assertEqual(round_to_tick(102.300001, 0.05, 'ceil'), 102.35)

    def test_target_sell_price_guarantees_net_profit(self):
        """Analytical target sell price solver must guarantee realized net profit >= target."""
        trade = calculate_option_target(
            buy_price=100.0,
            target_profit_pct=0.5,
            slippage=0.50,
            index_name="NIFTY",
            lot_size=65,
            num_lots=1,
            include_next_trade_fee=True
        )

        # Verify tick multiple on sell price
        remainder = round((trade.required_target_sell_price * 100) % 5, 2)
        self.assertIn(remainder, [0.0, 5.0])

        # Verify net PnL realized with tick price
        self.assertGreater(trade.net_pnl_realized, 0.0)
        self.assertGreaterEqual(trade.actual_net_roi_pct, 0.5)

if __name__ == '__main__':
    unittest.main()
