import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../../src/viewer/reviewExport.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { reviewZip, reviewSummary } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const items = ['Check window height', ''].map((note, i) => ({ id: String(i), createdAt: '2026-10-07T12:00:00Z', model: 'Duplex', modelUrl: '/models/model-03.glb?v=test', note, camera: { position: [1,2,3], quaternion: [0,0,0,1] }, points: [{x:.4,y:.5}], screenshot: 'data:image/png;base64,AQID' }));
test('review export contains independent notes, screenshots and camera references', async () => {
 const bytes = new Uint8Array(await reviewZip(items).arrayBuffer()); const view = new DataView(bytes.buffer); const files = new Map(); let offset = 0;
 while(view.getUint32(offset,true) === 0x04034b50) { const length = view.getUint32(offset+18,true), nameLength = view.getUint16(offset+26,true); const name = new TextDecoder().decode(bytes.subarray(offset+30,offset+30+nameLength)); const start = offset+30+nameLength; files.set(name,bytes.subarray(start,start+length)); offset=start+length; }
 assert.equal(view.getUint32(offset,true),0x02014b50); assert.equal(view.getUint32(bytes.length-22,true),0x06054b50); assert.equal(view.getUint16(bytes.length-12,true),4);
 assert.deepEqual([...files.keys()],['review.md','review.json','callout-1.png','callout-2.png']); assert.deepEqual([...files.get('callout-1.png')],[1,2,3]);
 const report = new TextDecoder().decode(files.get('review.md')); assert.match(report,/Check window height/); assert.match(report,/## 1\. Duplex/); assert.match(report,/## 2\. Duplex/); assert.match(report,/Camera position.*\[1.000, 2.000, 3.000\]/); assert.match(report,/Viewing direction: \[0.000, 0.000, -1.000\]/); assert.match(report,/Visual callout; no note/); assert.match(report,/callout-2.png/);
 const data = JSON.parse(new TextDecoder().decode(files.get('review.json'))); assert.equal(data.callouts[1].screenshot,'callout-2.png'); assert.deepEqual(data.callouts[0].camera.position,[1,2,3]); assert.equal(data.callouts[0].modelUrl,items[0].modelUrl);
 assert.equal(reviewSummary(items, true), report);
 const copied = reviewSummary(items); assert.doesNotMatch(copied, /!\[|callout-\d+\.png/); assert.match(copied, /Camera position/); assert.match(copied, /Viewing direction/);
});
