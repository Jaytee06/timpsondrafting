import test from 'node:test';import assert from 'node:assert/strict';
import {validateFinishes,resolveFinishes} from '../../.architecture-test/finishes.js';
import {buttsExterior,interiorPartition,generateWall} from '../../.architecture-test/assemblies.js';
import {openingHole} from '../../.architecture-test/openings.js';
import {createReview,restoreReview} from '../../.architecture-test/review.js';
const wall={id:'wall',start:[0,0,0],end:[4,0,0],height:2.7686,assemblyId:buttsExterior.id,evidenceIds:[]};
const choice=()=>({hostEntityId:'model/w',layerId:'gypsum',side:'interior',thicknessText:'25 mm',appearance:{label:'Warm plaster appearance',color:'#ddbb99',roughness:.7},note:'Synthetic designer choice'});
const opening={id:'hole',hostEntityId:'model/w',kind:'window',offsetText:'1 m',widthText:'1.2 m',sillText:'0.9 m',headText:'2.1 m',sourceLabel:'Synthetic fixture',status:'proposed'};
test('finish thickness leaves framing, voids and base evidence unchanged',()=>{
 const baseline=JSON.stringify(buttsExterior),choices=validateFinishes([choice()],[{entityId:'model/w',wall}],[opening]),resolved=resolveFinishes(buttsExterior,'model/w',choices);
 const original=generateWall(wall,buttsExterior,[openingHole(opening)]),modified=generateWall(wall,resolved,[openingHole(opening)]);
 assert.deepEqual(modified.filter(p=>p.layer==='framing'),original.filter(p=>p.layer==='framing'));assert.equal(JSON.stringify(buttsExterior),baseline);assert.equal(resolved.layers[0].thickness.status,'assumed');assert.equal(buttsExterior.layers[0].thickness.status,'documented');
 const gypsum=modified.filter(p=>p.layer==='gypsum');assert.ok(Math.abs(gypsum.reduce((s,p)=>s+p.size[0]*p.size[1]*p.size[2],0)-(4*2.7686-1.44)*.025)<1e-9);
 assert.ok(gypsum.every(p=>p.surfaceSide==='interior'));assert.deepEqual(modified.map(p=>p.id),original.map(p=>p.id));
 assert.deepEqual(resolveFinishes(buttsExterior,'neighbor',choices),buttsExterior);
});
test('interior finish targets are independent on opposite wall faces',()=>{
 const w={...wall,assemblyId:interiorPartition.id},resolved=resolveFinishes(interiorPartition,'model/w',validateFinishes([choice()],[{entityId:'model/w',wall:w}],[])),parts=generateWall(w,resolved,[]);
 for(const side of ['interior','exterior']){const panels=parts.filter(p=>p.layer==='gypsum'&&p.surfaceSide===side),volume=panels.reduce((s,p)=>s+p.size[0]*p.size[1]*p.size[2],0);assert.ok(Math.abs(volume-4*2.7686*(side==='interior'?.025:.0127))<1e-9);}
 assert.equal(new Set(parts.map(p=>p.id)).size,parts.length);
});
test('invalid finish targets and unbounded appearance or thickness cannot apply',()=>{
 for(const patch of [{hostEntityId:'missing'},{layerId:'framing'},{side:'other'},{thicknessText:'0.5 mm'},{thicknessText:'101 mm'},{note:''},{appearance:{label:'x',color:'url(secret)',roughness:.5}},{appearance:{label:'x',color:'#ffffff',roughness:NaN}}])assert.throws(()=>validateFinishes([{...choice(),...patch}],[{entityId:'model/w',wall}],[]));
 assert.throws(()=>validateFinishes([choice(),choice()],[{entityId:'model/w',wall}],[]));assert.throws(()=>validateFinishes([{...choice(),layerId:'siding'}],[{entityId:'model/w',wall:{...wall,assemblyId:interiorPartition.id}}],[]));
});
const input=()=>({source:{id:'a'.repeat(64),sha256:'a'.repeat(64),name:'fixture.dwg',bytes:100,lastModified:0,version:'AC1032',decoder:'fixture'},database:{entities:[{type:'LINE',handle:'w',startPoint:{x:0,y:0},endPoint:{x:4,y:0}}],tables:{LAYER:{entries:[]},BLOCK_RECORD:{entries:[]}}},decoderWarnings:[],controlPoints:[{id:'a',drawing:[0,0],building:[0,0]},{id:'b',drawing:[4,0],building:[4,0]},{id:'c',drawing:[0,4],building:[0,4]}],registrationAccepted:true,toleranceMetres:.01,decisions:[{entityId:'model/w',reference:'centerline',reverse:false,height:2.7686,assemblyId:buttsExterior.id,status:'accepted'}],pdfReference:null,dimensions:[],openings:[opening],finishes:[choice()]});
test('version five roundtrip preserves finishes and unchanged source/framing/opening evidence',()=>{
 const original=input(),snapshot=createReview(original),restored=restoreReview(JSON.parse(JSON.stringify(snapshot)));assert.equal(snapshot.schemaVersion,5);assert.deepEqual(restored.finishes,original.finishes);assert.deepEqual(restored.openings,original.openings);assert.deepEqual(restored.source,original.source);assert.equal(restored.walls[0].start[1],0);
 snapshot.finishes[0].hostEntityId='missing';assert.throws(()=>restoreReview(snapshot));
});
test('version four reviews migrate without manufacturing finish choices',()=>{
 const snapshot=createReview(input());snapshot.schemaVersion=4;delete snapshot.finishes;assert.deepEqual(restoreReview(snapshot).finishes,[]);
});
