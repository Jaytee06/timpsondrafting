import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Group, Object3D } from 'three';
import { Axis, Cartesian3, Matrix4 as CesiumMatrix4, Transforms, HeadingPitchRoll, Cartographic } from 'cesium';
const compiled = ts.transpileModule(readFileSync(new URL('../../src/viewer/modelSpawn.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText.replaceAll("from 'three'", `from '${import.meta.resolve('three')}'`);
const { DEFAULT_EYE_HEIGHT, spawnForwardAxis, sceneModelSpawn, gltfModelSpawn, readGlbModelSpawn, cesiumSpawnFrame } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const near = (a,b,tolerance=1e-5) => assert.ok(Math.abs(a-b)<tolerance, `${a} differs from ${b}`);
const vectorNear = (a,b) => a.forEach((value,index) => near(value,b[index]));
test('camera height is the requested five feet seven inches', () => near(DEFAULT_EYE_HEIGHT, 1.7018));
test('supports explicit glTF axes and legacy Blender-local Y conventions', () => {
 vectorNear(spawnForwardAxis('-Z').toArray(), [0,0,-1]);
 vectorNear(spawnForwardAxis('local -Y; faces world +Y toward entry').toArray(), [0,0,1]);
 vectorNear(spawnForwardAxis('local +Y; Blender').toArray(), [0,0,-1]);
 vectorNear(spawnForwardAxis('+X').toArray(), [1,0,0]);
});
test('scene and JSON readers include ancestor rotation, translation and scale', () => {
 const root = new Group(); root.position.set(10,2,4); root.rotation.y = Math.PI/2; root.scale.setScalar(2);
 const spawn = new Object3D(); spawn.name = 'SPAWN_FRONT'; spawn.position.set(1,0,3); spawn.userData.forwardAxis = '+Z'; root.add(spawn);
 const json = { scenes:[{nodes:[0]}], nodes:[{translation:root.position.toArray(), rotation:root.quaternion.toArray(), scale:root.scale.toArray(), children:[1]}, {name:spawn.name,translation:spawn.position.toArray(),extras:spawn.userData}] };
 const a=sceneModelSpawn(root), b=gltfModelSpawn(json);
 vectorNear(a.position,b.position); vectorNear(a.direction,b.direction);
 vectorNear(a.position,[16,2,2]); vectorNear(a.direction,[1,0,0]);
});
test('all published spawns retain their axis metadata and survive customized export wrappers', async () => {
 for (const id of ['model-01','model-02','model-03']) {
  const bytes = readFileSync(new URL(`../../public/models/${id}.glb`,import.meta.url));
  const json = JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const primary=json.nodes.find(node=>node.name==='SPAWN_FRONT');
  assert.ok(primary.extras.forwardAxis); assert.equal(primary.extras.eyeHeightMeters,1.65);
  const spawn = await readGlbModelSpawn(new Blob([bytes])); assert.ok(spawn);
  const scene=new Group(); const objects=json.nodes.map(node=>{ const object=new Object3D(); object.name=node.name??''; object.userData=node.extras??{};
   if(node.matrix) {object.matrix.fromArray(node.matrix);object.matrix.decompose(object.position,object.quaternion,object.scale);} else {object.position.fromArray(node.translation??[0,0,0]);object.quaternion.fromArray(node.rotation??[0,0,0,1]);object.scale.fromArray(node.scale??[1,1,1]);} return object; });
  json.nodes.forEach((node,index)=>node.children?.forEach(child=>objects[index].add(objects[child])));
  json.scenes[json.scene??0].nodes.forEach(index=>scene.add(objects[index]));
  const sceneSpawn=sceneModelSpawn(scene);vectorNear(spawn.position,sceneSpawn.position);vectorNear(spawn.direction,sceneSpawn.direction);
  assert.equal(primary.extras.forwardAxis, '-Z');
  near(Math.hypot(...spawn.direction), 1);
  const { exportCustomizedGlb } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(readFileSync(new URL('../../src/viewer/exportModel.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replaceAll("from 'three'",`from '${import.meta.resolve('three')}'`).replaceAll("import('three/examples/jsm/exporters/GLTFExporter.js')",`import('${import.meta.resolve('three/examples/jsm/exporters/GLTFExporter.js')}')`)).toString('base64')}`);
  globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}};
  const exported=await readGlbModelSpawn(await exportCustomizedGlb(scene));
  vectorNear(exported.position,spawn.position);vectorNear(exported.direction,spawn.direction);
 }
});
test('Cesium spawn frame matches its actual default axis-correction matrices', () => {
 const spawn={position:[3,2,7],direction:[0,0,-1],eyeHeight:1.65};
 const frame=cesiumSpawnFrame(spawn);
 const correction=CesiumMatrix4.multiply(Axis.Y_UP_TO_Z_UP,Axis.Z_UP_TO_X_UP,new CesiumMatrix4());
 const actual=CesiumMatrix4.multiplyByPoint(correction,new Cartesian3(...spawn.position),new Cartesian3());
 vectorNear(frame.position,[actual.x,actual.y,actual.z]);
 const transform=Transforms.headingPitchRollToFixedFrame(Cartesian3.fromDegrees(-112,37,1500),new HeadingPitchRoll(Math.PI/2,0,0));
 const world=CesiumMatrix4.multiplyByPoint(transform,new Cartesian3(...frame.position.map(x=>x*2)),new Cartesian3());
 const moved=Cartographic.fromCartesian(world);near(moved.height,1504,1e-3); // ENU tangent-plane offset adds a tiny curvature term.
 const direction=CesiumMatrix4.multiplyByPointAsVector(correction,new Cartesian3(...spawn.direction),new Cartesian3());
 vectorNear(frame.direction,[direction.x,direction.y,direction.z]);
 // At 90 degrees model heading, its authored west-facing direction points north.
 near(Math.PI/2+Math.atan2(frame.direction[0],frame.direction[1]),0);
});
test('missing markers fall back cleanly and exact primary wins over unit-specific markers', () => {
 assert.equal(gltfModelSpawn({nodes:[]}),null);
 const spawn=gltfModelSpawn({nodes:[{name:'SPAWN_FRONT_UNIT_B',translation:[20,0,0]},{name:'SPAWN_FRONT',translation:[2,0,0]}]});
 vectorNear(spawn.position,[2,0,0]);
});
