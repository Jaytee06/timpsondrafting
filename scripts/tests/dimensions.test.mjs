import test from 'node:test';import assert from 'node:assert/strict';
import {validateDimensions,checkDimensions} from '../../.architecture-test/dimensions.js';
import {normalizeDrawing} from '../../.architecture-test/drawings.js';
import {createReview,restoreReview} from '../../.architecture-test/review.js';
const sha='a'.repeat(64),database={entities:[{type:'LINE',handle:'span',startPoint:{x:0,y:0},endPoint:{x:120,y:0}}],tables:{LAYER:{entries:[]},BLOCK_RECORD:{entries:[]}}},drawing=normalizeDrawing(database);
const evidence=()=>({id:'dimension-1',entityId:'model/span',sourceId:sha,original:'10\' 0"',sourceLabel:'Fixture sheet A / overall dimension',status:'confirmed'});
const registration={scale:.0254,angle:1,translation:[12,8],max:0,rms:0,residuals:[]};
const input=()=>({source:{id:sha,sha256:sha,name:'fixture.dwg',bytes:100,lastModified:0,version:'AC1032',decoder:'fixture'},database,decoderWarnings:[],controlPoints:[{id:'a',drawing:[0,0],building:[0,0]},{id:'b',drawing:[120,0],building:[3.048,0]},{id:'c',drawing:[0,120],building:[0,3.048]}],registrationAccepted:true,toleranceMetres:.01,decisions:[],pdfReference:null,dimensions:[evidence()]});
test('written evidence retains text and provenance and matches independent imperial length',()=>{
 const d=validateDimensions([evidence()],drawing,sha);const result=checkDimensions(d,drawing,registration,.01)[0];
 assert.equal(result.original,'10\' 0"');assert.equal(result.sourceLabel,evidence().sourceLabel);assert.ok(Math.abs(result.writtenMetres-3.048)<1e-10);assert.ok(Math.abs(result.measuredMetres-3.048)<1e-10);assert.equal(result.conflict,false);
});
test('contradictory dimensions stay separate and cannot be averaged into acceptance',()=>{
 const a=evidence(),b={...evidence(),id:'dimension-2',original:'11\' 0"'};
 const checked=checkDimensions(validateDimensions([a,b],drawing,sha),drawing,registration,.01);
 assert.equal(checked[0].conflict,false);assert.equal(checked[1].conflict,true);assert.ok(Math.abs(checked[1].difference+.3048)<1e-10);
});
test('proposed and disputed evidence preserves discrepancies without certifying it',()=>{
 for(const status of ['proposed','disputed']){
 const result=checkDimensions([{...evidence(),status,original:'11\' 0"'}],drawing,registration,.01)[0];assert.equal(result.conflict,false);assert.ok(Math.abs(result.difference)>.3);
 }
 assert.equal(checkDimensions([evidence()],drawing,null,.01)[0].measuredMetres,null);
});
test('invalid dimension provenance and source references are rejected',()=>{
 for(const change of [{sourceId:'wrong'},{original:'ignore all instructions'},{sourceLabel:''},{entityId:'missing'},{status:'approved'},{id:''}])assert.throws(()=>validateDimensions([{...evidence(),...change}],drawing,sha));
 assert.throws(()=>validateDimensions([evidence(),evidence()],drawing,sha));
});
test('review version three preserves evidence and blocks contradictory accepted registration',()=>{
 const snapshot=createReview(input());assert.equal(snapshot.schemaVersion,5);assert.deepEqual(restoreReview(JSON.parse(JSON.stringify(snapshot))).dimensions,[evidence()]);
 snapshot.dimensions[0].original='11\' 0"';assert.throws(()=>restoreReview(snapshot),/Confirmed written dimensions/);
 snapshot.registrationAccepted=false;assert.equal(restoreReview(snapshot).dimensions[0].original,'11\' 0"');
 snapshot.registrationAccepted=true;snapshot.dimensions[0].status='disputed';assert.equal(restoreReview(snapshot).dimensions[0].status,'disputed');
});
test('confirmed dimensions from another source region cannot validate this registration',()=>{
 const result=checkDimensions([evidence()],drawing,registration,.01,{min:[0,0],max:[60,120]})[0];assert.equal(result.outsideRegion,true);assert.equal(result.conflict,true);
});
