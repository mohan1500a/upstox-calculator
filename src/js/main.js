/**
 * Upstox Options & Compounding Suite - Application Entry Point
 * Industrial Modular Architecture with Strict Financial Precision
 */

import { DEFAULT_OPTIONS_STATE, DEFAULT_COMPOUNDING_STATE } from './config/constants.js';
import { getDOMElements } from './ui/domElements.js';
import { renderOptions, renderCompounding, setupTariffModal } from './ui/renderers.js';

document.addEventListener('DOMContentLoaded', () => {
    const DOM = getDOMElements();

    // Application State Stores
    const optionsState = { ...DEFAULT_OPTIONS_STATE, isInternalUpdating: false };
    const compoundingState = { ...DEFAULT_COMPOUNDING_STATE, isInternalUpdating: false };
    let activeTab = 'options';

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
            renderOptions(optionsState, DOM);
        } else {
            DOM.tabBtnCompounding.classList.add('active');
            DOM.tabBtnOptions.classList.remove('active');
            DOM.viewCompounding.classList.remove('hidden');
            DOM.viewCompounding.classList.add('active');
            DOM.viewOptions.classList.add('hidden');
            DOM.viewOptions.classList.remove('active');
            DOM.headerSubtitle.textContent = 'Compounding Trade Growth & Velocity Calculator';
            renderCompounding(compoundingState, DOM);
        }
    }

    DOM.tabBtnOptions.addEventListener('click', () => switchTab('options'));
    DOM.tabBtnCompounding.addEventListener('click', () => switchTab('compounding'));

    // --- OPTIONS INPUT SYNCHRONIZATION ---
    function syncOptionsFromDOM(e) {
        if (optionsState.isInternalUpdating) return;
        const targetId = e && e.target ? e.target.id : null;

        if (targetId === 'num-lots') {
            let lots = parseInt(DOM.numLotsInput.value.trim(), 10);
            if (!isNaN(lots) && lots >= 1) {
                if (lots > optionsState.maxLot) lots = optionsState.maxLot;
                optionsState.numLots = lots;
                optionsState.isInternalUpdating = true;
                DOM.buyQtyInput.value = lots * optionsState.lotSize;
                optionsState.isInternalUpdating = false;
            }
        } else if (targetId === 'buy-qty') {
            let qty = parseInt(DOM.buyQtyInput.value.trim(), 10);
            if (!isNaN(qty) && qty >= 1) {
                let lots = Math.max(1, Math.min(optionsState.maxLot, Math.round(qty / optionsState.lotSize)));
                optionsState.numLots = lots;
                optionsState.isInternalUpdating = true;
                DOM.numLotsInput.value = lots;
                optionsState.isInternalUpdating = false;
            }
        }

        const buyPrice = parseFloat(DOM.buyPriceInput.value.trim());
        if (!isNaN(buyPrice) && buyPrice >= 0) {
            optionsState.buyPrice = buyPrice;
        }

        const slip = parseFloat(DOM.slippageInput.value.trim());
        if (!isNaN(slip) && slip >= 0) {
            optionsState.slippage = slip;
        }

        const targetPct = parseFloat(DOM.targetProfitPctInput.value.trim());
        if (!isNaN(targetPct) && targetPct >= 0) {
            optionsState.targetProfitPct = targetPct;
        }

        optionsState.includeNextFee = DOM.includeNextFeeToggle ? DOM.includeNextFeeToggle.checked : true;

        DOM.numLotsInput.max = optionsState.maxLot;
        DOM.buyQtyInput.max = optionsState.maxLot * optionsState.lotSize;
        DOM.buyQtyInput.step = optionsState.lotSize;

        renderOptions(optionsState, DOM);
    }

    // --- COMPOUNDING INPUT SYNCHRONIZATION ---
    function syncCompoundingFromDOM() {
        if (compoundingState.isInternalUpdating) return;

        const activeEl = document.activeElement;

        // 1. Initial Capital
        const rawInitStr = DOM.compInitialCapInput.value.trim();
        if (rawInitStr !== '') {
            const parsedInit = parseFloat(rawInitStr);
            if (!isNaN(parsedInit) && parsedInit >= 0) {
                if (activeEl === DOM.compInitialCapInput && parsedInit < 100) {
                    // Retain existing state during typing
                } else {
                    compoundingState.initialCap = parsedInit;
                }
            }
        }

        // 2. Target Capital
        const rawFinalStr = DOM.compFinalCapInput.value.trim();
        if (rawFinalStr !== '') {
            const parsedFinal = parseFloat(rawFinalStr);
            if (!isNaN(parsedFinal) && parsedFinal >= 0) {
                compoundingState.finalCap = parsedFinal;
            }
        }

        // Automatic condition: Target Capital MUST be >= Initial Capital
        if (compoundingState.finalCap < compoundingState.initialCap) {
            compoundingState.finalCap = compoundingState.initialCap;
            DOM.compFinalCapInput.value = compoundingState.initialCap.toString();
        }

        // 3. Net Return % per Trade
        const rawRetStr = DOM.compReturnPctInput.value.trim();
        if (rawRetStr !== '') {
            const parsedRet = parseFloat(rawRetStr);
            if (!isNaN(parsedRet) && parsedRet >= 0) {
                if (activeEl === DOM.compReturnPctInput && (parsedRet <= 0 || rawRetStr.endsWith('.'))) {
                    // Retain during typing
                } else {
                    compoundingState.returnPct = parsedRet;
                }
            }
        }

        // 4. Capital Deployed %
        const rawDeployStr = DOM.compDeployPctInput.value.trim();
        if (rawDeployStr !== '') {
            const parsedDeploy = parseFloat(rawDeployStr);
            if (!isNaN(parsedDeploy) && parsedDeploy >= 0) {
                if (activeEl === DOM.compDeployPctInput && parsedDeploy < 1) {
                    // Retain during typing
                } else {
                    compoundingState.deployPct = Math.min(100.0, parsedDeploy);
                }
            }
        }

        // 5. Trading Days
        const rawDaysStr = DOM.compTradingDaysInput.value.trim();
        if (rawDaysStr !== '') {
            const parsedDays = parseInt(rawDaysStr, 10);
            if (!isNaN(parsedDays) && parsedDays >= 1) {
                compoundingState.tradingDaysPerYear = Math.min(240, parsedDays);
            }
        }

        // 6. Time Horizon (Years)
        const rawYrsStr = DOM.compYearsInput.value.trim();
        if (rawYrsStr !== '') {
            const parsedYrs = parseFloat(rawYrsStr);
            if (!isNaN(parsedYrs) && parsedYrs > 0) {
                if (activeEl === DOM.compYearsInput && rawYrsStr.endsWith('.')) {
                    // Trailing decimal
                } else {
                    compoundingState.years = Math.min(50.0, parsedYrs);
                }
            }
        }

        renderCompounding(compoundingState, DOM);
    }

    // Dynamic Stepper on Mouse Wheel & Arrow Keys
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
            if (typeof onSync === 'function') onSync();
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
                if (typeof onSync === 'function') onSync();
            }
        });
    }

    attachDynamicControls(DOM.compInitialCapInput, syncCompoundingFromDOM);
    attachDynamicControls(DOM.compFinalCapInput, syncCompoundingFromDOM);

    // Event Listener Registrations
    [DOM.numLotsInput, DOM.buyQtyInput, DOM.buyPriceInput, DOM.slippageInput, DOM.targetProfitPctInput].forEach(el => {
        if (el) el.addEventListener('input', syncOptionsFromDOM);
    });

    if (DOM.includeNextFeeToggle) {
        DOM.includeNextFeeToggle.addEventListener('change', syncOptionsFromDOM);
    }

    [DOM.compInitialCapInput, DOM.compFinalCapInput, DOM.compReturnPctInput, DOM.compDeployPctInput, DOM.compTradingDaysInput, DOM.compYearsInput].forEach(el => {
        if (el) el.addEventListener('input', syncCompoundingFromDOM);
    });

    // Options Normalization on Blur
    DOM.numLotsInput.addEventListener('blur', () => {
        const valStr = DOM.numLotsInput.value.trim();
        let val = parseInt(valStr, 10);
        if (valStr === '' || isNaN(val) || val < 1) {
            val = 1;
        } else if (val > optionsState.maxLot) {
            val = optionsState.maxLot;
        }
        DOM.numLotsInput.value = val;
        optionsState.numLots = val;
        DOM.buyQtyInput.value = val * optionsState.lotSize;
        renderOptions(optionsState, DOM);
    });

    DOM.buyQtyInput.addEventListener('blur', () => {
        const valStr = DOM.buyQtyInput.value.trim();
        let val = parseInt(valStr, 10);
        if (valStr === '' || isNaN(val) || val < optionsState.lotSize) {
            optionsState.numLots = 1;
        } else {
            let lots = Math.max(1, Math.min(optionsState.maxLot, Math.round(val / optionsState.lotSize)));
            optionsState.numLots = lots;
        }
        DOM.numLotsInput.value = optionsState.numLots;
        DOM.buyQtyInput.value = optionsState.numLots * optionsState.lotSize;
        renderOptions(optionsState, DOM);
    });

    DOM.buyPriceInput.addEventListener('blur', () => {
        const valStr = DOM.buyPriceInput.value.trim();
        const val = parseFloat(valStr);
        if (valStr === '' || isNaN(val) || val < 0) {
            DOM.buyPriceInput.value = '100.00';
            optionsState.buyPrice = 100.00;
        } else {
            optionsState.buyPrice = val;
        }
        renderOptions(optionsState, DOM);
    });

    DOM.slippageInput.addEventListener('blur', () => {
        const valStr = DOM.slippageInput.value.trim();
        const val = parseFloat(valStr);
        if (valStr === '' || isNaN(val) || val < 0) {
            DOM.slippageInput.value = '0.50';
            optionsState.slippage = 0.50;
        } else {
            optionsState.slippage = val;
        }
        renderOptions(optionsState, DOM);
    });

    DOM.targetProfitPctInput.addEventListener('blur', () => {
        const valStr = DOM.targetProfitPctInput.value.trim();
        const val = parseFloat(valStr);
        if (valStr === '' || isNaN(val) || val < 0) {
            DOM.targetProfitPctInput.value = '0.0';
            optionsState.targetProfitPct = 0.0;
        } else {
            optionsState.targetProfitPct = val;
        }
        renderOptions(optionsState, DOM);
    });

    // Compounding Normalization on Blur
    DOM.compInitialCapInput.addEventListener('blur', () => {
        const valStr = DOM.compInitialCapInput.value.trim();
        const val = parseFloat(valStr);
        if (valStr === '' || isNaN(val) || val < 100) {
            DOM.compInitialCapInput.value = '10000';
            compoundingState.initialCap = 10000.0;
        } else {
            compoundingState.initialCap = val;
        }
        if (compoundingState.finalCap < compoundingState.initialCap) {
            compoundingState.finalCap = compoundingState.initialCap;
            DOM.compFinalCapInput.value = compoundingState.initialCap.toString();
        }
        renderCompounding(compoundingState, DOM);
    });

    DOM.compFinalCapInput.addEventListener('blur', () => {
        const valStr = DOM.compFinalCapInput.value.trim();
        const val = parseFloat(valStr);
        if (valStr === '' || isNaN(val) || val < compoundingState.initialCap) {
            DOM.compFinalCapInput.value = compoundingState.initialCap.toString();
            compoundingState.finalCap = compoundingState.initialCap;
        } else {
            compoundingState.finalCap = val;
        }
        renderCompounding(compoundingState, DOM);
    });

    DOM.compReturnPctInput.addEventListener('blur', () => {
        const valStr = DOM.compReturnPctInput.value.trim();
        const val = parseFloat(valStr);
        if (valStr === '' || isNaN(val) || val <= 0) {
            DOM.compReturnPctInput.value = '1.0';
            compoundingState.returnPct = 1.0;
        } else {
            compoundingState.returnPct = val;
        }
        renderCompounding(compoundingState, DOM);
    });

    DOM.compDeployPctInput.addEventListener('blur', () => {
        const valStr = DOM.compDeployPctInput.value.trim();
        const val = parseFloat(valStr);
        if (valStr === '' || isNaN(val) || val <= 0) {
            DOM.compDeployPctInput.value = '50.0';
            compoundingState.deployPct = 50.0;
        } else {
            const clamped = Math.min(100.0, val);
            DOM.compDeployPctInput.value = clamped.toString();
            compoundingState.deployPct = clamped;
        }
        renderCompounding(compoundingState, DOM);
    });

    DOM.compTradingDaysInput.addEventListener('blur', () => {
        const valStr = DOM.compTradingDaysInput.value.trim();
        const val = parseInt(valStr, 10);
        if (valStr === '' || isNaN(val) || val < 1 || val > 240) {
            DOM.compTradingDaysInput.value = '200';
            compoundingState.tradingDaysPerYear = 200;
        } else {
            compoundingState.tradingDaysPerYear = val;
        }
        renderCompounding(compoundingState, DOM);
    });

    DOM.compYearsInput.addEventListener('blur', () => {
        const valStr = DOM.compYearsInput.value.trim();
        const val = parseFloat(valStr);
        if (valStr === '' || isNaN(val) || val <= 0) {
            DOM.compYearsInput.value = '1.0';
            compoundingState.years = 1.0;
        } else {
            const clamped = Math.min(50.0, val);
            DOM.compYearsInput.value = clamped.toString();
            compoundingState.years = clamped;
        }
        renderCompounding(compoundingState, DOM);
    });

    // Compounding Preset Chips
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

    // Index Chips
    DOM.lotChips.forEach(chip => {
        chip.addEventListener('click', () => {
            DOM.lotChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            optionsState.selectedIndex = chip.getAttribute('data-index') || 'NIFTY';
            optionsState.lotSize = parseInt(chip.getAttribute('data-lot'), 10) || 65;
            optionsState.maxLot = parseInt(chip.getAttribute('data-maxlot'), 10) || 27;

            if (optionsState.numLots > optionsState.maxLot) optionsState.numLots = optionsState.maxLot;

            DOM.numLotsInput.value = optionsState.numLots;
            DOM.buyQtyInput.value = optionsState.numLots * optionsState.lotSize;
            syncOptionsFromDOM();
        });
    });

    // Profit Pct Chips
    DOM.pctChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const pctVal = parseFloat(chip.getAttribute('data-pct'));
            if (!isNaN(pctVal)) {
                DOM.targetProfitPctInput.value = pctVal;
                syncOptionsFromDOM();
            }
        });
    });

    // Sensitivity Grid Delegation
    if (DOM.compSensitivityContainer) {
        DOM.compSensitivityContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.sensitivity-card');
            if (card) {
                const depVal = parseFloat(card.getAttribute('data-deploy'));
                if (!isNaN(depVal)) {
                    compoundingState.deployPct = depVal;
                    DOM.compDeployPctInput.value = depVal;
                    renderCompounding(compoundingState, DOM);
                }
            }
        });
    }

    // Reset Button
    DOM.resetBtn.addEventListener('click', () => {
        if (activeTab === 'options') {
            Object.assign(optionsState, DEFAULT_OPTIONS_STATE);

            DOM.numLotsInput.value = 1;
            DOM.numLotsInput.max = 27;
            DOM.buyQtyInput.value = 65;
            DOM.buyPriceInput.value = "100.00";
            DOM.slippageInput.value = "0.50";
            DOM.targetProfitPctInput.value = "0.0";
            if (DOM.includeNextFeeToggle) DOM.includeNextFeeToggle.checked = true;

            DOM.lotChips.forEach((c, idx) => c.classList.toggle('active', idx === 0));
            DOM.pctChips.forEach((c, idx) => c.classList.toggle('active', idx === 0));

            syncOptionsFromDOM();
        } else {
            Object.assign(compoundingState, DEFAULT_COMPOUNDING_STATE);

            DOM.compInitialCapInput.value = "10000";
            DOM.compFinalCapInput.value = "100000";
            DOM.compReturnPctInput.value = "1.0";
            DOM.compDeployPctInput.value = "50.0";
            DOM.compTradingDaysInput.value = "200";
            DOM.compYearsInput.value = "1.0";
            syncCompoundingFromDOM();
        }
    });

    // Setup Tariff Modal Handlers
    setupTariffModal(DOM);

    // Initial Execution & Deep-linking
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab');
    if (initialTab === 'compounding') {
        switchTab('compounding');
    } else {
        syncOptionsFromDOM();
        syncCompoundingFromDOM();
    }
});
