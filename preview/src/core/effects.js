/** Portable effect limits and musical starting points, shared by UI, prompts and DSP. */
export const TRACK_BOUNDS = Object.freeze(Object.fromEntries(Object.entries({
  gainDb: [-60, 6], pan: [-1, 1], lowDb: [-12, 12], highDb: [-12, 12],
  drive: [0, 1], space: [0, 1], timbre: [-1, 1], glitch: [0, 1],
}).map(([key, range]) => [key, Object.freeze(range)])));
export const EFFECT_FIELDS = Object.freeze(['lowDb', 'highDb', 'drive', 'space', 'timbre', 'glitch']);
const WIDE_BOUNDS = Object.freeze(Object.fromEntries(Object.entries(TRACK_BOUNDS).map(([key, range]) =>
  [key, EFFECT_FIELDS.includes(key) ? Object.freeze(range.map(value => value * 1.5)) : range])));
export function trackBounds(trackOrBoolean = false) {
  return (trackOrBoolean === true || trackOrBoolean?.expanded === true) ? WIDE_BOUNDS : TRACK_BOUNDS;
}
const clamp = (value, range) => Math.max(range[0], Math.min(range[1], value));
/** Returns an undoable patch; disabling expansion explicitly restores ordinary limits. */
export function setExpanded(track, expanded) {
  if (typeof expanded !== 'boolean') throw new TypeError('Expanded effect ranges must be true or false.');
  const bounds = trackBounds(expanded);
  return { expanded, ...Object.fromEntries(EFFECT_FIELDS.map(key => [key, clamp(track[key] ?? 0, bounds[key])])) };
}
const clean = Object.freeze({ lowDb: 0, highDb: 0, drive: 0, space: 0, timbre: 0, glitch: 0 });
export const STEM_PRESETS = Object.freeze([
  { id: 'clean', name: 'Clean slate', description: 'Reset all six effects; keep your level, pan and range choice.', patch: { ...clean } },
  { id: 'velvet', name: 'Velvet body', description: 'Rounder body, soft presence and a little room.', patch: { ...clean, timbre: -0.55, lowDb: 1.5, highDb: -1, drive: 0.12, space: 0.15 } },
  { id: 'glass', name: 'Clear glass', description: 'Forward presence and a lightly opened top end.', patch: { ...clean, timbre: 0.6, lowDb: -1, highDb: 1.5, space: 0.12 } },
  { id: 'broken-beat', name: 'Broken beat', description: 'Tempo-linked rhythmic cuts with a little drive.', patch: { ...clean, glitch: 0.85, drive: 0.22, timbre: 0.2 } },
  { id: 'carriage-radio', name: 'Carriage radio', description: 'Focused, gritty colour with a gentle broken rhythm.', patch: { ...clean, timbre: 0.8, lowDb: -4, highDb: -3, drive: 0.48, glitch: 0.35 } },
  { id: 'fractured-space', name: 'Fractured space', description: 'Deep rhythmic gaps feeding a lingering room.', patch: { ...clean, glitch: 1, space: 0.72, timbre: -0.25, drive: 0.1 } },
].map(preset => Object.freeze({ ...preset, patch: Object.freeze(preset.patch) })));
export function presetPatch(id, track) {
  const preset = STEM_PRESETS.find(candidate => candidate.id === id);
  if (!preset) throw new RangeError('Choose a known stem preset.');
  const bounds = trackBounds(track);
  return Object.fromEntries(Object.entries(preset.patch).map(([key, value]) => [key, clamp(value, bounds[key])]));
}
