// Touch precision added to native ranges. All edits use the existing input/change
// route so preview, persistence and Undo have the same semantics as a drag.
const controls = new WeakMap();

export function refreshSlider(input) {
  const ui = controls.get(input);
  if (!ui) return;
  const disabled = input.matches(':disabled');
  for (const button of ui.buttons) button.disabled = disabled;
  const min = Number(input.min), max = Number(input.max);
  ui.marker.hidden = !(min < 0 && max > 0);
  ui.rail.style.setProperty('--neutral-ratio', String(-min / (max - min)));
}

export function enhanceSlider(input, { neutral = 0 } = {}) {
  if (controls.has(input)) return refreshSlider(input);
  if (!input.parentElement) throw new Error('Append a slider before enhancing it.');
  const doc = input.ownerDocument;
  const name = input.getAttribute('aria-label') || input.labels?.[0]?.childNodes[0]?.textContent?.trim() || 'Parameter';
  const rail = doc.createElement('div');
  rail.className = 'precision-rail';
  input.before(rail);
  rail.append(input);
  const marker = doc.createElement('span');
  marker.className = 'neutral-marker';
  marker.setAttribute('aria-hidden', 'true');
  rail.append(marker);
  const actions = doc.createElement('div');
  actions.className = 'precision-actions';
  const apply = change => {
    if (input.matches(':disabled')) return;
    const previous = input.value;
    change();
    if (input.value === previous) return;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const reset = () => apply(() => { input.value = String(neutral); });
  const button = (text, label, action) => {
    const el = doc.createElement('button');
    el.type = 'button';
    el.id = `${input.id}-${label.toLowerCase()}`;
    el.textContent = text;
    el.setAttribute('aria-label', `${label} ${name}`);
    el.addEventListener('click', action);
    actions.append(el);
    return el;
  };
  const less = button('−', 'Decrease', () => apply(() => input.stepDown()));
  const resetButton = button('Reset', 'Reset', reset);
  resetButton.title = `Reset ${name} to ${neutral}`;
  const more = button('+', 'Increase', () => apply(() => input.stepUp()));
  const ends = rail.nextElementSibling;
  if (ends?.classList.contains('range-ends')) ends.after(actions);
  else rail.after(actions);
  const value = input.closest('.tone-control, .stem-volume, .master')?.querySelector('output');
  if (value) {
    value.classList.add('precision-value');
    value.title = 'Double-tap this value to reset';
    // The value is separate from the draggable range. Pointer events cover touch,
    // pen and mouse without interpreting a slider drag as a reset gesture.
    let previousTap = null;
    value.addEventListener('pointerup', event => {
      if (!event.isPrimary || event.button !== 0) return;
      if (previousTap && event.timeStamp - previousTap.time < 350 &&
          Math.hypot(event.clientX - previousTap.x, event.clientY - previousTap.y) < 20) {
        previousTap = null;
        reset();
      } else previousTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };
    });
  }
  controls.set(input, { rail, marker, buttons: [less, resetButton, more] });
  refreshSlider(input);
}
