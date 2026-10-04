import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
const compiled=ts.transpileModule(readFileSync(new URL('../../src/viewer/sourceGlbExport.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replaceAll("from 'three'",`from '${import.meta.resolve('three')}'`);
const {registerSourceGlb,exportSourceGlb}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
async function decode(blob){const b=Buffer.from(await blob.arrayBuffer());assert.equal(b.readUInt32LE(8),b.length);const end=20+b.readUInt32LE(12);assert.equal(b.readUInt32LE(end+4),0x004e4942);return {json:JSON.parse(b.subarray(20,end)),binary:b.subarray(end+8)};}
function fixture(){
 const scene=new Group(), base=new MeshStandardMaterial(), alternate=new MeshStandardMaterial();base.name='FINISH_WALLS__ROOM';alternate.name='THEME_SAGE__WALLS';
 const a=new Mesh(new BoxGeometry(),alternate),b=new Mesh(a.geometry,base),library=new Group();library.visible=false;scene.add(a,b,library);a.rotation.y=.4;
 const json={asset:{version:'2.0'},buffers:[{byteLength:4}],bufferViews:[{buffer:0,byteOffset:0,byteLength:4}],images:[{bufferView:0,mimeType:'image/png'}],materials:[{name:base.name,pbrMetallicRoughness:{roughnessFactor:.8},normalTexture:{index:0}},{name:alternate.name}],meshes:[{primitives:[{material:0,attributes:{POSITION:0}}]}],nodes:[{mesh:0},{mesh:0},{name:'MATERIAL_LIBRARY'}],scenes:[{nodes:[0,1,2]}]};
 const associations=new Map([[a,{nodes:0,meshes:0,primitives:0}],[b,{nodes:1,meshes:0,primitives:0}],[library,{nodes:2}],[base,{materials:0}],[alternate,{materials:1}]]);
 const binary=new Uint8Array([3,6,9,12]).buffer;registerSourceGlb(scene,{json,associations,binary:async()=>binary});return {scene,a,b,base,json,binary};
}
test('source export preserves embedded bytes, isolates shared mesh finishes, keeps door transforms, and hides library',async()=>{
 const {scene,a,json,binary}=fixture();const original=JSON.stringify(json);const result=await decode(await exportSourceGlb(scene));
 assert.deepEqual(result.binary,Buffer.from(binary));assert.equal(JSON.stringify(json),original);
 const first=result.json.nodes[0],second=result.json.nodes[1];assert.notEqual(first.mesh,second.mesh);
 assert.equal(result.json.meshes[first.mesh].primitives[0].material,1);assert.equal(result.json.meshes[second.mesh].primitives[0].material,0);
 assert.deepEqual(first.matrix,a.matrix.toArray());assert.deepEqual(result.json.scenes[0].nodes,[0,1]);assert.deepEqual(result.json.images,json.images);
});
test('studio paint clones its packaged material definition, preserving surface textures and linear color',async()=>{
 const {scene,a,base,json}=fixture();const paint=base.clone();paint.name='STUDIO_PAINT_MIST_BLUE';paint.userData.tddExportBaseMaterial=base.name;paint.color.set('#bcc4c7');a.material=paint;
 const {json:output}=await decode(await exportSourceGlb(scene));const selected=output.materials[output.meshes[output.nodes[0].mesh].primitives[0].material];
 assert.equal(selected.name,paint.name);assert.deepEqual(selected.normalTexture,json.materials[0].normalTexture);
 assert.deepEqual(selected.pbrMetallicRoughness.baseColorFactor,[paint.color.r,paint.color.g,paint.color.b,paint.opacity]);
 assert.equal(output.meshes[output.nodes[1].mesh].primitives[0].material,0);
});
test('ordinary synthetic scenes keep the generic exporter fallback',async()=>{assert.equal(await exportSourceGlb(new Group()),null);});
