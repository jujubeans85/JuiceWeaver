import { newSession, newTrack } from '../src/core/model.js';
import { createRecoveryStore } from '../src/core/storage.js';

const runButton = document.querySelector('#run');
const summary = document.querySelector('#summary');
const results = document.querySelector('#results');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function tinyWav() {
  const buffer = new ArrayBuffer(44 + 64);
  const view = new DataView(buffer);
  const ascii = (offset, text) => [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, 48000, true); view.setUint32(28, 96000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, 'data'); view.setUint32(40, 64, true);
  for (let index = 0; index < 32; index += 1) view.setInt16(44 + index * 2, Math.round(Math.sin(index / 4) * 4096), true);
  return buffer;
}

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  results.replaceChildren();
  summary.textContent = 'Running isolated browser storage checks…';
  const evidence = [];
  globalThis.storageProof = { status: 'running', evidence };
  const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const base = `crate-juice.juiceweaver.v1.proof-${nonce}`;
  const allowedNames = new Set([base, `${base}-sibling`]);
  const stores = [];
  const makeStore = (name) => {
    assert(allowedNames.has(name), 'Refused an unowned database namespace.');
    const store = createRecoveryStore(name); stores.push(store); return store;
  };
  let store = makeStore(base);
  const sibling = makeStore(`${base}-sibling`);
  const original = tinyWav();
  const assets = new Map([['proof-audio', { id: 'proof-audio', name: 'proof.wav', mime: 'audio/wav', bytes: original }]]);
  const makeSession = (name) => newSession({ id: 'proof-session', name, tracks: [newTrack({ id: 'proof-stem', assetId: 'proof-audio', name: 'Proof keys' })] });

  const check = async (name, action) => {
    let detail;
    let passed = false;
    try { detail = await action(); passed = true; }
    catch (error) { detail = error.message; }
    evidence.push({ name, passed, detail });
    const row = document.createElement('tr');
    for (const value of [name, passed ? 'PASS' : 'FAIL', detail]) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    row.children[1].className = passed ? 'pass' : 'fail';
    results.append(row);
    summary.textContent = `${evidence.length} checks completed…`;
  };

  const ownedDatabase = (name) => new Promise((resolve, reject) => {
    if (!allowedNames.has(name)) { reject(new Error('Refused an unowned database namespace.')); return; }
    const request = indexedDB.open(name, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('The proof database is blocked.'));
  });

  try {
    await check('Actual browser storage and secure hashing', async () => {
      assert(globalThis.indexedDB && globalThis.crypto?.subtle, 'IndexedDB or secure hashing is unavailable.');
      assert(await store.loadRecovery() === null, 'The new proof namespace was not empty.');
      return `Real IndexedDB; HTTPS/localhost hashing; ${navigator.userAgent}`;
    });

    await check('Atomic save and exact original-byte recovery', async () => {
      await store.saveRecovery(makeSession('Saved original'), assets);
      const loaded = await store.loadRecovery();
      assert(loaded.session.name === 'Saved original', 'The saved session name changed.');
      const actual = new Uint8Array(loaded.assets.get('proof-audio').bytes);
      assert(actual.length === original.byteLength && actual.every((byte, index) => byte === new Uint8Array(original)[index]), 'Original audio bytes changed.');
      assert(!Object.hasOwn(loaded.assets.get('proof-audio'), 'buffer'), 'Runtime AudioBuffer leaked into storage.');
      return `${original.byteLength} original WAV bytes restored exactly with integrity checks.`;
    });

    await check('Close and reopen using a new store instance', async () => {
      await store.close(); store = makeStore(base);
      const loaded = await store.loadRecovery();
      assert(loaded?.session.name === 'Saved original', 'A new connection could not reopen the saved project.');
      return 'Closed the first IndexedDB connection; a fresh store instance reopened the project.';
    });

    await check('Rapid saves coalesce to the newest pending state', async () => {
      const first = store.saveRecovery(makeSession('Queue one'), assets);
      // Yield once to let the first encoder start; subsequent calls share one pending slot.
      await Promise.resolve();
      const second = store.saveRecovery(makeSession('Queue two'), assets);
      const third = store.saveRecovery(makeSession('Queue three'), assets);
      const outcomes = await Promise.all([first, second, third]);
      assert((await store.loadRecovery()).session.name === 'Queue three', 'An older queued save replaced the newest state.');
      assert(outcomes.some(outcome => outcome.coalesced), 'Rapid pending saves did not coalesce.');
      assert(outcomes[1].sessionName === 'Queue three', 'A superseded save claimed that its old snapshot was persisted.');
      return 'Three save requests completed; newest state persisted and superseded pending requests reported the actual committed snapshot.';
    });

    await check('Save–clear–save preserves operation order', async () => {
      const a = store.saveRecovery(makeSession('Before clear'), assets);
      const b = store.clearRecovery();
      const c = store.saveRecovery(makeSession('After clear'), assets);
      await Promise.all([a, b, c]);
      assert((await store.loadRecovery()).session.name === 'After clear', 'The clear operation removed a later save.');
      return 'The explicit clear remained between earlier and later saves.';
    });

    await check('Another tab cannot silently overwrite a newer recovery', async () => {
      const otherTab = makeStore(base);
      await otherTab.loadRecovery();
      await store.saveRecovery(makeSession('Newer tab state'), assets);
      let conflict;
      try { await otherTab.saveRecovery(makeSession('Stale tab state'), assets); }
      catch (error) { conflict = error; }
      assert(conflict?.code === 'RECOVERY_CHANGED_ELSEWHERE', 'A stale connection did not receive a recovery conflict.');
      assert((await store.loadRecovery()).session.name === 'Newer tab state', 'The stale save overwrote the latest recovery.');
      await otherTab.close();
      return 'An atomic revision check rejected the stale write and preserved the newer project.';
    });

    await check('Invalid save leaves the previous recovery intact', async () => {
      let failure;
      try { await store.saveRecovery(makeSession('Missing bytes'), new Map()); }
      catch (error) { failure = error; }
      assert(failure, 'Invalid audio references were accepted.');
      assert((await store.loadRecovery()).session.name === 'Newer tab state', 'Invalid input damaged the saved recovery.');
      return 'Missing source bytes failed before mutation; the prior complete recovery remains readable.';
    });

    await check('Clear touches only the selected application namespace', async () => {
      await sibling.saveRecovery(makeSession('Sibling remains'), assets);
      await store.clearRecovery();
      assert(await store.loadRecovery() === null, 'The selected proof recovery was not cleared.');
      assert((await sibling.loadRecovery()).session.name === 'Sibling remains', 'Clearing one namespace modified its sibling.');
      return 'One proof recovery cleared; the independent sibling recovery remains intact.';
    });

    await check('RC1 stored archive migrates with exact original audio and neutral new effects', async () => {
      await store.saveRecovery(makeSession('Legacy recovery'), assets);
      const db = await ownedDatabase(base);
      try {
        const saved = await new Promise((resolve, reject) => {
          const tx = db.transaction('recovery', 'readonly'); const request = tx.objectStore('recovery').get('latest');
          tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error);
        });
        const source = await saved.archive.arrayBuffer();
        const view = new DataView(source); const manifestLength = view.getUint32(4, true);
        const manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(source, 12, manifestLength)));
        manifest.version = 1; manifest.session.schema = 1;
        for (const track of manifest.session.tracks) { delete track.timbre; delete track.glitch; delete track.expanded; }
        const metadata = new TextEncoder().encode(JSON.stringify(manifest));
        const header = source.slice(0, 12); new DataView(header).setUint32(4, metadata.byteLength, true);
        const archive = new Blob([header, metadata, source.slice(12 + manifestLength)]);
        await new Promise((resolve, reject) => {
          const tx = db.transaction('recovery', 'readwrite'); tx.objectStore('recovery').put({ ...saved, archive });
          tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Legacy fixture write aborted.'));
        });
      } finally { db.close(); }
      await store.close(); store = makeStore(base);
      const loaded = await store.loadRecovery();
      assert(loaded.session.schema === 2 && loaded.session.name === 'Legacy recovery', 'Legacy recovery failed schema migration.');
      const track = loaded.session.tracks[0];
      assert(track.timbre === 0 && track.glitch === 0 && track.expanded === false, 'Legacy recovery gained non-neutral effects.');
      const bytes = new Uint8Array(loaded.assets.get('proof-audio').bytes);
      assert(bytes.every((value, index) => value === new Uint8Array(original)[index]), 'Legacy recovery altered original samples.');
      return 'Real version1 archive record reopened through a fresh IndexedDB connection; migrated to schema2 with neutral controls and exact original bytes.';
    });
    await check('Expanded sound persists across recovery close and reopen', async () => {
      const session = makeSession('Expanded recovery');
      Object.assign(session.tracks[0], { expanded: true, timbre: -1.5, glitch: 1.5, lowDb: -18, highDb: 18, drive: 1.5, space: 1.5 });
      await store.saveRecovery(session, assets); await store.close(); store = makeStore(base);
      const loaded = await store.loadRecovery();
      assert(JSON.stringify(loaded.session) === JSON.stringify(session), 'Recovery changed expanded control values.');
      const invalid = makeSession('Invalid new control'); invalid.tracks[0].glitch = null;
      let failure;
      try { await store.saveRecovery(invalid, assets); } catch (error) { failure = error; }
      assert(failure && (await store.loadRecovery()).session.name === 'Expanded recovery', 'Invalid control damaged existing recovery.');
      return 'All six expanded effects and range choice restored exactly; malformed glitch control refused while the prior recovery remained intact.';
    });

    await check('Stored payload corruption is rejected transactionally', async () => {
      await store.saveRecovery(makeSession('Before corruption'), assets);
      const db = await ownedDatabase(base);
      try {
        const saved = await new Promise((resolve, reject) => {
          const tx = db.transaction('recovery', 'readonly');
          const request = tx.objectStore('recovery').get('latest');
          tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error);
        });
        const bytes = new Uint8Array(await saved.archive.arrayBuffer()); bytes[bytes.length - 1] ^= 1;
        await new Promise((resolve, reject) => {
          const tx = db.transaction('recovery', 'readwrite');
          tx.objectStore('recovery').put({ ...saved, archive: new Blob([bytes]) });
          tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Corruption setup aborted.'));
        });
      } finally { db.close(); }
      let failure;
      try { await store.loadRecovery(); } catch (error) { failure = error; }
      assert(failure?.message.includes('integrity check'), 'Damaged audio was not rejected with recovery guidance.');
      await store.clearRecovery();
      assert(await store.loadRecovery() === null, 'A damaged proof copy could not be explicitly cleared.');
      return 'A one-byte audio change failed SHA-256; no partial project was returned; explicit clear recovered cleanly.';
    });
  } finally {
    await check('Close and delete only this run’s temporary databases', async () => {
      await Promise.all(stores.map(item => item.close()));
      for (const name of allowedNames) {
        assert(name.startsWith(base), 'Refused cleanup outside this proof run.');
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = resolve; request.onerror = () => reject(request.error);
          request.onblocked = () => reject(new Error('A proof connection remained open during cleanup.'));
        });
      }
      return 'Both owned proof databases deleted after connection closure. The application recovery namespace was never accessed.';
    });
    const failed = evidence.filter(item => !item.passed).length;
    globalThis.storageProof.status = failed ? 'failed' : 'passed';
    summary.textContent = `${evidence.length - failed}/${evidence.length} checks passed. ${failed ? 'Review the failures below.' : 'Browser storage proof complete.'}`;
    runButton.disabled = false;
  }
});
