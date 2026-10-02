import { BROKERAGE_PLANS } from './config/tariff.js';
import { INSTRUMENTS } from './config/instruments.js';
import {
  DEFAULT_COMPOUNDING,
  DEFAULT_OPTIONS,
  DEPLOY_PRESETS,
  LIMITS,
  TARGET_PRESETS,
} from './config/defaults.js';
import { computeCompounding } from './engine/compounding.js';
import { computeTrade, targetLadder } from './engine/options.js';
import { renderChips, selectChip } from './ui/chips.js';
import { collectElements } from './ui/dom.js';
import { bindNumericField } from './ui/fields.js';
import { formatRupees } from './ui/format.js';
import {
  compoundingSummary,
  optionsSummary,
  renderCompounding,
  renderOptions,
  renderTariff,
} from './ui/render.js';

const els = collectElements();

/** The only mutable state. Every render is computed from it. */
const state = {
  tab: 'options',
  options: { ...DEFAULT_OPTIONS },
  compounding: { ...DEFAULT_COMPOUNDING },
};

/* ---------- rendering ---------- */

let announceTimer;
/** Screen readers get one settled summary, not one per keystroke. */
function announce(text) {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    els.liveStatus.textContent = text;
  }, 400);
}

function syncControls() {
  selectChip(els.instrumentChips, state.options.instrument);
  selectChip(els.targetChips, state.options.targetPct);
  selectChip(els.planChips, state.options.plan);
  selectChip(els.deployChips, state.compounding.deployPct);
  els.includeFee.checked = state.options.includeNextFee;
}

function update() {
  syncControls();
  if (state.tab === 'options') {
    const result = computeTrade(state.options);
    renderOptions(els, result, targetLadder(state.options, TARGET_PRESETS));
    announce(optionsSummary(result));
  } else {
    const result = computeCompounding(state.compounding);
    renderCompounding(els, result);
    announce(compoundingSummary(result));
  }
}

/* ---------- numeric fields ---------- */

const bind = (group, key) => ({
  get: () => state[group][key],
  set: (value) => {
    state[group][key] = value;
  },
});
const field = (spec) => bindNumericField({ onChange: update, ...spec });
const maxLots = () => INSTRUMENTS[state.options.instrument].maxLots;

const optionFields = {
  lots: field({
    input: els.lots,
    hint: els.lotsHint,
    hintText: () => `Up to ${maxLots()} lots in one order.`,
    min: 1,
    max: maxLots,
    integer: true,
    ...bind('options', 'lots'),
  }),
  buyPrice: field({
    input: els.buyPrice,
    hint: els.buyPriceHint,
    ...LIMITS.buyPrice,
    decimals: 2,
    fixed: true,
    snapToTick: true,
    ...bind('options', 'buyPrice'),
  }),
  slippage: field({
    input: els.slippage,
    hint: els.slippageHint,
    ...LIMITS.slippage,
    decimals: 2,
    fixed: true,
    snapToTick: true,
    ...bind('options', 'slippage'),
  }),
  targetPct: field({
    input: els.targetPct,
    hint: els.targetPctHint,
    ...LIMITS.targetPct,
    decimals: 2,
    ...bind('options', 'targetPct'),
  }),
};

const compoundingFields = {
  initial: field({
    input: els.initial,
    hint: els.initialHint,
    hintText: () => `What you begin with: ${formatRupees(state.compounding.initial)}.`,
    ...LIMITS.initial,
    decimals: 2,
    ...bind('compounding', 'initial'),
  }),
  target: field({
    input: els.targetCapital,
    hint: els.targetCapitalHint,
    hintText: () => `What you want to reach: ${formatRupees(state.compounding.target)}.`,
    ...LIMITS.target,
    decimals: 2,
    ...bind('compounding', 'target'),
  }),
  returnPct: field({
    input: els.returnPct,
    hint: els.returnPctHint,
    ...LIMITS.returnPct,
    decimals: 2,
    ...bind('compounding', 'returnPct'),
  }),
  daysPerYear: field({
    input: els.daysPerYear,
    hint: els.daysPerYearHint,
    ...LIMITS.daysPerYear,
    integer: true,
    ...bind('compounding', 'daysPerYear'),
  }),
  years: field({
    input: els.years,
    hint: els.yearsHint,
    ...LIMITS.years,
    decimals: 2,
    ...bind('compounding', 'years'),
  }),
};

