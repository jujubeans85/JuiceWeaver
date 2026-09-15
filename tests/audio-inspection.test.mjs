import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav } from '../src/audio/wav.js';
import { inspectPcmWav } from '../src/audio/preflight.js';

const fixture = (frames = 4800, channels = 2, sampleRate = 48000) => encodeWav({
  numberOfChannels: channels, length: frames, sampleRate,
  getChannelData: () => new Float32Array(frames),
});

test('PCM timing and channel count can be checked without decoding samples', () => {
  assert.deepEqual(inspectPcmWav(fixture()), { duration: 0.1, channels: 2, sampleRate: 48000 });
  assert.deepEqual(inspectPcmWav(fixture(4800, 1, 8000)), { duration: 0.6, channels: 1, sampleRate: 8000 });
});

test('Overlong PCM is identifiable from its header before full-rate decoding', () => {
  const bytes = fixture(181 * 8000, 1, 8000);
  assert.equal(inspectPcmWav(bytes).duration, 181);
});

test('Truncated sample data and inconsistent block alignment are rejected', () => {
  const bytes = fixture();
  assert.throws(() => inspectPcmWav(bytes.slice(0, bytes.byteLength - 2)), /incomplete/);
  new DataView(bytes).setUint16(32, 7, true);
  assert.throws(() => inspectPcmWav(bytes), /invalid audio header/);
});

test('Other formats are routed to local media metadata inspection', () => {
  assert.equal(inspectPcmWav(new TextEncoder().encode('ID3another audio format').buffer), null);
  const compressedWav = fixture();
  const header = new DataView(compressedWav);
  header.setUint16(20, 17, true); // IMA ADPCM has blocks, not one block per PCM frame.
  header.setUint16(32, 256, true);
  header.setUint16(34, 4, true);
  assert.equal(inspectPcmWav(compressedWav), null);
});
