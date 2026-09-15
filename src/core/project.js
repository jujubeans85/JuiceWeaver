/**
 * .juice = 12-byte little-endian header + UTF-8 manifest + untouched audio bytes.
 * CJW1 | uint32 manifest length | uint32 audio length
 * SHA-256 detects corrupted payloads; it is not an authenticity signature.
 */
import { LIMITS, cleanText, safeId, validateSession } from './model.js';

const MAGIC = [0x43, 0x4a, 0x57, 0x31]; // CJW1
const HEADER_SIZE = 12;
const FORMAT = 'crate-juice/juiceweaver';
const MIME = /^(?:audio\/[a-z0-9!#$&^_.+-]+|application\/octet-stream)$/i;
const ASSET_KEYS = new Set(['id', 'name', 'mime', 'byteLength', 'sha256']);

export class ProjectError extends Error {
  constructor(message, options) { super(message, options); this.name = 'ProjectError'; }
}

function projectError(error, fallback = 'This project could not be read.') {
  if (error instanceof ProjectError) return error;
  return new ProjectError(error?.message || fallback, { cause: error });
}

function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProjectError(`${label} is invalid.`);
  }
  return value;
}

function validMime(value) {
  if (typeof value !== 'string' || value.length > 100 || !MIME.test(value)) {
    throw new ProjectError('An audio source has an invalid media type.');
  }
  return value.toLowerCase();
}

function byteLength(value, label) {
  if (!Number.isSafeInteger(value) || value < 1 || value > LIMITS.MAX_SOURCE_BYTES) {
    throw new ProjectError(`${label} must be between 1 byte and 64 MiB.`);
  }
  return value;
}

function collectAssets(session, assets) {
  if (!(assets instanceof Map)) throw new ProjectError('The project audio sources are missing.');
  const ids = [...new Set(session.tracks.map(track => track.assetId))];
  if (ids.length > LIMITS.MAX_ASSETS) throw new ProjectError('This project contains too many audio sources.');
  let total = 0;
  const selected = ids.map(id => {
    const asset = requireRecord(assets.get(id), `Audio source for ${session.tracks.find(track => track.assetId === id)?.name ?? id}`);
    if (asset.id !== id) throw new ProjectError('An audio source ID does not match its stem.');
    safeId(id, 'Audio ID');
    if (!(asset.bytes instanceof ArrayBuffer)) throw new ProjectError('Original audio bytes are missing. Import the original file again.');
    const length = byteLength(asset.bytes.byteLength, 'Each audio source');
    total += length;
    if (total > LIMITS.MAX_TOTAL_SOURCE_BYTES) throw new ProjectError('Original audio exceeds this session’s 96 MiB limit.');
    return {
      id,
      name: cleanText(asset.name, 'Audio filename', 160),
      mime: validMime(asset.mime || 'application/octet-stream'),
      bytes: asset.bytes,
    };
  });
  return { selected, total };
}

/** Throws before any application state is changed; unused runtime assets are ignored. */
export function validateAssetReferences(session, assets) {
  try { collectAssets(validateSession(session), assets); return true; }
  catch (error) { throw projectError(error); }
}

