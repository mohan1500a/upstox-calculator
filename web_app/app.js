/**
 * Upstox Options, Compounding & Financial Vocabulary Calculator Suite (Official 2026 Rules)
 * Includes:
 * 1. Options Target Sell Price & Re-entry Engine
 * 2. Compounding Velocity 200-Day Target Growth Engine
 * 3. Level 0 Financial Vocabulary, Accounting & Microstructure Engine
 * 4. Hamburger Side Drawer Navigation & Lumos UI Framework
 *
 * Author: Antigravity AI Pair Programmer
 * Version: 30.0 (Level 0 Financial Vocabulary & Hamburger Drawer)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REGISTRY ---
    const DOM = {
        // Tab Navigation & Header
        tabBtnOptions: document.getElementById('tab-btn-options'),
        tabBtnCompounding: document.getElementById('tab-btn-compounding'),
        tabBtnFinancial: document.getElementById('tab-btn-financial'),
        viewOptions: document.getElementById('view-options'),
        viewCompounding: document.getElementById('view-compounding'),
        viewFinancial: document.getElementById('view-financial'),
        headerSubtitle: document.getElementById('header-subtitle'),
        resetBtn: document.getElementById('reset-btn'),

        // Hamburger Menu & Side Drawer
        hamburgerBtn: document.getElementById('hamburger-btn'),
        sideDrawer: document.getElementById('side-drawer'),
        drawerOverlay: document.getElementById('drawer-overlay'),
        drawerCloseBtn: document.getElementById('drawer-close-btn'),
        drawerLinkOptions: document.getElementById('drawer-link-options'),
        drawerLinkCompounding: document.getElementById('drawer-link-compounding'),
        drawerLinkFinancial: document.getElementById('drawer-link-financial'),
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

        // Financial Vocabulary Level 0 Inputs
        finCashInput: document.getElementById('fin-cash'),
        finPlantInput: document.getElementById('fin-plant'),
        finInventoryInput: document.getElementById('fin-inventory'),
        finReceivablesInput: document.getElementById('fin-receivables'),
        finLiabilitiesInput: document.getElementById('fin-liabilities'),
        finSharePriceInput: document.getElementById('fin-share-price'),
        finSharesOutInput: document.getElementById('fin-shares-out'),
        finBidPriceInput: document.getElementById('fin-bid-price'),
        finAskPriceInput: document.getElementById('fin-ask-price'),

        // Financial Vocabulary Level 0 Outputs
        finHeroEquity: document.getElementById('fin-hero-equity'),
        finHeroSub: document.getElementById('fin-hero-sub'),
        finValMarketCap: document.getElementById('fin-val-market-cap'),
        finSubMarketCap: document.getElementById('fin-sub-market-cap'),
        finValBvps: document.getElementById('fin-val-bvps'),
        finSubBvps: document.getElementById('fin-sub-bvps'),
        finValPb: document.getElementById('fin-val-pb'),
        finSubPb: document.getElementById('fin-sub-pb'),
        finValSpread: document.getElementById('fin-val-spread'),
        finSubSpread: document.getElementById('fin-sub-spread'),

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
        initialCap: 10000.0,
        finalCap: 100000.0,
        returnPct: 1.0,
        deployPct: 50.0,
        tradingDays: 200,
        years: 1.0,
        isInternalUpdating: false
    };

    const financialState = {
        cash: 200000000.0,
        plant: 500000000.0,
        inventory: 100000000.0,
        receivables: 200000000.0,
        liabilities: 400000000.0,
        sharePrice: 25.0,
        sharesOutstanding: 60000000.0,
        bidPrice: 100.0,
        askPrice: 100.10,
        isInternalUpdating: false
    };

    let activeTab = 'options';

    // --- FORMATTING HELPERS ---
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
        if (val >= 10000000) return '₹' + (val / 10000000).toFixed(1) + ' Cr';
        if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' Lakh';
        if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
        return '₹' + val.toFixed(0);
    }

    // Dynamic Step Scaling (1K -> 10K -> 1L -> 1Cr -> 10Cr)
    function getDynamicStep(val) {
        if (isNaN(val) || val <= 0) return 1000;
        const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
        return Math.max(1000, magnitude);
    }

    function attachDynamicControls(inputEl, onSync) {
        if (!inputEl) return;

        inputEl.addEventListener('wheel', (e) => {
            e.preventDefault();
            let val = parseFloat(inputEl.value.trim());
            if (isNaN(val)) val = 0;
            const step = getDynamicStep(val);

            if (e.deltaY < 0) {
                val += step;
            } else if (e.deltaY > 0) {
                val = Math.max(0, val - step);
            }

            inputEl.value = val.toString();
            if (typeof onSync === 'function') {
                onSync();
            }
        }, { passive: false });

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                let val = parseFloat(inputEl.value.trim());
                if (isNaN(val)) val = 0;
                const step = getDynamicStep(val);

                if (e.key === 'ArrowUp') {
                    val += step;
                } else if (e.key === 'ArrowDown') {
                    val = Math.max(0, val - step);
                }

                inputEl.value = val.toString();
                if (typeof onSync === 'function') {
                    onSync();
                }
            }
        });
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
            actualNextTradeEntryCost, nextTradeNetCapital, buyTurnover
        };
    }

    // --- COMPOUNDING VELOCITY SOLVER ---
    function computeCompoundingVelocity(params) {
        let cInit = Math.max(0.01, params.initialCap);
        let cFinal = Math.max(0.01, params.finalCap);

        if (cFinal < cInit) {
            cFinal = cInit;
        }

        const rPct = Math.max(0.0, params.returnPct);
        const dPct = Math.max(0.0, Math.min(100.0, params.deployPct));
        const daysYear = Math.max(1, Math.min(240, params.tradingDays));
        const yrs = Math.max(0.01, params.years);

        const effectiveRate = (dPct / 100.0) * (rPct / 100.0);

        let exactTrades = 0.0;
        let isGoalValid = true;

        if (cFinal <= cInit) {
            isGoalValid = true;
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

        const sensitivities = [];
        const deploySteps = [10, 25, 50, 75, 100];

        deploySteps.forEach(deployVal => {
            const effRate = (deployVal / 100.0) * (rPct / 100.0);
            let trades = 0;
            let perDay = 0.0;
            if (isGoalValid && effRate > 0 && cFinal > cInit) {
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

    // --- LEVEL 0 FINANCIAL VOCABULARY SOLVER ---
    function computeFinancialVocabulary(params) {
        const cash = Math.max(0.0, params.cash);
        const plant = Math.max(0.0, params.plant);
        const inventory = Math.max(0.0, params.inventory);
        const receivables = Math.max(0.0, params.receivables);
        const liabilities = Math.max(0.0, params.liabilities);

        const totalAssets = cash + plant + inventory + receivables;
        const bookEquity = totalAssets - liabilities;
        const deRatio = bookEquity > 0 ? liabilities / bookEquity : 0.0;

        const price = Math.max(0.01, params.sharePrice);
        const shares = Math.max(1.0, params.sharesOutstanding);
        const marketCap = price * shares;
        const bvps = shares > 0 ? bookEquity / shares : 0.0;
        const pbRatio = bookEquity > 0 ? marketCap / bookEquity : 0.0;

        const bid = Math.max(0.0, params.bidPrice);
        const ask = Math.max(bid, params.askPrice);
        const spread = ask - bid;
        const midPrice = (bid + ask) / 2.0;
        const spreadPct = midPrice > 0 ? (spread / midPrice) * 100.0 : 0.0;
        const spreadBps = spreadPct * 100.0;

        return {
            totalAssets, bookEquity, deRatio, price, shares,
            marketCap, bvps, pbRatio, bid, ask, spread, midPrice,
            spreadPct, spreadBps
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
        if (DOM.lblNextEntryFee) DOM.lblNextEntryFee.textContent = formatINR(calc.actualNextTradeEntryCost);
        if (DOM.lblCapitalPreserved) {
            const yieldPct = calc.buyTurnover > 0 ? ((calc.nextTradeNetCapital / calc.buyTurnover) * 100).toFixed(1) : '100.0';
            DOM.lblCapitalPreserved.textContent = `${yieldPct}%`;
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

    function renderCompounding() {
        const calc = computeCompoundingVelocity(compoundingState);

        DOM.compEffectiveRate.textContent = `${(calc.effectiveRate * 100).toFixed(3)}% / trade`;
        DOM.compTotalDays.textContent = `${calc.totalDays.toFixed(0)} trading days`;

        if (calc.isGoalValid) {
            if (calc.cFinal <= calc.cInit) {
                DOM.compHeroTrades.textContent = `0 Trades`;
                DOM.compHeroSub.innerHTML = `<i class="fa-solid fa-check-circle text-green"></i> Target capital matches initial capital (0 trades needed)`;
            } else {
                DOM.compHeroTrades.textContent = `${calc.totalTrades.toLocaleString('en-IN')} Trades`;
                DOM.compHeroSub.innerHTML = `<i class="fa-solid fa-bolt"></i> Needs ${calc.tradesPerDay.toFixed(2)} trades / day across ${calc.totalDays.toFixed(0)} trading days`;
            }
        } else {
            DOM.compHeroTrades.textContent = `0 Trades`;
            DOM.compHeroSub.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Net return % must be greater than 0`;
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

        DOM.compDeployChips.forEach(chip => {
            const depVal = parseFloat(chip.getAttribute('data-deploy'));
            if (!isNaN(depVal) && Math.abs(depVal - compoundingState.deployPct) < 0.1) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    function renderFinancialVocabulary() {
        const calc = computeFinancialVocabulary(financialState);

        DOM.finHeroEquity.textContent = formatShortINR(calc.bookEquity);
        DOM.finHeroSub.innerHTML = `<i class="fa-solid fa-coins"></i> Total Assets ${formatShortINR(calc.totalAssets)} | Liabilities ${formatShortINR(financialState.liabilities)} (D/E Ratio: ${calc.deRatio.toFixed(2)}x)`;

        DOM.finValMarketCap.textContent = formatShortINR(calc.marketCap);
        DOM.finSubMarketCap.textContent = `▲ P = ${formatINR(calc.price)} × ${(calc.shares / 10000000).toFixed(1)} Cr Shares`;

        DOM.finValBvps.textContent = `${formatINR(calc.bvps)} / sh`;
        DOM.finSubBvps.textContent = `Book Equity / ${(calc.shares / 10000000).toFixed(1)} Cr Shares`;

        DOM.finValPb.textContent = `${calc.pbRatio.toFixed(2)}x`;
        DOM.finSubPb.textContent = `Market Cap / Book Equity`;

        DOM.finValSpread.textContent = formatINR(calc.spread);
        DOM.finSubSpread.textContent = `Mid: ${formatINR(calc.midPrice)} (${calc.spreadBps.toFixed(0)} bps / ${calc.spreadPct.toFixed(2)}%)`;
    }

    // --- HAMBURGER DRAWER & TAB SWITCHING LOGIC ---
    function toggleDrawer(open) {
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

        // Reset active tabs & views
        [DOM.tabBtnOptions, DOM.tabBtnCompounding, DOM.tabBtnFinancial].forEach(btn => btn && btn.classList.remove('active'));
        [DOM.viewOptions, DOM.viewCompounding, DOM.viewFinancial].forEach(view => {
            if (view) {
                view.classList.add('hidden');
                view.classList.remove('active');
            }
        });
        [DOM.drawerLinkOptions, DOM.drawerLinkCompounding, DOM.drawerLinkFinancial].forEach(link => link && link.classList.remove('active'));

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
        } else if (tabName === 'financial') {
            if (DOM.tabBtnFinancial) DOM.tabBtnFinancial.classList.add('active');
            if (DOM.drawerLinkFinancial) DOM.drawerLinkFinancial.classList.add('active');
            if (DOM.viewFinancial) {
                DOM.viewFinancial.classList.remove('hidden');
                DOM.viewFinancial.classList.add('active');
            }
            DOM.headerSubtitle.textContent = 'Level 0 Financial Vocabulary & Microstructure Engine';
            renderFinancialVocabulary();
        }

        toggleDrawer(false);
    }

    // Attach Nav Pills Listeners
    if (DOM.tabBtnOptions) DOM.tabBtnOptions.addEventListener('click', () => switchTab('options'));
    if (DOM.tabBtnCompounding) DOM.tabBtnCompounding.addEventListener('click', () => switchTab('compounding'));
    if (DOM.tabBtnFinancial) DOM.tabBtnFinancial.addEventListener('click', () => switchTab('financial'));

    // Attach Drawer Links Listeners
    if (DOM.hamburgerBtn) DOM.hamburgerBtn.addEventListener('click', () => toggleDrawer(true));
    if (DOM.drawerCloseBtn) DOM.drawerCloseBtn.addEventListener('click', () => toggleDrawer(false));
    if (DOM.drawerOverlay) DOM.drawerOverlay.addEventListener('click', () => toggleDrawer(false));
    if (DOM.drawerLinkOptions) DOM.drawerLinkOptions.addEventListener('click', () => switchTab('options'));
    if (DOM.drawerLinkCompounding) DOM.drawerLinkCompounding.addEventListener('click', () => switchTab('compounding'));
    if (DOM.drawerLinkFinancial) DOM.drawerLinkFinancial.addEventListener('click', () => switchTab('financial'));
    if (DOM.drawerLinkTariff) {
        DOM.drawerLinkTariff.addEventListener('click', () => {
            toggleDrawer(false);
            if (DOM.tariffModal) DOM.tariffModal.style.display = 'flex';
        });
    }

    // Keydown Esc listener for drawer & modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            toggleDrawer(false);
            if (DOM.tariffModal) DOM.tariffModal.style.display = 'none';
        }
    });

    // --- DYNAMIC STEPPING CONTROLS ---
    attachDynamicControls(DOM.compInitialCapInput, syncCompoundingFromDOM);
    attachDynamicControls(DOM.compFinalCapInput, syncCompoundingFromDOM);
    attachDynamicControls(DOM.finCashInput, syncFinancialFromDOM);
    attachDynamicControls(DOM.finPlantInput, syncFinancialFromDOM);
    attachDynamicControls(DOM.finLiabilitiesInput, syncFinancialFromDOM);
    attachDynamicControls(DOM.finSharesOutInput, syncFinancialFromDOM);

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
        if (!isNaN(buyPrice) && buyPrice >= 0) {
            optionsState.buyPrice = buyPrice;
        }

        let slip = parseFloat(DOM.slippageInput.value.trim());
        if (!isNaN(slip) && slip >= 0) {
            optionsState.slippage = slip;
        }

        let targetPct = parseFloat(DOM.targetProfitPctInput.value.trim());
        if (!isNaN(targetPct) && targetPct >= 0) {
            optionsState.targetProfitPct = targetPct;
        }

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
                if (activeEl === DOM.compInitialCapInput && parsedInit < 100) {
                } else {
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
                if (activeEl === DOM.compReturnPctInput && (parsedRet <= 0 || rawRetStr.endsWith('.'))) {
                } else {
                    compoundingState.returnPct = parsedRet;
                }
            }
        }

        const rawDeployStr = DOM.compDeployPctInput.value.trim();
        if (rawDeployStr !== '') {
            const parsedDeploy = parseFloat(rawDeployStr);
            if (!isNaN(parsedDeploy) && parsedDeploy >= 0) {
                if (activeEl === DOM.compDeployPctInput && parsedDeploy < 1) {
                } else {
                    compoundingState.deployPct = Math.min(100.0, parsedDeploy);
                }
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
                if (activeEl === DOM.compYearsInput && rawYrsStr.endsWith('.')) {
                } else {
                    compoundingState.years = Math.min(50.0, parsedYrs);
                }
            }
        }

        renderCompounding();
    }

    function syncFinancialFromDOM() {
        if (financialState.isInternalUpdating) return;

        const parseVal = (inputEl, fallback) => {
            if (!inputEl) return fallback;
            const str = inputEl.value.trim();
            const val = parseFloat(str);
            return (!isNaN(val) && val >= 0) ? val : fallback;
        };

        financialState.cash = parseVal(DOM.finCashInput, financialState.cash);
        financialState.plant = parseVal(DOM.finPlantInput, financialState.plant);
        financialState.inventory = parseVal(DOM.finInventoryInput, financialState.inventory);
        financialState.receivables = parseVal(DOM.finReceivablesInput, financialState.receivables);
        financialState.liabilities = parseVal(DOM.finLiabilitiesInput, financialState.liabilities);
        financialState.sharePrice = parseVal(DOM.finSharePriceInput, financialState.sharePrice);
        financialState.sharesOutstanding = parseVal(DOM.finSharesOutInput, financialState.sharesOutstanding);
        financialState.bidPrice = parseVal(DOM.finBidPriceInput, financialState.bidPrice);
        financialState.askPrice = parseVal(DOM.finAskPriceInput, financialState.askPrice);

        renderFinancialVocabulary();
    }

    // Attach Reaction Listeners
    ['input', 'change'].forEach(evt => {
        DOM.numLotsInput.addEventListener(evt, syncOptionsFromDOM);
        DOM.buyQtyInput.addEventListener(evt, syncOptionsFromDOM);
        DOM.buyPriceInput.addEventListener(evt, syncOptionsFromDOM);
        DOM.slippageInput.addEventListener(evt, syncOptionsFromDOM);
        DOM.targetProfitPctInput.addEventListener(evt, syncOptionsFromDOM);

        DOM.compInitialCapInput.addEventListener(evt, syncCompoundingFromDOM);
        DOM.compFinalCapInput.addEventListener(evt, syncCompoundingFromDOM);
        DOM.compReturnPctInput.addEventListener(evt, syncCompoundingFromDOM);
        DOM.compDeployPctInput.addEventListener(evt, syncCompoundingFromDOM);
        DOM.compTradingDaysInput.addEventListener(evt, syncCompoundingFromDOM);
        DOM.compYearsInput.addEventListener(evt, syncCompoundingFromDOM);

        if (DOM.finCashInput) DOM.finCashInput.addEventListener(evt, syncFinancialFromDOM);
        if (DOM.finPlantInput) DOM.finPlantInput.addEventListener(evt, syncFinancialFromDOM);
        if (DOM.finInventoryInput) DOM.finInventoryInput.addEventListener(evt, syncFinancialFromDOM);
        if (DOM.finReceivablesInput) DOM.finReceivablesInput.addEventListener(evt, syncFinancialFromDOM);
        if (DOM.finLiabilitiesInput) DOM.finLiabilitiesInput.addEventListener(evt, syncFinancialFromDOM);
        if (DOM.finSharePriceInput) DOM.finSharePriceInput.addEventListener(evt, syncFinancialFromDOM);
        if (DOM.finSharesOutInput) DOM.finSharesOutInput.addEventListener(evt, syncFinancialFromDOM);
        if (DOM.finBidPriceInput) DOM.finBidPriceInput.addEventListener(evt, syncFinancialFromDOM);
        if (DOM.finAskPriceInput) DOM.finAskPriceInput.addEventListener(evt, syncFinancialFromDOM);
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

    // Tariff Modal Listeners
    if (DOM.tariffTrigger && DOM.tariffModal && DOM.modalCloseBtn) {
        DOM.tariffTrigger.addEventListener('click', () => DOM.tariffModal.style.display = 'flex');
        DOM.modalCloseBtn.addEventListener('click', () => DOM.tariffModal.style.display = 'none');
        DOM.tariffModal.addEventListener('click', (e) => {
            if (e.target === DOM.tariffModal) DOM.tariffModal.style.display = 'none';
        });
    }

    // Reset Button
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
        } else if (activeTab === 'financial') {
            financialState.cash = 200000000.0;
            financialState.plant = 500000000.0;
            financialState.inventory = 100000000.0;
            financialState.receivables = 200000000.0;
            financialState.liabilities = 400000000.0;
            financialState.sharePrice = 25.0;
            financialState.sharesOutstanding = 60000000.0;
            financialState.bidPrice = 100.0;
            financialState.askPrice = 100.10;

            DOM.finCashInput.value = "200000000";
            DOM.finPlantInput.value = "500000000";
            DOM.finInventoryInput.value = "100000000";
            DOM.finReceivablesInput.value = "200000000";
            DOM.finLiabilitiesInput.value = "400000000";
            DOM.finSharePriceInput.value = "25.00";
            DOM.finSharesOutInput.value = "60000000";
            DOM.finBidPriceInput.value = "100.00";
            DOM.finAskPriceInput.value = "100.10";

            renderFinancialVocabulary();
        }
    });

    // Initial Render
    renderOptions();
});
