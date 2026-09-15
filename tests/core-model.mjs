import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession, newTrack, cloneSession, validateSession, inferRole, LIMITS } from '../src/core/model.js';

const stem = (extra = {}) => newTrack({ id: 'track_1', assetId: 'audio_1', name: 'Live keys.wav', ...extra });
const session = () => newSession({ id: 'session_1', tracks: [stem()] });

test('new sessions have a safe empty state and inferred stem identity', () => {
  const empty = newSession();
  assert.equal(empty.schema, 2);
  assert.equal(empty.masterDb, -6);
  assert.equal(empty.bpm, 88);
  assert.equal(empty.loop, true);
  assert.deepEqual(empty.tracks, []);
  assert.equal(stem().role, 'harmonics');
  assert.equal(inferRole('lead_vox-01.wav'), 'vocals');
  assert.equal(inferRole('bass.wav'), 'bass');
  assert.equal(inferRole('kick-loop.wav'), 'drums');
  assert.equal(inferRole('field recording.m4a'), 'other');
});

test('imported controls clamp to published bounds without mutating the input', () => {
  const source = session();
  Object.assign(source, { bpm: 999, masterDb: 50 });
  Object.assign(source.tracks[0], { gainDb: -100, pan: 8, lowDb: -20, highDb: 50, drive: -2, space: 7 });
  const safe = validateSession(source);
  assert.equal(safe.bpm, LIMITS.MAX_BPM);
  assert.equal(safe.masterDb, 0);
  assert.deepEqual([safe.tracks[0].gainDb, safe.tracks[0].pan, safe.tracks[0].lowDb, safe.tracks[0].highDb, safe.tracks[0].drive, safe.tracks[0].space], [-60, 1, -12, 12, 0, 1]);
  assert.equal(source.tracks[0].space, 7);
});

test('non-finite numbers and incorrect types never become valid controls', () => {
  for (const value of [NaN, Infinity, -Infinity, '2', null, undefined]) {
    const source = session(); source.tracks[0].gainDb = value;
    assert.throws(() => validateSession(source), /finite/);
  }
  const source = session(); source.loop = 'false';
  assert.throws(() => validateSession(source), /true or false/);
  source.loop = false; source.schema = 99;
  assert.throws(() => validateSession(source), /unsupported session version/);
});

test('identifiers, roles, colours, duplicates and stem count are checked', () => {
  assert.throws(() => stem({ assetId: '../audio' }), /Audio ID/);
  assert.throws(() => stem({ role: 'remote' }), /role/);
  assert.throws(() => stem({ color: 'url(https://example.com)' }), /hex colour/);
  assert.throws(() => newSession({ tracks: [stem(), stem()] }), /duplicate/);
  assert.throws(() => newSession({ tracks: Array.from({ length: 9 }, (_, i) => stem({ id: `track_${i}` })) }), /up to 8/);
});

test('imported records are fresh and discard unexpected/prototype-bearing fields', () => {
  const input = JSON.parse(JSON.stringify(session()));
  Object.defineProperty(input, '__proto__', { value: { polluted: true }, enumerable: true });
  input.tracks[0].remoteUrl = 'https://example.com/private.wav';
  input.tracks[0].constructor = { prototype: { polluted: true } };
  const clean = cloneSession(input);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.hasOwn(clean, '__proto__'), false);
  assert.equal(Object.hasOwn(clean.tracks[0], 'constructor'), false);
  assert.equal(Object.hasOwn(clean.tracks[0], 'remoteUrl'), false);
  clean.tracks[0].gainDb = -7;
  assert.equal(input.tracks[0].gainDb, 0);
  assert.throws(() => validateSession(new Date()), /object type/);
});

test('history keeps the most recent fifty bounded entries', () => {
  const input = session();
  input.journal = Array.from({ length: 60 }, (_, i) => ({ at: new Date(Date.UTC(2026, 8, 15, 0, i)).toISOString(), text: `Edit ${i}` }));
  const result = validateSession(input);
  assert.equal(result.journal.length, 50);
  assert.equal(result.journal[0].text, 'Edit 10');
  input.journal = [{ at: 'not a timestamp', text: 'Edit' }];
  assert.throws(() => validateSession(input), /timestamp/);
});

test('legacy sessions migrate neutral effects while current sessions require typed controls', () => {
  const old = session(); old.schema = 1;
  delete old.tracks[0].timbre; delete old.tracks[0].glitch; delete old.tracks[0].expanded;
  const upgraded = validateSession(old);
  assert.equal(upgraded.schema, 2);
  assert.deepEqual([upgraded.tracks[0].timbre, upgraded.tracks[0].glitch, upgraded.tracks[0].expanded], [0, 0, false]);
  assert.equal(old.schema, 1);
  for (const field of ['timbre', 'glitch']) for (const invalid of [null, '0.5', undefined, NaN, Infinity]) {
    const input = session(); input.tracks[0][field] = invalid;
    assert.throws(() => validateSession(input), /finite/);
  }
  for (const invalid of [null, 'true', 1, undefined]) {
    const input = session(); input.tracks[0].expanded = invalid;
    assert.throws(() => validateSession(input), /true or false/);
  }
});

test('expanded settings preserve 150% effect range and disabling clamps without moving pan or gain', async () => {
  const { setExpanded, trackBounds, presetPatch, STEM_PRESETS } = await import('../src/core/effects.js');
  const original = stem({ expanded: true, lowDb: -18, highDb: 18, drive: 1.5, space: 1.5, timbre: -1.5, glitch: 1.5, gainDb: 6, pan: -1 });
  assert.equal(original.lowDb, -18);
  assert.equal(original.glitch, 1.5);
  const narrowed = { ...original, ...setExpanded(original, false) };
  assert.deepEqual([narrowed.lowDb, narrowed.highDb, narrowed.drive, narrowed.space, narrowed.timbre, narrowed.glitch], [-12, 12, 1, 1, -1, 1]);
  assert.deepEqual([narrowed.pan, narrowed.gainDb], [-1, 6]);
  assert.equal(original.expanded, true);
  assert.equal(original.glitch, 1.5);
  const clampOnImport = validateSession(newSession({ tracks: [ { ...original, expanded: false } ] })).tracks[0];
  assert.equal(clampOnImport.glitch, 1);
  for (const preset of STEM_PRESETS) {
    const patch = presetPatch(preset.id, original);
    for (const [key, value] of Object.entries(patch)) {
      assert.ok(value >= trackBounds(original)[key][0] && value <= trackBounds(original)[key][1]);
    }
    assert.equal('gainDb' in patch, false);
    assert.equal('expanded' in patch, false);
  }
  assert.throws(() => presetPatch('unknown', original), /known/);
});
