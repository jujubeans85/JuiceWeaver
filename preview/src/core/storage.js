/**
 * One atomic, app-scoped IndexedDB recovery snapshot. Export remains the backup.
 * Original source ArrayBuffers are immutable application assets. Pending saves
 * retain references, not audio copies; only one save at a time encodes them.
 */
import { cloneSession, LIMITS } from './model.js';
import { encodeProject, decodeProject, validateAssetReferences } from './project.js';

const DEFAULT_NAMESPACE = 'crate-juice.juiceweaver.v1';
const STORE = 'recovery';

export class RecoveryError extends Error {
  constructor(message, options) { super(message, options); this.name = 'RecoveryError'; }
}

export class RecoveryConflictError extends RecoveryError {
  constructor() {
    super('Another JuiceWeaver tab changed the recovery copy. Export your .juice backup, then reload to reopen the latest recovery. Your current session is still open.');
    this.name = 'RecoveryConflictError';
    this.code = 'RECOVERY_CHANGED_ELSEWHERE';
  }
}

function friendlyError(error, action) {
  if (error instanceof RecoveryError) return error;
  if (error?.name === 'QuotaExceededError') {
    return new RecoveryError('This browser is out of storage. Export a .juice backup now; your current session is still open.', { cause: error });
  }
  return new RecoveryError(`Could not ${action} the recovery copy. ${error?.message || 'Browser storage may be unavailable.'} Export a .juice backup to keep your work.`, { cause: error });
}

function revisionOf(saved) {
  if (!saved) return null;
  return typeof saved.revision === 'string' ? saved.revision : `legacy:${saved.updatedAt ?? 'unknown'}`;
}