async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) {
    throw new ProjectError('Project integrity checks need a secure HTTPS connection or localhost.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function encodeProject(session, assets) {
  try {
    const snapshot = validateSession(session);
    const { selected, total } = collectAssets(snapshot, assets);
    // Blob snapshots the source bytes before the first await, preventing changes
    // made while hashing from creating a manifest/payload mismatch.
    const sourceBlobs = selected.map(asset => new Blob([asset.bytes]));
    const descriptors = [];
    for (let index = 0; index < selected.length; index += 1) {
      const asset = selected[index];
      const bytes = await sourceBlobs[index].arrayBuffer();
      descriptors.push({
        id: asset.id, name: asset.name, mime: asset.mime,
        byteLength: bytes.byteLength, sha256: await sha256(bytes),
      });
    }
    const manifest = new TextEncoder().encode(JSON.stringify({
      format: FORMAT, version: 2, session: snapshot, assets: descriptors,
    }));
    if (manifest.byteLength > LIMITS.MAX_MANIFEST_BYTES) throw new ProjectError('This project’s metadata is too large.');
    const header = new ArrayBuffer(HEADER_SIZE);
    new Uint8Array(header).set(MAGIC);
    const view = new DataView(header);
    view.setUint32(4, manifest.byteLength, true);
    view.setUint32(8, total, true);
    return new Blob([header, manifest, ...sourceBlobs], { type: 'application/vnd.cratejuice.project' });
  } catch (error) { throw projectError(error, 'This project could not be exported.'); }
}

export async function decodeProject(arrayBuffer) {
  try {
    if (!(arrayBuffer instanceof ArrayBuffer)) throw new ProjectError('Open a .juice project file to continue.');
    if (arrayBuffer.byteLength < HEADER_SIZE) throw new ProjectError('This project is incomplete or is not a .juice file.');
    if (arrayBuffer.byteLength > LIMITS.MAX_PROJECT_BYTES) throw new ProjectError('This project exceeds the 96 MiB audio limit.');
    const bytes = new Uint8Array(arrayBuffer);
    if (!MAGIC.every((byte, index) => bytes[index] === byte)) {
      throw new ProjectError('This is not a supported JuiceWeaver .juice project.');
    }
    const header = new DataView(arrayBuffer, 0, HEADER_SIZE);
    const manifestLength = header.getUint32(4, true);
    const payloadLength = header.getUint32(8, true);
    if (manifestLength < 2 || manifestLength > LIMITS.MAX_MANIFEST_BYTES) throw new ProjectError('This project’s metadata length is invalid.');
    if (payloadLength > LIMITS.MAX_TOTAL_SOURCE_BYTES) throw new ProjectError('Original audio exceeds this session’s 96 MiB limit.');
    if (HEADER_SIZE + manifestLength + payloadLength !== bytes.byteLength) {
      throw new ProjectError('This project is truncated or contains unexpected trailing data.');
    }
    let manifest;
    try {
      manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(HEADER_SIZE, HEADER_SIZE + manifestLength)));
    } catch (cause) { throw new ProjectError('This project’s metadata is damaged.', { cause }); }
    requireRecord(manifest, 'Project manifest');
    if (manifest.format !== FORMAT || ![1, 2].includes(manifest.version)) throw new ProjectError('This project uses an unsupported file version.');
    if (manifest.session?.schema !== manifest.version) throw new ProjectError('Project file and session versions do not match.');
    const session = validateSession(manifest.session);
    if (!Array.isArray(manifest.assets) || manifest.assets.length > LIMITS.MAX_ASSETS) {
      throw new ProjectError('This project has too many or invalid audio sources.');
    }
    const ids = new Set();
    let declaredLength = 0;
    const descriptors = manifest.assets.map((input) => {
      const asset = requireRecord(input, 'Audio source');
      if (Object.keys(asset).some(key => !ASSET_KEYS.has(key))) {
        throw new ProjectError('This project contains unsupported audio metadata. Linked or remote audio is not supported.');
      }
      const id = safeId(asset.id, 'Audio ID');
      if (ids.has(id)) throw new ProjectError('This project contains duplicate audio IDs.');
      ids.add(id);
      const length = byteLength(asset.byteLength, 'Each audio source');
      declaredLength += length;
      if (declaredLength > LIMITS.MAX_TOTAL_SOURCE_BYTES) throw new ProjectError('Original audio exceeds this session’s 96 MiB limit.');
      if (typeof asset.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(asset.sha256)) {
        throw new ProjectError('An audio source is missing its integrity checksum.');
      }
      return { id, name: cleanText(asset.name, 'Audio filename', 160), mime: validMime(asset.mime), byteLength: length, sha256: asset.sha256 };
    });
    if (declaredLength !== payloadLength) throw new ProjectError('The project’s audio lengths do not match its contents.');
    const referenced = new Set(session.tracks.map(track => track.assetId));
    if (referenced.size !== ids.size || [...referenced].some(id => !ids.has(id))) {
      throw new ProjectError('This project has missing or unreferenced audio sources.');
    }
    const assets = new Map();
    let offset = HEADER_SIZE + manifestLength;
    for (const descriptor of descriptors) {
      const audioBytes = arrayBuffer.slice(offset, offset + descriptor.byteLength);
      offset += descriptor.byteLength;
      if (await sha256(audioBytes) !== descriptor.sha256) {
        throw new ProjectError(`“${descriptor.name}” failed its integrity check. Open another backup.`);
      }
      assets.set(descriptor.id, { id: descriptor.id, name: descriptor.name, mime: descriptor.mime, bytes: audioBytes });
    }
    return { session, assets };
  } catch (error) { throw projectError(error); }
}
