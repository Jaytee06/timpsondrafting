import test from 'node:test';import assert from 'node:assert/strict';
import {validateHostedOpenings,openingHole} from '../../.architecture-test/openings.js';
import {generateWall,buttsExterior,interiorPartition} from '../../.architecture-test/assemblies.js';
import {createReview,restoreReview} from '../../.architecture-test/review.js';
const wall={id:'wall',start:[0,0,0],end:[4,0,0],height:2.7686,assemblyId:buttsExterior.id,evidenceIds:[]};
const host={entityId:'model/w',wall,assembly:buttsExterior};
const window=()=>({id:'opening-a',hostEntityId:'model/w',kind:'window',offsetText:'1 m',widthText:'1.2 m',sillText:'0.9 m',headText:'2.1 m',sourceLabel:'Synthetic window fixture',status:'proposed'});
test('hosted opening parses written values and cuts every solid layer independently',()=>{
 const opening=validateHostedOpenings([window()],[host])[0],hole=openingHole(opening),parts=generateWall(wall,buttsExterior,[hole]);
 assert.equal(opening.offsetText,'1 m');assert.equal(hole.width,1.2);
 for(const layer of buttsExterior.layers){const volume=parts.filter(p=>p.layer===layer.id).reduce((sum,p)=>sum+p.size[0]*p.size[1]*p.size[2],0);assert.ok(Math.abs(volume-(4*2.7686-1.2*1.2)*layer.thickness.metres)<1e-9);}
 assert.ok(parts.filter(p=>p.layer==='framing').every(p=>!(p.center[0]-p.size[0]/2<2.2-1e-9&&p.center[0]+p.size[0]/2>1+1e-9&&p.center[2]-p.size[2]/2<2.1-1e-9&&p.center[2]+p.size[2]/2>.9+1e-9)));
});
test('missing hosts, overlaps, invalid values and incompatible door/window sills fail',()=>{
 assert.throws(()=>validateHostedOpenings([window()],[]));
 for(const changed of [{widthText:'20 m'},{offsetText:'0 m'},{headText:'4 m'},{sillText:'0 m'},{sourceLabel:''},{kind:'door'},{widthText:'NaN m'}])assert.throws(()=>validateHostedOpenings([{...window(),...changed}],[host]));
 assert.throws(()=>validateHostedOpenings([window(),{...window(),id:'b',offsetText:'1.5 m'}],[host]));
 assert.throws(()=>validateHostedOpenings([window(),window()],[host]));
 const door={...window(),kind:'door',sillText:'0 m'};assert.equal(openingHole(validateHostedOpenings([door],[host])[0]).sill,0);
});
test('interior assembly produces both gypsum faces with unique IDs and correct volume',()=>{
 const w={...wall,assemblyId:interiorPartition.id},parts=generateWall(w,interiorPartition,[openingHole(window())]);
 assert.equal(new Set(parts.map(p=>p.id)).size,parts.length);
 const gypsum=parts.filter(p=>p.layer==='gypsum'),volume=gypsum.reduce((s,p)=>s+p.size[0]*p.size[1]*p.size[2],0);
 assert.ok(Math.abs(volume-2*(4*2.7686-1.44)*.0127)<1e-9);assert.ok(gypsum.some(p=>p.center[1]<0)&&gypsum.some(p=>p.center[1]>0));
 assert.ok(interiorPartition.layers.every(l=>l.thickness.status==='assumed'));
});
const review=()=>({source:{id:'a'.repeat(64),sha256:'a'.repeat(64),name:'fixture.dwg',bytes:100,lastModified:0,version:'AC1032',decoder:'fixture'},database:{entities:[{type:'LINE',handle:'w',startPoint:{x:0,y:0},endPoint:{x:4,y:0}}],tables:{LAYER:{entries:[]},BLOCK_RECORD:{entries:[]}}},decoderWarnings:[],controlPoints:[{id:'a',drawing:[0,0],building:[0,0]},{id:'b',drawing:[4,0],building:[4,0]},{id:'c',drawing:[0,4],building:[0,4]}],registrationAccepted:true,toleranceMetres:.01,decisions:[{entityId:'model/w',reference:'centerline',reverse:false,height:2.7686,assemblyId:interiorPartition.id,status:'accepted'}],pdfReference:null,dimensions:[],openings:[window()]});
test('version four preserves opening evidence and wall type; rejects orphaned or invalid restored openings',()=>{
 const snapshot=createReview(review()),restored=restoreReview(JSON.parse(JSON.stringify(snapshot)));assert.equal(snapshot.schemaVersion,5);assert.deepEqual(restored.openings,[window()]);assert.equal(restored.walls[0].assemblyId,interiorPartition.id);
 for(const modify of [s=>s.decisions=[],s=>s.openings[0].headText='5 m',s=>s.openings[0].hostEntityId='missing',s=>s.decisions[0].height=2.2]){const s=JSON.parse(JSON.stringify(snapshot));modify(s);assert.throws(()=>restoreReview(s));}
});
test('export migration cannot retain an older version through extra input fields',()=>{
 assert.equal(createReview({...review(),schemaVersion:3}).schemaVersion,5);
});