function revisionId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Separate instances permit preview/proof isolation without changing production storage. */
export function createRecoveryStore(namespace = DEFAULT_NAMESPACE) {
  if (typeof namespace !== 'string' || !/^crate-juice\.juiceweaver\.[A-Za-z0-9_.-]{1,120}$/.test(namespace)) {
    throw new RecoveryError('The recovery storage namespace is invalid.');
  }
  let databasePromise;
  let operations = Promise.resolve();
  let saveBatch = null;
  let expectedRevision = null;
  let closing = false;
  let closed = false;
  let nextRequestId = 0;

  function database() {
    if (closed) return Promise.reject(new RecoveryError('This recovery store is closed. Reload JuiceWeaver before saving again.'));
    if (!globalThis.indexedDB) return Promise.reject(new RecoveryError('This browser cannot keep a recovery copy. Export a .juice backup to keep your work.'));
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      let request;
      let abandoned = false;
      try { request = globalThis.indexedDB.open(namespace, 1); }
      catch (error) { reject(error); return; }
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onerror = () => { abandoned = true; reject(request.error); };
      request.onblocked = () => {
        abandoned = true;
        reject(new RecoveryError('Another JuiceWeaver tab is blocking recovery storage. Close that tab and retry.'));
      };
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned || closed) { db.close(); reject(new RecoveryError('The recovery connection closed before it opened.')); return; }
        db.onversionchange = () => { db.close(); databasePromise = undefined; };
        db.onclose = () => { databasePromise = undefined; };
        resolve(db);
      };
    }).catch(error => { databasePromise = undefined; throw error; });
    return databasePromise;
  }

  async function readSnapshot() {
    const db = await database();
    return new Promise((resolve, reject) => {
      let transaction;
      let result;
      try {
        transaction = db.transaction(STORE, 'readonly');
        const request = transaction.objectStore(STORE).get('latest');
        request.onsuccess = () => { result = request.result; };
      } catch (error) { reject(error); return; }
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error || new Error('The storage read was interrupted.'));
      transaction.onerror = event => reject(event.target?.error || transaction.error || new Error('The storage read failed.'));
    });
  }

  /** Compare and write in the same transaction: competing tabs cannot silently win. */
  async function commitSnapshot(next) {
    const db = await database();
    return new Promise((resolve, reject) => {
      let transaction;
      let failure;
      try {
        transaction = db.transaction(STORE, 'readwrite');
        const objectStore = transaction.objectStore(STORE);
        const request = objectStore.get('latest');
        request.onsuccess = () => {
          try {
            if (revisionOf(request.result) !== expectedRevision) throw new RecoveryConflictError();
            if (next) objectStore.put(next);
            else objectStore.delete('latest');
          } catch (error) {
            failure = error;
            transaction.abort();
          }
        };
      } catch (error) { reject(error); return; }
      transaction.oncomplete = () => { expectedRevision = revisionOf(next); resolve(); };
      transaction.onabort = () => reject(failure || transaction.error || new Error('The storage transaction was interrupted.'));
      transaction.onerror = event => reject(failure || event.target?.error || transaction.error || new Error('The storage transaction failed.'));
    });
  }

  function appendOperation(operation) {
    const task = operations.catch(() => {}).then(operation);
    operations = task;
    return task;
  }

  async function drainBatch(batch) {
    try {
      while (batch.pending) {
        const current = batch.pending;
        batch.pending = null;
        try {
          // Crucially, the expensive Blob snapshot and hashing begin here, never
          // in saveRecovery. There is one active encoder for this store.
          const archive = await encodeProject(current.session, current.assets);
          const updatedAt = new Date().toISOString();
          const revision = revisionId();
          await commitSnapshot({ id: 'latest', version: 1, revision, updatedAt, archive });
          for (const waiter of current.waiters) waiter.resolve({
            savedAt: updatedAt, revision, sessionId: current.session.id,
            sessionName: current.session.name, bytes: archive.size,
            coalesced: waiter.id !== current.id,
          });
        } catch (error) {
          const failure = friendlyError(error, 'save');
          for (const waiter of current.waiters) waiter.reject(failure);
        }
      }
    } finally { if (saveBatch === batch) saveBatch = null; }
  }

  function saveRecovery(session, assets) {
    let snapshot;
    let sources;
    try {
      if (closing || closed) throw new RecoveryError('This recovery store is closed. Reload JuiceWeaver before saving again.');
      snapshot = cloneSession(session);
      validateAssetReferences(snapshot, assets);
      sources = new Map([...new Set(snapshot.tracks.map(track => track.assetId))].map(id => {
        const source = assets.get(id);
        return [id, { id, name: source.name, mime: source.mime, bytes: source.bytes }];
      }));
    } catch (error) { return Promise.reject(friendlyError(error, 'save')); }
    return new Promise((resolve, reject) => {
      if (!saveBatch) {
        const batch = { pending: null };
        saveBatch = batch;
        // The operation queue also serializes any earlier clear or closed batch.
        appendOperation(() => drainBatch(batch));
      }
      const id = ++nextRequestId;
      const waiters = saveBatch.pending?.waiters ?? [];
      waiters.push({ id, resolve, reject });
      // Keep only the newest pending session. Superseded callers resolve only
      // after that newer state commits; a failed newer state rejects them all.
      saveBatch.pending = { id, session: snapshot, assets: sources, waiters };
    });
  }

  function loadRecovery() {
    if (closing || closed) return Promise.reject(new RecoveryError('This recovery store is closed. Reload JuiceWeaver before reopening recovery.'));
    // Reads are also ordering barriers: their revision cannot race our own writes.
    saveBatch = null;
    return appendOperation(async () => {
      try {
        const saved = await readSnapshot();
        expectedRevision = revisionOf(saved);
        if (!saved) return null;
        if (saved.version !== 1 || !(saved.archive instanceof Blob) || saved.archive.size > LIMITS.MAX_PROJECT_BYTES) {
          throw new RecoveryError('The local recovery copy is damaged or too large. Open a .juice backup or start a fresh session.');
        }
        try { return await decodeProject(await saved.archive.arrayBuffer()); }
        catch (cause) { throw new RecoveryError('The local recovery copy failed its integrity check. Open a .juice backup or start a fresh session.', { cause }); }
      } catch (error) { throw friendlyError(error, 'open'); }
    });
  }

  function clearRecovery() {
    if (closing || closed) return Promise.reject(new RecoveryError('This recovery store is closed. Reload JuiceWeaver before clearing recovery.'));
    // Seal the current batch so a later save cannot jump ahead of this clear.
    saveBatch = null;
    return appendOperation(async () => {
      try { await commitSnapshot(null); }
      catch (error) { throw friendlyError(error, 'clear'); }
    });
  }

  async function getStorageInfo() {
    const info = { available: Boolean(globalThis.indexedDB), usage: null, quota: null, persistent: null };
    try {
      const estimate = await globalThis.navigator?.storage?.estimate?.();
      if (estimate) { info.usage = estimate.usage ?? null; info.quota = estimate.quota ?? null; }
      if (globalThis.navigator?.storage?.persisted) info.persistent = await globalThis.navigator.storage.persisted();
    } catch { /* Estimates never establish that a backup is safe. */ }
    return info;
  }

  async function close() {
    closing = true;
    saveBatch = null;
    await operations.catch(() => {});
    closed = true;
    if (databasePromise) {
      try { (await databasePromise).close(); } catch { /* No open handle remains. */ }
      databasePromise = undefined;
    }
  }

  return Object.freeze({ saveRecovery, loadRecovery, clearRecovery, getStorageInfo, close });
}

const defaultStore = createRecoveryStore();
export const { saveRecovery, loadRecovery, clearRecovery, getStorageInfo } = defaultStore;