const syncAll = (fields) => Object.values(fields).forEach((f) => f.sync());

/* ---------- chips and switch ---------- */

renderChips(els.instrumentChips, {
  items: Object.entries(INSTRUMENTS).map(([value, spec]) => ({ value, label: spec.label })),
  onSelect: (key) => {
    state.options.instrument = key;
    state.options.lots = Math.min(state.options.lots, INSTRUMENTS[key].maxLots);
    optionFields.lots.sync();
    update();
  },
});

renderChips(els.targetChips, {
  items: TARGET_PRESETS.map((value) => ({ value, label: `${value}%` })),
  onSelect: (value) => {
    state.options.targetPct = Number(value);
    optionFields.targetPct.sync();
    update();
  },
});

renderChips(els.planChips, {
  items: Object.entries(BROKERAGE_PLANS).map(([value, plan]) => ({
    value,
    label: `${plan.label} \u20B9${plan.perOrder}`,
  })),
  onSelect: (key) => {
    state.options.plan = key;
    update();
  },
});

renderChips(els.deployChips, {
  items: DEPLOY_PRESETS.map((value) => ({ value, label: `${value}%` })),
  onSelect: (value) => {
    state.compounding.deployPct = Number(value);
    update();
  },
});

els.includeFee.addEventListener('change', () => {
  state.options.includeNextFee = els.includeFee.checked;
  update();
});

els.resetOptions.addEventListener('click', () => {
  state.options = { ...DEFAULT_OPTIONS };
  syncAll(optionFields);
  update();
});

els.resetCompounding.addEventListener('click', () => {
  state.compounding = { ...DEFAULT_COMPOUNDING };
  syncAll(compoundingFields);
  update();
});

/* ---------- tabs ---------- */

const TABS = ['options', 'compounding'];
const parts = {
  options: { tab: els.tabOptions, panel: els.viewOptions },
  compounding: { tab: els.tabCompounding, panel: els.viewCompounding },
};

function rememberTab(name) {
  try {
    const url = new URL(window.location.href);
    if (name === TABS[0]) url.searchParams.delete('tab');
    else url.searchParams.set('tab', name);
    window.history.replaceState(null, '', url);
  } catch {
    // Sandboxed frames and some file:// contexts refuse. The URL is a convenience only.
  }
}

function selectTab(name, { focus = false, remember = true } = {}) {
  state.tab = name;
  for (const key of TABS) {
    const active = key === name;
    parts[key].tab.setAttribute('aria-selected', String(active));
    parts[key].tab.tabIndex = active ? 0 : -1;
    parts[key].panel.hidden = !active;
  }
  if (focus) parts[name].tab.focus();
  if (remember) rememberTab(name);
  update();
}

for (const key of TABS) {
  parts[key].tab.addEventListener('click', () => selectTab(key));
  parts[key].tab.addEventListener('keydown', (event) => {
    const index = TABS.indexOf(key);
    let next = null;
    if (event.key === 'ArrowRight') next = TABS[(index + 1) % TABS.length];
    else if (event.key === 'ArrowLeft') next = TABS[(index + TABS.length - 1) % TABS.length];
    else if (event.key === 'Home') next = TABS[0];
    else if (event.key === 'End') next = TABS[TABS.length - 1];
    if (next) {
      event.preventDefault();
      selectTab(next, { focus: true });
    }
  });
}

/* ---------- rates dialog ---------- */

els.openTariff.addEventListener('click', () => els.tariffDialog.showModal());
els.closeTariff.addEventListener('click', () => els.tariffDialog.close());
// The dialog has no padding of its own, so only a click on the backdrop targets it.
els.tariffDialog.addEventListener('click', (event) => {
  if (event.target === els.tariffDialog) els.tariffDialog.close();
});

/* ---------- start ---------- */

renderTariff(els);
syncAll(optionFields);
syncAll(compoundingFields);
const requested = new URLSearchParams(window.location.search).get('tab');
selectTab(TABS.includes(requested) ? requested : TABS[0], { remember: false });
