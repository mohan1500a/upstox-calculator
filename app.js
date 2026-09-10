/**
 * Upstox Options Target Sell Price & Compounding Velocity Suite (Official 2026 Engine)
 * Features:
 * 1. Options Target Sell Price & Re-entry Calculator (Upstox Statutory Taxes)
 * 2. Compounding Velocity 200-Day Target Growth Model & Sensitivity Grid
 * 3. Hamburger Side Drawer Navigation & Lumos Theme Framework
 * 
 * Author: Antigravity AI Pair Programmer
 * Version: 31.0
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REGISTRY ---
    const DOM = {
        // Tab Navigation & Header
        tabBtnOptions: document.getElementById('tab-btn-options'),
        tabBtnCompounding: document.getElementById('tab-btn-compounding'),
        viewOptions: document.getElementById('view-options'),
        viewCompounding: document.getElementById('view-compounding'),
        headerSubtitle: document.getElementById('header-subtitle'),
        resetBtn: document.getElementById('reset-btn'),

        // Hamburger Menu & Side Drawer
        hamburgerBtn: document.getElementById('hamburger-btn'),
        sideDrawer: document.getElementById('side-drawer'),
        drawerOverlay: document.getElementById('drawer-overlay'),
        drawerCloseBtn: document.getElementById('drawer-close-btn'),
        drawerLinkOptions: document.getElementById('drawer-link-options'),
        drawerLinkCompounding: document.getElementById('drawer-link-compounding'),
        drawerLinkTariff: document.getElementById('drawer-link-tariff'),

        // Options Engine Inputs
        numLotsInput: document.getElementById('num-lots'),
        buyQtyInput: document.getElementById('buy-qty'),
        buyPriceInput: document.getElementById('buy-price'),
        slippageInput: document.getElementById('slippage'),
        targetProfitPctInput: document.getElementById('target-profit-pct'),
        includeNextFeeToggle: document.getElementById('include-next-fee-toggle'),
        lblToggleTitle: document.getElementById('lbl-toggle-title'),
        lotChips: document.querySelectorAll('.chip:not(.comp-deploy-chip)'),
        pctChips: document.querySelectorAll('.pct-chip:not(.comp-deploy-chip)'),

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

        // Tariff Modal
        tariffTrigger: document.getElementById('tariff-info-trigger'),
        tariffModal: document.getElementById('tariff-modal'),
        modalCloseBtn: document.getElementById('modal-close-btn')
    };

    // --- STATE STORES ---
    let activeTab = 'options';

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
        initialCap: 10000.0,
        finalCap: 100000.0,
        returnPct: 1.0,
        deployPct: 50.0,
        tradingDays: 200,
        years: 1.0,
        isInternalUpdating: false
    };

    // --- PURE QUANTITATIVE CALCULATION ENGINES ---

    /**
     * Upstox Options Brokerage & Target Sell Price Engine
     */
    function computeOptionsEngine(params) {
        const indexName = params.indexName || 'NIFTY';
        const lotSize = Math.max(1, parseInt(params.lotSize) || 65);
        const maxLot = Math.max(1, parseInt(params.maxLot) || 27);
        const numLots = Math.min(maxLot, Math.max(1, parseInt(params.numLots) || 1));
        const qty = numLots * lotSize;

        const pBuy = Math.max(0.0, parseFloat(params.buyPrice) || 0.0);
        const sSlip = Math.max(0.0, parseFloat(params.slippage) || 0.0);
        const tPct = Math.max(0.0, parseFloat(params.targetProfitPct) || 0.0);
        const includeNextFee = params.includeNextFee !== false;

        const rBuy = pBuy + sSlip;
        const buyTurnover = rBuy * qty;

        // Dynamic Next Trade Entry Fee (Estimated Buy Side Costs)
        const nextBrok = 20.0;
        const nextEx = 0.000495 * buyTurnover;
        const nextSebi = 0.000001 * buyTurnover;
        const nextStamp = 0.00003 * buyTurnover;
        const nextGst = 0.18 * (nextBrok + nextEx + nextSebi);
        const dynamicNextEntryFee = nextBrok + nextEx + nextSebi + nextStamp + nextGst;

        let targetNetPnl = (tPct / 100.0) * buyTurnover;
        if (includeNextFee) {
            targetNetPnl += dynamicNextEntryFee;
        }

        // Upstox Linear Tax Coefficients (Options)
        const cSell = 0.001 + (1.18 * 0.000496); // STT 0.1% + Exchange/SEBI/GST
        const fixedKBuy = (40.0 * 1.18) + (0.00003 * buyTurnover) + (1.18 * 0.000496 * buyTurnover);

        const denominator = qty * (1.0 - cSell);
        const rSell = denominator > 0 ? (targetNetPnl + buyTurnover + fixedKBuy) / denominator : rBuy;
        const pSell = rSell + sSlip;

        const sellTurnover = rSell * qty;
        const totalTurnover = buyTurnover + sellTurnover;

        // Itemized Upstox Taxes & Fees
        const brokerage = 40.0; // ₹20 buy + ₹20 sell
        const stt = 0.001 * sellTurnover; // 0.1% on sell premium
        const exchangeCharges = 0.000495 * totalTurnover; // 0.0495%
        const sebiCharges = 0.000001 * totalTurnover; // 0.0001%
        const stampDuty = 0.00003 * buyTurnover; // 0.003% buy side
        const gst = 0.18 * (brokerage + exchangeCharges + sebiCharges);

        const totalTaxes = brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst;
        const totalSlippagePts = sSlip * 2;
        const totalSlippageCost = totalSlippagePts * qty;

        const grossPnlRealized = (rSell - rBuy) * qty;
        const netPnlRealized = grossPnlRealized - totalTaxes;
        const actualNetRoiPct = buyTurnover > 0 ? (netPnlRealized / buyTurnover) * 100.0 : 0.0;

        const pointsMoveNeeded = pSell - pBuy;
        const pctMoveNeeded = pBuy > 0 ? (pointsMoveNeeded / pBuy) * 100.0 : 0.0;

        const chargesBreakevenPts = totalTaxes / qty;
        const totalBreakevenPts = chargesBreakevenPts + totalSlippagePts;
        const breakevenSellPrice = pBuy + totalBreakevenPts;

        // Next Trade Re-entry Capital
        const nextProceeds = Math.max(0.0, sellTurnover - totalTaxes);
        const actualNextStamp = 0.00003 * nextProceeds;
        const actualNextEntryCost = 20.0 + (0.18 * 20.0) + (1.18 * 0.000496 * nextProceeds) + actualNextStamp;
        const nextTradeNetCapital = Math.max(0.0, nextProceeds - actualNextEntryCost);

        return {
            indexName, lotSize, numLots, maxLot, qty,
            targetBuyPrice: pBuy, slippage: sSlip, targetProfitPct: tPct, includeNextFee,
            realizedBuyPrice: rBuy, realizedSellPrice: rSell, requiredTargetSellPrice: pSell,
            buyTurnover, sellTurnover, totalTurnover,
            brokerage, stt, exchangeCharges, sebiCharges, stampDuty, gst,
            totalTaxes, totalSlippageCost, totalSlippagePts,
            grossPnlRealized, netPnlRealized, actualNetRoiPct,
            pointsMoveNeeded, pctMoveNeeded,
            chargesBreakevenPts, totalBreakevenPts, breakevenSellPrice,
            dynamicNextEntryFee, actualNextEntryCost, nextTradeNetCapital
        };
    }

    /**
     * Compounding Velocity & Growth Engine
     */
    function computeCompoundingEngine(params) {
        const cInit = Math.max(1.0, parseFloat(params.initialCap) || 10000.0);
        const cFinal = Math.max(cInit, parseFloat(params.finalCap) || 100000.0);
        const rPct = Math.max(0.001, parseFloat(params.returnPct) || 1.0);
        const dPct = Math.max(0.001, Math.min(100.0, parseFloat(params.deployPct) || 50.0));
        const daysYear = Math.max(1, Math.min(240, parseInt(params.tradingDays) || 200));
        const years = Math.max(0.01, parseFloat(params.years) || 1.0);

        const effectiveRate = (dPct / 100.0) * (rPct / 100.0);
        const exactTrades = (effectiveRate > 0 && cFinal > cInit) ? Math.log(cFinal / cInit) / Math.log(1.0 + effectiveRate) : 0.0;
        const totalTrades = Math.ceil(exactTrades);

        const totalDays = daysYear * years;
        const tradesPerDay = totalDays > 0 ? exactTrades / totalDays : 0.0;
        const tradesPerMonth = years > 0 ? exactTrades / (years * 12.0) : 0.0;
        const tradesPerWeek = years > 0 ? exactTrades / (years * 52.0) : 0.0;

        const totalNetProfit = cFinal - cInit;
        const growthMultiplier = cFinal / cInit;

        return {
            initialCap: cInit, finalCap: cFinal, returnPct: rPct, deployPct: dPct,
            tradingDays: daysYear, years, effectiveRate,
            totalTrades, exactTrades, totalDays,
            tradesPerDay, tradesPerMonth, tradesPerWeek,
            totalNetProfit, growthMultiplier
        };
    }

    // --- DOM RENDERING PROCEDURES ---

    function renderOptions() {
        const res = computeOptionsEngine(optionsState);

        DOM.lblLotMultiple.textContent = `Max ${res.maxLot} Lots (${res.qty} Qty)`;
        DOM.lblRealizedBuy.textContent = `Realized Buy Price: ₹${res.realizedBuyPrice.toFixed(2)} (+₹${res.slippage.toFixed(2)} slip)`;

        DOM.reqSellVal.textContent = `₹${res.requiredTargetSellPrice.toFixed(2)}`;
        DOM.reqSellSub.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> Realized Sell: ₹${res.realizedSellPrice.toFixed(2)}`;

        DOM.realMoveVal.textContent = `+${res.pointsMoveNeeded.toFixed(2)} pts`;
        DOM.realMoveSub.textContent = `▲ +${res.pctMoveNeeded.toFixed(2)}% premium move`;

        DOM.netPnlVal.textContent = `${res.netPnlRealized >= 0 ? '+' : ''}₹${res.netPnlRealized.toFixed(2)}`;
        DOM.netRoiVal.textContent = `${res.actualNetRoiPct >= 0 ? '+' : ''}${res.actualNetRoiPct.toFixed(2)}% Net ROI`;

        if (res.netPnlRealized < 0) {
            DOM.netPnlCard.classList.remove('highlight');
            DOM.netPnlVal.className = 'card-val text-red';
            DOM.netRoiVal.className = 'trend-pill negative';
        } else {
            DOM.netPnlCard.classList.add('highlight');
            DOM.netPnlVal.className = 'card-val text-green';
            DOM.netRoiVal.className = 'trend-pill positive';
        }

        DOM.breakevenSellVal.textContent = `₹${res.breakevenSellPrice.toFixed(2)}`;
        DOM.breakevenSub.textContent = `▲ +${res.totalBreakevenPts.toFixed(2)} pts move needed`;

        DOM.totalDeductionsVal.textContent = `₹${res.totalTaxes.toFixed(2)}`;
        DOM.deductionsSub.textContent = `Tax: ₹${res.totalTaxes.toFixed(2)} | Slip: ₹${res.totalSlippageCost.toFixed(2)}`;

        if (optionsState.includeNextFee) {
            DOM.lblNextEntryFee.textContent = 'Next Entry Fee (Deducted)';
            DOM.nextTradeCostVal.textContent = `₹${res.actualNextEntryCost.toFixed(2)}`;
            DOM.lblCapitalPreserved.textContent = 'Net Capital for Next Trade';
            DOM.nextCapitalVal.textContent = `₹${res.nextTradeNetCapital.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            DOM.lblNextEntryFee.textContent = 'Next Entry Fee (Excluded)';
            DOM.nextTradeCostVal.textContent = `₹0.00`;
            DOM.lblCapitalPreserved.textContent = 'Gross Capital Preserved';
            DOM.nextCapitalVal.textContent = `₹${(res.sellTurnover - res.totalTaxes).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }

    function renderCompounding() {
        const res = computeCompoundingEngine(compoundingState);

        DOM.compEffectiveRate.textContent = `Effective Compound Rate: ${(res.effectiveRate * 100).toFixed(4)}% / trade`;
        DOM.compTotalDays.textContent = `Total Trading Horizon: ${res.totalDays.toFixed(0)} trading days`;

        DOM.compHeroTrades.textContent = `${res.totalTrades} Trades`;
        DOM.compHeroSub.innerHTML = `<i class="fa-solid fa-bolt"></i> ${res.exactTrades.toFixed(2)} exact trades @ ${(res.effectiveRate * 100).toFixed(4)}% rate`;

        DOM.compValPerDay.textContent = `${res.tradesPerDay.toFixed(2)} / day`;
        DOM.compSubPerDay.textContent = `Over ${res.totalDays.toFixed(0)} trading days`;

        DOM.compValPerMonth.textContent = `${res.tradesPerMonth.toFixed(2)} / mo`;
        DOM.compSubPerMonth.textContent = `~${res.tradesPerWeek.toFixed(2)} trades / week`;

        DOM.compValMultiplier.textContent = `${res.growthMultiplier.toFixed(2)}x`;
        DOM.compSubMultiplier.textContent = `₹${res.initialCap.toLocaleString('en-IN')} ➔ ₹${res.finalCap.toLocaleString('en-IN')}`;

        const roiPct = res.initialCap > 0 ? (res.totalNetProfit / res.initialCap) * 100.0 : 0.0;
        DOM.compValNetProfit.textContent = `+₹${res.totalNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        DOM.compSubNetProfit.textContent = `+${roiPct.toFixed(2)}% Net Return`;

        DOM.compSensitivitySummary.textContent = `5 Allocations (10% to 100%)`;
        renderSensitivityGrid(res.initialCap, res.finalCap, res.returnPct, res.tradingDays, res.years, res.deployPct);
    }

    function renderSensitivityGrid(cInit, cFinal, returnPct, tradingDays, years, activeDeployPct) {
        if (!DOM.compSensitivityContainer) return;

        const presets = [10.0, 25.0, 50.0, 75.0, 100.0];
        let html = '';

        presets.forEach(deploy => {
            const subRes = computeCompoundingEngine({
                initialCap: cInit, finalCap: cFinal, returnPct, deployPct: deploy, tradingDays, years
            });
            const isActive = Math.abs(deploy - activeDeployPct) < 0.1;

            html += `
                <div class="sensitivity-cell ${isActive ? 'active' : ''}">
                    <span class="s-pct">${deploy.toFixed(0)}% Deploy</span>
                    <span class="s-trades">${subRes.totalTrades} T</span>
                    <span class="s-daily">${subRes.tradesPerDay.toFixed(2)}/day</span>
                </div>
            `;
        });

        DOM.compSensitivityContainer.innerHTML = html;
    }

    // --- NAVIGATION & INTERACTION CONTROLS ---

    function toggleDrawer(open) {
        if (!DOM.sideDrawer || !DOM.drawerOverlay) return;
        if (open) {
            DOM.sideDrawer.classList.add('active');
            DOM.drawerOverlay.classList.add('active');
            DOM.sideDrawer.setAttribute('aria-hidden', 'false');
        } else {
            DOM.sideDrawer.classList.remove('active');
            DOM.drawerOverlay.classList.remove('active');
            DOM.sideDrawer.setAttribute('aria-hidden', 'true');
        }
    }

    function switchTab(tabName) {
        activeTab = tabName;

        [DOM.tabBtnOptions, DOM.tabBtnCompounding].forEach(btn => { if (btn) btn.classList.remove('active'); });
        [DOM.drawerLinkOptions, DOM.drawerLinkCompounding].forEach(link => { if (link) link.classList.remove('active'); });
        [DOM.viewOptions, DOM.viewCompounding].forEach(view => {
            if (view) {
                view.classList.remove('active');
                view.classList.add('hidden');
            }
        });

        if (tabName === 'options') {
            if (DOM.tabBtnOptions) DOM.tabBtnOptions.classList.add('active');
            if (DOM.drawerLinkOptions) DOM.drawerLinkOptions.classList.add('active');
            if (DOM.viewOptions) {
                DOM.viewOptions.classList.remove('hidden');
                DOM.viewOptions.classList.add('active');
            }
            DOM.headerSubtitle.textContent = 'Target Sell Price & Re-entry Calculator';
            renderOptions();
        } else if (tabName === 'compounding') {
            if (DOM.tabBtnCompounding) DOM.tabBtnCompounding.classList.add('active');
            if (DOM.drawerLinkCompounding) DOM.drawerLinkCompounding.classList.add('active');
            if (DOM.viewCompounding) {
                DOM.viewCompounding.classList.remove('hidden');
                DOM.viewCompounding.classList.add('active');
            }
            DOM.headerSubtitle.textContent = 'Compounding Trade Growth & Velocity Calculator';
            renderCompounding();
        }

        toggleDrawer(false);
    }

    // Nav Pill Listeners
    if (DOM.tabBtnOptions) DOM.tabBtnOptions.addEventListener('click', () => switchTab('options'));
    if (DOM.tabBtnCompounding) DOM.tabBtnCompounding.addEventListener('click', () => switchTab('compounding'));

    // Drawer Listeners
    if (DOM.hamburgerBtn) DOM.hamburgerBtn.addEventListener('click', () => toggleDrawer(true));
    if (DOM.drawerCloseBtn) DOM.drawerCloseBtn.addEventListener('click', () => toggleDrawer(false));
    if (DOM.drawerOverlay) DOM.drawerOverlay.addEventListener('click', () => toggleDrawer(false));
    if (DOM.drawerLinkOptions) DOM.drawerLinkOptions.addEventListener('click', () => switchTab('options'));
    if (DOM.drawerLinkCompounding) DOM.drawerLinkCompounding.addEventListener('click', () => switchTab('compounding'));
    if (DOM.drawerLinkTariff) {
        DOM.drawerLinkTariff.addEventListener('click', () => {
            toggleDrawer(false);
            if (DOM.tariffModal) DOM.tariffModal.style.display = 'flex';
        });
    }

    // Modal & Escape Key Listeners
    if (DOM.tariffTrigger && DOM.tariffModal && DOM.modalCloseBtn) {
        DOM.tariffTrigger.addEventListener('click', () => DOM.tariffModal.style.display = 'flex');
        DOM.modalCloseBtn.addEventListener('click', () => DOM.tariffModal.style.display = 'none');
        DOM.tariffModal.addEventListener('click', (e) => {
            if (e.target === DOM.tariffModal) DOM.tariffModal.style.display = 'none';
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            toggleDrawer(false);
            if (DOM.tariffModal) DOM.tariffModal.style.display = 'none';
        }
    });

    // --- REACTION SYNC HANDLERS ---

    function syncOptionsFromDOM(e) {
        if (optionsState.isInternalUpdating) return;
        const targetId = e && e.target ? e.target.id : null;

        if (targetId === 'num-lots') {
            let lots = parseInt(DOM.numLotsInput.value.trim());
            if (!isNaN(lots) && lots >= 1) {
                if (lots > optionsState.maxLot) lots = optionsState.maxLot;
                optionsState.numLots = lots;
                optionsState.isInternalUpdating = true;
                DOM.buyQtyInput.value = lots * optionsState.lotSize;
                optionsState.isInternalUpdating = false;
            }
        } else if (targetId === 'buy-qty') {
            let qty = parseInt(DOM.buyQtyInput.value.trim());
            if (!isNaN(qty) && qty >= 1) {
                let lots = Math.max(1, Math.min(optionsState.maxLot, Math.round(qty / optionsState.lotSize)));
                optionsState.numLots = lots;
                optionsState.isInternalUpdating = true;
                DOM.numLotsInput.value = lots;
                optionsState.isInternalUpdating = false;
            }
        }

        let buyPrice = parseFloat(DOM.buyPriceInput.value.trim());
        if (!isNaN(buyPrice) && buyPrice >= 0) optionsState.buyPrice = buyPrice;

        let slip = parseFloat(DOM.slippageInput.value.trim());
        if (!isNaN(slip) && slip >= 0) optionsState.slippage = slip;

        let targetPct = parseFloat(DOM.targetProfitPctInput.value.trim());
        if (!isNaN(targetPct) && targetPct >= 0) optionsState.targetProfitPct = targetPct;

        optionsState.includeNextFee = DOM.includeNextFeeToggle ? DOM.includeNextFeeToggle.checked : true;

        DOM.numLotsInput.max = optionsState.maxLot;
        DOM.buyQtyInput.max = optionsState.maxLot * optionsState.lotSize;
        DOM.buyQtyInput.step = optionsState.lotSize;

        renderOptions();
    }

    function syncCompoundingFromDOM() {
        if (compoundingState.isInternalUpdating) return;

        const activeEl = document.activeElement;

        const rawInitStr = DOM.compInitialCapInput.value.trim();
        if (rawInitStr !== '') {
            const parsedInit = parseFloat(rawInitStr);
            if (!isNaN(parsedInit) && parsedInit >= 0) {
                if (activeEl !== DOM.compInitialCapInput || parsedInit >= 100) {
                    compoundingState.initialCap = parsedInit;
                }
            }
        }

        const rawFinalStr = DOM.compFinalCapInput.value.trim();
        if (rawFinalStr !== '') {
            const parsedFinal = parseFloat(rawFinalStr);
            if (!isNaN(parsedFinal) && parsedFinal >= 0) {
                compoundingState.finalCap = parsedFinal;
            }
        }

        if (compoundingState.finalCap < compoundingState.initialCap) {
            compoundingState.finalCap = compoundingState.initialCap;
            DOM.compFinalCapInput.value = compoundingState.initialCap.toString();
        }

        const rawRetStr = DOM.compReturnPctInput.value.trim();
        if (rawRetStr !== '') {
            const parsedRet = parseFloat(rawRetStr);
            if (!isNaN(parsedRet) && parsedRet >= 0) {
                if (activeEl !== DOM.compReturnPctInput || (!rawRetStr.endsWith('.') && parsedRet > 0)) {
                    compoundingState.returnPct = parsedRet;
                }
            }
        }

        const rawDeployStr = DOM.compDeployPctInput.value.trim();
        if (rawDeployStr !== '') {
            const parsedDeploy = parseFloat(rawDeployStr);
            if (!isNaN(parsedDeploy) && parsedDeploy >= 0) {
                compoundingState.deployPct = Math.min(100.0, parsedDeploy);
            }
        }

        const rawDaysStr = DOM.compTradingDaysInput.value.trim();
        if (rawDaysStr !== '') {
            const parsedDays = parseInt(rawDaysStr);
            if (!isNaN(parsedDays) && parsedDays >= 1) {
                compoundingState.tradingDays = Math.min(240, parsedDays);
            }
        }

        const rawYrsStr = DOM.compYearsInput.value.trim();
        if (rawYrsStr !== '') {
            const parsedYrs = parseFloat(rawYrsStr);
            if (!isNaN(parsedYrs) && parsedYrs > 0) {
                if (activeEl !== DOM.compYearsInput || !rawYrsStr.endsWith('.')) {
                    compoundingState.years = Math.min(50.0, parsedYrs);
                }
            }
        }

        renderCompounding();
    }

    // Attach Event Listeners
    ['input', 'change'].forEach(evt => {
        if (DOM.numLotsInput) DOM.numLotsInput.addEventListener(evt, syncOptionsFromDOM);
        if (DOM.buyQtyInput) DOM.buyQtyInput.addEventListener(evt, syncOptionsFromDOM);
        if (DOM.buyPriceInput) DOM.buyPriceInput.addEventListener(evt, syncOptionsFromDOM);
        if (DOM.slippageInput) DOM.slippageInput.addEventListener(evt, syncOptionsFromDOM);
        if (DOM.targetProfitPctInput) DOM.targetProfitPctInput.addEventListener(evt, syncOptionsFromDOM);

        if (DOM.compInitialCapInput) DOM.compInitialCapInput.addEventListener(evt, syncCompoundingFromDOM);
        if (DOM.compFinalCapInput) DOM.compFinalCapInput.addEventListener(evt, syncCompoundingFromDOM);
        if (DOM.compReturnPctInput) DOM.compReturnPctInput.addEventListener(evt, syncCompoundingFromDOM);
        if (DOM.compDeployPctInput) DOM.compDeployPctInput.addEventListener(evt, syncCompoundingFromDOM);
        if (DOM.compTradingDaysInput) DOM.compTradingDaysInput.addEventListener(evt, syncCompoundingFromDOM);
        if (DOM.compYearsInput) DOM.compYearsInput.addEventListener(evt, syncCompoundingFromDOM);
    });

    if (DOM.includeNextFeeToggle) {
        DOM.includeNextFeeToggle.addEventListener('change', syncOptionsFromDOM);
    }

    // Preset Chips Listeners
    DOM.compDeployChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const depVal = parseFloat(chip.getAttribute('data-deploy'));
            if (!isNaN(depVal)) {
                compoundingState.deployPct = depVal;
                DOM.compDeployPctInput.value = depVal;
                syncCompoundingFromDOM();
            }
        });
    });

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
            if (!isNaN(pctVal)) {
                DOM.targetProfitPctInput.value = pctVal;
                syncOptionsFromDOM();
            }
        });
    });

    // Reset Button
    if (DOM.resetBtn) {
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
                DOM.buyQtyInput.value = 65;
                DOM.buyPriceInput.value = "100.00";
                DOM.slippageInput.value = "0.50";
                DOM.targetProfitPctInput.value = "0.0";
                if (DOM.includeNextFeeToggle) DOM.includeNextFeeToggle.checked = true;

                renderOptions();
            } else if (activeTab === 'compounding') {
                compoundingState.initialCap = 10000.0;
                compoundingState.finalCap = 100000.0;
                compoundingState.returnPct = 1.0;
                compoundingState.deployPct = 50.0;
                compoundingState.tradingDays = 200;
                compoundingState.years = 1.0;

                DOM.compInitialCapInput.value = "10000";
                DOM.compFinalCapInput.value = "100000";
                DOM.compReturnPctInput.value = "1.0";
                DOM.compDeployPctInput.value = "50.0";
                DOM.compTradingDaysInput.value = "200";
                DOM.compYearsInput.value = "1.0";

                renderCompounding();
            }
        });
    }

    // Initial Render & Deep-linking
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab');
    if (initialTab === 'compounding') {
        switchTab('compounding');
    } else {
        renderOptions();
    }
});
