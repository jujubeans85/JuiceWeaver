/** One atomic, app-scoped IndexedDB recovery snapshot. Export remains the backup. */
import { encodeProject, decodeProject } from './project.js';

const DATABASE = 'crate-juice.juiceweaver.v1';
const STORE = 'recovery';
let databasePromise;
let writes = Promise.resolve();

export class RecoveryError extends Error {
  constructor(message, options) { super(message, options); this.name = 'RecoveryError'; }
}

function friendlyError(error, action) {
  if (error instanceof RecoveryError) return error;
  if (error?.name === 'QuotaExceededError') {
    return new RecoveryError('This browser is out of storage. Export a .juice backup now; your current session is still open.', { cause: error });
  }
  return new RecoveryError(`Could not ${action} the recovery copy. ${error?.message || 'Browser storage may be unavailable.'} Export a .juice backup to keep your work.`, { cause: error });
}

function database() {
  if (!globalThis.indexedDB) return Promise.reject(new RecoveryError('This browser cannot keep a recovery copy. Export a .juice backup to keep your work.'));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    let request;
    let abandoned = false;
    try { request = globalThis.indexedDB.open(DATABASE, 1); }
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
      if (abandoned) { db.close(); return; }
      db.onversionchange = () => { db.close(); databasePromise = undefined; };
      db.onclose = () => { databasePromise = undefined; };
      resolve(db);
    };
  }).catch(error => { databasePromise = undefined; throw error; });
  return databasePromise;
}

async function transact(mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    let transaction;
    let result;
    try {
      transaction = db.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      request.onsuccess = () => { result = request.result; };
    } catch (error) { reject(error); return; }
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error || new Error('The storage transaction was interrupted.'));
    transaction.onerror = () => reject(transaction.error || new Error('The storage transaction failed.'));
  });
}

function queueWrite(operation) {
  const task = writes.catch(() => {}).then(operation);
  writes = task;
  return task;
}

export function saveRecovery(session, assets) {
  // Start capturing now; queued writes preserve call order even if hashing differs.
  const encoded = encodeProject(session, assets);
  // Attach a handler immediately so a queued validation failure is never unhandled.
  const captured = encoded.then(blob => ({ blob }), error => ({ error }));
  return queueWrite(async () => {
    try {
      const prepared = await captured;
      if (prepared.error) throw prepared.error;
      const updatedAt = new Date().toISOString();
      await transact('readwrite', store => store.put({ id: 'latest', version: 1, updatedAt, archive: prepared.blob }));
      return { savedAt: updatedAt, bytes: prepared.blob.size };
    } catch (error) { throw friendlyError(error, 'save'); }
  });
}

export async function loadRecovery() {
  try {
    await writes.catch(() => {});
    const saved = await transact('readonly', store => store.get('latest'));
    if (!saved) return null;
    if (saved.version !== 1 || !(saved.archive instanceof Blob)) {
      throw new RecoveryError('The local recovery copy is damaged. Open a .juice backup or start a fresh session.');
    }
    try { return await decodeProject(await saved.archive.arrayBuffer()); }
    catch (cause) { throw new RecoveryError('The local recovery copy failed its integrity check. Open a .juice backup or start a fresh session.', { cause }); }
  } catch (error) { throw friendlyError(error, 'open'); }
}

export function clearRecovery() {
  return queueWrite(async () => {
    try { await transact('readwrite', store => store.delete('latest')); }
    catch (error) { throw friendlyError(error, 'clear'); }
  });
}

export async function getStorageInfo() {
  const info = { available: Boolean(globalThis.indexedDB), usage: null, quota: null, persistent: null };
  try {
    const estimate = await globalThis.navigator?.storage?.estimate?.();
    if (estimate) { info.usage = estimate.usage ?? null; info.quota = estimate.quota ?? null; }
    if (globalThis.navigator?.storage?.persisted) info.persistent = await globalThis.navigator.storage.persisted();
  } catch { /* Estimates are optional; they never establish that a backup is safe. */ }
  return info;
}
