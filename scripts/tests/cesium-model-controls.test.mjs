import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Cartesian3, Matrix4 } from 'cesium';
const source = readFileSync(new URL('../../src/viewer/cesiumModelControls.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText.replaceAll("from 'cesium'", `from '${import.meta.resolve('cesium')}'`);
const { configureCesiumModel } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('Cesium interaction targets door descendants, preserves hinge position and toggles paired doors', () => {
 const nodes = [
  { name: 'manifest', extras: { viewerOptionsJSON: JSON.stringify({ doors: [{ node: 'DOOR_SWING_L', pairGroup: 'entry' }, { node: 'DOOR_SWING_R', pairGroup: 'entry' }] }) } },
  { name: 'DOOR_SWING_L', children: [3] }, { name: 'DOOR_SWING_R' }, { name: 'door_handle' },
  { name: 'LANDSCAPING' }, { name: 'MATERIAL_LIBRARY' }, { name: 'COLLISION_WALL' },
 ];
 const runtime = new Map(nodes.map(node => [node.name, { matrix: Matrix4.fromTranslation(new Cartesian3(2, 3, 4)), show: true }]));
 const controls = configureCesiumModel({ getNode: name => runtime.get(name) }, nodes);
 assert.deepEqual(controls.landscaping, ['LANDSCAPING']);
 assert.equal(runtime.get('MATERIAL_LIBRARY').show, false);
 assert.equal(runtime.get('COLLISION_WALL').show, false);
 const closed = Matrix4.clone(runtime.get('DOOR_SWING_L').matrix);
 assert.equal(controls.toggleDoor('wall'), false);
 assert.equal(controls.toggleDoor('DOOR_HANDLE'), true);
 assert.ok(!Matrix4.equals(closed, runtime.get('DOOR_SWING_L').matrix));
 assert.ok(!Matrix4.equals(closed, runtime.get('DOOR_SWING_R').matrix));
 assert.deepEqual(Matrix4.getTranslation(runtime.get('DOOR_SWING_L').matrix, new Cartesian3()), new Cartesian3(2, 3, 4));
 controls.toggleDoor('door_handle');
 assert.ok(Matrix4.equals(closed, runtime.get('DOOR_SWING_L').matrix));
});
