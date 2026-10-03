import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDrawing,parseDimension,wallFromDecision } from '../../.architecture-test/drawings.js';
import { registerPoints,transformPoint } from '../../.architecture-test/registration.js';
import { buttsExterior,generateWall } from '../../.architecture-test/assemblies.js';
const line=(handle,a,b,layer='A-wall')=>({type:'LINE',handle,layer,startPoint:{x:a[0],y:a[1],z:0},endPoint:{x:b[0],y:b[1],z:0}});
const db=(entities,blocks=[])=>({entities,header:{INSUNITS:1},tables:{LAYER:{entries:[{name:'A-wall',frozen:false},{name:'hidden',frozen:true}]},BLOCK_RECORD:{entries:blocks}}});
const eps=1e-9;
test('similarity registration independently reconstructs known rotated points',()=>{
 const known={scale:.0254,angle:Math.PI/2,translation:[10,-20]};
 const drawing=[[0,0],[612,0],[612,378],[0,378]];
 // Expected coordinates independently use quarter-turn geometry.
 const controls=drawing.map((p,i)=>({id:String(i),drawing:p,building:[10-p[1]*.0254,-20+p[0]*.0254]}));
 const fitted=registerPoints(controls);
 assert.ok(Math.abs(fitted.scale-known.scale)<eps);assert.ok(Math.abs(fitted.angle-known.angle)<eps);assert.ok(fitted.max<eps);
 assert.ok(Math.hypot(...transformPoint([100,50],fitted).map((n,i)=>n-[8.73,-17.46][i]))<eps);
});
test('incompatible controls produce measurable residuals rather than stretching',()=>{
 const points=[{id:'a',drawing:[0,0],building:[0,0]},{id:'b',drawing:[10,0],building:[10,0]},{id:'c',drawing:[0,10],building:[0,12]}];
 assert.ok(registerPoints(points).max>.5);
});
test('underconstrained, degenerate, duplicate and nonfinite controls fail',()=>{
 for(const p of [[],[{id:'a',drawing:[0,0],building:[0,0]}],[0,1,2].map(x=>({id:String(x),drawing:[x,0],building:[x,0]})),[{id:'a',drawing:[0,0],building:[0,0]},{id:'a',drawing:[10,0],building:[10,0]},{id:'c',drawing:[0,10],building:[0,10]}],[{id:'a',drawing:[NaN,0],building:[0,0]},{id:'b',drawing:[10,0],building:[10,0]},{id:'c',drawing:[0,10],building:[0,10]}]])assert.throws(()=>registerPoints(p));
});
test('imperial fractions and metric values preserve independent unit conversions',()=>{
 assert.ok(Math.abs(parseDimension('12\' 7-3/8"')-3.844925)<eps);
 assert.ok(Math.abs(parseDimension('51\' 0"')-15.5448)<eps);assert.ok(Math.abs(parseDimension('9′-1″')-2.7686)<eps);
 assert.equal(parseDimension('12.7 mm'),.0127);assert.equal(parseDimension('3 m'),3);
 for(const s of ['0 m','3','-2 m','NaN m','1\' 1-1/0"','wall instructions'])assert.throws(()=>parseDimension(s));
});
test('model and paper spaces do not double count geometry',()=>{
 const model=line('model',[0,0],[10,0]);const paper={...line('paper',[0,0],[20,0]),isInPaperSpace:true};
 const drawing=normalizeDrawing(db([model,paper],[{name:'*Model_Space',entities:[model]}]));
 assert.equal(drawing.entities.length,1);assert.equal(drawing.modelEntityCount,1);assert.equal(drawing.entities[0].handle,'model');
 assert.equal(normalizeDrawing(db([model,paper])).entities.length,1);
});
test('nested block transforms retain instance identities and inherited layers',()=>{
 const block={name:'chair',basePoint:{x:1,y:1},entities:[line('edge',[1,1],[3,1],'0')]};
 const insert={type:'INSERT',handle:'instance',layer:'A-wall',name:'chair',insertionPoint:{x:10,y:20},xScale:2,yScale:2,rotation:Math.PI/2};
 const drawing=normalizeDrawing(db([insert],[block]));
 assert.equal(drawing.entities[0].layer,'A-wall');assert.equal(drawing.entities[0].id,'model/instance[0,0]/edge');
 const p=drawing.entities[0].points;assert.ok(Math.hypot(p[0][0]-10,p[0][1]-20)<eps);assert.ok(Math.hypot(p[1][0]-10,p[1][1]-24)<eps);
 const nested={name:'outer',basePoint:{x:0,y:0},entities:[insert]};
 const root={...insert,handle:'root',name:'outer',insertionPoint:{x:5,y:5},xScale:1,yScale:1,rotation:0};
 assert.deepEqual(normalizeDrawing(db([root],[block,nested])).entities[0].points,[[15,25],[15,29]]);
});
test('array instances, closed polylines and frozen source layers retain meaning',()=>{
 const block={name:'b',basePoint:{x:0,y:0},entities:[line('e',[0,0],[1,0],'0')]};
 const insert={type:'INSERT',handle:'i',layer:'hidden',name:'b',insertionPoint:{x:0,y:0},columnCount:2,columnSpacing:4,rowCount:1};
 const result=normalizeDrawing(db([insert],[block]));assert.equal(result.entities.length,2);assert.equal(result.entities[1].points[0][0],4);assert.ok(result.entities.every(e=>e.hidden));
 const poly={type:'LWPOLYLINE',handle:'p',layer:'A-wall',flag:1,vertices:[{x:0,y:0},{x:2,y:0},{x:2,y:2}]};assert.equal(normalizeDrawing(db([poly])).entities.length,3);
});
test('unsupported entities, bulges, recursive blocks and invalid coordinates are explicit',()=>{
 const recursive={name:'b',basePoint:{x:0,y:0},entities:[{type:'INSERT',handle:'loop',name:'b',insertionPoint:{x:0,y:0}}]};
 const items=[{type:'INSERT',handle:'i',name:'b',insertionPoint:{x:0,y:0}},{type:'HATCH',handle:'h'},{type:'LWPOLYLINE',handle:'p',flag:0,vertices:[{x:0,y:0,bulge:1},{x:1,y:1}]},line('bad',[NaN,0],[1,0])];
 const result=normalizeDrawing(db(items,[recursive]));assert.equal(result.entities.length,0);assert.ok(result.unsupported.HATCH);assert.ok(result.unsupported['INSERT:recursive block']);assert.ok(result.unsupported['LWPOLYLINE:curved segment']);assert.ok(result.unsupported['LINE:invalid coordinates']);
});
test('source line decisions align framing faces instead of moving the evidence',()=>{
 const drawing=normalizeDrawing(db([line('a',[0,0],[100,0])])),entity=drawing.entities[0];
 const registration={scale:.0254,angle:0,translation:[0,0],residuals:[],rms:0,max:0};
 const source={id:'sha',name:'test.dwg',bytes:100,sha256:'sha',lastModified:0,version:'AC1032',decoder:'test'};
 const d={entityId:entity.id,reference:'exterior-face',reverse:false,height:2.7686,assemblyId:buttsExterior.id,status:'proposed'};
 const wall=wallFromDecision(entity,d,registration,source,.1397);
 assert.equal(wall.start[1],.06985);assert.equal(wall.end[0],2.54);assert.equal(wall.evidenceIds[0],'sha:model/a');
 // Exterior sheathing's interior edge must coincide with the governing source face Y=0.
 const panel=generateWall(wall,buttsExterior,[]).find(p=>p.layer==='sheathing');
 assert.ok(Math.abs(panel.center[1]+panel.size[1]/2)<eps);
 assert.deepEqual(entity.points,[[0,0],[100,0]]);
 assert.equal(wallFromDecision(entity,{...d,reference:'interior-face'},registration,source,.1397).start[1],-.06985);
 assert.equal(wallFromDecision(entity,{...d,reverse:true},registration,source,.1397).start[1],-.06985);
});
test('ambiguous curves and invalid wall parameters cannot become accepted geometry',()=>{
 const e={id:'e',handle:'e',layer:'A-wall',type:'ARC',points:[[0,0],[10,0]],straight:false,hidden:false,sourcePath:'e'};
 const d={entityId:'e',reference:'centerline',reverse:false,height:2.7,assemblyId:'a',status:'proposed'};
 const r={scale:1,angle:0,translation:[0,0],residuals:[],rms:0,max:0};const source={id:'sha'};
 assert.throws(()=>wallFromDecision(e,d,r,source,.1397));assert.throws(()=>wallFromDecision({...e,straight:true},{...d,height:NaN},r,source,.1397));assert.throws(()=>wallFromDecision({...e,straight:true},d,{...r,scale:NaN},source,.1397));
});

test('wall interpretation cannot escape its registered source region',()=>{
 const entity=normalizeDrawing(db([line('a',[0,0],[100,0])])).entities[0];
 const decision={entityId:entity.id,reference:'centerline',reverse:false,height:2.7,assemblyId:buttsExterior.id,status:'proposed'};
 const r={scale:.0254,angle:0,translation:[0,0],residuals:[],rms:0,max:0};
 assert.throws(()=>wallFromDecision(entity,decision,r,{id:'source'},.1397,{min:[0,0],max:[50,50]}),/outside/);
});
