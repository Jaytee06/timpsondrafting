import test from 'node:test';
import assert from 'node:assert/strict';
import { buttsExterior, buttsStudy, generateWall, generateAssemblies, exportAssemblyConfiguration, studyWalls, wallFrame } from '../../.architecture-test/assemblies.js';
import { applyChange, fixture, openings } from '../../.architecture-test/model.js';
const eps = 1e-8;
const wall = { id:'test', start:[0,0,0], end:[4,0,0], height:2.7686, assemblyId:buttsExterior.id, evidenceIds:[] };
const hole = {id:'window',offset:1.4,width:1.2,sill:.9,head:2.1};
const volume = parts => parts.reduce((sum,p)=>sum+p.size[0]*p.size[1]*p.size[2],0);
const bounds = p => ({u0:p.center[0]-p.size[0]/2,u1:p.center[0]+p.size[0]/2,z0:p.center[2]-p.size[2]/2,z1:p.center[2]+p.size[2]/2});
test('Butts study retains documented height and proposal spans',()=> {
 assert.ok(Math.abs(buttsStudy.height-2.7686)<eps);
 assert.equal(buttsStudy.evidence[0].status,'fixture');
 assert.throws(()=>applyChange(buttsStudy,{revision:0,field:'height',value:3}),/conflicts/);
});
test('framing and cavity volumes independently cover core minus opening',()=>{
 const parts=generateWall(wall,buttsExterior,[hole]);
 const core=parts.filter(p=>['framing','cavity'].includes(p.layer));
 assert.ok(Math.abs(volume(core)-(4*2.7686-1.2*1.2)*.1397)<eps);
 assert.ok(volume(parts.filter(p=>p.layer==='cavity'))>0);
 assert.ok(volume(parts.filter(p=>p.layer==='framing'))<volume(core)*.4);
});
test('framing and cavities have no overlapping interiors',()=>{
 const core=generateWall(wall,buttsExterior,[hole]).filter(p=>['framing','cavity'].includes(p.layer));
 for(let i=0;i<core.length;i++)for(let j=i+1;j<core.length;j++){
  const a=bounds(core[i]),b=bounds(core[j]);
  const overlap=Math.min(a.u1,b.u1)-Math.max(a.u0,b.u0)>eps && Math.min(a.z1,b.z1)-Math.max(a.z0,b.z0)>eps;
  assert.equal(overlap,false,`${core[i].id} intersects ${core[j].id}`);
 }
});
test('all layers respect window and doorway voids, and door has no sill',()=>{
 for(const h of [hole,{...hole,id:'door',offset:.5,width:.9,sill:0}]){
  const parts=generateWall(wall,buttsExterior,[h]);
  for(const p of parts){const b=bounds(p);assert.equal(Math.min(b.u1,h.offset+h.width)-Math.max(b.u0,h.offset)>eps && Math.min(b.z1,h.head)-Math.max(b.z0,h.sill)>eps,false,p.id);assert.ok(b.z0>=-eps);}
  if(h.sill===0)assert.equal(parts.some(p=>p.role==='rough sill'),false);
 }
});
test('surface volume equals independent net area times layer thickness',()=>{
 const parts=generateWall(wall,buttsExterior,[hole]);
 for(const layer of buttsExterior.layers)assert.ok(Math.abs(volume(parts.filter(p=>p.layer===layer.id))-(4*2.7686-1.44)*layer.thickness.metres)<eps);
});
test('thicker finish moves finished face without moving framing reference',()=>{
 const altered=structuredClone(buttsExterior);altered.layers.find(l=>l.id==='siding').thickness.metres=.05;
 const a=generateWall(wall,buttsExterior,[hole]),b=generateWall(wall,altered,[hole]);
 assert.deepEqual(a.filter(p=>p.layer==='framing'),b.filter(p=>p.layer==='framing'));
 assert.ok(b.find(p=>p.layer==='siding').size[1]>.019);
});
test('rotation preserves local frame geometry and hosted component positions',()=>{
 const rotated={...wall,start:[10,20,1],end:[10,24,1]};
 assert.deepEqual(wallFrame(rotated).point(2,.2,3),[10.2,22,4]);
 const a=generateWall(wall,buttsExterior,[hole]),b=generateWall(rotated,buttsExterior,[hole]);
 assert.equal(a.length,b.length);
 a.forEach((p,i)=>{assert.deepEqual(p.size,b[i].size); assert.ok(Math.abs(b[i].center[0]-(10-p.center[1]))<eps);assert.ok(Math.abs(b[i].center[1]-(20+p.center[0]))<eps);});
});
test('edited spans regenerate assemblies; layers and study walls stay stable',()=>{
 const a=generateAssemblies(fixture),p=applyChange(fixture,{revision:0,field:'width',value:6}),b=generateAssemblies(p);
 assert.deepEqual(studyWalls(fixture).map(w=>w.id),studyWalls(p).map(w=>w.id));
 assert.equal(new Set(b.map(c=>c.id)).size,b.length);
 assert.ok(a.length>0 && b.length>a.length);
 assert.equal(openings(p)[0].offset,2.4);
});
test('invalid assembly parameters and out-of-range holes reject generation',()=>{
 assert.throws(()=>generateWall({...wall,end:[0,0,0]},buttsExterior,[]));
 assert.throws(()=>generateWall(wall,{...buttsExterior,spacing:{...buttsExterior.spacing,metres:0}},[]));
 assert.throws(()=>generateWall(wall,buttsExterior,[{...hole,offset:3.5}]));
});

test('configuration readback retains assembly assumptions and regenerated geometry',()=>{
 const decoded=JSON.parse(exportAssemblyConfiguration(buttsStudy));
 assert.deepEqual(decoded.assembly,buttsExterior);
 assert.deepEqual(generateAssemblies(decoded.project,decoded.assembly),generateAssemblies(buttsStudy));
 assert.equal(decoded.assembly.layers.find(l=>l.id==='siding').thickness.status,'assumed');
});
test('multiple openings and an unperforated wall have correct net core volume',()=>{
 for(const holes of [[],[{...hole,offset:.3,width:.8},{...hole,id:'door',offset:2.5,width:.9,sill:0}]]){
  const parts=generateWall(wall,buttsExterior,holes).filter(p=>['framing','cavity'].includes(p.layer));
  const voidArea=holes.reduce((sum,h)=>sum+h.width*(h.head-h.sill),0);
  assert.ok(Math.abs(volume(parts)-(4*2.7686-voidArea)*.1397)<eps);
 }
});
