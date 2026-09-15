import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession, newTrack } from '../src/core/model.js';
import { interpretPrompt, PROMPT_EXAMPLES } from '../src/core/prompts.js';

function session() {
  return newSession({ tracks: [
    newTrack({ id: 'drums', assetId: 'a_drums', name: 'Dust Drums' }),
    newTrack({ id: 'bass', assetId: 'a_bass', name: 'Round Bass' }),
    newTrack({ id: 'keys', assetId: 'a_keys', name: 'Soft Keys' }),
    newTrack({ id: 'vocals', assetId: 'a_vocals', name: 'Air Vocals' }),
    newTrack({ id: 'guitar', assetId: 'a_guitar', name: 'Guitar' }),
  ] });
}

test('advertised chips resolve correctly with deterministic local controls', () => {
  for (const example of PROMPT_EXAMPLES) assert.equal(interpretPrompt(example, session()).understood, true, example);
  const warm = interpretPrompt('Warm the mix', session());
  assert.equal(warm.changes.length, 5);
  assert.deepEqual(warm.changes[0].patch, { lowDb: 1.5, highDb: -1.5, drive: 0.08 });
  const drums = interpretPrompt('Brighter drums', session());
  assert.deepEqual(drums.changes, [{ id: 'drums', patch: { highDb: 2 } }]);
  const keys = interpretPrompt('Softer keys', session());
  assert.deepEqual(keys.changes, [{ id: 'keys', patch: { gainDb: -2 } }]);
  assert.equal(keys.changes.some(change => change.id === 'guitar'), false);
});

test('all and omitted targets map mix effects; overall volume preserves stem balance', () => {
  assert.equal(interpretPrompt('More space', session()).changes.length, 5);
  assert.equal(interpretPrompt('Brighter all', session()).changes.length, 5);
  const result = interpretPrompt('Louder mix', session());
  assert.deepEqual(result.masterPatch, { masterDb: -4 });
  assert.deepEqual(result.changes, []);
});

test('a preview never mutates the source session', () => {
  const original = session();
  const before = JSON.stringify(original);
  interpretPrompt('Warm the mix', original);
  assert.equal(JSON.stringify(original), before);
});

test('unmute does not accidentally mute and explicit negation never applies', () => {
  const original = session(); original.tracks[1].mute = true;
  assert.deepEqual(interpretPrompt('Unmute bass', original).changes, [{ id: 'bass', patch: { mute: false } }]);
  for (const request of ["Don't mute bass", 'Do not mute bass', 'Never make the mix louder', 'No more space', 'Warm everything except vocals', 'Make bass louder without clipping']) {
    const result = interpretPrompt(request, original);
    assert.equal(result.understood, false, request);
    assert.deepEqual(result.changes, []);
    assert.equal(result.masterPatch, undefined);
  }
});

test('ambiguous compound and unsupported requests cannot fake a successful change', () => {
  for (const request of ['Warm bass and brighten drums', 'Mute bass and drums', 'Separate vocals', 'Tune vocals', 'Punchier drums', 'Warmer sandwich', 'Warmer bass invert polarity', 'Louder bass by 8 dB', 'Add more space and lower volume']) {
    const result = interpretPrompt(request, session());
    assert.equal(result.understood, false, request);
    assert.deepEqual(result.changes, []);
  }
});

test('exact names and instrument targets select only the intended stems', () => {
  assert.deepEqual(interpretPrompt('Please make Dust Drums a bit warmer', session()).changes.map(change => change.id), ['drums']);
  assert.deepEqual(interpretPrompt('Darker guitar', session()).changes, [{ id: 'guitar', patch: { highDb: -2 } }]);
  assert.deepEqual(interpretPrompt('Quieter harmonics', session()).changes.map(change => change.id), ['keys', 'guitar']);
});

test('solo selects the requested role, clears previous solos and unmutes its target', () => {
  const original = session(); original.tracks[0].solo = true; original.tracks[3].mute = true;
  assert.deepEqual(interpretPrompt('Solo vocals', original).changes, [
    { id: 'drums', patch: { solo: false } },
    { id: 'vocals', patch: { solo: true, mute: false } },
  ]);
  assert.equal(interpretPrompt('Solo', original).understood, false);
  assert.deepEqual(interpretPrompt('Unsolo', original).changes, [{ id: 'drums', patch: { solo: false } }]);
});

test('effect reset preserves levels/pan and safe limits do not create false work', () => {
  const original = session();
  Object.assign(original.tracks[1], { gainDb: -6, pan: 0.3, drive: 0.8, lowDb: 3, highDb: -2, space: 0.5 });
  assert.deepEqual(interpretPrompt('Reset effects bass', original).changes, [
    { id: 'bass', patch: { lowDb: 0, highDb: 0, drive: 0, space: 0 } },
  ]);
  original.masterDb = 0;
  const limited = interpretPrompt('Louder master', original);
  assert.equal(limited.understood, true);
  assert.deepEqual(limited.changes, []);
  assert.equal(limited.masterPatch, undefined);
  assert.equal(interpretPrompt('Brighter master', original).understood, false);
  assert.equal(interpretPrompt('Warm the mix', newSession()).understood, false);
});

test('new colour and glitch commands respect per-stem limits and reset both effects', () => {
  const input = session(); const bass = input.tracks.find(track => track.role === 'bass');
  Object.assign(bass, { timbre: -1.4, glitch: 1.4, expanded: true });
  assert.deepEqual(interpretPrompt('More glitch bass', input).changes, [{ id: bass.id, patch: { glitch: 1.5 } }]);
  assert.deepEqual(interpretPrompt('Rounder timbre bass', input).changes, [{ id: bass.id, patch: { timbre: -1.5 } }]);
  assert.deepEqual(interpretPrompt('Clearer timbre bass', input).changes, [{ id: bass.id, patch: { timbre: -1.25 } }]);
  assert.deepEqual(interpretPrompt('Reset effects bass', input).changes, [{ id: bass.id, patch: { timbre: 0, glitch: 0 } }]);
});
