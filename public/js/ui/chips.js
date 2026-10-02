import { h } from './dom.js';

/**
 * Fill a container with toggle buttons. Selection lives in `aria-pressed`,
 * so it is announced to screen readers and styled from the same attribute.
 * `onSelect` receives the chip's value as a string.
 */
export function renderChips(container, { items, onSelect }) {
  container.replaceChildren(
    ...items.map(({ value, label }) =>
      h('button', { class: 'chip', type: 'button', 'data-value': String(value), 'aria-pressed': 'false', text: label }),
    ),
  );
  container.addEventListener('click', (event) => {
    const chip = event.target.closest('button[data-value]');
    if (chip && container.contains(chip)) onSelect(chip.dataset.value);
  });
}

export function selectChip(container, value) {
  const wanted = String(value);
  for (const chip of container.children) {
    chip.setAttribute('aria-pressed', String(chip.dataset.value === wanted));
  }
}
