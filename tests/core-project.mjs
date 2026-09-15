import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession, newTrack, LIMITS } from '../src/core/model.js';
import { encodeProject, decodeProject, validateAssetReferences, ProjectError } from '../src/core/project.js';

function example() {
  const session = newSession({ id: 'project_1', name: 'Exact originals', tracks: [
    newTrack({ id: 'stem_drums', assetId: 'audio_drums', name: 'Drums', pan: -0.25 }),
    newTrack({ id: 'stem_bass', assetId: 'audio_bass', name: 'Bass', gainDb: -3 }),
  ] });
  const assets = new Map([
    ['audio_drums', { id: 'audio_drums', name: 'drums.wav', mime: 'audio/wav', bytes: new Uint8Array([0, 1, 127, 128, 200, 255, 13, 10]).buffer, buffer: { runtimeOnly: true } }],
    ['audio_bass', { id: 'audio_bass', name: 'bass.m4a', mime: 'audio/mp4', bytes: new Uint8Array([255, 17, 0, 253, 5]).buffer }],
  ]);
  return { session, assets };
}

function unpack(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const length = view.getUint32(4, true);
  return { manifest: JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, 12, length))), payload: new Uint8Array(arrayBuffer.slice(12 + length)) };
}

function pack(manifest, payload) {
  const encoded = new TextEncoder().encode(JSON.stringify(manifest));
  const result = new Uint8Array(12 + encoded.length + payload.length);
  result.set([67, 74, 87, 49]);
  const header = new DataView(result.buffer);
  header.setUint32(4, encoded.length, true);
  header.setUint32(8, payload.length, true);
  result.set(encoded, 12);
  result.set(payload, 12 + encoded.length);
  return result.buffer;
}

async function archive() { const { session, assets } = example(); return (await encodeProject(session, assets)).arrayBuffer(); }

test('binary project round-trip preserves all controls and source bytes exactly', async () => {
  const { session, assets } = example();
  session.journal.push({ at: '2026-09-15T00:00:00.000Z', text: 'Turned bass down' });
  const blob = await encodeProject(session, assets);
  assert.equal(blob.type, 'application/vnd.cratejuice.project');
  const restored = await decodeProject(await blob.arrayBuffer());
  assert.deepEqual(restored.session, session);
  assert.equal(restored.assets.size, 2);
  for (const [id, original] of assets) {
    assert.deepEqual(new Uint8Array(restored.assets.get(id).bytes), new Uint8Array(original.bytes));
    assert.equal(Object.hasOwn(restored.assets.get(id), 'buffer'), false);
  }
  assert.ok(blob.size < 4096, 'small inputs do not acquire encoded/base64 audio overhead');
});

test('a project captures the session and byte snapshot at save time', async () => {
  const { session, assets } = example();
  const encoding = encodeProject(session, assets);
  session.name = 'Changed after save';
  session.tracks[0].gainDb = -20;
  new Uint8Array(assets.get('audio_drums').bytes).fill(99);
  const restored = await decodeProject(await (await encoding).arrayBuffer());
  assert.equal(restored.session.name, 'Exact originals');
  assert.equal(restored.session.tracks[0].gainDb, 0);
  assert.equal(new Uint8Array(restored.assets.get('audio_drums').bytes)[0], 0);
});

test('empty sessions and shared audio references round-trip without duplicate payloads', async () => {
  const empty = newSession();
  const restored = await decodeProject(await (await encodeProject(empty, new Map())).arrayBuffer());
  assert.deepEqual(restored.session, empty);
  assert.equal(restored.assets.size, 0);
  const { session, assets } = example();
  session.tracks.push(newTrack({ id: 'stem_copy', assetId: 'audio_drums', name: 'Drums copy' }));
  assets.set('unused', { id: 'unused', name: 'Unused', mime: '', bytes: new ArrayBuffer(10) });
  const withCopy = await decodeProject(await (await encodeProject(session, assets)).arrayBuffer());
  assert.equal(withCopy.session.tracks.length, 3);
  assert.equal(withCopy.assets.size, 2);
});

