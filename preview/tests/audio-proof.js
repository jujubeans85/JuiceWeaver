import { JuiceEngine } from '../src/audio/engine.js';
import { createDemo } from '../src/audio/demo.js';
import { encodeWav, measurePeak } from '../src/audio/wav.js';

const runButton = document.querySelector('#run');
const summary = document.querySelector('#summary');
const results = document.querySelector('#results');
const download = document.querySelector('#download');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let downloadURL;

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  results.replaceChildren();
  summary.textContent = 'Running real audio checks…';
  download.hidden = true;
  if (downloadURL) URL.revokeObjectURL(downloadURL);
  const evidence = [];
  globalThis.audioProof = { status: 'running', evidence };
  const engine = new JuiceEngine();
  const check = async (name, action) => {
    let detail;
    let passed = false;
    try { detail = await action(); passed = true; }
    catch (error) { detail = error.message; }
    evidence.push({ name, passed, detail });
    const row = document.createElement('tr');
    for (const value of [name, passed ? 'PASS' : 'FAIL', detail]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    row.children[1].className = passed ? 'pass' : 'fail';
    results.append(row);
    summary.textContent = `${evidence.length} checks completed…`;
  };
  const makeBuffer = (duration, sample, channels = 1) => {
    const buffer = engine.createBuffer(channels, Math.round(duration * 48000), 48000);
    for (let channel = 0; channel < channels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) data[i] = sample(i, channel);
    }
    return buffer;
  };
  const makeSession = (buffers, changes = {}) => {
    const assets = new Map();
    const tracks = buffers.map((buffer, i) => {
      const id = `proof-${i}`;
      assets.set(id, { id, name: `${id}.wav`, mime: 'audio/wav', bytes: encodeWav(buffer), buffer });
      return { id, assetId: id, name: id, role: 'other', color: '#bd6547', gainDb: 0, pan: 0, mute: false, solo: false, lowDb: 0, highDb: 0, drive: 0, space: 0 };
    });
    return { session: { schema: 1, id: 'audio-proof', name: 'Audio proof', bpm: 88, masterDb: 0, loop: false, tracks, journal: [], ...changes }, assets };
  };
  try {
    await engine.unlock();
    await check('Actual browser audio context', async () => {
      assert(engine.context.state === 'running', 'Context did not enter running state.');
      return `${engine.sampleRate} Hz; ${engine.context.state}; ${navigator.userAgent}`;
    });
    const impulse = makeBuffer(0.3, (i) => i === 2400 ? 0.25 : 0);
    const inverse = makeBuffer(0.3, (i) => i === 2400 ? -0.25 : 0);
    await check('Offline stem alignment and polarity cancellation', async () => {
      const { session, assets } = makeSession([impulse, inverse]);
      const rendered = await engine.render(session, assets);
      assert(rendered.peak < 1e-7, `Aligned opposite impulses did not cancel: ${rendered.peak}.`);
      return `Two opposite impulses cancel to peak ${rendered.peak}; all sources start at sample zero.`;
    });
    await check('Mute and solo exclude the correct stems', async () => {
      const { session, assets } = makeSession([impulse, inverse]);
      session.tracks[1].mute = true;
      const muted = await engine.render(session, assets);
      session.tracks[1].mute = false;
      session.tracks[0].solo = true;
      const solo = await engine.render(session, assets);
      assert(muted.peak > 0.17 && Math.abs(muted.peak - solo.peak) < 1e-7, 'Mute and solo did not produce the same single-stem output.');
      session.tracks[0].mute = true;
      const silent = await engine.render(session, assets);
      assert(silent.peak === 0, 'Muted solo stem should leave exact silence.');
      return `Mute peak ${muted.peak.toFixed(6)} = solo peak ${solo.peak.toFixed(6)}; muted solo is silent.`;
    });
    await check('Stereo pan preserves channel isolation', async () => {
      const { session, assets } = makeSession([impulse]);
      session.tracks[0].pan = -1;
      const rendered = await engine.render(session, assets);
      const buffer = await engine.decode(await rendered.blob.arrayBuffer());
      const left = Math.max(...buffer.getChannelData(0));
      const right = Math.max(...buffer.getChannelData(1));
      assert(left > 0.24 && right < 0.00004, 'Hard-left audio leaked into the right channel.');
      return `Hard-left peak ${left.toFixed(6)}; right channel ${right.toFixed(6)}.`;
    });
    await check('WAV header, duration and decode round trip', async () => {
      const { session, assets } = makeSession([impulse]);
      const rendered = await engine.render(session, assets);
      const bytes = await rendered.blob.arrayBuffer();
      const view = new DataView(bytes);
      assert(new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF', 'Missing RIFF marker.');
      assert(view.getUint16(22, true) === 2 && view.getUint16(34, true) === 16, 'Incorrect stereo PCM16 format.');
      assert(view.getUint32(24, true) === 48000 && view.getUint32(40, true) === bytes.byteLength - 44, 'Incorrect sample rate or data size.');
      const decoded = await engine.decode(bytes);
      assert(Math.abs(decoded.duration - 0.3) < 1 / 48000, 'Round-trip duration changed.');
      assert(Math.abs(measurePeak(decoded) - rendered.peak) < 0.00004, 'Round-trip level changed beyond PCM16 rounding.');
      return `${bytes.byteLength} bytes; stereo 16-bit 48 kHz; ${decoded.duration.toFixed(3)} s; peak difference < 1 PCM16 step.`;
    });
    await check('EQ, drive and space change the audible output', async () => {
      const tone = makeBuffer(0.25, (i) => Math.sin(i / 48000 * 2 * Math.PI * 100) * 0.1);
      const { session, assets } = makeSession([tone]);
      const dry = await engine.render(session, assets);
      session.tracks[0].lowDb = 12;
      const equalized = await engine.render(session, assets);
      assert(equalized.peak > dry.peak * 1.7, 'Low shelf did not boost low-frequency content.');
      session.tracks[0].lowDb = 0;
      session.tracks[0].drive = 0.75;
      const driven = await engine.render(session, assets);
      assert(Math.abs(driven.peak - dry.peak) > 0.01, 'Drive did not change the output.');
      session.tracks[0].drive = 0;
      session.tracks[0].space = 0.8;
      const roomy = await engine.render(session, assets);
      const tail = await engine.decode(await roomy.blob.arrayBuffer());
      const tailData = tail.getChannelData(0).slice(Math.round(0.3 * tail.sampleRate));
      let tailPeak = 0;
      for (const sample of tailData) tailPeak = Math.max(tailPeak, Math.abs(sample));
      assert(roomy.tail === 2 && Math.abs(roomy.duration - 2.25) < 1 / 48000 && tailPeak > 0.0001, 'Reverb tail is absent or wrong length.');
      return `Dry ${dry.peak.toFixed(4)}; low EQ ${equalized.peak.toFixed(4)}; drive ${driven.peak.toFixed(4)}; room tail ${tailPeak.toFixed(4)} and exactly +2 s.`;
    });
    await check('Clipping is reported; optional peak protection never boosts quiet mixes', async () => {
      const loud = makeBuffer(0.1, (i) => i === 240 ? 0.95 : 0);
      const { session, assets } = makeSession([loud, loud]);
      const plain = await engine.render(session, assets);
      const normalized = await engine.render(session, assets, { normalize: true });
      assert(plain.peak > 1 && plain.normalizationGain === 1, 'Default export hid clipping or silently normalized.');
      assert(normalized.normalizationGain < 1 && Math.abs(normalized.exportedPeak - 0.98) < 1e-6, 'Explicit normalization failed.');
      session.masterDb = -24;
      const quiet = await engine.render(session, assets, { normalize: true });
      assert(quiet.normalizationGain === 1, 'Peak protection unexpectedly boosted a quiet mix.');
      return `Unprotected peak ${plain.peak.toFixed(4)}; protected peak ${normalized.exportedPeak.toFixed(4)}; quiet-mix gain remains exactly 1.`;
    });
    await check('Malformed audio fails with an actionable error', async () => {
      let error;
      try { await engine.decode(new TextEncoder().encode('This is not an audio file.').buffer); }
      catch (caught) { error = caught; }
      assert(error && /could not be decoded/.test(error.message), 'Malformed input was accepted or produced an opaque error.');
      return error.message;
    });
    await check('Overlong input is rejected before native decoding; invalid PCM never plays', async () => {
      const bytes = encodeWav({
        numberOfChannels: 1, length: 181 * 8000, sampleRate: 8000,
        getChannelData: () => new Float32Array(181 * 8000),
      });
      const original = engine.context.decodeAudioData.bind(engine.context);
      let decodeCalls = 0;
      engine.context.decodeAudioData = (...args) => { decodeCalls++; return original(...args); };
      let longError;
      try { await engine.decode(bytes); }
      catch (error) { longError = error; }
      finally { engine.context.decodeAudioData = original; }
      assert(longError && /three minutes/.test(longError.message) && decodeCalls === 0, 'Overlong audio reached the native decoder.');
      const invalid = makeBuffer(0.1, (i) => i === 10 ? NaN : 0);
      const { session, assets } = makeSession([invalid]);
      let sampleError;
      try { engine.update(session, assets); }
      catch (error) { sampleError = error; }
      assert(sampleError && /invalid sample/.test(sampleError.message), 'Nonfinite PCM was accepted for playback.');
      return '181 s PCM rejected with zero native decode calls; NaN samples rejected before graph creation.';
    });
    await check('Realtime stems use one clock, including shorter-stem loops', async () => {
      const longer = makeBuffer(1.2, (i) => i === 2400 ? 0.05 : 0);
      const shorter = makeBuffer(0.5, (i) => i === 480 ? 0.05 : 0);
      const { session, assets } = makeSession([longer, shorter], { loop: true, masterDb: -24 });
      const original = engine.context.createBufferSource.bind(engine.context);
      const starts = [];
      engine.context.createBufferSource = () => {
        const source = original();
        const start = source.start.bind(source);
        source.start = (...args) => { starts.push({ when: args[0], offset: args[1], duration: source.buffer.duration }); return start(...args); };
        return source;
      };
      try {
        await engine.play(session, assets, 0.7);
        assert(starts[0].offset === 0.7 && starts[0].duration === 1.2, 'Initial seek offset was incorrect.');
        assert(starts[1].when === starts[2].when, 'Next whole-session loop was not synchronized.');
        assert(Math.abs(starts[1].when - starts[0].when - 0.5) < 1e-8, 'Shorter stem restarted before the master boundary.');
        const pausedAt = engine.pause();
        assert(!engine.playing && pausedAt >= 0.7 && pausedAt < 1.2, 'Pause failed to retain the playhead.');
        return `${starts.length} scheduled source starts; next loop shares exact timestamp ${starts[1].when.toFixed(6)}; short stem waits for the master boundary.`;
      } finally { engine.stop(); engine.context.createBufferSource = original; }
    });
    await check('Sub-second loops use bounded native playback; seeking to a non-loop end stops', async () => {
      const shorter = makeBuffer(0.1, () => 0);
      const { session, assets } = makeSession([impulse, shorter], { loop: true, masterDb: -24 });
      await engine.play(session, assets, 0.15);
      assert(engine._nativeLoop && engine._ticker === null && engine._sources.size === 2, 'Short loops were not handled by two native sources.');
      assert([...engine._sources].every((source) => source.loop && source.loopEnd === 0.3), 'Native loop boundaries do not match.');
      session.loop = false;
      engine.update(session, assets);
      engine.seek(engine.duration);
      assert(!engine.playing && engine.position === engine.duration, 'Seeking to the end unexpectedly restarted playback.');
      engine.stop();
      return 'Two sources share the 0.3 s native loop boundary; the short stem is zero-padded. Non-loop end remains stopped.';
    });
    await check('Disabling Loop after a full cycle preserves the current playhead', async () => {
      const loop = makeBuffer(0.4, () => 0);
      const { session, assets } = makeSession([loop], { loop: true, masterDb: -24 });
      await engine.play(session, assets);
      await wait(515);
      // Keep the assertion away from an actual loop boundary even if this
      // browser schedules the test callback late under load.
      for (let attempt = 0; attempt < 40 && (engine.position < 0.05 || engine.position > 0.2); attempt++) await wait(10);
      const before = engine.position;
      assert(before >= 0.05 && before <= 0.2, 'The browser did not provide a stable mid-loop observation window.');
      session.loop = false;
      engine.update(session, assets);
      const after = engine.position;
      assert(Math.abs(after - before) < 0.035 && engine.playing, 'Disabling Loop jumped to the end or stopped playback.');
      engine.stop();
      return `After at least one cycle, the same session object changed to non-loop: ${before.toFixed(4)} s → ${after.toFixed(4)} s; playback continued.`;
    });
    await check('Adding or removing room while playing updates the non-loop tail', async () => {
      const short = makeBuffer(0.1, (i) => i === 240 ? 0.025 : 0);
      const { session, assets } = makeSession([short], { masterDb: -24 });
      await engine.play(session, assets);
      session.tracks[0].space = 0.7;
      engine.update(session, assets);
      await wait(190);
      assert(engine.playing, 'Adding Room did not extend the end clock beyond dry duration.');
      session.tracks[0].space = 0;
      engine.update(session, assets);
      await wait(60);
      assert(!engine.playing, 'Removing Room left an unnecessary silent tail running.');
      engine.stop();
      return 'Room added during playback survives past the original dry end; removing it ends the remaining tail.';
    });
    await check('Interruptions pause; resume never restarts audio by surprise', async () => {
      const { session, assets } = makeSession([impulse], { loop: true, masterDb: -24 });
      const states = [];
      engine.onStateChange = (state) => states.push(state.reason);
      await engine.play(session, assets);
      await engine.context.suspend();
      await wait(30);
      assert(!engine.playing && states.includes('interrupted'), 'Suspension did not pause the engine.');
      await engine.context.resume();
      assert(!engine.playing, 'Context resume unexpectedly restarted playback.');
      engine.stop();
      return `State events: ${states.join(', ')}. Playback requires another explicit Play.`;
    });
    await check('Stop cancels a pending play request', async () => {
      const { session, assets } = makeSession([impulse], { loop: true, masterDb: -24 });
      const pending = engine.play(session, assets);
      engine.stop();
      await pending;
      assert(!engine.playing, 'An awaited play resumed after Stop.');
      return 'Pending unlock/play was invalidated; engine stayed stopped.';
    });
    await check('Original four-stem demo exports within the declared limits', async () => {
      const demo = await createDemo(engine);
      const session = { schema: 1, id: 'demo-proof', name: demo.name, bpm: demo.bpm, masterDb: -6, loop: true, tracks: demo.tracks, journal: [] };
      const rendered = await engine.render(session, demo.assets);
      let decodedBytes = 0;
      let originalBytes = 0;
      for (const asset of demo.assets.values()) {
        decodedBytes += asset.buffer.length * asset.buffer.numberOfChannels * 4;
        originalBytes += asset.bytes.byteLength;
      }
      assert(demo.tracks.length === 4 && rendered.peak > 0.1 && rendered.peak < 0.95, 'Demo is missing stems, too quiet, or clips.');
      assert(decodedBytes < 96 * 1024 * 1024 && originalBytes < 96 * 1024 * 1024, 'Demo exceeded the session budget.');
      downloadURL = URL.createObjectURL(rendered.blob);
      download.href = downloadURL;
      download.hidden = false;
      return `4 original stems; 88 BPM; 8 bars; ${rendered.duration.toFixed(3)} s including tail; peak ${rendered.peak.toFixed(4)}; ${(decodedBytes / 1024 / 1024).toFixed(1)} MiB decoded / ${(originalBytes / 1024 / 1024).toFixed(1)} MiB original WAVs.`;
    });
  } catch (error) {
    evidence.push({ name: 'Proof runner', passed: false, detail: error.message });
  } finally {
    await engine.destroy();
    const failed = evidence.filter((result) => !result.passed).length;
    summary.textContent = `${evidence.length - failed}/${evidence.length} passed. ${failed ? `${failed} failure(s): inspect the table.` : 'All audio checks passed.'}`;
    globalThis.audioProof = { status: failed ? 'failed' : 'passed', evidence, completedAt: new Date().toISOString() };
    runButton.disabled = false;
  }
});
