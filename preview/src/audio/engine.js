import { encodeWav, measurePeak } from './wav.js';
import { inspectAudio } from './preflight.js';
import { LIMITS, TRACK_BOUNDS, MASTER_DB_BOUNDS } from '../core/model.js';

export const AUDIO_LIMITS = Object.freeze({
  tracks: LIMITS.MAX_TRACKS, seconds: LIMITS.MAX_DURATION_SECONDS,
  decodedBytes: LIMITS.MAX_DECODED_BYTES, renderBytes: 224 * 1024 * 1024,
});
export const REVERB_TAIL_SECONDS = 2;
const RENDER_SAMPLE_RATE = 48000;
const clamp = (value, min, max, fallback = 0) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback));
const dbToGain = (db) => 10 ** (db / 20);
const curves = new Map();
const impulses = new WeakMap();
const validatedBuffers = new WeakSet();

function validateSamples(buffer) {
  if (validatedBuffers.has(buffer)) return;
  try { measurePeak(buffer); }
  catch { throw new Error('This file contains an invalid sample. Export it again as PCM WAV before importing.'); }
  validatedBuffers.add(buffer);
}

function roomTail(session) {
  const hasSolo = session.tracks.some((track) => track.solo);
  return session.tracks.some((track) => !track.mute && (!hasSolo || track.solo) && clamp(track.space, ...TRACK_BOUNDS.space) > 0) ? REVERB_TAIL_SECONDS : 0;
}

function driveCurve(amount) {
  const step = Math.round(clamp(amount, 0, 1) * 64);
  if (!step) return null;
  if (!curves.has(step)) {
    const strength = 1 + (step / 64) * 8;
    const curve = new Float32Array(2048);
    const compensation = 1 / Math.sqrt(strength);
    for (let i = 0; i < curve.length; i++) {
      const x = i * 2 / (curve.length - 1) - 1;
      curve[i] = Math.tanh(strength * x) / Math.tanh(strength) * compensation;
    }
    curves.set(step, curve);
  }
  return curves.get(step);
}

function roomImpulse(context) {
  if (impulses.has(context)) return impulses.get(context);
  const length = Math.ceil(context.sampleRate * REVERB_TAIL_SECONDS);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    let seed = 91357 + channel * 401;
    const data = buffer.getChannelData(channel);
    let previous = 0;
    for (let i = 0; i < length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 0xffffffff * 2 - 1;
      previous = previous * 0.7 + noise * 0.3;
      const seconds = i / context.sampleRate;
      const attack = Math.min(1, seconds / 0.012);
      data[i] = previous * attack * Math.exp(-seconds * 5.2) * 0.16;
    }
    // A few soft, irregular early reflections make the room audible without a metallic wash.
    for (const [seconds, level] of [[0.029, 0.23], [0.047, 0.15], [0.073, 0.1]]) {
      const index = Math.floor((seconds + channel * 0.003) * context.sampleRate);
      data[index] += level;
    }
  }
  impulses.set(context, buffer);
  return buffer;
}

function setParam(param, value, context, immediate) {
  const now = context.currentTime;
  if (immediate) {
    param.cancelScheduledValues(now);
    param.setValueAtTime(value, now);
  } else {
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(now);
    } else {
      const heldValue = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(heldValue, now);
    }
    param.setTargetAtTime(value, now, 0.012);
  }
}

function validate(session, assets) {
  if (!session || !Array.isArray(session.tracks)) throw new Error('This session has no track list.');
  if (session.tracks.length > AUDIO_LIMITS.tracks) throw new Error('Keep this session to eight stems or fewer.');
  let duration = 0;
  let decodedBytes = 0;
  const seenAssets = new Set();
  const seenTracks = new Set();
  for (const track of session.tracks) {
    if (seenTracks.has(track.id)) throw new Error('Two stems share the same track ID. Reopen the project before playing.');
    seenTracks.add(track.id);
    const asset = assets?.get(track.assetId);
    if (!asset?.buffer) throw new Error(`The audio for “${track.name || 'this stem'}” is missing. Import it again.`);
    const buffer = asset.buffer;
    if (buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) throw new Error('Import mono or stereo audio files.');
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > AUDIO_LIMITS.seconds + 1 / buffer.sampleRate) throw new Error('Each stem must be between one sample and three minutes long.');
    duration = Math.max(duration, buffer.duration);
    if (!seenAssets.has(track.assetId)) {
      decodedBytes += buffer.length * buffer.numberOfChannels * 4;
      seenAssets.add(track.assetId);
    }
    if (decodedBytes > AUDIO_LIMITS.decodedBytes) throw new Error('The decoded stems exceed this studio’s 96 MiB session limit. Use shorter or fewer stems.');
    validateSamples(buffer);
  }
  if (decodedBytes > AUDIO_LIMITS.decodedBytes) throw new Error('The decoded stems exceed this studio’s 96 MiB session limit. Use shorter or fewer stems.');
  return { duration, decodedBytes };
}

