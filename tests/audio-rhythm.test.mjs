import test from 'node:test';
import assert from 'node:assert/strict';
import { glitchControlSamples, GLITCH_CONTROL_RATE } from '../src/audio/rhythm.js';

test('glitch rhythm is deterministic, tempo-linked and smoothly attenuation-only', () => {
  const values = glitchControlSamples(2, 120);
  assert.deepEqual(values, glitchControlSamples(2, 120));
  assert.equal(values[0], 0);
  assert.equal(values[Math.round(0.1 * GLITCH_CONTROL_RATE)], 0);
  assert.equal(values[Math.round(0.3 * GLITCH_CONTROL_RATE)], -1);
  assert.equal(glitchControlSamples(2, 60)[Math.round(0.3 * GLITCH_CONTROL_RATE)], 0);
  for (let i = 1; i < values.length; i++) {
    assert.ok(values[i] >= -1 && values[i] <= 0);
    assert.ok(Math.abs(values[i] - values[i - 1]) <= 1 / 32 + 1e-6);
    assert.ok(1 + 1.5 * 0.65 * values[i] >= 0.0249);
  }
});

test('arbitrary session loop boundaries and tiny stems remain bounded without drift allocations', () => {
  const duration = 0.321017;
  const loop = glitchControlSamples(duration, 120, true);
  assert.equal(loop.length, Math.ceil(duration * GLITCH_CONTROL_RATE));
  assert.equal(loop[0], 0);
  assert.ok(Math.abs(loop.at(-1)) < 0.032);
  assert.ok(Math.abs(glitchControlSamples(duration, 120, false).at(-1)) > 0.5);
  assert.deepEqual(glitchControlSamples(1 / 48000, 240, true), new Float32Array([0]));
  assert.equal(glitchControlSamples(180, 240, true).byteLength, 5_760_000);
  for (const args of [[0, 120], [Infinity, 120], [181, 120], [1, 0], [1, NaN]]) assert.throws(() => glitchControlSamples(...args), RangeError);
});
