export type ModelTransfer = { id: string; blob: Blob; fileName: string; createdAt: number };
const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('tdd-viewer-transfers', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('models', { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error('Browser storage is unavailable.'));
});
export async function saveModelTransfer(blob: Blob, fileName: string) {
  const database = await openDatabase();
  const id = crypto.randomUUID();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('models', 'readwrite');
      const store = transaction.objectStore('models');
      // Keep only the newest handoff; exports can be large.
      store.clear();
      store.put({ id, blob, fileName, createdAt: Date.now() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('The customized model could not be saved.'));
      transaction.onabort = () => reject(new Error('The customized model could not be saved.'));
    });
    return id;
  } finally { database.close(); }
}
export async function readModelTransfer(id: string): Promise<ModelTransfer | undefined> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction('models').objectStore('models').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('The customized model could not be restored.'));
    });
  } finally { database.close(); }
}