function createTrackGraph(context, master, track, session) {
  const low = context.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = 160;
  const high = context.createBiquadFilter();
  high.type = 'highshelf';
  high.frequency.value = 4000;
  const drive = context.createWaveShaper();
  // No oversampling latency in the neutral path; source timing remains sample-aligned.
  drive.oversample = 'none';
  drive.curve = driveCurve(0.75);
  const driveClean = context.createGain();
  const driveColor = context.createGain();
  const driveSum = context.createGain();
  const dry = context.createGain();
  const wet = context.createGain();
  const sum = context.createGain();
  const pan = context.createStereoPanner();
  const level = context.createGain();
  low.connect(high);
  high.connect(driveClean).connect(driveSum);
  high.connect(drive).connect(driveColor).connect(driveSum);
  driveSum.connect(dry).connect(sum);
  wet.connect(sum);
  sum.connect(pan).connect(level).connect(master);
  const graph = { input: low, low, high, drive, driveClean, driveColor, driveSum, dry, wet, sum, pan, level, convolver: null, assetId: track.assetId };
  updateTrackGraph(context, graph, track, session, true);
  return graph;
}

function updateTrackGraph(context, graph, track, session, immediate = false) {
  const soloActive = session.tracks.some((candidate) => candidate.solo);
  const audible = !track.mute && (!soloActive || track.solo);
  const space = clamp(track.space, ...TRACK_BOUNDS.space);
  if (space > 0 && !graph.convolver) {
    graph.convolver = context.createConvolver();
    // Fixed, original room impulse; Web Audio normalization keeps wet level portable.
    graph.convolver.normalize = true;
    graph.convolver.buffer = roomImpulse(context);
    graph.driveSum.connect(graph.convolver).connect(graph.wet);
  }
  setParam(graph.low.gain, clamp(track.lowDb, ...TRACK_BOUNDS.lowDb), context, immediate);
  setParam(graph.high.gain, clamp(track.highDb, ...TRACK_BOUNDS.highDb), context, immediate);
  setParam(graph.dry.gain, 1 - space * 0.2, context, immediate);
  setParam(graph.wet.gain, space * 0.42, context, immediate);
  setParam(graph.pan.pan, clamp(track.pan, ...TRACK_BOUNDS.pan), context, immediate);
  setParam(graph.level.gain, audible ? dbToGain(clamp(track.gainDb, ...TRACK_BOUNDS.gainDb)) : 0, context, immediate);
  // Drive is a smoothed parallel blend. Editing a shaper curve while it carries
  // audio can create a discontinuity, so its curve stays fixed for the graph's life.
  const drive = clamp(track.drive, ...TRACK_BOUNDS.drive);
  setParam(graph.driveClean.gain, 1 - drive, context, immediate);
  setParam(graph.driveColor.gain, drive, context, immediate);
}

function buildGraph(context, destination, session) {
  const master = context.createGain();
  master.gain.value = dbToGain(clamp(session.masterDb, ...MASTER_DB_BOUNDS, -6));
  master.connect(destination);
  const tracks = new Map(session.tracks.map((track) => [track.id, createTrackGraph(context, master, track, session)]));
  return { master, tracks, loop: Boolean(session.loop), buffers: new Map() };
}

function disconnectGraph(graph) {
  if (!graph) return;
  for (const track of graph.tracks.values()) {
    for (const node of new Set(Object.values(track).filter((value) => value && typeof value.disconnect === 'function'))) {
      try { node.disconnect(); } catch { /* Already disconnected during context shutdown. */ }
    }
  }
  try { graph.master.disconnect(); } catch { /* Context may already be closed. */ }
}

/** Native Web Audio playback and offline export share exactly the same effect graph. */
export class JuiceEngine {
  constructor() {
    this.context = null;
    this.onStateChange = null;
    this._session = null;
    this._assets = null;
    this._duration = 0;
    this._playing = false;
    this._offset = 0;
    this._startedAt = 0;
    this._sources = new Set();
    this._graph = null;
    this._ticker = null;
    this._clock = null;
    this._clockStopAt = 0;
    this._nextLoopAt = 0;
    this._nativeLoop = false;
    this._loopBuffers = null;
    this._analyzers = null;
    this._clipLatched = false;
    this._playRequest = 0;
  }

