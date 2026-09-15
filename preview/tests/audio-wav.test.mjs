import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav, measurePeak } from '../src/audio/wav.js';

function buffer(channelData, sampleRate = 48000) {
  return { numberOfChannels: channelData.length, length: channelData[0].length, sampleRate, getChannelData: (channel) => channelData[channel] };
}

test('PCM WAV uses a correct RIFF header, channel interleaving and signed full scale', () => {
  const input = buffer([new Float32Array([-1, 0, 1]), new Float32Array([0.5, -0.5, 2])]);
  const bytes = encodeWav(input);
  const view = new DataView(bytes);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE');
  assert.equal(view.getUint32(4, true), bytes.byteLength - 8);
  assert.equal(view.getUint16(20, true), 1);
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 48000);
  assert.equal(view.getUint32(28, true), 192000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 12);
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => view.getInt16(44 + i * 2, true)), [-32768, 16384, 0, -16384, 32767, 32767]);
  assert.equal(measurePeak(input), 2);
});

test('WAV gain is explicit; silent buffers remain exact silence', () => {
  const attenuated = new DataView(encodeWav(buffer([new Float32Array([1, -1])]), { gain: 0.5 }));
  assert.equal(attenuated.getInt16(44, true), 16384);
  assert.equal(attenuated.getInt16(46, true), -16384);
  assert.equal(measurePeak(buffer([new Float32Array(20)])), 0);
  assert.ok(new Uint8Array(encodeWav(buffer([new Float32Array(20)]))).slice(44).every((byte) => byte === 0));
});

test('Invalid channel layouts and nonfinite DSP samples are rejected', () => {
  assert.throws(() => encodeWav(buffer([new Float32Array(1), new Float32Array(1), new Float32Array(1)])), /mono or stereo/);
  assert.throws(() => measurePeak(buffer([new Float32Array([NaN])])), /invalid sample/);
  assert.throws(() => encodeWav(buffer([new Float32Array(1)]), { gain: Infinity }), /finite/);
});