test('missing original bytes and mismatched references fail before export', async () => {
  const { session, assets } = example();
  assets.delete('audio_bass');
  assert.throws(() => validateAssetReferences(session, assets), ProjectError);
  await assert.rejects(encodeProject(session, assets), /Audio source/);
  assets.set('audio_bass', { id: 'wrong_id', name: 'Bass', mime: 'audio/wav', bytes: new ArrayBuffer(10) });
  await assert.rejects(encodeProject(session, assets), /ID does not match/);
  assets.get('audio_bass').id = 'audio_bass';
  assets.get('audio_bass').bytes = 'https://example.com/bass.wav';
  await assert.rejects(encodeProject(session, assets), /Original audio bytes are missing/);
});

test('wrong magic, truncated files and trailing payloads fail cleanly', async () => {
  const valid = await archive();
  await assert.rejects(decodeProject(valid.slice(0, 8)), /incomplete/);
  await assert.rejects(decodeProject(valid.slice(0, -1)), /truncated/);
  const trailing = new Uint8Array(valid.byteLength + 1); trailing.set(new Uint8Array(valid));
  await assert.rejects(decodeProject(trailing.buffer), /trailing/);
  const wrongMagic = valid.slice(0); new Uint8Array(wrongMagic)[0] = 0;
  await assert.rejects(decodeProject(wrongMagic), /not a supported/);
});

test('payload damage is detected even when every declared length is correct', async () => {
  const bytes = new Uint8Array(await archive());
  bytes[bytes.length - 1] ^= 0x01;
  await assert.rejects(decodeProject(bytes.buffer), /integrity check/);
});

test('malformed manifests and invalid UTF-8 cannot produce a partial session', async () => {
  const bytes = new Uint8Array(await archive());
  bytes[12] = 0xff;
  await assert.rejects(decodeProject(bytes.buffer), /metadata is damaged/);
  const { manifest, payload } = unpack(await archive());
  manifest.version = 2;
  await assert.rejects(decodeProject(pack(manifest, payload)), /unsupported file version/);
});

test('duplicate, missing and orphaned assets are rejected', async () => {
  let { manifest, payload } = unpack(await archive());
  manifest.assets[1].id = manifest.assets[0].id;
  await assert.rejects(decodeProject(pack(manifest, payload)), /duplicate audio IDs/);
  ({ manifest, payload } = unpack(await archive()));
  manifest.session.tracks[1].assetId = 'not_present';
  await assert.rejects(decodeProject(pack(manifest, payload)), /missing or unreferenced/);
  ({ manifest, payload } = unpack(await archive()));
  manifest.session.tracks.pop();
  await assert.rejects(decodeProject(pack(manifest, payload)), /missing or unreferenced/);
});

test('oversized archive, metadata, payload and source lengths are rejected before copying audio', async () => {
  await assert.rejects(decodeProject(new ArrayBuffer(LIMITS.MAX_PROJECT_BYTES + 1)), /exceeds/);
  let file = await archive();
  new DataView(file).setUint32(4, LIMITS.MAX_MANIFEST_BYTES + 1, true);
  await assert.rejects(decodeProject(file), /metadata length/);
  file = await archive();
  new DataView(file).setUint32(8, LIMITS.MAX_TOTAL_SOURCE_BYTES + 1, true);
  await assert.rejects(decodeProject(file), /96 MiB/);
  const { manifest, payload } = unpack(await archive());
  manifest.assets[0].byteLength = LIMITS.MAX_SOURCE_BYTES + 1;
  await assert.rejects(decodeProject(pack(manifest, payload)), /64 MiB/);
  manifest.assets[0].byteLength = 0;
  await assert.rejects(decodeProject(pack(manifest, payload)), /1 byte/);
});

test('remote audio descriptors, executable media types and malformed checksums are rejected', async () => {
  let { manifest, payload } = unpack(await archive());
  manifest.assets[0].url = 'https://example.com/track.wav';
  await assert.rejects(decodeProject(pack(manifest, payload)), /remote audio is not supported/);
  ({ manifest, payload } = unpack(await archive()));
  manifest.assets[0].mime = 'text/javascript';
  await assert.rejects(decodeProject(pack(manifest, payload)), /media type/);
  ({ manifest, payload } = unpack(await archive()));
  manifest.assets[0].sha256 = 'invalid';
  await assert.rejects(decodeProject(pack(manifest, payload)), /integrity checksum/);
});