  get playing() { return this._playing; }
  get duration() { return this._duration; }
  get sampleRate() { return this.context?.sampleRate || RENDER_SAMPLE_RATE; }
  get position() {
    if (!this._playing || !this.context) return this._offset;
    const elapsed = Math.max(0, this.context.currentTime - this._startedAt) + this._offset;
    return this._session?.loop && this._duration ? elapsed % this._duration : Math.min(elapsed, this._duration);
  }

  _emit(reason) {
    this.onStateChange?.({ playing: this._playing, position: this.position, reason });
  }

  _ensureContext() {
    if (this.context && this.context.state !== 'closed') return this.context;
    const Constructor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Constructor) throw new Error('This browser does not support Web Audio. Open JuiceWeaver in current Safari, Chrome or Firefox.');
    try { this.context = new Constructor({ sampleRate: RENDER_SAMPLE_RATE, latencyHint: 'interactive' }); }
    catch { this.context = new Constructor(); }
    this.context.addEventListener('statechange', () => {
      if (this._playing && this.context.state !== 'running') {
        this._offset = this.position;
        this._halt();
        this._emit('interrupted');
      }
    });
    return this.context;
  }

  async unlock() {
    const context = this._ensureContext();
    if (context.state !== 'running') await context.resume();
    if (context.state !== 'running') throw new Error('Tap Play again to enable audio in this browser.');
    return context;
  }

  createBuffer(channels, length, sampleRate = RENDER_SAMPLE_RATE) {
    return this._ensureContext().createBuffer(channels, length, sampleRate);
  }

  async decode(bytes) {
    if (!(bytes instanceof ArrayBuffer) || !bytes.byteLength) throw new Error('This audio file is empty.');
    if (bytes.byteLength > LIMITS.MAX_SOURCE_BYTES) throw new Error('This audio file exceeds the 64 MiB file limit. Use a shorter or smaller file.');
    const metadata = await inspectAudio(bytes);
    if (metadata.channels && metadata.channels > 2) throw new Error('This file has more than two channels. Convert it to mono or stereo first.');
    if (metadata.duration > AUDIO_LIMITS.seconds) throw new Error('This stem is longer than three minutes. Trim it before importing.');
    if (metadata.duration <= 0) throw new Error('This audio file is empty.');
    const context = this._ensureContext();
    let buffer;
    try { buffer = await context.decodeAudioData(bytes.slice(0)); }
    catch { throw new Error('This audio file could not be decoded. Try a PCM WAV, MP3, M4A or another format supported by your browser.'); }
    if (buffer.numberOfChannels > 2) throw new Error('This file has more than two channels. Convert it to mono or stereo first.');
    if (buffer.duration > AUDIO_LIMITS.seconds + 1 / buffer.sampleRate) throw new Error('This stem is longer than three minutes. Trim it before importing.');
    if (buffer.length * buffer.numberOfChannels * 4 > AUDIO_LIMITS.decodedBytes) throw new Error('This decoded audio is too large. Use a shorter stem.');
    validateSamples(buffer);
    return buffer;
  }

  update(session, assets) {
    const { duration } = validate(session, assets);
    const previousPosition = this.position;
    const structuralChange = this._playing && (
      this._duration !== duration || this._graph.loop !== Boolean(session.loop) ||
      this._graph.tracks.size !== session.tracks.length || session.tracks.some((track) => {
        const graph = this._graph.tracks.get(track.id);
        return !graph || graph.assetId !== track.assetId || this._graph.buffers.get(track.id) !== assets.get(track.assetId)?.buffer;
      })
    );
    if (structuralChange) this._halt();
    this._session = session;
    this._assets = assets;
    this._duration = duration;
    this._offset = Math.min(this._offset, duration);
    if (structuralChange && duration > 0 && this.context?.state === 'running') {
      this._begin(Math.min(previousPosition, Math.max(0, duration - 1 / this.sampleRate)));
    } else if (structuralChange && !duration) {
      this._offset = 0;
      this._emit('empty');
    } else if (this._graph) {
      setParam(this._graph.master.gain, dbToGain(clamp(session.masterDb, ...MASTER_DB_BOUNDS, -6)), this.context, false);
      for (const track of session.tracks) updateTrackGraph(this.context, this._graph.tracks.get(track.id), track, session);
      this._refreshEndClock();
    }
  }

  async play(session = this._session, assets = this._assets, offset = 0) {
    const request = ++this._playRequest;
    await this.unlock();
    if (request !== this._playRequest) return;
    const { duration } = validate(session, assets);
    if (!duration) throw new Error('Add a stem or load the demo before playing.');
    this._halt();
    this._session = session;
    this._assets = assets;
    this._duration = duration;
    this._clipLatched = false;
    this._begin(clamp(offset, 0, duration));
    this._emit('play');
  }

  _begin(offset) {
    const context = this.context;
    this._offset = offset >= this._duration ? 0 : offset;
    this._startedAt = context.currentTime + 0.025;
    this._playing = true;
    this._graph = buildGraph(context, context.destination, this._session);
    this._graph.buffers = new Map(this._session.tracks.map((track) => [track.id, this._assets.get(track.assetId).buffer]));
    this._nativeLoop = Boolean(this._session.loop) && (
      this._duration < 1 || this._session.tracks.every((track) => this._assets.get(track.assetId).buffer.duration === this._duration)
    );
    if (this._nativeLoop) {
      this._loopBuffers = new Map();
      for (const track of this._session.tracks) {
        let buffer = this._assets.get(track.assetId).buffer;
        if (buffer.duration < this._duration) {
          // Sub-second mixed-length loops can be safely padded (<3 MiB for eight
          // stereo stems). Native looping avoids an unbounded timer/source load.
          const padded = context.createBuffer(buffer.numberOfChannels, Math.ceil(this._duration * buffer.sampleRate), buffer.sampleRate);
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) padded.getChannelData(channel).set(buffer.getChannelData(channel));
          buffer = padded;
        }
        this._loopBuffers.set(track.id, buffer);
      }
    }
    const splitter = context.createChannelSplitter(2);
    const sink = context.createGain();
    sink.gain.value = 0;
    this._graph.master.connect(splitter);
    const analyzers = [context.createAnalyser(), context.createAnalyser()];
    for (let channel = 0; channel < 2; channel++) {
      analyzers[channel].fftSize = 2048;
      splitter.connect(analyzers[channel], channel).connect(sink);
    }
    sink.connect(context.destination);
    this._analyzers = { nodes: analyzers, splitter, sink, data: new Float32Array(2048) };
    this._scheduleGroup(this._startedAt, this._offset);
    this._nextLoopAt = this._startedAt + this._duration - this._offset;
    if (this._session.loop && !this._nativeLoop) {
      this._scheduleLoops();
      this._ticker = globalThis.setInterval(() => this._scheduleLoops(), 100);
    } else if (!this._session.loop) {
      const clock = context.createConstantSource();
      clock.offset.value = 0;
      clock.connect(sink);
      this._clock = clock;
      clock.onended = () => {
        if (this._clock !== clock || !this._playing) return;
        this._offset = this._duration;
        this._halt();
        this._emit('ended');
      };
      clock.start(this._startedAt);
      this._refreshEndClock();
    }
  }

  _refreshEndClock() {
    if (!this._clock || this._session.loop) return;
    const stopAt = this._nextLoopAt + roomTail(this._session);
    if (stopAt !== this._clockStopAt) {
      this._clockStopAt = stopAt;
      // Repeated stop() calls replace a future scheduled stop. This matters when
      // Room, mute or solo changes after non-loop playback has already started.
      this._clock.stop(Math.max(this.context.currentTime, stopAt));
    }
  }

  _scheduleGroup(when, offset) {
    for (const track of this._session.tracks) {
      const buffer = this._loopBuffers?.get(track.id) || this._assets.get(track.assetId).buffer;
      if (offset >= buffer.duration) continue;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      if (this._nativeLoop) {
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = this._duration;
      }
      source.connect(this._graph.tracks.get(track.id).input);
      this._sources.add(source);
      source.onended = () => { this._sources.delete(source); source.disconnect(); };
      // Every source uses one shared clock. Shorter stems are silent until the next whole-session loop.
      source.start(when, offset);
    }
  }

  _scheduleLoops() {
    if (!this._playing || !this._session.loop || !this._duration) return;
    const now = this.context.currentTime;
    // Schedule multiple whole cycles ahead without allocating padded copies of stems.
    const horizon = Math.max(0.4, Math.min(30, this._duration * 3));
    let groups = 0;
    if (this._nextLoopAt < now) {
      // If timers were suspended, recover on the next shared boundary; never restart individual stems.
      const skipped = Math.ceil((now - this._nextLoopAt) / this._duration);
      this._nextLoopAt += skipped * this._duration;
    }
    while (this._nextLoopAt < now + horizon && groups++ < 64) {
      this._scheduleGroup(this._nextLoopAt, 0);
      this._nextLoopAt += this._duration;
    }
  }

  _halt() {
    this._playing = false;
    if (this._ticker !== null) globalThis.clearInterval(this._ticker);
    this._ticker = null;
    const clock = this._clock;
    this._clock = null;
    this._clockStopAt = 0;
    if (clock) { clock.onended = null; try { clock.stop(); clock.disconnect(); } catch { /* Already ended. */ } }
    for (const source of this._sources) {
      source.onended = null;
      try { source.stop(); source.disconnect(); } catch { /* Source may have ended. */ }
    }
    this._sources.clear();
    this._loopBuffers = null;
    this._nativeLoop = false;
    if (this._analyzers) {
      for (const node of [...this._analyzers.nodes, this._analyzers.splitter, this._analyzers.sink]) node.disconnect();
      this._analyzers = null;
    }
    disconnectGraph(this._graph);
    this._graph = null;
  }

  pause() {
    ++this._playRequest;
    this._offset = this.position;
    this._halt();
    this._emit('pause');
    return this._offset;
  }

  stop() {
    ++this._playRequest;
    this._halt();
    this._offset = 0;
    this._emit('stop');
  }

  seek(seconds) {
    ++this._playRequest;
    const offset = clamp(seconds, 0, this._duration);
    const resume = this._playing;
    this._halt();
    this._offset = offset;
    if (resume && this._duration && this.context.state === 'running' && (offset < this._duration || this._session.loop)) this._begin(offset);
    this._emit('seek');
    return this._offset;
  }

  meter() {
    let peak = 0;
    if (this._analyzers && this._playing) {
      for (const node of this._analyzers.nodes) {
        node.getFloatTimeDomainData(this._analyzers.data);
        for (const sample of this._analyzers.data) peak = Number.isFinite(sample) ? Math.max(peak, Math.abs(sample)) : Infinity;
      }
    }
    this._clipLatched ||= peak >= 1;
    return { peak, clipped: this._clipLatched };
  }

  async render(session = this._session, assets = this._assets, { normalize = false } = {}) {
    const { duration, decodedBytes } = validate(session, assets);
    if (!duration) throw new Error('Add a stem or load the demo before exporting.');
    const tail = roomTail(session);
    const sampleRate = RENDER_SAMPLE_RATE;
    const length = Math.ceil((duration + tail) * sampleRate);
    const estimate = decodedBytes + length * 2 * (4 + 2) + session.tracks.length * sampleRate * 2 * 4 * REVERB_TAIL_SECONDS;
    if (estimate > AUDIO_LIMITS.renderBytes) throw new Error('This export exceeds the safe processing budget. Use shorter stems or export fewer at once.');
    const Constructor = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!Constructor) throw new Error('Offline audio export is unavailable in this browser. Use current Safari, Chrome or Firefox.');
    const offline = new Constructor(2, length, sampleRate);
    const graph = buildGraph(offline, offline.destination, session);
    for (const track of session.tracks) {
      const source = offline.createBufferSource();
      source.buffer = assets.get(track.assetId).buffer;
      source.connect(graph.tracks.get(track.id).input);
      source.start(0);
    }
    let rendered;
    try { rendered = await offline.startRendering(); }
    catch { throw new Error('The browser could not finish this export. Close other tabs or try a shorter session.'); }
    finally { disconnectGraph(graph); }
    const peak = measurePeak(rendered);
    // Historical option name retained for the UI API. This protects peaks only:
    // quiet mixes are never boosted, and no compressor or limiter is applied.
    const normalizationGain = normalize && peak > 0 ? Math.min(1, 0.98 / peak) : 1;
    const bytes = encodeWav(rendered, { gain: normalizationGain });
    return {
      blob: new Blob([bytes], { type: 'audio/wav' }), peak,
      exportedPeak: Math.min(1, peak * normalizationGain),
      duration: rendered.duration, sampleRate, tail, normalizationGain,
    };
  }

  async destroy() {
    this.stop();
    if (this.context && this.context.state !== 'closed') await this.context.close();
    this.context = null;
  }
}
