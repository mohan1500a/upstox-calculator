/**
 * Upstox Options Target Calculator Engine (Official 2026 Rules)
 * Includes Zero Input Protection & Fluid Editing Engine
 *
 * Author: Antigravity AI Pair Programmer
 * Version: 5.0 (Pristine Ground-Up Rewrite)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REGISTRY ---
    const DOM = {
        numLotsInput: document.getElementById('num-lots'),
        buyQtyInput: document.getElementById('buy-qty'),
        buyPriceInput: document.getElementById('buy-price'),
        slippageInput: document.getElementById('slippage'),
        targetProfitPctInput: document.getElementById('target-profit-pct'),
        includeNextFeeToggle: document.getElementById('include-next-fee-toggle'),
        lblToggleTitle: document.getElementById('lbl-toggle-title'),
        resetBtn: document.getElementById('reset-btn'),

        lotChips: document.querySelectorAll('.chip'),
        pctChips: document.querySelectorAll('.pct-chip'),

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

        // Modal Elements
        tariffTrigger: document.getElementById('tariff-info-trigger'),
        tariffModal: document.getElementById('tariff-modal'),
        modalCloseBtn: document.getElementById('modal-close-btn')
    };

    // --- STATE STORE (Default includeNextFee = true, targetProfitPct = 0.0) ---
    const state = {
        indexName: 'NIFTY',
        lotSize: 65,
        maxLot: 27,
        numLots: 1,
        buyPrice: 100.00,
        slippage: 0.50,
        targetProfitPct: 0.0,
        includeNextFee: true,
        isInternalUpdating: false
    };

    // Helper: Safe Currency Formatter
    function formatINR(val, includeSign = false) {
        if (isNaN(val) || !isFinite(val)) val = 0.0;
        const sign = includeSign && val > 0 ? '+' : '';
        return sign + '₹' + Math.abs(val).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // --- MATHEMATICAL CLOSED-FORM SOLVER (STRICT UPSTOX 2026 RULES) ---
    function computeTargetTrade(params) {
        const qty = Math.max(1, params.numLots * params.lotSize);
        const pBuy = Math.max(0.0, params.buyPrice);
        const slip = Math.max(0.0, params.slippage);
        const targetPct = Math.max(0.0, params.targetProfitPct);

        const rBuy = pBuy + slip;
        const buyTurnover = rBuy * qty;

        // Dynamic Next Trade Buy Entry Fee:
        const nextBrok = 20.0;
        const nextEx = 0.000495 * buyTurnover;
        const nextSebi = 0.000001 * buyTurnover;
        const nextStamp = 0.00003 * buyTurnover;
        const nextGst = 0.18 * (nextBrok + nextEx + nextSebi);
        const dynamicNextEntryFee = nextBrok + nextEx + nextSebi + nextStamp + nextGst;

        // Base Net Profit Goal
        let targetNetPnl = (targetPct / 100.0) * buyTurnover;

        // If Toggle ON: Add Dynamic Next Trade Fee into required Net PnL goal!
        if (params.includeNextFee) {
            targetNetPnl += dynamicNextEntryFee;
        }

        // Upstox Linear Tax Coefficients (Options)
        const cSell = 0.001 + (1.18 * 0.000496); // 0.00158528
        const fixedKBuy = (40.0 * 1.18) + (0.00003 * buyTurnover) + (1.18 * 0.000496 * buyTurnover);

        const denominator = qty * (1.0 - cSell);
        const rSell = denominator > 0 ? (targetNetPnl + buyTurnover + fixedKBuy) / denominator : rBuy;
        const pSell = rSell + slip;

        const sellTurnover = rSell * qty;
        const totalTurnover = buyTurnover + sellTurnover;

        // Upstox Options Taxes & Slippage Breakdown
        const brokerage = 40.0; // ₹20 buy + ₹20 sell
        const stt = 0.001 * sellTurnover; // 0.1% on sell premium
        const exchangeCharges = 0.000495 * totalTurnover; // 0.0495%
        const sebiCharges = 0.000001 * totalTurnover; // 0.0001%
        const stampDuty = 0.00003 * buyTurnover; // 0.003% buy side
        const gst = 0.18 * (brokerage + exchangeCharges + sebiCharges); // 18% GST

        const totalTaxes = brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst;
        const totalSlipPts = slip * 2;
        const totalSlippageCost = totalSlipPts * qty;

        const grossPnlRealized = (rSell - rBuy) * qty;
        const netPnlRealized = grossPnlRealized - totalTaxes;
        const actualNetRoi = buyTurnover > 0 ? (netPnlRealized / buyTurnover) * 100.0 : 0.0;

        const realPtsMove = pSell - pBuy;
        const realPctMove = pBuy > 0 ? (realPtsMove / pBuy) * 100.0 : 0.0;

        const chargesBreakevenPts = totalTaxes / qty;
        const totalBreakevenPts = chargesBreakevenPts + totalSlipPts;
        const breakevenSellPrice = pBuy + totalBreakevenPts;

        const nextProceeds = Math.max(0.0, sellTurnover - totalTaxes);
        const actualNextStamp = 0.00003 * nextProceeds;
        const actualNextTradeEntryCost = 20.0 + (0.18 * 20.0) + (1.18 * 0.000496 * nextProceeds) + actualNextStamp;
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
            nextTradeNetCapital
        };
    }

    // --- RENDER ENGINE ---
    function render() {
        const calc = computeTargetTrade(state);
        const maxQty = state.maxLot * state.lotSize;

        // Labels
        DOM.lblLotMultiple.textContent = `${state.numLots} Lot${state.numLots > 1 ? 's' : ''} = ${calc.qty} units (Max: ${state.maxLot} Lots / ${maxQty.toLocaleString('en-IN')})`;
        DOM.lblRealizedBuy.textContent = formatINR(calc.rBuy);

        // Dynamic Toggle Label
        if (DOM.lblToggleTitle) {
            DOM.lblToggleTitle.textContent = `Include Next Trade Fee (+${formatINR(calc.dynamicNextEntryFee)})`;
        }

        // Hero Card
        DOM.reqSellVal.textContent = formatINR(calc.pSell);
        const extraNote = state.includeNextFee ? ` (includes +${formatINR(calc.dynamicNextEntryFee)} next trade fee)` : '';
        DOM.reqSellSub.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> +${calc.realPtsMove.toFixed(2)} pts move needed (+${calc.realPctMove.toFixed(2)}% price move)${extraNote}`;

        // Sub Metrics
        DOM.realMoveVal.textContent = `+${calc.realPtsMove.toFixed(2)} pts`;
        DOM.realMoveSub.textContent = `▲ +${calc.realPctMove.toFixed(2)}% premium move`;

        DOM.netPnlVal.textContent = (calc.netPnlRealized >= 0 ? '+' : '-') + formatINR(calc.netPnlRealized);
        DOM.netRoiVal.textContent = (calc.actualNetRoi >= 0 ? '▲ +' : '▼ ') + calc.actualNetRoi.toFixed(2) + '% Net ROI';

        if (calc.netPnlRealized >= 0) {
            DOM.netPnlVal.className = 'card-val text-green';
            DOM.netRoiVal.className = 'trend-pill positive';
        } else {
            DOM.netPnlVal.className = 'card-val text-red';
            DOM.netRoiVal.className = 'trend-pill negative';
        }

        DOM.breakevenSellVal.textContent = formatINR(calc.breakevenSellPrice);
        DOM.breakevenSub.textContent = `+${calc.totalBreakevenPts.toFixed(2)} pts breakeven`;

        const totalDeductions = calc.totalTaxes + calc.totalSlippageCost;
        DOM.totalDeductionsVal.textContent = formatINR(totalDeductions);
        DOM.deductionsSub.textContent = `Taxes: ${formatINR(calc.totalTaxes)} + Slip: ${formatINR(calc.totalSlippageCost)}`;

        // Next Trade Capital Carryover
        DOM.nextTradeCostVal.textContent = `Next Entry Fee: ${formatINR(calc.actualNextTradeEntryCost)}`;
        DOM.nextCapitalVal.textContent = formatINR(calc.nextTradeNetCapital);

        // Dynamic Chip Glow Synchronization
        DOM.pctChips.forEach(chip => {
            const chipVal = parseFloat(chip.getAttribute('data-pct'));
            if (!isNaN(chipVal) && Math.abs(chipVal - state.targetProfitPct) < 0.001) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    // --- SYNCHRONIZER & INPUT PARSER ---
    function syncStateFromDOM(e) {
        if (state.isInternalUpdating) return;

        const targetId = e && e.target ? e.target.id : null;

        // Parse Lots
        let rawLots = DOM.numLotsInput.value.trim();
        let lots = parseInt(rawLots);
        if (isNaN(lots) || lots < 1) lots = 1;
        if (lots > state.maxLot) lots = state.maxLot;
        state.numLots = lots;

        // Parse Buy Price
        let rawBuyPrice = DOM.buyPriceInput.value.trim();
        let buyPrice = parseFloat(rawBuyPrice);
        if (isNaN(buyPrice) || buyPrice < 0) buyPrice = 0.0;
        state.buyPrice = buyPrice;

        // Parse Slippage
        let rawSlippage = DOM.slippageInput.value.trim();
        let slippage = parseFloat(rawSlippage);
        if (isNaN(slippage) || slippage < 0) slippage = 0.0;
        state.slippage = slippage;

        // Parse Target Profit %
        let rawTargetPct = DOM.targetProfitPctInput.value.trim();
        let targetPct = parseFloat(rawTargetPct);
        if (isNaN(targetPct) || targetPct < 0) targetPct = 0.0;
        state.targetProfitPct = targetPct;

        state.includeNextFee = DOM.includeNextFeeToggle ? DOM.includeNextFeeToggle.checked : true;

        state.isInternalUpdating = true;
        DOM.numLotsInput.max = state.maxLot;

        if (targetId !== 'num-lots' && targetId !== 'buy-qty') {
            DOM.numLotsInput.value = state.numLots;
            DOM.buyQtyInput.value = state.numLots * state.lotSize;
        } else if (targetId === 'num-lots') {
            DOM.buyQtyInput.value = state.numLots * state.lotSize;
        }

        DOM.buyQtyInput.max = state.maxLot * state.lotSize;
        DOM.buyQtyInput.step = state.lotSize;
        state.isInternalUpdating = false;

        render();
    }

    function syncStateFromQtyInput() {
        if (state.isInternalUpdating) return;
        state.isInternalUpdating = true;

        let qty = parseInt(DOM.buyQtyInput.value);
        if (isNaN(qty) || qty < 1) qty = state.lotSize;

        let lots = Math.max(1, Math.round(qty / state.lotSize));
        if (lots > state.maxLot) lots = state.maxLot;

        state.numLots = lots;
        DOM.numLotsInput.value = state.numLots;
        DOM.buyQtyInput.value = state.numLots * state.lotSize;

        state.isInternalUpdating = false;
        syncStateFromDOM();
    }

    // --- EVENT LISTENERS ---
    DOM.numLotsInput.addEventListener('input', syncStateFromDOM);
    DOM.numLotsInput.addEventListener('change', syncStateFromDOM);
    DOM.numLotsInput.addEventListener('blur', () => {
        let val = DOM.numLotsInput.value.trim();
        if (val === '' || isNaN(parseInt(val))) {
            DOM.numLotsInput.value = '1';
        } else {
            let lots = parseInt(val);
            if (lots < 1) lots = 1;
            if (lots > state.maxLot) lots = state.maxLot;
            DOM.numLotsInput.value = lots;
        }
        syncStateFromDOM();
    });

    DOM.buyQtyInput.addEventListener('input', syncStateFromDOM);
    DOM.buyQtyInput.addEventListener('change', syncStateFromQtyInput);

    DOM.buyPriceInput.addEventListener('input', syncStateFromDOM);
    DOM.buyPriceInput.addEventListener('change', syncStateFromDOM);
    DOM.buyPriceInput.addEventListener('blur', () => {
        let val = DOM.buyPriceInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) {
            DOM.buyPriceInput.value = '0.00';
        } else {
            DOM.buyPriceInput.value = Math.max(0, parseFloat(val)).toFixed(2);
        }
        syncStateFromDOM();
    });

    DOM.slippageInput.addEventListener('input', syncStateFromDOM);
    DOM.slippageInput.addEventListener('change', syncStateFromDOM);
    DOM.slippageInput.addEventListener('blur', () => {
        let val = DOM.slippageInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) {
            DOM.slippageInput.value = '0.00';
        } else {
            DOM.slippageInput.value = Math.max(0, parseFloat(val)).toFixed(2);
        }
        syncStateFromDOM();
    });

    DOM.targetProfitPctInput.addEventListener('input', syncStateFromDOM);
    DOM.targetProfitPctInput.addEventListener('change', syncStateFromDOM);
    DOM.targetProfitPctInput.addEventListener('blur', () => {
        let val = DOM.targetProfitPctInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) {
            DOM.targetProfitPctInput.value = "0.0";
        } else {
            DOM.targetProfitPctInput.value = Math.max(0, parseFloat(val)).toFixed(1);
        }
        syncStateFromDOM();
    });

    if (DOM.includeNextFeeToggle) {
        DOM.includeNextFeeToggle.addEventListener('change', syncStateFromDOM);
    }

    // Modal Trigger Listeners
    if (DOM.tariffTrigger && DOM.tariffModal && DOM.modalCloseBtn) {
        DOM.tariffTrigger.addEventListener('click', () => {
            DOM.tariffModal.style.display = 'flex';
        });
        DOM.modalCloseBtn.addEventListener('click', () => {
            DOM.tariffModal.style.display = 'none';
        });
        DOM.tariffModal.addEventListener('click', (e) => {
            if (e.target === DOM.tariffModal) {
                DOM.tariffModal.style.display = 'none';
            }
        });
    }

    // Chip Listeners
    DOM.lotChips.forEach(chip => {
        chip.addEventListener('click', () => {
            DOM.lotChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            state.indexName = chip.getAttribute('data-index') || 'NIFTY';
            state.lotSize = parseInt(chip.getAttribute('data-lot')) || 65;
            state.maxLot = parseInt(chip.getAttribute('data-maxlot')) || 27;

            if (state.numLots > state.maxLot) state.numLots = state.maxLot;

            DOM.numLotsInput.value = state.numLots;
            DOM.buyQtyInput.value = state.numLots * state.lotSize;

            syncStateFromDOM();
        });
    });

    DOM.pctChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const pctVal = parseFloat(chip.getAttribute('data-pct'));
            DOM.targetProfitPctInput.value = pctVal;
            syncStateFromDOM();
        });
    });

    // Reset Listener
    DOM.resetBtn.addEventListener('click', () => {
        state.indexName = 'NIFTY';
        state.lotSize = 65;
        state.maxLot = 27;
        state.numLots = 1;
        state.buyPrice = 100.00;
        state.slippage = 0.50;
        state.targetProfitPct = 0.0;
        state.includeNextFee = true;

        DOM.numLotsInput.value = 1;
        DOM.numLotsInput.max = 27;
        DOM.buyQtyInput.value = 65;
        DOM.buyQtyInput.step = 65;
        DOM.buyQtyInput.max = 1755;
        DOM.buyQtyInput.min = 65;
        DOM.buyPriceInput.value = "100.00";
        DOM.slippageInput.value = "0.50";
        DOM.targetProfitPctInput.value = "0.0";
        if (DOM.includeNextFeeToggle) DOM.includeNextFeeToggle.checked = true;

        DOM.lotChips.forEach(c => c.classList.remove('active'));
        document.querySelector('[data-lot="65"]').classList.add('active');

        DOM.pctChips.forEach(c => c.classList.remove('active'));
        document.querySelector('[data-pct="0"]').classList.add('active');

        syncStateFromDOM();
    });

    // Initial render
    syncStateFromDOM();
});
