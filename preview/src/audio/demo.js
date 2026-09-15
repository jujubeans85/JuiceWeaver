import { encodeWav } from './wav.js';

/** An original, deterministic eight-bar composition. No recordings, models or third-party assets. */
export async function createDemo(engine) {
  const bpm = 88;
  const sampleRate = 48000;
  const beat = 60 / bpm;
  const bars = 8;
  const duration = bars * 4 * beat;
  const frames = Math.round(duration * sampleRate);
  const drums = engine.createBuffer(2, frames, sampleRate);
  const bass = engine.createBuffer(1, frames, sampleRate);
  const harmonics = engine.createBuffer(2, frames, sampleRate);
  const melody = engine.createBuffer(2, frames, sampleRate);
  const tau = Math.PI * 2;
  const note = (midi) => 440 * 2 ** ((midi - 69) / 12);
  let seed = 182793;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff * 2 - 1;
  };

  // Wrapped placement preserves the natural release of notes across the loop boundary.
  function place(buffer, seconds, length, synth, pan = 0, level = 1) {
    const start = Math.round(seconds * sampleRate);
    const count = Math.floor(length * sampleRate);
    const channelData = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
    const left = buffer.numberOfChannels === 1 ? 1 : Math.cos((pan + 1) * Math.PI / 4);
    const right = Math.sin((pan + 1) * Math.PI / 4);
    for (let i = 0; i < count; i++) {
      const t = i / sampleRate;
      const sample = synth(t, i) * level;
      const frame = (start + i) % frames;
      channelData[0][frame] += sample * left;
      if (channelData[1]) channelData[1][frame] += sample * right;
    }
  }

  function kick(time, level = 1) {
    let phase = 0;
    place(drums, time, 0.45, (t) => {
      phase += tau * (45 + 85 * Math.exp(-t * 42)) / sampleRate;
      const body = Math.sin(phase) * Math.exp(-t * 11);
      const tick = random() * Math.exp(-t * 300) * 0.19;
      return (body * 0.53 + tick) * Math.min(1, t * 1800);
    }, 0, level);
  }

  function snare(time, level = 1) {
    let low = 0;
    place(drums, time, 0.24, (t) => {
      const noise = random();
      low = low * 0.72 + noise * 0.28;
      const snap = (noise - low) * Math.exp(-t * 26) * 0.22;
      const body = (Math.sin(tau * 181 * t) + Math.sin(tau * 327 * t) * 0.25) * Math.exp(-t * 34) * 0.13;
      return (snap + body) * Math.min(1, t * 2400);
    }, -0.1, level);
  }

  function hat(time, level, open = false, pan = 0.28) {
    let previous = 0;
    let smooth = 0;
    place(drums, time, open ? 0.26 : 0.1, (t) => {
      const noise = random();
      smooth = 0.36 * noise + 0.64 * smooth;
      const airy = smooth - previous;
      previous = smooth;
      return airy * Math.exp(-t * (open ? 20 : 65)) * 0.2 * Math.min(1, t * 4500);
    }, pan, level);
  }

  const chords = [
    { bass: 33, tones: [48, 55, 59, 64, 67], melody: [76, 79, 83, 81] },
    { bass: 29, tones: [48, 52, 57, 64, 67], melody: [76, 72, 79, 76] },
    { bass: 36, tones: [48, 55, 59, 62, 64], melody: [74, 76, 79, 71] },
    { bass: 31, tones: [47, 55, 57, 62, 64], melody: [74, 76, 69, 71] },
  ];
  for (let bar = 0; bar < bars; bar++) {
    const start = bar * 4 * beat;
    const chord = chords[bar % chords.length];
    kick(start);
    kick(start + (bar % 2 ? 2.55 : 2.5) * beat, 0.83);
    if (bar === 3 || bar === 7) kick(start + 3.5 * beat, 0.7);
    snare(start + 1.015 * beat, 0.93);
    snare(start + 3.01 * beat, 1);
    if (bar % 2) snare(start + 2.76 * beat, 0.2);
    for (let eighth = 0; eighth < 8; eighth++) {
      const swing = eighth % 2 ? 0.055 : 0;
      hat(start + (eighth * 0.5 + swing) * beat,
        (eighth % 2 ? 0.53 : 0.8) + random() * 0.06,
        eighth === 7 && bar % 2 === 1, eighth % 2 ? 0.38 : 0.2);
    }
    if (bar === 7) {
      hat(start + 3.76 * beat, 0.45, false, -0.35);
      snare(start + 3.79 * beat, 0.27);
    }

    const bassPattern = [
      [0.015, chord.bass, 0.78], [1.63, chord.bass + 12, 0.32],
      [2.5, chord.bass, 0.62], [3.42, chord.bass + (bar % 2 ? 7 : 10), 0.36],
    ];
    for (const [onset, midi, beats] of bassPattern) {
      const length = beats * beat;
      const frequency = note(midi);
      place(bass, start + onset * beat, length + 0.06, (t) => {
        const attack = Math.min(1, t / 0.012);
        const release = Math.min(1, Math.max(0, (length + 0.06 - t) / 0.08));
        const envelope = attack * release * (0.75 + 0.25 * Math.exp(-t * 9));
        return (Math.sin(tau * frequency * t) + Math.sin(tau * frequency * 2 * t) * 0.18 + Math.sin(tau * frequency * 3 * t) * 0.045) * envelope * 0.29;
      });
    }

    for (let voice = 0; voice < chord.tones.length; voice++) {
      const frequency = note(chord.tones[voice]);
      const pan = (voice - 2) * 0.18;
      for (const [onset, level, length] of [[0.07, 1, 2.35], [2.58, 0.48, 1.8]]) {
        place(harmonics, start + onset * beat, length, (t) => {
          const attack = 1 - Math.exp(-t * 240);
          const release = Math.min(1, (length - t) / 0.2);
          const tremolo = 0.92 + 0.08 * Math.sin(tau * 3.1 * t + voice);
          const bell = Math.sin(tau * frequency * t + Math.sin(tau * frequency * 2 * t) * 1.35 * Math.exp(-t * 9));
          const warmth = Math.sin(tau * frequency * 0.9993 * t) * 0.22;
          return (bell + warmth) * attack * Math.max(0, release) * Math.exp(-t * 1.55) * tremolo * 0.069;
        }, pan, level);
      }
    }

    const phrases = bar % 2 === 0 ? [[0.75, 0], [1.56, 1], [2.25, 2]] : [[0.24, 2], [1.74, 1], [3.18, 3]];
    for (let index = 0; index < phrases.length; index++) {
      const [onset, toneIndex] = phrases[index];
      const frequency = note(chord.melody[toneIndex] - (bar < 4 ? 12 : 0));
      const pan = index % 2 ? -0.23 : 0.2;
      const length = 1.25;
      const synth = (t) => {
        const attack = 1 - Math.exp(-t * 130);
        const release = Math.max(0, Math.min(1, (length - t) / 0.12));
        const drift = 0.00065 * Math.sin(tau * 4.2 * t);
        const fundamental = Math.sin(tau * frequency * t + drift * frequency);
        const softBell = Math.sin(tau * frequency * 2 * t) * 0.28 * Math.exp(-t * 4);
        return (fundamental + softBell) * attack * release * Math.exp(-t * 3.6) * 0.072;
      };
      place(melody, start + onset * beat, length, synth, pan);
      place(melody, start + (onset + 0.75) * beat, length, synth, -pan, 0.27);
      place(melody, start + (onset + 1.5) * beat, length, synth, pan * 1.5, 0.09);
    }
    // Yield between bars so creating the demo never locks up the app on a phone.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const specifications = [
    { id: 'demo-drums', name: 'Night bus', role: 'drums', color: '#bd6547', buffer: drums, gainDb: -1, space: 0.07 },
    { id: 'demo-bass', name: 'Low tide', role: 'bass', color: '#a2ad85', buffer: bass, gainDb: -1, space: 0 },
    { id: 'demo-chords', name: 'Keys', role: 'harmonics', color: '#d2b27e', buffer: harmonics, gainDb: -1, space: 0.14 },
    { id: 'demo-melody', name: 'First light', role: 'other', color: '#b5a2c4', buffer: melody, gainDb: 0, space: 0.18 },
  ];
  const assets = new Map();
  const tracks = [];
  for (const specification of specifications) {
    const assetId = `${specification.id}-audio`;
    assets.set(assetId, {
      id: assetId, name: `${specification.name}.wav`, mime: 'audio/wav',
      bytes: encodeWav(specification.buffer), buffer: specification.buffer,
    });
    tracks.push({
      id: specification.id, assetId, name: specification.name, role: specification.role,
      color: specification.color, gainDb: specification.gainDb, pan: 0, mute: false,
      solo: false, lowDb: 0, highDb: 0, drive: 0, space: specification.space,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { assets, tracks, bpm, name: 'Last train, first light' };
}
