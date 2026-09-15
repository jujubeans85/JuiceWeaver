import { LIMITS } from './core/model.js';
const MAX_RATE = 48000;
import { probeAudio } from './audio/preflight.js';
export { wavMetadata, probeAudio } from './audio/preflight.js';
export function assetSize(assets){let decoded=0,source=0;for(const asset of assets.values()){source+=asset.bytes.byteLength;if(asset.buffer)decoded+=asset.buffer.length*asset.buffer.numberOfChannels*4;}return {decoded,source};}
export async function checkedDecode(engine,file,bytes,currentBytes=0) {
  if(bytes.byteLength>LIMITS.MAX_SOURCE_BYTES)throw new Error(`${file.name}: the file limit is 64 MiB. Export a shorter stem.`);
  const meta=await probeAudio(file,bytes);
  if(meta.duration>LIMITS.MAX_DURATION_SECONDS)throw new Error(`${file.name}: stems can be up to 3 minutes. Trim or split this file first.`);
  if(meta.channels>2)throw new Error(`${file.name}: use a mono or stereo stem.`);
  if(meta.duration*MAX_RATE*meta.channels*4+currentBytes>LIMITS.MAX_DECODED_BYTES)throw new Error('This session would exceed the 96 MiB audio budget. Use shorter stems or fewer tracks.');
  const buffer=await engine.decode(bytes);
  if(buffer.duration>LIMITS.MAX_DURATION_SECONDS||buffer.numberOfChannels>2||buffer.length*buffer.numberOfChannels*4+currentBytes>LIMITS.MAX_DECODED_BYTES)throw new Error('The decoded audio exceeds the supported session limit. Use shorter mono/stereo stems.');
  return buffer;
}
