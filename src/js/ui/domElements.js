/**
 * Centralized DOM Element Registry
 * Provides cached DOM selectors for high-performance zero-overhead access.
 */

export function getDOMElements() {
    return {
        // Navigation Tabs & Views
        tabBtnOptions: document.getElementById('tab-btn-options'),
        tabBtnCompounding: document.getElementById('tab-btn-compounding'),
        viewOptions: document.getElementById('view-options'),
        viewCompounding: document.getElementById('view-compounding'),
        headerSubtitle: document.getElementById('header-subtitle'),
        resetBtn: document.getElementById('reset-btn'),

        // Options Engine Inputs
        numLotsInput: document.getElementById('num-lots'),
        buyQtyInput: document.getElementById('buy-qty'),
        buyPriceInput: document.getElementById('buy-price'),
        slippageInput: document.getElementById('slippage'),
        targetProfitPctInput: document.getElementById('target-profit-pct'),
        includeNextFeeToggle: document.getElementById('include-next-fee-toggle'),
        lblToggleTitle: document.getElementById('lbl-toggle-title'),
        lotChips: document.querySelectorAll('.chip:not(.comp-deploy-chip)'),
        pctChips: document.querySelectorAll('.pct-chip'),

        // Options Engine Outputs
        lblLotMultiple: document.getElementById('lbl-lot-multiple'),
        lblRealizedBuy: document.getElementById('lbl-realized-buy'),
        reqSellVal: document.getElementById('req-sell-val'),
        reqSellSub: document.getElementById('req-sell-sub'),
        realMoveVal: document.getElementById('real-move-val'),
        realMoveSub: document.getElementById('real-move-sub'),
        netPnlCard: document.getElementById('net-pnl-card'),
        netPnlVal: document.getElementById('net-pnl-val'),
        netRoiVal: document.getElementById('net-roi-val'),
        breakevenSellVal: document.getElementById('breakeven-sell-val'),
        breakevenSub: document.getElementById('breakeven-sub'),
        totalDeductionsVal: document.getElementById('total-deductions-val'),
        deductionsSub: document.getElementById('deductions-sub'),
        nextTradeCostVal: document.getElementById('next-trade-cost-val'),
        nextCapitalVal: document.getElementById('next-capital-val'),
        lblNextEntryFee: document.getElementById('lbl-next-entry-fee'),
        lblCapitalPreserved: document.getElementById('lbl-capital-preserved'),

        // Compounding Engine Inputs
        compInitialCapInput: document.getElementById('comp-initial-cap'),
        compFinalCapInput: document.getElementById('comp-final-cap'),
        compReturnPctInput: document.getElementById('comp-return-pct'),
        compDeployPctInput: document.getElementById('comp-deploy-pct'),
        compTradingDaysInput: document.getElementById('comp-trading-days'),
        compYearsInput: document.getElementById('comp-years'),
        compEffectiveRate: document.getElementById('comp-effective-rate'),
        compTotalDays: document.getElementById('comp-total-days'),
        compDeployChips: document.querySelectorAll('.comp-deploy-chip'),

        // Compounding Engine Outputs
        compHeroTrades: document.getElementById('comp-hero-trades'),
        compHeroSub: document.getElementById('comp-hero-sub'),
        compValPerDay: document.getElementById('comp-val-per-day'),
        compSubPerDay: document.getElementById('comp-sub-per-day'),
        compValPerMonth: document.getElementById('comp-val-per-month'),
        compSubPerMonth: document.getElementById('comp-sub-per-month'),
        compValMultiplier: document.getElementById('comp-val-multiplier'),
        compSubMultiplier: document.getElementById('comp-sub-multiplier'),
        compValNetProfit: document.getElementById('comp-val-net-profit'),
        compSubNetProfit: document.getElementById('comp-sub-net-profit'),
        compSensitivitySummary: document.getElementById('comp-sensitivity-summary'),
        compSensitivityContainer: document.getElementById('comp-sensitivity-container'),

        // Tariff Modal Elements
        tariffTrigger: document.getElementById('tariff-info-trigger'),
        tariffModal: document.getElementById('tariff-modal'),
        modalCloseBtn: document.getElementById('modal-close-btn')
    };
}
