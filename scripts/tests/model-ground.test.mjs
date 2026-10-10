import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Group, Object3D } from 'three';
const code = ts.transpileModule(readFileSync(new URL('../../src/viewer/modelGround.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText.replaceAll("from 'three'", `from '${import.meta.resolve('three')}'`);
const { sceneGroundHeight } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('site datum honors parent transforms and ignores underground depth without moving geometry', () => {
 const scene = new Group(), parent = new Group(), datum = new Object3D(), tank = new Object3D(); parent.position.y = 3; parent.scale.setScalar(2); datum.name = 'GROUND_DATUM'; datum.position.y = 1; tank.position.y = -8; parent.add(datum); scene.add(parent,tank);
 assert.equal(sceneGroundHeight(scene,-8),5); assert.equal(tank.position.y,-8); assert.equal(parent.position.y,3);
});
test('datum takes precedence over legacy spawn metadata; zero is a valid authored grade', () => {
 const scene = new Group(), spawn = new Object3D(); spawn.name = 'SPAWN_FRONT'; spawn.userData.viewerGroundHeightMeters = 0; scene.add(spawn); assert.equal(sceneGroundHeight(scene,-4),0);
 const datum = new Object3D(); datum.name = 'GROUND_DATUM'; datum.position.y = .25; scene.add(datum); assert.equal(sceneGroundHeight(scene,-4),.25);
});
test('models with absent or malformed metadata retain their legacy fallback', () => {
 const scene = new Group(), spawn = new Object3D(); spawn.name = 'SPAWN_FRONT'; scene.add(spawn);
 for (const value of [undefined, null, '0', NaN, Infinity]) { spawn.userData.viewerGroundHeightMeters = value; assert.equal(sceneGroundHeight(scene,-2),-2); }
});
