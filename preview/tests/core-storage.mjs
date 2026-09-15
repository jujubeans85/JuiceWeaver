import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecoveryStore, RecoveryError } from '../src/core/storage.js';
import { newSession } from '../src/core/model.js';

test('recovery factory rejects unrelated or malformed storage namespaces', () => {
  for (const namespace of ['another-app', '', '../recovery', 'crate-juice.juiceweaver.v1/other', null]) {
    assert.throws(() => createRecoveryStore(namespace), RecoveryError);
  }
  assert.doesNotThrow(() => createRecoveryStore('crate-juice.juiceweaver.v1.proof-test'));
});

test('unavailable browser storage fails actionably and closing prevents later writes', async () => {
  assert.equal(globalThis.indexedDB, undefined, 'This is the Node unavailable-storage test; actual IDB has its browser proof.');
  const store = createRecoveryStore('crate-juice.juiceweaver.v1.proof-node');
  await assert.rejects(store.saveRecovery(newSession(), new Map()), /Export a .juice backup/);
  await assert.rejects(store.loadRecovery(), /Export a .juice backup/);
  await assert.rejects(store.clearRecovery(), /Export a .juice backup/);
  assert.equal((await store.getStorageInfo()).available, false);
  await store.close();
  await assert.rejects(store.saveRecovery(newSession(), new Map()), /closed/);
  await assert.rejects(store.loadRecovery(), /closed/);
});
