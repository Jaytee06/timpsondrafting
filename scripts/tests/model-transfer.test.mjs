import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../../src/viewer/modelTransfer.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { loadPresetModel, saveModelTransfer, readModelTransfer } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function databaseFixture(limit = Infinity) {
 const records = new Map(); let closed = 0;
 globalThis.indexedDB = { open() {
  const request = {};
  request.result = { close() { closed++; }, transaction() {
   const transaction = {};
   transaction.objectStore = () => ({
    clear() {},
    put(value) {
     assert.ok(value.bytes instanceof ArrayBuffer, 'Blob must not be passed into IndexedDB');
     assert.equal(value.blob, undefined);
     const put = {};
     queueMicrotask(() => {
      if (value.bytes.byteLength > limit) { transaction.error = new DOMException('Storage full', 'QuotaExceededError'); put.error = transaction.error; transaction.onabort?.(); }
      else { records.clear(); records.set(value.id, value); transaction.oncomplete?.(); }
     });
     return put;
    },
    get(id) { const get = {}; queueMicrotask(() => { get.result = records.get(id); get.onsuccess?.(); }); return get; },
   });
   return transaction;
  } };
  queueMicrotask(() => request.onsuccess?.()); return request;
 } };
 return { records, get closed() { return closed; } };
}
test('preset placement loads the original asset with browser storage disabled', async () => {
 const oldFetch = globalThis.fetch, oldIdb = globalThis.indexedDB;
 const requests = []; const bytes = new Uint8Array([1, 2, 3]);
 globalThis.indexedDB = { open() { throw new Error('Storage disabled'); } };
 globalThis.fetch = async url => {
  requests.push(url);
  return url === '/viewer-projects.json'
   ? { ok: true, json: async () => [{ id: 'model-02', label: 'Farmhouse', modelUrl: '/models/model-02.glb?v=latest' }] }
   : { ok: true, blob: async () => new Blob([bytes]) };
 };
 try {
  const model = await loadPresetModel('model-02');
  assert.equal(model.fileName, 'Farmhouse.glb');
  assert.deepEqual(new Uint8Array(await model.blob.arrayBuffer()), bytes);
  assert.deepEqual(requests, ['/viewer-projects.json', '/models/model-02.glb?v=latest']);
  await assert.rejects(loadPresetModel('missing'), /preset model is unavailable/);
 } finally { globalThis.fetch = oldFetch; globalThis.indexedDB = oldIdb; }
});
test('customized handoffs store binary data and restore the same bytes', async () => {
 const old = globalThis.indexedDB; const db = databaseFixture();
 try {
  const bytes = new Uint8Array([9, 8, 7, 6]);
  const id = await saveModelTransfer(new Blob([bytes]), 'custom.glb');
  const restored = await readModelTransfer(id);
  assert.equal(restored.fileName, 'custom.glb');
  assert.equal(restored.blob.type, 'model/gltf-binary');
  assert.deepEqual(new Uint8Array(await restored.blob.arrayBuffer()), bytes);
  assert.equal(await readModelTransfer('missing'), undefined);
  assert.equal(db.closed, 3);
 } finally { globalThis.indexedDB = old; }
});
test('old Blob handoffs still restore and quota failures retain an actionable error', async () => {
 const old = globalThis.indexedDB; const db = databaseFixture(1);
 try {
  const blob = new Blob(['old']);
  db.records.set('legacy', { id: 'legacy', blob, fileName: 'legacy.glb', createdAt: 1 });
  assert.equal((await readModelTransfer('legacy')).blob, blob);
  await assert.rejects(saveModelTransfer(new Blob(['too large']), 'model.glb'), /Not enough browser storage/);
  assert.ok(db.records.has('legacy'));
  assert.equal(db.closed, 2);
 } finally { globalThis.indexedDB = old; }
});
