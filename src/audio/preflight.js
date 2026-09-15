const tag = (view, offset, expected) => {
  if (offset + expected.length > view.byteLength) return false;
  for (let i = 0; i < expected.length; i++) if (view.getUint8(offset + i) !== expected.charCodeAt(i)) return false;
  return true;
};
const inspected = new WeakMap();

/** Read PCM WAV timing without allocating decoded audio. Compressed WAV needs media metadata. */
export function inspectPcmWav(bytes) {
  const view = new DataView(bytes);
  if (view.byteLength < 12 || !tag(view, 0, 'RIFF') || !tag(view, 8, 'WAVE')) return null;
  let format;
  let dataBytes;
  for (let offset = 12; offset + 8 <= view.byteLength;) {
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (size > view.byteLength - start) throw new Error('This WAV file is incomplete. Export the original audio again.');
    if (tag(view, offset, 'fmt ') && size >= 16) {
      if (format) throw new Error('This WAV contains multiple audio formats. Export it as one PCM WAV and try again.');
      const code = view.getUint16(start, true);
      const subtype = code === 0xfffe && size >= 40 ? view.getUint16(start + 24, true) : code;
      format = {
        code: subtype, channels: view.getUint16(start + 2, true),
        sampleRate: view.getUint32(start + 4, true), blockAlign: view.getUint16(start + 12, true),
        bits: view.getUint16(start + 14, true),
      };
    }
    if (tag(view, offset, 'data')) dataBytes = (dataBytes ?? 0) + size;
    offset = start + size + size % 2;
  }
  if (!format || dataBytes === undefined) throw new Error('This WAV file is missing its audio format or sample data.');
  if (![1, 3].includes(format.code)) return null;
  const validBits = format.code === 3 ? [32, 64] : [8, 16, 24, 32];
  const expectedAlignment = format.channels * format.bits / 8;
  if (!format.sampleRate || !format.channels || !validBits.includes(format.bits) || !format.blockAlign || format.blockAlign !== expectedAlignment || dataBytes % format.blockAlign) {
    throw new Error('This WAV file has an invalid audio header. Export it as PCM WAV and try again.');
  }
  return { duration: dataBytes / format.blockAlign / format.sampleRate, channels: format.channels, sampleRate: format.sampleRate };
}

function sniffMime(bytes) {
  const view = new DataView(bytes);
  if (tag(view, 0, 'RIFF')) return 'audio/wav';
  if (tag(view, 4, 'ftyp')) return 'audio/mp4';
  if (tag(view, 0, 'fLaC')) return 'audio/flac';
  if (tag(view, 0, 'OggS')) return 'audio/ogg';
  if (tag(view, 0, 'ID3') || (view.byteLength >= 2 && view.getUint8(0) === 0xff && (view.getUint8(1) & 0xe0) === 0xe0)) return 'audio/mpeg';
  return '';
}

/** Compressed sources are inspected locally before decodeAudioData can expand them. */
export async function inspectAudio(bytes, { timeoutMs = 8000, file } = {}) {
  if (inspected.has(bytes)) return inspected.get(bytes);
  const wave = inspectPcmWav(bytes);
  if (wave) {
    const metadata = Object.freeze(wave);
    inspected.set(bytes, metadata);
    return metadata;
  }
  if (typeof globalThis.Audio !== 'function' || !globalThis.URL?.createObjectURL) throw new Error('This browser cannot inspect the audio safely. Export a PCM WAV and try again.');
  const media = new Audio();
  media.preload = 'metadata';
  const url = URL.createObjectURL(new Blob([bytes], { type: file?.type || sniffMime(bytes) }));
  let timer;
  try {
    const duration = await new Promise((resolve, reject) => {
      const readDuration = () => {
        if (Number.isFinite(media.duration) && media.duration > 0) resolve(media.duration);
      };
      media.onloadedmetadata = readDuration;
      media.ondurationchange = readDuration;
      media.onerror = () => reject(new Error('This audio file could not be decoded. Try a PCM WAV, MP3, M4A or another format supported by your browser.'));
      timer = setTimeout(() => reject(new Error('The browser could not verify this file’s duration safely. Export a PCM WAV or try a smaller file.')), timeoutMs);
      media.src = url;
      media.load();
    });
    // Metadata APIs do not reliably expose encoded channel count. Budget for
    // stereo now; inspect the actual channel count after native decoding.
    const metadata = Object.freeze({ duration, channels: 2, sampleRate: null });
    inspected.set(bytes, metadata);
    return metadata;
  } finally {
    clearTimeout(timer);
    media.onloadedmetadata = null;
    media.ondurationchange = null;
    media.onerror = null;
    media.removeAttribute('src');
    media.load();
    URL.revokeObjectURL(url);
  }
}

export const wavMetadata = inspectPcmWav;
export function probeAudio(file, bytes) { return inspectAudio(bytes, { file }); }
