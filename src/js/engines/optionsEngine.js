/**
 * Options Engine: Exact Analytical Solver for Target Sell Price & Net P&L
 * Based on official Upstox statutory rates & NSE/BSE options regulations.
 */

import { UPSTOX_TARIFF_2026 } from '../config/constants.js';
import { roundToTick } from '../formatters/metricFormatters.js';

export function computeOptionsTrade(params) {
    const qty = Math.max(1, params.numLots * params.lotSize);
    const pBuy = Math.max(0.0, params.buyPrice);
    const slip = Math.max(0.0, params.slippage);
    const targetPct = Math.max(0.0, params.targetProfitPct);

    // Destructure statutory rates from single source of truth
    const BROK = UPSTOX_TARIFF_2026.BROKERAGE_PER_ORDER;
    const STT_SELL = UPSTOX_TARIFF_2026.STT_RATE_SELL;
    const EX_RATE = UPSTOX_TARIFF_2026.EXCHANGE_TURNOVER_NSE;
    const SEBI_RATE = UPSTOX_TARIFF_2026.SEBI_TURNOVER_RATE;
    const STAMP_RATE = UPSTOX_TARIFF_2026.STAMP_DUTY_BUY_RATE;
    const GST = UPSTOX_TARIFF_2026.GST_RATE;
    const TICK = UPSTOX_TARIFF_2026.TICK_SIZE;

    const roundtripBrok = BROK * 2; // ₹30 Buy + ₹30 Sell = ₹60

    const rBuy = pBuy + slip;
    const buyTurnover = rBuy * qty;

    // Dynamic Next Trade Buy Entry Fee (Official Upstox Verified Rates)
    const nextEx = EX_RATE * buyTurnover;
    const nextSebi = SEBI_RATE * buyTurnover;
    const nextStamp = STAMP_RATE * buyTurnover;
    const nextGst = GST * (BROK + nextEx + nextSebi);
    const dynamicNextEntryFee = BROK + nextEx + nextSebi + nextStamp + nextGst;

    let targetNetPnl = (targetPct / 100.0) * buyTurnover;
    if (params.includeNextFee) {
        targetNetPnl += dynamicNextEntryFee;
    }

    // Upstox Official Options Linear Coefficients
    const feeRate = EX_RATE + SEBI_RATE;
    const cSell = STT_SELL + ((1.0 + GST) * feeRate);
    const fixedKBuy = (roundtripBrok * (1.0 + GST)) + (STAMP_RATE * buyTurnover) + ((1.0 + GST) * feeRate * buyTurnover);

    const denominator = qty * (1.0 - cSell);
    const rSellContinuous = denominator > 0 ? (targetNetPnl + buyTurnover + fixedKBuy) / denominator : rBuy;
    const pSellContinuous = rSellContinuous + slip;

    // Indian Exchange (NSE/BSE) Tick Size Rule: discrete ₹0.05 increments, ceiling up
    const pSell = roundToTick(pSellContinuous, TICK, 'ceil');
    const rSell = pSell - slip;

    const sellTurnover = rSell * qty;
    const totalTurnover = buyTurnover + sellTurnover;

    const brokerage = roundtripBrok;
    const stt = STT_SELL * sellTurnover;
    const exchangeCharges = EX_RATE * totalTurnover;
    const sebiCharges = SEBI_RATE * totalTurnover;
    const stampDuty = STAMP_RATE * buyTurnover;
    const gst = GST * (brokerage + exchangeCharges + sebiCharges);

    const totalTaxes = brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst;
    const totalSlipPts = slip * 2;
    const totalSlippageCost = totalSlipPts * qty;

    const grossPnlRealized = (rSell - rBuy) * qty;
    const netPnlRealized = grossPnlRealized - totalTaxes;
    const actualNetRoi = buyTurnover > 0 ? (netPnlRealized / buyTurnover) * 100.0 : 0.0;

    const realPtsMove = pSell - pBuy;
    const realPctMove = pBuy > 0 ? (realPtsMove / pBuy) * 100.0 : 0.0;

    // Breakeven Sell Price: snapped UP to nearest valid ₹0.05 tick
    const chargesBreakevenPts = totalTaxes / qty;
    const continuousBreakevenPrice = pBuy + chargesBreakevenPts + totalSlipPts;
    const breakevenSellPrice = roundToTick(continuousBreakevenPrice, TICK, 'ceil');
    const totalBreakevenPts = breakevenSellPrice - pBuy;

    const nextProceeds = Math.max(0.0, sellTurnover - totalTaxes);
    const actualNextStamp = STAMP_RATE * nextProceeds;
    const actualNextTradeEntryCost = BROK + (GST * BROK) + ((1.0 + GST) * feeRate * nextProceeds) + actualNextStamp;
    const nextTradeNetCapital = Math.max(0.0, nextProceeds - actualNextTradeEntryCost);

    return {
        qty,
        pBuy,
        rBuy,
        rSell,
        pSell,
        totalTaxes,
        totalSlippageCost,
        netPnlRealized,
        actualNetRoi,
        realPtsMove,
        realPctMove,
        totalBreakevenPts,
        breakevenSellPrice,
        dynamicNextEntryFee,
        actualNextTradeEntryCost,
        nextTradeNetCapital,
        buyTurnover,
        sellTurnover,
        totalTurnover,
        brokerage,
        stt,
        exchangeCharges,
        sebiCharges,
        stampDuty,
        gst
    };
}

