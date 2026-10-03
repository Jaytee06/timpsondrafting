import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
const source = readFileSync(new URL('../../src/viewer/walkMovement.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText.replace("from 'three'", `from '${import.meta.resolve('three')}'`);
const { slideMovement } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function wall(x, z, angle = 0) {
 const mesh = new Mesh(new PlaneGeometry(20, 5), new MeshBasicMaterial({ side: DoubleSide }));
 mesh.position.set(x, 1.5, z); mesh.rotation.y = angle; mesh.updateMatrixWorld(true); return mesh;
}
test('unobstructed movement retains speed', () => {
 assert.ok(slideMovement(new Vector3(0, 1.65, 0), new Vector3(1, 0, 1), []).equals(new Vector3(1, 1.65, 1)));
});
test('slides along wall while preserving clearance', () => {
 const end = slideMovement(new Vector3(0, 1.65, 0.3), new Vector3(0.1, 0, -0.1), [wall(0, 0)]);
 assert.ok(end.x > 0.09); assert.ok(end.z >= 0.24);
});
test('can move away from wall', () => {
 const end = slideMovement(new Vector3(0, 1.65, 0.25), new Vector3(0, 0, 0.1), [wall(0, 0)]);
 assert.ok(end.z > 0.34);
});
test('corner blocks passage through either wall', () => {
 const end = slideMovement(new Vector3(0.3, 1.65, 0.3), new Vector3(-0.1, 0, -0.1), [wall(0, 0), wall(0, 0, Math.PI / 2)]);
 assert.ok(end.x >= 0.24 && end.z >= 0.24);
});
test('slides along rotated walls', () => {
 const end = slideMovement(new Vector3(0.22, 1.65, 0.22), new Vector3(0, 0, -0.1), [wall(0, 0, Math.PI / 4)]);
 assert.ok(end.x > 0.22); assert.ok((end.x + end.z) / Math.sqrt(2) >= 0.24);
});

test('passes through a standard-width doorway', () => {
 const jambs = [-1.45, 1.45].map((x) => {
  const mesh = new Mesh(new PlaneGeometry(2, 5), new MeshBasicMaterial({ side: DoubleSide }));
  mesh.position.set(x, 1.5, 0); mesh.updateMatrixWorld(true); return mesh;
 });
 const end = slideMovement(new Vector3(0, 1.65, 0.3), new Vector3(0, 0, -0.5), jambs);
 assert.ok(end.z < 0);
});
