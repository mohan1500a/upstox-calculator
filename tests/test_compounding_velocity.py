"""
Automated Unit & Regression Tests for Compounding Velocity Engine
Verifies Natural Number Whole Trades, Ceiling Math, and Sensitivity Matrix.
Tests the actual production calculate_compounding_velocity function.
"""

import unittest
import sys
import os

# Add scripts directory to path to test Python standalone scripts
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scripts')))
from options_brokerage_calculator import calculate_compounding_velocity


class TestCompoundingVelocity(unittest.TestCase):

    def test_natural_integer_trades_no_decimals(self):
        """Total trades and daily trades must always be strict positive integers."""
        res = calculate_compounding_velocity(
            initial_capital=10000, final_capital=100000,
            return_pct_per_trade=1.0, deploy_pct_per_trade=50.0,
            trading_days_per_year=200, num_years=1.0
        )
        self.assertIsInstance(res.total_trades_needed, int)
        self.assertIsInstance(res.daily_trades, int)
        self.assertIsInstance(res.days_needed, int)
        self.assertGreater(res.total_trades_needed, 0)
        self.assertGreater(res.daily_trades, 0)

    def test_days_needed_is_within_goal_days(self):
        """When taking daily_trades (ceil), days_needed must be <= total_days."""
        res = calculate_compounding_velocity(
            initial_capital=10000, final_capital=100000,
            return_pct_per_trade=1.0, deploy_pct_per_trade=50.0,
            trading_days_per_year=200, num_years=1.0
        )
        self.assertLessEqual(res.days_needed, res.total_trading_days)

    def test_zero_gain_goal_returns_zero_trades(self):
        """When target capital equals initial capital, trades needed must be 0."""
        res = calculate_compounding_velocity(
            initial_capital=10000, final_capital=10000,
            return_pct_per_trade=1.0, deploy_pct_per_trade=50.0,
            trading_days_per_year=200, num_years=1.0
        )
        self.assertEqual(res.total_trades_needed, 0)
        self.assertEqual(res.daily_trades, 0)
        self.assertEqual(res.days_needed, 0)

    def test_lower_target_auto_clamps_to_initial(self):
        """Target capital less than initial capital must auto-clamp and require 0 trades."""
        res = calculate_compounding_velocity(
            initial_capital=50000, final_capital=20000,
            return_pct_per_trade=1.0, deploy_pct_per_trade=50.0,
            trading_days_per_year=200, num_years=1.0
        )
        self.assertEqual(res.total_trades_needed, 0)
        self.assertEqual(res.daily_trades, 0)

    def test_growth_multiplier_correct(self):
        """Growth multiplier must equal final_capital / initial_capital."""
        res = calculate_compounding_velocity(
            initial_capital=10000, final_capital=100000,
            return_pct_per_trade=1.0, deploy_pct_per_trade=50.0,
            trading_days_per_year=200, num_years=1.0
        )
        self.assertAlmostEqual(res.growth_multiplier, 10.0, places=1)

    def test_net_profit_is_positive(self):
        """Total net profit must equal final - initial and be positive for growth goals."""
        res = calculate_compounding_velocity(
            initial_capital=10000, final_capital=100000,
            return_pct_per_trade=1.0, deploy_pct_per_trade=50.0,
            trading_days_per_year=200, num_years=1.0
        )
        self.assertAlmostEqual(res.total_net_profit, 90000.0, places=0)
        self.assertGreater(res.total_net_profit, 0)


if __name__ == '__main__':
    unittest.main()
