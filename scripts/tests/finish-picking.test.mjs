import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
async function load(path) {
 const source = readFileSync(new URL(path, import.meta.url), 'utf8');
 return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
}
const controls = `data:text/javascript;base64,${Buffer.from(await load('../../src/viewer/finishControls.ts')).toString('base64')}`;
const code = (await load('../../src/viewer/finishPicking.ts')).replace("'three'", JSON.stringify(import.meta.resolve('three'))).replace("'./finishControls'", JSON.stringify(controls));
const { inheritedModelFinish, isVisibleModelHit } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('every child in a finish group resolves its shared finish, including nested walls', () => {
 const group = new Group(); group.name = 'FINISH_WALLS__LIVING_ROOM';
 const nested = new Group(), first = new Mesh(), second = new Mesh();
 group.add(first, nested); nested.add(second);
 for (const mesh of [first, second]) assert.deepEqual(inheritedModelFinish(mesh), { category: 'WALLS', surface: 'LIVING_ROOM' });
 second.name = 'FINISH_WALLS__ACCENT';
 assert.equal(inheritedModelFinish(second).surface, 'ACCENT');
 assert.equal(inheritedModelFinish(new Mesh()), null);
});
test('transparent movement barriers do not block finish picking but visible walls do', () => {
 const scene = new Group();
 const barrier = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ transparent: true, opacity: 0 }));
 barrier.position.z = 2;
 const wall = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
 scene.add(barrier, wall); scene.updateMatrixWorld(true);
 const ray = new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
 const hits = ray.intersectObjects(scene.children, true);
 assert.equal(hits[0].object, barrier);
 assert.equal(hits.find(isVisibleModelHit).object, wall);
 wall.parent.visible = false;
 assert.equal(hits.find(isVisibleModelHit), undefined);
});
test('visibility respects the actual material slot and retains visible glazing as an occluder', () => {
 const invisible = new MeshStandardMaterial({ transparent: true, opacity: 0 });
 const glass = new MeshStandardMaterial({ transparent: true, opacity: 0.2 });
 const mesh = new Mesh(new BoxGeometry(), [invisible, glass]);
 assert.equal(isVisibleModelHit({ object: mesh, face: { materialIndex: 0 } }), false);
 assert.equal(isVisibleModelHit({ object: mesh, face: { materialIndex: 1 } }), true);
 glass.visible = false;
 assert.equal(isVisibleModelHit({ object: mesh, face: { materialIndex: 1 } }), false);
});
