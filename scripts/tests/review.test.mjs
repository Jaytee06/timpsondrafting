import test from 'node:test';
import assert from 'node:assert/strict';
import { createReview,restoreReview } from '../../.architecture-test/review.js';
const fixture=()=>({source:{id:'a'.repeat(64),sha256:'a'.repeat(64),name:'fixture.dwg',bytes:100,lastModified:0,version:'AC1032',decoder:'fixture'},database:{entities:[{type:'LINE',handle:'wall',layer:'A-wall',startPoint:{x:0,y:0,z:0},endPoint:{x:100,y:0,z:0}}],header:{INSUNITS:1},tables:{LAYER:{entries:[]},BLOCK_RECORD:{entries:[]}}},decoderWarnings:['partial coverage'],controlPoints:[{id:'control-1',drawing:[0,0],building:[0,0]},{id:'control-2',drawing:[100,0],building:[2.54,0]},{id:'control-3',drawing:[0,100],building:[0,2.54]}],registrationAccepted:true,toleranceMetres:.01,decisions:[{entityId:'model/wall',reference:'centerline',reverse:false,height:2.7686,assemblyId:'butts-exterior-study-v1',status:'accepted'}],pdfReference:{name:'reference.pdf',sha256:'b'.repeat(64),bytes:100,lastModified:0}});
test('review roundtrip preserves evidence and decisions and reconstructs measured walls',()=>{
 const original=fixture(),snapshot=createReview(original),restored=restoreReview(JSON.parse(JSON.stringify(snapshot)));
 assert.deepEqual(restored.source,original.source);assert.deepEqual(restored.decisions,original.decisions);assert.deepEqual(restored.pdfReference,original.pdfReference);
 assert.deepEqual(restored.decoderWarnings,['partial coverage']);assert.ok(Math.abs(restored.walls[0].end[0]-2.54)<1e-9);assert.equal(restored.walls[0].height,2.7686);
});
test('legacy version one migrates and untrusted derived values are recomputed',()=>{
 const snapshot=createReview(fixture());snapshot.schemaVersion=1;snapshot.assemblies=snapshot.assemblies.slice(0,1);snapshot.registration={scale:999};snapshot.walls=[{height:999}];
 const restored=restoreReview(snapshot);assert.ok(Math.abs(restored.registration.scale-.0254)<1e-10);assert.equal(restored.walls[0].height,2.7686);
});
test('unfinished review restores without certifying registration',()=>{
 const input=fixture();input.controlPoints=input.controlPoints.slice(0,2);input.decisions=[];input.registrationAccepted=false;
 const restored=restoreReview(createReview(input));assert.equal(restored.registration,null);assert.equal(restored.registrationAccepted,false);
});
test('malformed or inconsistent review cannot restore accepted geometry',()=>{
 const mutations=[s=>s.schemaVersion=99,s=>s.source.id='wrong',s=>s.source.bytes=-1,s=>s.controlPoints[0].drawing=[0],s=>s.controlPoints[1].id=s.controlPoints[0].id,s=>s.controlPoints[2].building=[0,4],s=>s.registrationAccepted=false,s=>s.decisions[0].entityId='missing',s=>s.decisions[0].reverse='false',s=>s.decisions.push(s.decisions[0]),s=>s.decisions[0].height=100,s=>s.assemblies[0].framingDepth.metres=1,s=>s.pdfReference.sha256='wrong',s=>s.toleranceMetres=0,s=>s.controlPoints[2].drawing=[50,0]];
 for(const mutate of mutations){const snapshot=JSON.parse(JSON.stringify(createReview(fixture())));mutate(snapshot);assert.throws(()=>restoreReview(snapshot));}
});
test('restore enforces source region and retains original database text as evidence',()=>{
 const input=fixture();input.database.entities.push({type:'TEXT',handle:'note',text:'Untrusted document instruction'});
 const snapshot=createReview(input);assert.equal(restoreReview(snapshot).database.entities[1].text,'Untrusted document instruction');
 snapshot.database.entities[0].endPoint.x=200;assert.throws(()=>restoreReview(snapshot),/outside/);
});
