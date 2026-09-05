/**
 * Upstox Options & Compounding Calculator Engine (Official 2026 Rules)
 * Includes Options Target Engine + Compounding Velocity Trade Counter
 *
 * Author: Antigravity AI Pair Programmer
 * Version: 6.2 (Capital Deployment Sensitivity Matrix)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REGISTRY ---
    const DOM = {
        // Tab Navigation
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

        // Modal Elements
        tariffTrigger: document.getElementById('tariff-info-trigger'),
        tariffModal: document.getElementById('tariff-modal'),
        modalCloseBtn: document.getElementById('modal-close-btn')
    };

    // --- STATE STORES ---
    const optionsState = {
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

    const compoundingState = {
        initialCap: 1000.0,
        finalCap: 100000.0,
        returnPct: 1.0,
        deployPct: 100.0,
        tradingDays: 250,
        years: 1.0,
        isInternalUpdating: false
    };

    let activeTab = 'options';

    // Helper: Safe Currency Formatter
    function formatINR(val, includeSign = false) {
        if (isNaN(val) || !isFinite(val)) val = 0.0;
        const sign = includeSign && val > 0 ? '+' : '';
        return sign + '₹' + Math.abs(val).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatShortINR(val) {
        if (isNaN(val) || !isFinite(val)) return '₹0';
        if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
        if (val >= 100000) return '₹' + (val / 100000).toFixed(2) + ' Lakh';
        if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
        return '₹' + val.toFixed(0);
    }

    // --- OPTIONS ENGINE SOLVER ---
    function computeTargetTrade(params) {
        const qty = Math.max(1, params.numLots * params.lotSize);
        const pBuy = Math.max(0.0, params.buyPrice);
        const slip = Math.max(0.0, params.slippage);
        const targetPct = Math.max(0.0, params.targetProfitPct);

        const rBuy = pBuy + slip;
        const buyTurnover = rBuy * qty;

        const nextBrok = 20.0;
        const nextEx = 0.000495 * buyTurnover;
        const nextSebi = 0.000001 * buyTurnover;
        const nextStamp = 0.00003 * buyTurnover;
        const nextGst = 0.18 * (nextBrok + nextEx + nextSebi);
        const dynamicNextEntryFee = nextBrok + nextEx + nextSebi + nextStamp + nextGst;

        let targetNetPnl = (targetPct / 100.0) * buyTurnover;

        if (params.includeNextFee) {
            targetNetPnl += dynamicNextEntryFee;
        }

        const cSell = 0.001 + (1.18 * 0.000496);
        const fixedKBuy = (40.0 * 1.18) + (0.00003 * buyTurnover) + (1.18 * 0.000496 * buyTurnover);

        const denominator = qty * (1.0 - cSell);
        const rSell = denominator > 0 ? (targetNetPnl + buyTurnover + fixedKBuy) / denominator : rBuy;
        const pSell = rSell + slip;

        const sellTurnover = rSell * qty;
        const totalTurnover = buyTurnover + sellTurnover;

        const brokerage = 40.0;
        const stt = 0.001 * sellTurnover;
        const exchangeCharges = 0.000495 * totalTurnover;
        const sebiCharges = 0.000001 * totalTurnover;
        const stampDuty = 0.00003 * buyTurnover;
        const gst = 0.18 * (brokerage + exchangeCharges + sebiCharges);

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
            qty, pBuy, rBuy, rSell, pSell, totalTaxes, totalSlippageCost,
            netPnlRealized, actualNetRoi, realPtsMove, realPctMove,
            totalBreakevenPts, breakevenSellPrice, dynamicNextEntryFee,
            actualNextTradeEntryCost, nextTradeNetCapital
        };
    }

    // --- COMPOUNDING VELOCITY SOLVER ---
    function computeCompoundingVelocity(params) {
        const cInit = Math.max(0.01, params.initialCap);
        const cFinal = Math.max(0.01, params.finalCap);
        const rPct = Math.max(0.0, params.returnPct);
        const dPct = Math.max(0.0, Math.min(100.0, params.deployPct));
        const daysYear = Math.max(1, params.tradingDays);
        const yrs = Math.max(0.01, params.years);

        const effectiveRate = (dPct / 100.0) * (rPct / 100.0);

        let exactTrades = 0.0;
        let isGoalValid = true;

        if (cFinal <= cInit) {
            isGoalValid = false;
            exactTrades = 0.0;
        } else if (effectiveRate <= 0) {
            isGoalValid = false;
            exactTrades = 0.0;
        } else {
            exactTrades = Math.log(cFinal / cInit) / Math.log(1.0 + effectiveRate);
        }

        const totalTrades = Math.ceil(exactTrades);
        const totalDays = daysYear * yrs;

        const tradesPerDay = (isGoalValid && totalDays > 0) ? exactTrades / totalDays : 0.0;
        const tradesPerWeek = (isGoalValid && yrs > 0) ? exactTrades / (yrs * 52.0) : 0.0;
        const tradesPerMonth = (isGoalValid && yrs > 0) ? exactTrades / (yrs * 12.0) : 0.0;

        const netProfit = Math.max(0.0, cFinal - cInit);
        const multiplier = cInit > 0 ? cFinal / cInit : 1.0;

        // Generate Sensitivity Matrix for 10%, 25%, 50%, 75%, 100% capital deployed
        const sensitivities = [];
        const deploySteps = [10, 25, 50, 75, 100];

        deploySteps.forEach(deployVal => {
            const effRate = (deployVal / 100.0) * (rPct / 100.0);
            let trades = 0;
            let perDay = 0.0;
            if (isGoalValid && effRate > 0) {
                const exact = Math.log(cFinal / cInit) / Math.log(1.0 + effRate);
                trades = Math.ceil(exact);
                perDay = totalDays > 0 ? exact / totalDays : 0.0;
            }
            sensitivities.push({
                deployPct: deployVal,
                tradesNeeded: trades,
                tradesPerDay: perDay,
                isSelected: Math.abs(deployVal - dPct) < 0.1
            });
        });

        return {
            cInit, cFinal, rPct, dPct, daysYear, yrs, effectiveRate,
            exactTrades, totalTrades, totalDays, tradesPerDay, tradesPerWeek,
            tradesPerMonth, netProfit, multiplier, sensitivities, isGoalValid
        };
    }

    // --- RENDER ENGINES ---
    function renderOptions() {
        const calc = computeTargetTrade(optionsState);
        const maxQty = optionsState.maxLot * optionsState.lotSize;

        DOM.lblLotMultiple.textContent = `${optionsState.numLots} Lot${optionsState.numLots > 1 ? 's' : ''} = ${calc.qty} units (Max: ${optionsState.maxLot} Lots / ${maxQty.toLocaleString('en-IN')})`;
        DOM.lblRealizedBuy.textContent = formatINR(calc.rBuy);

        if (DOM.lblToggleTitle) {
            DOM.lblToggleTitle.textContent = `Include Next Trade Fee (+${formatINR(calc.dynamicNextEntryFee)})`;
        }

        DOM.reqSellVal.textContent = formatINR(calc.pSell);
        const extraNote = optionsState.includeNextFee ? ` (includes +${formatINR(calc.dynamicNextEntryFee)} next trade fee)` : '';
        DOM.reqSellSub.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> +${calc.realPtsMove.toFixed(2)} pts move needed (+${calc.realPctMove.toFixed(2)}% price move)${extraNote}`;

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

        DOM.nextTradeCostVal.textContent = `Next Entry Fee: ${formatINR(calc.actualNextTradeEntryCost)}`;
        DOM.nextCapitalVal.textContent = formatINR(calc.nextTradeNetCapital);

        DOM.pctChips.forEach(chip => {
            const chipVal = parseFloat(chip.getAttribute('data-pct'));
            if (!isNaN(chipVal) && Math.abs(chipVal - optionsState.targetProfitPct) < 0.001) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    function renderCompounding() {
        const calc = computeCompoundingVelocity(compoundingState);

        DOM.compEffectiveRate.textContent = `${(calc.effectiveRate * 100).toFixed(3)}% / trade`;
        DOM.compTotalDays.textContent = `${calc.totalDays.toFixed(0)} trading days`;

        if (calc.isGoalValid) {
            DOM.compHeroTrades.textContent = `${calc.totalTrades.toLocaleString('en-IN')} Trades`;
            DOM.compHeroSub.innerHTML = `<i class="fa-solid fa-bolt"></i> Needs ${calc.tradesPerDay.toFixed(2)} trades / day across ${calc.totalDays.toFixed(0)} trading days`;
        } else {
            DOM.compHeroTrades.textContent = `0 Trades`;
            DOM.compHeroSub.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Target Capital must be greater than Initial Capital`;
        }

        DOM.compValPerDay.textContent = `${calc.tradesPerDay.toFixed(2)} / day`;
        DOM.compSubPerDay.textContent = `▲ ${calc.tradesPerWeek.toFixed(2)} trades / week`;

        DOM.compValPerMonth.textContent = `${calc.tradesPerMonth.toFixed(2)} / mo`;
        DOM.compSubPerMonth.textContent = `Across ${(calc.yrs * 12).toFixed(0)} months`;

        DOM.compValMultiplier.textContent = `${calc.multiplier.toFixed(1)}x`;
        DOM.compSubMultiplier.textContent = calc.multiplier > 1.0 ? `▲ +${((calc.multiplier - 1) * 100).toFixed(0)}% Growth` : `0% Growth`;

        DOM.compValNetProfit.textContent = `+${formatShortINR(calc.netProfit)}`;
        DOM.compSubNetProfit.textContent = `From ${formatShortINR(calc.cInit)} capital`;

        DOM.compSensitivitySummary.textContent = `5 Allocations (10% to 100%)`;

        // Render Dynamic Capital Deployment Sensitivity Grid (10%, 25%, 50%, 75%, 100%)
        let html = '';
        if (calc.isGoalValid) {
            calc.sensitivities.forEach(s => {
                const activeClass = s.isSelected ? 'active' : '';
                html += `
                    <div class="sensitivity-card ${activeClass}" data-deploy="${s.deployPct}">
                        <span class="sens-tag">${s.deployPct}% Deployed</span>
                        <span class="sens-trades">${s.tradesNeeded.toLocaleString('en-IN')} Trades</span>
                        <span class="sens-rate">${s.tradesPerDay.toFixed(1)} / day</span>
                    </div>
                `;
            });
        } else {
            html = `<div style="grid-column: 1 / -1; font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 0.5rem 0;">Enter Target Capital > Initial Capital to generate deployment matrix</div>`;
        }
        DOM.compSensitivityContainer.innerHTML = html;

        // Attach click listeners to sensitivity cards so tapping any card updates Capital Deployed %
        const sensCards = DOM.compSensitivityContainer.querySelectorAll('.sensitivity-card');
        sensCards.forEach(card => {
            card.addEventListener('click', () => {
                const depVal = parseFloat(card.getAttribute('data-deploy'));
                DOM.compDeployPctInput.value = depVal;
                syncCompoundingFromDOM();
            });
        });

        // Sync preset chips
        DOM.compDeployChips.forEach(chip => {
            const depVal = parseFloat(chip.getAttribute('data-deploy'));
            if (!isNaN(depVal) && Math.abs(depVal - compoundingState.deployPct) < 0.1) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    // --- TAB SWITCHER LOGIC ---
    function switchTab(tabName) {
        activeTab = tabName;
        if (tabName === 'options') {
            DOM.tabBtnOptions.classList.add('active');
            DOM.tabBtnCompounding.classList.remove('active');
            DOM.viewOptions.classList.remove('hidden');
            DOM.viewOptions.classList.add('active');
            DOM.viewCompounding.classList.add('hidden');
            DOM.viewCompounding.classList.remove('active');
            DOM.headerSubtitle.textContent = 'Target Sell Price & Re-entry Calculator';
            renderOptions();
        } else {
            DOM.tabBtnCompounding.classList.add('active');
            DOM.tabBtnOptions.classList.remove('active');
            DOM.viewCompounding.classList.remove('hidden');
            DOM.viewCompounding.classList.add('active');
            DOM.viewOptions.classList.add('hidden');
            DOM.viewOptions.classList.remove('active');
            DOM.headerSubtitle.textContent = 'Compounding Trade Growth & Velocity Calculator';
            renderCompounding();
        }
    }

    DOM.tabBtnOptions.addEventListener('click', () => switchTab('options'));
    DOM.tabBtnCompounding.addEventListener('click', () => switchTab('compounding'));

    // --- OPTIONS INPUT PARSERS ---
    function syncOptionsFromDOM(e) {
        if (optionsState.isInternalUpdating) return;
        const targetId = e && e.target ? e.target.id : null;

        let lots = parseInt(DOM.numLotsInput.value.trim());
        if (isNaN(lots) || lots < 1) lots = 1;
        if (lots > optionsState.maxLot) lots = optionsState.maxLot;
        optionsState.numLots = lots;

        let buyPrice = parseFloat(DOM.buyPriceInput.value.trim());
        if (isNaN(buyPrice) || buyPrice < 0) buyPrice = 0.0;
        optionsState.buyPrice = buyPrice;

        let slip = parseFloat(DOM.slippageInput.value.trim());
        if (isNaN(slip) || slip < 0) slip = 0.0;
        optionsState.slippage = slip;

        let targetPct = parseFloat(DOM.targetProfitPctInput.value.trim());
        if (isNaN(targetPct) || targetPct < 0) targetPct = 0.0;
        optionsState.targetProfitPct = targetPct;

        optionsState.includeNextFee = DOM.includeNextFeeToggle ? DOM.includeNextFeeToggle.checked : true;

        optionsState.isInternalUpdating = true;
        DOM.numLotsInput.max = optionsState.maxLot;

        if (targetId !== 'num-lots' && targetId !== 'buy-qty') {
            DOM.numLotsInput.value = optionsState.numLots;
            DOM.buyQtyInput.value = optionsState.numLots * optionsState.lotSize;
        } else if (targetId === 'num-lots') {
            DOM.buyQtyInput.value = optionsState.numLots * optionsState.lotSize;
        }

        DOM.buyQtyInput.max = optionsState.maxLot * optionsState.lotSize;
        DOM.buyQtyInput.step = optionsState.lotSize;
        optionsState.isInternalUpdating = false;

        renderOptions();
    }

    // --- COMPOUNDING INPUT PARSERS ---
    function syncCompoundingFromDOM() {
        if (compoundingState.isInternalUpdating) return;

        let rawInit = DOM.compInitialCapInput.value.trim();
        let cInit = parseFloat(rawInit);
        if (isNaN(cInit) || cInit < 0) cInit = 0.0;
        compoundingState.initialCap = cInit;

        let rawFinal = DOM.compFinalCapInput.value.trim();
        let cFinal = parseFloat(rawFinal);
        if (isNaN(cFinal) || cFinal < 0) cFinal = 0.0;
        compoundingState.finalCap = cFinal;

        let rawRet = DOM.compReturnPctInput.value.trim();
        let retPct = parseFloat(rawRet);
        if (isNaN(retPct) || retPct < 0) retPct = 0.0;
        compoundingState.returnPct = retPct;

        let rawDep = DOM.compDeployPctInput.value.trim();
        let depPct = parseFloat(rawDep);
        if (isNaN(depPct) || depPct < 0) depPct = 0.0;
        if (depPct > 100.0) depPct = 100.0;
        compoundingState.deployPct = depPct;

        let rawDays = DOM.compTradingDaysInput.value.trim();
        let days = parseInt(rawDays);
        if (isNaN(days) || days < 1) days = 250;
        compoundingState.tradingDays = days;

        let rawYrs = DOM.compYearsInput.value.trim();
        let yrs = parseFloat(rawYrs);
        if (isNaN(yrs) || yrs < 0.01) yrs = 1.0;
        compoundingState.years = yrs;

        renderCompounding();
    }

    // --- EVENT LISTENERS ---
    // Options Engine Inputs
    DOM.numLotsInput.addEventListener('input', syncOptionsFromDOM);
    DOM.numLotsInput.addEventListener('blur', () => {
        let val = DOM.numLotsInput.value.trim();
        if (val === '' || isNaN(parseInt(val))) DOM.numLotsInput.value = '1';
        syncOptionsFromDOM();
    });

    DOM.buyQtyInput.addEventListener('input', syncOptionsFromDOM);
    DOM.buyPriceInput.addEventListener('input', syncOptionsFromDOM);
    DOM.buyPriceInput.addEventListener('blur', () => {
        let val = DOM.buyPriceInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) DOM.buyPriceInput.value = '0.00';
        syncOptionsFromDOM();
    });

    DOM.slippageInput.addEventListener('input', syncOptionsFromDOM);
    DOM.slippageInput.addEventListener('blur', () => {
        let val = DOM.slippageInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) DOM.slippageInput.value = '0.00';
        syncOptionsFromDOM();
    });

    DOM.targetProfitPctInput.addEventListener('input', syncOptionsFromDOM);
    DOM.targetProfitPctInput.addEventListener('blur', () => {
        let val = DOM.targetProfitPctInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) DOM.targetProfitPctInput.value = '0.0';
        syncOptionsFromDOM();
    });

    if (DOM.includeNextFeeToggle) {
        DOM.includeNextFeeToggle.addEventListener('change', syncOptionsFromDOM);
    }

    // Compounding Engine Inputs
    DOM.compInitialCapInput.addEventListener('input', syncCompoundingFromDOM);
    DOM.compInitialCapInput.addEventListener('change', syncCompoundingFromDOM);
    DOM.compInitialCapInput.addEventListener('blur', () => {
        let val = DOM.compInitialCapInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) DOM.compInitialCapInput.value = '1000';
        syncCompoundingFromDOM();
    });

    DOM.compFinalCapInput.addEventListener('input', syncCompoundingFromDOM);
    DOM.compFinalCapInput.addEventListener('change', syncCompoundingFromDOM);
    DOM.compFinalCapInput.addEventListener('blur', () => {
        let val = DOM.compFinalCapInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) DOM.compFinalCapInput.value = '100000';
        syncCompoundingFromDOM();
    });

    DOM.compReturnPctInput.addEventListener('input', syncCompoundingFromDOM);
    DOM.compReturnPctInput.addEventListener('change', syncCompoundingFromDOM);
    DOM.compReturnPctInput.addEventListener('blur', () => {
        let val = DOM.compReturnPctInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) DOM.compReturnPctInput.value = '1.0';
        syncCompoundingFromDOM();
    });

    DOM.compDeployPctInput.addEventListener('input', syncCompoundingFromDOM);
    DOM.compDeployPctInput.addEventListener('change', syncCompoundingFromDOM);
    DOM.compDeployPctInput.addEventListener('blur', () => {
        let val = DOM.compDeployPctInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) DOM.compDeployPctInput.value = '100.0';
        syncCompoundingFromDOM();
    });

    DOM.compTradingDaysInput.addEventListener('input', syncCompoundingFromDOM);
    DOM.compTradingDaysInput.addEventListener('change', syncCompoundingFromDOM);
    DOM.compTradingDaysInput.addEventListener('blur', () => {
        let val = DOM.compTradingDaysInput.value.trim();
        if (val === '' || isNaN(parseInt(val))) DOM.compTradingDaysInput.value = '250';
        syncCompoundingFromDOM();
    });

    DOM.compYearsInput.addEventListener('input', syncCompoundingFromDOM);
    DOM.compYearsInput.addEventListener('change', syncCompoundingFromDOM);
    DOM.compYearsInput.addEventListener('blur', () => {
        let val = DOM.compYearsInput.value.trim();
        if (val === '' || isNaN(parseFloat(val))) DOM.compYearsInput.value = '1.0';
        syncCompoundingFromDOM();
    });

    DOM.compDeployChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const depVal = parseFloat(chip.getAttribute('data-deploy'));
            DOM.compDeployPctInput.value = depVal;
            syncCompoundingFromDOM();
        });
    });

    // Modal Trigger Listeners
    if (DOM.tariffTrigger && DOM.tariffModal && DOM.modalCloseBtn) {
        DOM.tariffTrigger.addEventListener('click', () => DOM.tariffModal.style.display = 'flex');
        DOM.modalCloseBtn.addEventListener('click', () => DOM.tariffModal.style.display = 'none');
        DOM.tariffModal.addEventListener('click', (e) => {
            if (e.target === DOM.tariffModal) DOM.tariffModal.style.display = 'none';
        });
    }

    // Chip Listeners
    DOM.lotChips.forEach(chip => {
        chip.addEventListener('click', () => {
            DOM.lotChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            optionsState.indexName = chip.getAttribute('data-index') || 'NIFTY';
            optionsState.lotSize = parseInt(chip.getAttribute('data-lot')) || 65;
            optionsState.maxLot = parseInt(chip.getAttribute('data-maxlot')) || 27;

            if (optionsState.numLots > optionsState.maxLot) optionsState.numLots = optionsState.maxLot;

            DOM.numLotsInput.value = optionsState.numLots;
            DOM.buyQtyInput.value = optionsState.numLots * optionsState.lotSize;
            syncOptionsFromDOM();
        });
    });

    DOM.pctChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const pctVal = parseFloat(chip.getAttribute('data-pct'));
            DOM.targetProfitPctInput.value = pctVal;
            syncOptionsFromDOM();
        });
    });

    // Reset Listener
    DOM.resetBtn.addEventListener('click', () => {
        if (activeTab === 'options') {
            optionsState.indexName = 'NIFTY';
            optionsState.lotSize = 65;
            optionsState.maxLot = 27;
            optionsState.numLots = 1;
            optionsState.buyPrice = 100.00;
            optionsState.slippage = 0.50;
            optionsState.targetProfitPct = 0.0;
            optionsState.includeNextFee = true;

            DOM.numLotsInput.value = 1;
            DOM.numLotsInput.max = 27;
            DOM.buyQtyInput.value = 65;
            DOM.buyPriceInput.value = "100.00";
            DOM.slippageInput.value = "0.50";
            DOM.targetProfitPctInput.value = "0.0";
            if (DOM.includeNextFeeToggle) DOM.includeNextFeeToggle.checked = true;

            DOM.lotChips.forEach(c => c.classList.remove('active'));
            document.querySelector('[data-lot="65"]').classList.add('active');
            DOM.pctChips.forEach(c => c.classList.remove('active'));
            document.querySelector('[data-pct="0"]').classList.add('active');

            syncOptionsFromDOM();
        } else {
            DOM.compInitialCapInput.value = "1000";
            DOM.compFinalCapInput.value = "100000";
            DOM.compReturnPctInput.value = "1.0";
            DOM.compDeployPctInput.value = "100.0";
            DOM.compTradingDaysInput.value = "250";
            DOM.compYearsInput.value = "1.0";
            syncCompoundingFromDOM();
        }
    });

    // Initial render
    syncOptionsFromDOM();
    syncCompoundingFromDOM();
});
