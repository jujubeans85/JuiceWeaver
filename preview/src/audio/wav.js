/** Encode interleaved, little-endian 16-bit PCM. Input may be a native AudioBuffer. */
export function encodeWav(buffer, { gain = 1 } = {}) {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const sampleRate = buffer.sampleRate;
  if (!Number.isInteger(channels) || channels < 1 || channels > 2) throw new Error('WAV export supports mono or stereo audio.');
  if (!Number.isInteger(frames) || frames < 1 || !Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('Cannot export an empty or invalid audio buffer.');
  if (!Number.isFinite(gain) || gain < 0) throw new Error('WAV gain must be a finite positive number.');
  const byteLength = frames * channels * 2;
  if (byteLength > 0xffffffff - 36) throw new Error('This recording exceeds the PCM WAV size limit.');
  const bytes = new ArrayBuffer(44 + byteLength);
  const view = new DataView(bytes);
  const ascii = (offset, text) => [...text].forEach((character, i) => view.setUint8(offset + i, character.charCodeAt(0)));
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + byteLength, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, byteLength, true);
  const samples = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const original = samples[channel][frame];
      // Malformed/nonfinite DSP output must never put NaN into an audio file.
      const sample = Number.isFinite(original) ? Math.max(-1, Math.min(1, original * gain)) : 0;
      view.setInt16(offset, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
      offset += 2;
    }
  }
  return bytes;
}

export function measurePeak(buffer) {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let frame = 0; frame < samples.length; frame++) {
      if (!Number.isFinite(samples[frame])) throw new Error('Audio processing produced an invalid sample. Try reducing the effects.');
      peak = Math.max(peak, Math.abs(samples[frame]));
    }
  }
  return peak;
}
