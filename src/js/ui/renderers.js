/**
 * UI Renderers: High-Precision View Orchestration
 * Renders Options Engine and Compounding Velocity dashboards with 8K micro-alignment.
 */

import { computeOptionsTrade } from '../engines/optionsEngine.js';
import { computeCompoundingVelocity } from '../engines/compoundingEngine.js';
import {
    formatINR,
    formatShortINR,
    formatMetricHTML,
    formatCurrencyHTML,
    formatShortCurrencyHTML
} from '../formatters/metricFormatters.js';

export function renderOptions(optionsState, DOM) {
    const calc = computeOptionsTrade(optionsState);
    const maxQty = optionsState.maxLot * optionsState.lotSize;

    DOM.lblLotMultiple.textContent = `${optionsState.numLots} Lot${optionsState.numLots > 1 ? 's' : ''} = ${calc.qty} units (Max: ${optionsState.maxLot} Lots / ${maxQty.toLocaleString('en-IN')})`;
    DOM.lblRealizedBuy.textContent = formatINR(calc.rBuy);

    if (DOM.lblToggleTitle) {
        DOM.lblToggleTitle.textContent = `Include Next Trade Fee (+${formatINR(calc.dynamicNextEntryFee)})`;
    }

    DOM.reqSellVal.innerHTML = formatCurrencyHTML(calc.pSell);
    const extraNote = optionsState.includeNextFee ? ` (includes +${formatINR(calc.dynamicNextEntryFee)} next trade fee)` : '';
    DOM.reqSellSub.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> +${calc.realPtsMove.toFixed(2)} pts move needed (+${calc.realPctMove.toFixed(2)}% price move)${extraNote}`;

    DOM.realMoveVal.innerHTML = formatMetricHTML({ sign: '+', num: calc.realPtsMove.toFixed(2), unit: 'pts' });
    DOM.realMoveSub.textContent = `▲ +${calc.realPctMove.toFixed(2)}% premium move`;

    DOM.netPnlVal.innerHTML = formatCurrencyHTML(calc.netPnlRealized, true);
    DOM.netRoiVal.textContent = (calc.actualNetRoi >= 0 ? '▲ +' : '▼ ') + calc.actualNetRoi.toFixed(2) + '% Net ROI';

    if (calc.netPnlRealized >= 0) {
        DOM.netPnlVal.className = 'card-val text-green';
        DOM.netRoiVal.className = 'trend-pill positive';
    } else {
        DOM.netPnlVal.className = 'card-val text-red';
        DOM.netRoiVal.className = 'trend-pill negative';
    }

    DOM.breakevenSellVal.innerHTML = formatCurrencyHTML(calc.breakevenSellPrice);
    DOM.breakevenSub.textContent = `+${calc.totalBreakevenPts.toFixed(2)} pts breakeven`;

    const totalDeductions = calc.totalTaxes + calc.totalSlippageCost;
    DOM.totalDeductionsVal.innerHTML = formatCurrencyHTML(totalDeductions);
    DOM.deductionsSub.textContent = `Taxes: ${formatINR(calc.totalTaxes)} + Slip: ${formatINR(calc.totalSlippageCost)}`;

    DOM.nextTradeCostVal.textContent = `Next Entry Fee: ${formatINR(calc.actualNextTradeEntryCost)}`;
    DOM.nextCapitalVal.innerHTML = formatCurrencyHTML(calc.nextTradeNetCapital);
    if (DOM.lblNextEntryFee) DOM.lblNextEntryFee.innerHTML = formatCurrencyHTML(calc.actualNextTradeEntryCost);
    if (DOM.lblCapitalPreserved) {
        const yieldPct = calc.buyTurnover > 0 ? ((calc.nextTradeNetCapital / calc.buyTurnover) * 100).toFixed(1) : '100.0';
        DOM.lblCapitalPreserved.innerHTML = formatMetricHTML({ num: yieldPct, unit: '%' });
    }

    DOM.pctChips.forEach(chip => {
        const chipVal = parseFloat(chip.getAttribute('data-pct'));
        if (!isNaN(chipVal) && Math.abs(chipVal - optionsState.targetProfitPct) < 0.001) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
}

export function renderCompounding(compoundingState, DOM) {
    const calc = computeCompoundingVelocity(compoundingState);

    DOM.compEffectiveRate.textContent = `${(calc.effectiveRate * 100).toFixed(3)}% / trade`;
    DOM.compTotalDays.textContent = `${calc.totalDays.toFixed(0)} trading days`;

    if (calc.isGoalValid) {
        DOM.compHeroTrades.innerHTML = formatMetricHTML({ num: calc.totalTrades.toLocaleString('en-IN'), unit: 'Trades' });
        DOM.compHeroSub.innerHTML = `<i class="fa-solid fa-bolt"></i> Take ${calc.dailyTrades} trades / day to finish in ${calc.daysNeeded} days (within ${calc.totalDays.toFixed(0)}-day goal)`;
    } else {
        DOM.compHeroTrades.innerHTML = formatMetricHTML({ num: '0', unit: 'Trades' });
        DOM.compHeroSub.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Target Capital must be greater than Initial Capital`;
    }

    DOM.compValPerDay.innerHTML = formatMetricHTML({ num: calc.dailyTrades, unit: '/ day' });
    DOM.compSubPerDay.textContent = `Goal reached in ${calc.daysNeeded} trading days`;

    DOM.compValPerMonth.innerHTML = formatMetricHTML({ num: calc.monthlyTrades, unit: '/ mo' });
    DOM.compSubPerMonth.textContent = `Goal reached in ${calc.monthsNeeded} months`;

    DOM.compValMultiplier.innerHTML = formatMetricHTML({ num: calc.multiplier.toFixed(1), unit: 'x' });
    DOM.compSubMultiplier.textContent = calc.multiplier > 1.0 ? `▲ +${((calc.multiplier - 1) * 100).toFixed(0)}% Growth` : `0% Growth`;

    DOM.compValNetProfit.innerHTML = formatShortCurrencyHTML(calc.netProfit, true);
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
                    <span class="sens-trades">${formatMetricHTML({ num: s.tradesNeeded.toLocaleString('en-IN'), unit: 'Trades' })}</span>
                    <span class="sens-rate">${formatMetricHTML({ num: s.dailyTrades, unit: '/ day' })}</span>
                    <span class="sens-days">In ${s.daysNeeded} days</span>
                </div>
            `;
        });
    } else {
        html = `<div style="grid-column: 1 / -1; font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 0.5rem 0;">Enter Target Capital > Initial Capital to generate deployment matrix</div>`;
    }
    DOM.compSensitivityContainer.innerHTML = html;

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

export function setupTariffModal(DOM) {
    if (!DOM.tariffModal || !DOM.tariffTrigger || !DOM.modalCloseBtn) return;
    
    const closeModal = () => { DOM.tariffModal.style.display = 'none'; };
    const openModal = () => { DOM.tariffModal.style.display = 'flex'; };

    DOM.tariffTrigger.addEventListener('click', openModal);
    DOM.modalCloseBtn.addEventListener('click', closeModal);
    DOM.tariffModal.addEventListener('click', (e) => {
        if (e.target === DOM.tariffModal) closeModal();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.tariffModal.style.display === 'flex') closeModal();
    });
}
