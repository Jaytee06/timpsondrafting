import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { BoxGeometry, Color, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Scene } from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { unzipSync, strFromU8 } from 'three/examples/jsm/libs/fflate.module.js';
async function loadModule(path) {
 const source = readFileSync(new URL(path, import.meta.url), 'utf8');
 const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replaceAll("from 'three'", `from '${import.meta.resolve('three')}'`)
  .replaceAll("import('three/examples/jsm/exporters/GLTFExporter.js')", `import('${import.meta.resolve('three/examples/jsm/exporters/GLTFExporter.js')}')`);
 return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}
const { parseFinishPreferences } = await loadModule('../../src/viewer/finishPreferences.ts');
const { snapshotModel, snapshotAppleArModel, exportCustomizedGlb } = await loadModule('../../src/viewer/exportModel.ts');
test('Apple AR keeps shared customized materials and exports transmission glass as see-through opacity', async () => {
 const scene = new Scene(), geometry = new BoxGeometry();
 const glass = new MeshPhysicalMaterial({ transmission: 1, roughness: 0.06 });
 const paint = new MeshStandardMaterial({ color: '#bcc4c7' });
 const appliance = new MeshStandardMaterial({ color: '#121212' });
 scene.add(new Mesh(geometry, glass), new Mesh(geometry, glass), new Mesh(geometry, paint), new Mesh(geometry, paint), new Mesh(geometry, appliance));
 const snapshot = snapshotAppleArModel(scene);
 assert.equal(snapshot.children[0].material, snapshot.children[1].material);
 assert.equal(snapshot.children[2].material, snapshot.children[3].material);
 assert.notEqual(snapshot.children[0].material, glass);
 assert.ok(Math.abs(snapshot.children[0].material.opacity - 0.06) < 1e-10);
 assert.equal(snapshot.children[4].material.opacity, 1);
 assert.equal(glass.opacity, 1); assert.equal(glass.transmission, 1);
 assert.deepEqual(snapshot.children[2].material.color, paint.color);
 const files = unzipSync(await new USDZExporter().parseAsync(snapshot, { quickLookCompatible: true }));
 const usd = strFromU8(files['model.usda']);
 assert.match(usd, /float inputs:opacity = 0.06/);
 assert.equal((usd.match(/def Material /g) ?? []).length, 3);
 assert.equal(Object.keys(files).filter(name => name.startsWith('geometries/')).length, 1);
});
// The exporter uses the browser FileReader API; supply its Blob reader for Node tests.
globalThis.FileReader = class {
 readAsArrayBuffer(blob) { blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.(); }); }
 readAsDataURL(blob) { blob.arrayBuffer().then((buffer) => { this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); }); }
};
test('restores valid themes and individual overrides', () => {
 const saved = { theme: 'warm', overrides: { 'walls:ROOM': 'dark', 'category:flooring': 'light' }, landscaping: false };
 assert.deepEqual(parseFinishPreferences(JSON.stringify(saved)), saved);
});
test('malformed cache is ignored and unknown override themes are dropped', () => {
 assert.equal(parseFinishPreferences('{bad'), null);
 assert.equal(parseFinishPreferences('{"theme":"unknown"}'), null);
 assert.deepEqual(parseFinishPreferences(JSON.stringify({ theme: 'original', landscaping: true, overrides: { 'walls:ROOM': 'invalid' } })).overrides, {});
});
test('snapshot freezes customized materials without mutating original', () => {
 const scene = new Scene(); const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ color: '#77736c' }));
 scene.add(mesh); const snapshot = snapshotModel(scene);
 mesh.material.color.set('#ffffff');
 assert.equal(snapshot.children[0].material.color.getHexString(), '77736c');
});
test('customized GLB retains finishes and transforms and excludes hidden nodes', async () => {
 const scene = new Scene(); const wall = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ color: '#77736c' }));
 wall.name = 'FINISH_WALLS__ROOM'; wall.position.set(2, 1, 3); scene.add(wall);
 const hidden = new Mesh(new BoxGeometry(), new MeshStandardMaterial()); hidden.name = 'LANDSCAPING'; hidden.visible = false; scene.add(hidden);
 const blob = await exportCustomizedGlb(scene); const bytes = await blob.arrayBuffer();
 const view = new DataView(bytes); assert.equal(view.getUint32(0, true), 0x46546c67);
 const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, view.getUint32(12, true))).trim());
 assert.ok(json.nodes.some((node) => node.name === wall.name && (node.translation?.[0] === 2 || node.matrix?.[12] === 2)));
 assert.ok(!json.nodes.some((node) => node.name === 'LANDSCAPING'));
 const color = new Color('#77736c');
 assert.ok(Math.abs(json.materials[0].pbrMetallicRoughness.baseColorFactor[0] - color.r) < 1e-6);
});

test('named model palettes persist across visits', () => {
 const saved = { theme: 'original', overrides: { 'walls:WALLS': 'model:earthen_tuscan' }, landscaping: true };
 assert.deepEqual(parseFinishPreferences(JSON.stringify(saved)), saved);
});

const { createPaintVariations } = await loadModule('../../src/viewer/paintVariations.ts');
test('viewer paints preserve base surface detail without mutating supplied materials', () => {
 const base = new MeshStandardMaterial({ color: '#fff6e8', roughness: 0.74 });
 const originalColor = base.color.clone();
 const variants = createPaintVariations('walls', base);
 assert.equal(variants.length, 2);
 for (const { material, theme } of variants) {
  assert.notEqual(material, base); assert.equal(material.roughness, base.roughness);
  assert.equal(material.normalMap, base.normalMap); assert.equal(material.roughnessMap, base.roughnessMap);
  const saved = { theme: 'original', landscaping: true, overrides: { 'walls:ROOM': theme } };
  assert.deepEqual(parseFinishPreferences(JSON.stringify(saved)), saved);
 }
 assert.deepEqual(base.color, originalColor);
});
test('viewer paints reject textured, transparent, metallic, or unrelated surfaces', () => {
 assert.deepEqual(createPaintVariations('walls'), []);
 assert.deepEqual(createPaintVariations('doors', new MeshStandardMaterial()), []);
 assert.deepEqual(createPaintVariations('walls', new MeshStandardMaterial({ transparent: true })), []);
 assert.deepEqual(createPaintVariations('walls', new MeshStandardMaterial({ metalness: 0.9 })), []);
 const textured = new MeshStandardMaterial(); textured.map = { isTexture: true };
 assert.deepEqual(createPaintVariations('walls', textured), []);
});
