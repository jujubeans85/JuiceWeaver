/** Deterministic 16-step rhythmic gate. One shared control buffer per graph. */
export const GLITCH_CONTROL_RATE = 8000;
export const GLITCH_PATTERN = Object.freeze([1, 1, 0, 0.35, 1, 0, 1, 0, 1, 0.5, 0, 1, 1, 0, 0, 0.5]);
export function glitchControlSamples(duration, bpm, loop = false, target = null) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 180 + 1 / 8000) throw new RangeError('Invalid glitch duration.');
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 240) throw new RangeError('Invalid glitch tempo.');
  const length = Math.ceil(duration * GLITCH_CONTROL_RATE);
  const samples = target ?? new Float32Array(length);
  if (!(samples instanceof Float32Array) || samples.length !== length) throw new RangeError('Invalid glitch control buffer.');
  const stepSeconds = 60 / bpm / 4;
  const edge = Math.min(0.004, duration / 4, stepSeconds / 4);
  for (let index = 0; index < samples.length; index++) {
    const time = index / GLITCH_CONTROL_RATE;
    const step = Math.floor(time / stepSeconds);
    const phase = time - step * stepSeconds;
    const target = GLITCH_PATTERN[step % GLITCH_PATTERN.length] - 1;
    const previous = step ? GLITCH_PATTERN[(step - 1) % GLITCH_PATTERN.length] - 1 : 0;
    const blend = Math.min(1, phase / edge);
    let value = previous + (target - previous) * blend;
    // Whole-session loops start the pattern again even for non-bar lengths.
    // Fade the final edge back to the first (open) step before the wrap.
    if (loop && time > duration - edge) value *= Math.max(0, (duration - time) / edge);
    samples[index] = value;
  }
  return samples;
}
