import test from 'node:test';
import assert from 'node:assert/strict';
import { JuiceEngine } from '../src/audio/engine.js';
import { checkedDecode } from '../src/imports.js';
import { encodeWav } from '../src/audio/wav.js';

test('four-file decoding and repeat selection do not await an unavailable playback gesture', { timeout: 2000 }, async () => {
  const previous = globalThis.AudioContext;
  let resumes = 0;
  let decodes = 0;
  class SuspendedContext {
    state = 'suspended';
    sampleRate = 48000;
    addEventListener() {}
    resume() { resumes++; return new Promise(() => {}); }
    async decodeAudioData(bytes) {
      decodes++;
      const view = new DataView(bytes);
      const samples = Float32Array.from({ length: (bytes.byteLength - 44) / 2 }, (_, i) => view.getInt16(44 + i * 2, true) / 32768);
      return { length: samples.length, numberOfChannels: 1, sampleRate: 48000, duration: samples.length / 48000, getChannelData: () => samples };
    }
  }
  globalThis.AudioContext = SuspendedContext;
  try {
    const engine = new JuiceEngine();
    for (let batch = 0; batch < 2; batch++) {
      let decodedBytes = 0;
      for (let index = 0; index < 4; index++) {
        const data = new Float32Array(4800); data[100 + index] = 0.125;
        const bytes = encodeWav({ numberOfChannels: 1, length: data.length, sampleRate: 48000, getChannelData: () => data });
        const original = bytes.slice(0);
        const file = new File([bytes], `stem-${index}.wav`, { type: 'audio/wav' });
        const decoded = await checkedDecode(engine, file, bytes, decodedBytes);
        decodedBytes += decoded.length * decoded.numberOfChannels * 4;
        assert.equal(decoded.length, 4800);
        assert.ok(Math.abs(decoded.getChannelData(0)[100 + index] - 0.125) < 1 / 32768);
        assert.deepEqual(bytes, original);
        assert.equal(engine.context.state, 'suspended');
      }
    }
    assert.equal(decodes, 8);
    assert.equal(resumes, 0);
    const incomplete = encodeWav({ numberOfChannels: 1, length: 4800, sampleRate: 48000, getChannelData: () => new Float32Array(4800) }).slice(0, 50);
    await assert.rejects(checkedDecode(engine, new File([incomplete], 'incomplete.wav'), incomplete), /incomplete/);
    assert.equal(decodes, 8, 'malformed WAV never reaches native allocation');
  } finally {
    if (previous === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = previous;
  }
});
