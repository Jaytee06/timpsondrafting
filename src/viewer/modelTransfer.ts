export type ModelTransfer = { id: string; blob: Blob; fileName: string; createdAt: number };
type StoredTransfer = Omit<ModelTransfer, 'blob'> & { bytes?: ArrayBuffer; blob?: Blob };

const storageError = (error?: DOMException | null) => new Error(error?.name === 'QuotaExceededError'
  ? 'Not enough browser storage to transfer this model. Free device storage or open the GLB directly in the site viewer.'
  : 'Browser storage could not save the model for the site viewer. Open the GLB directly there, or try a browser with storage enabled.');

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('tdd-viewer-transfers', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('models', { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error('Browser storage is unavailable.'));
});

// Presets can be fetched again on the destination page, without copying a large
// model into browser storage just to navigate between the two viewers.
export async function loadPresetModel(projectId: string): Promise<ModelTransfer> {
  const catalogResponse = await fetch('/viewer-projects.json');
  if (!catalogResponse.ok) throw new Error('Preset models could not be loaded.');
  const catalog = await catalogResponse.json() as Array<{ id: string; label: string; modelUrl: string | null }>;
  const project = catalog.find((entry) => entry.id === projectId);
  if (!project?.modelUrl) throw new Error('This preset model is unavailable. Return to the model viewer and choose another model.');
  const response = await fetch(project.modelUrl);
  if (!response.ok) throw new Error('The preset model could not be downloaded. Check your connection and try again.');
  return { id: project.id, fileName: `${project.label}.glb`, blob: await response.blob(), createdAt: Date.now() };
}

export async function saveModelTransfer(blob: Blob, fileName: string) {
  // Read before opening the transaction; awaiting inside it can deactivate it.
  // Binary data also avoids Safari's IndexedDB Blob serialization failures.
  const bytes = await blob.arrayBuffer();
  const database = await openDatabase();
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('models', 'readwrite');
      const store = transaction.objectStore('models');
      store.clear();
      const request = store.put({ id, bytes, fileName, createdAt: Date.now() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(storageError(transaction.error ?? request.error));
      transaction.onabort = () => reject(storageError(transaction.error ?? request.error));
    });
    return id;
  } finally { database.close(); }
}

export async function readModelTransfer(id: string): Promise<ModelTransfer | undefined> {
  const database = await openDatabase();
  try {
    const stored = await new Promise<StoredTransfer | undefined>((resolve, reject) => {
      const request = database.transaction('models').objectStore('models').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('The model could not be restored from browser storage.'));
    });
    if (!stored) return undefined;
    // Retain compatibility with transfers created before binary storage.
    const blob = stored.blob ?? (stored.bytes ? new Blob([stored.bytes], { type: 'model/gltf-binary' }) : undefined);
    if (!blob) throw new Error('The saved model is incomplete. Return to the model viewer and send it again.');
    return { id: stored.id, fileName: stored.fileName, createdAt: stored.createdAt, blob };
  } finally { database.close(); }
}
