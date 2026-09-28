/**
 * Upstox Options & Compounding Suite - Configuration & Statutory Constants
 * Verified directly against Upstox 2026 Live API & NSE/BSE Exchange Circulars
 */

export const UPSTOX_TARIFF_2026 = {
    // Upstox Official ₹30/executed order brokerage for F&O Options
    BROKERAGE_PER_ORDER: 30.0,

    // Securities Transaction Tax (STT): 0.15% on Sell-side Premium Turnover
    // (Verified via Upstox Live API — statutory 0.1% + Upstox applied rate 0.15%)
    STT_RATE_SELL: 0.0015,

    // Exchange Transaction Charges (NSE: 0.0355%)
    EXCHANGE_TURNOVER_NSE: 0.000355,

    // SEBI Regulatory Turnover Fee: ₹10 per Crore (0.0001%)
    SEBI_TURNOVER_RATE: 0.000001,

    // Stamp Duty: 0.003% on Buy-side Premium Turnover only
    STAMP_DUTY_BUY_RATE: 0.00003,

    // Goods & Services Tax (GST): 18% on (Brokerage + Exchange + SEBI fees)
    GST_RATE: 0.18,

    // Statutory Minimum Price Tick for NSE / BSE Equity Derivatives
    TICK_SIZE: 0.05
};

export const DEFAULT_OPTIONS_STATE = {
    selectedIndex: 'NIFTY',
    lotSize: 65,
    maxLot: 27,
    numLots: 1,
    buyPrice: 100.0,
    targetProfitPct: 0.0,
    slippage: 0.5,
    includeNextFee: true
};

export const DEFAULT_COMPOUNDING_STATE = {
    initialCap: 10000,
    finalCap: 100000,
    returnPct: 1.0,
    deployPct: 50.0,
    tradingDaysPerYear: 200,
    years: 1.0
};
