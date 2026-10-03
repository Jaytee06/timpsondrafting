import { transformPoint, type Registration, type Point2 } from './registration.js';
import { type Wall } from './assemblies.js';
export type DrawingEntity = { id: string; handle: string; layer: string; type: string; points: Point2[]; straight: boolean; hidden: boolean; sourcePath: string };
export type Drawing = { entities: DrawingEntity[]; layers: { name: string; hidden: boolean }[]; unitCode: number; unsupported: Record<string, number>; warnings: string[]; modelEntityCount: number; blockCount: number };
export type SourceMetadata = { id: string; name: string; bytes: number; sha256: string; lastModified: number; version: string; decoder: string };
export type WallDecision = { entityId: string; reference: 'centerline' | 'exterior-face' | 'interior-face'; reverse: boolean; height: number; assemblyId: string; status: 'proposed' | 'accepted' };
type RecordValue = Record<string, unknown>;
const record = (v: unknown): RecordValue => v !== null && typeof v === 'object' ? v as RecordValue : {};
const array = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const num = (v: unknown, fallback = 0) => typeof v === 'number' ? v : fallback;
const pt = (v: unknown): Point2 => { const p=record(v);return [num(p.x,NaN),num(p.y,NaN)]; };
type Affine = [number,number,number,number,number,number];
const identity: Affine = [1,0,0,1,0,0];
const apply = (p: Point2,t: Affine): Point2 => [t[0]*p[0]+t[2]*p[1]+t[4],t[1]*p[0]+t[3]*p[1]+t[5]];
const compose = (a: Affine,b: Affine): Affine => [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];

/** Keep decoded database separately; this subset is evidence for inspection, not a building. */
export function normalizeDrawing(input: unknown): Drawing {
  const db=record(input),tables=record(db.tables),blocks=array(record(tables.BLOCK_RECORD).entries).map(record);
  if (!Array.isArray(db.entities) || !db.tables) throw new Error('Invalid decoded drawing database');
  const layerEntries=array(record(tables.LAYER).entries).map(record);
  const layers=layerEntries.map(l=>({name:String(l.name),hidden:!!(l.off||l.frozen)}));
  const blockMap=new Map(blocks.map(b=>[String(b.name),b]));
  const entities: DrawingEntity[]=[],unsupported: Record<string,number>={},warnings: string[]=[];
  const note = (key:string) => {unsupported[key]=(unsupported[key]||0)+1;};
  let visited=0;
  const walk = (items: unknown[],t: Affine,path:string,inherited='0',ancestors: string[]=[],parentHidden=false) => {
    for(let i=0;i<items.length;i++){
      if (++visited>100000) throw new Error('Drawing exceeds 100,000 inspected entities');
      const e=record(items[i]),type=String(e.type),handle=String(e.handle??`index-${i}`),id=`${path}/${handle}`;
      const layer=String(e.layer??'0')==='0' ? inherited : String(e.layer);
      const hidden=parentHidden||e.isVisible===false||!!layers.find(l=>l.name===layer)?.hidden;
      const extrusion=record(e.extrusionDirection);
      if (num(extrusion.x)!==0 || num(extrusion.y)!==0 || ![0,1].includes(num(extrusion.z,1))) {note(`${type}:non-planar OCS`);continue;}
      const push=(points:Point2[],straight:boolean,suffix='')=>{
        if(points.some(p=>p.some(n=>!Number.isFinite(n)))){note(`${type}:invalid coordinates`);return;}
        entities.push({id:id+suffix,handle,layer,type,points:points.map(p=>apply(p,t)),straight,hidden,sourcePath:id});
      };
      if(type==='INSERT'){
        const name=String(e.name),block=blockMap.get(name);
        if(!block||ancestors.includes(name)||ancestors.length>=24){note(`INSERT:${!block?'missing block':'recursive block'}`);continue;}
        if (num(block.flags)&12) {note('INSERT:external reference');continue;}
        const origin=pt(e.insertionPoint),base=pt(block.basePoint),angle=num(e.rotation),sx=num(e.xScale,1),sy=num(e.yScale,1);
        if(![...origin,...base,angle,sx,sy].every(Number.isFinite)||sx===0||sy===0){note('INSERT:invalid transform');continue;}
        const c=Math.cos(angle),s=Math.sin(angle),cols=Math.max(1,num(e.columnCount,1)),rows=Math.max(1,num(e.rowCount,1));
        if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows*cols>1000){note('INSERT:unsupported array size');continue;}
        for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
          const matrix: Affine=[c*sx,s*sx,-s*sy,c*sy,origin[0]-c*sx*base[0]+s*sy*base[1]+c*col*num(e.columnSpacing)-s*row*num(e.rowSpacing),origin[1]-s*sx*base[0]-c*sy*base[1]+s*col*num(e.columnSpacing)+c*row*num(e.rowSpacing)];
          walk(array(block.entities),compose(t,matrix),`${id}[${row},${col}]`,layer,[...ancestors,name],hidden);
        }
      }else if(type==='LINE'){
        if(Math.abs(num(record(e.startPoint).z)-num(record(e.endPoint).z))>1e-8){note('LINE:non-horizontal');continue;}
        const a=pt(e.startPoint),b=pt(e.endPoint);if([...a,...b].some(n=>!Number.isFinite(n))){note('LINE:invalid coordinates');continue;}if(Math.hypot(a[0]-b[0],a[1]-b[1])>1e-9)push([a,b],true);
      }else if(type==='LWPOLYLINE'){
        const vertices=array(e.vertices).map(record),closed=(num(e.flag)&1)!==0;
        for(let k=0;k<vertices.length-(closed?0:1);k++){
          const a=pt(vertices[k]),b=pt(vertices[(k+1)%vertices.length]),bulge=num(vertices[k].bulge);
          if([...a,...b,bulge].some(n=>!Number.isFinite(n))){note('LWPOLYLINE:invalid coordinates');continue;}
          if(Math.abs(bulge)>1e-12){note('LWPOLYLINE:curved segment');continue;}
          if(Math.hypot(a[0]-b[0],a[1]-b[1])>1e-9)push([a,b],true,`/edge-${k}`);
        }
      }else if(type==='ARC'||type==='CIRCLE'){
        const center=pt(e.center),radius=num(e.radius),start=type==='CIRCLE'?0:num(e.startAngle),end=type==='CIRCLE'?Math.PI*2:num(e.endAngle);
        let span=end-start;while(span<=0)span+=Math.PI*2;
        if(!Number.isFinite(span)||radius<=0||span>Math.PI*2+1e-8){note(`${type}:invalid arc`);continue;}
        push(Array.from({length:65},(_,j)=>[center[0]+radius*Math.cos(start+span*j/64),center[1]+radius*Math.sin(start+span*j/64)] as Point2),false);
      }else note(type);
    }
  };
  // Prefer the explicit model-space block. Do not combine its entities with database.entities.
  const model=blocks.find(b=>String(b.name).toLowerCase()==='*model_space');
  const root=model?array(model.entities):array(db.entities).filter(e=>!record(e).isInPaperSpace);
  walk(root,identity,'model');
  for(const e of entities)if(!layers.some(l=>l.name===e.layer))layers.push({name:e.layer,hidden:false});
  if(Object.keys(unsupported).length)warnings.push('Some decoded entity types are retained in the database but not drawn in this preview.');
  if(new Set(entities.map(e=>e.id)).size!==entities.length)throw new Error('Decoded source contains duplicate entity identities');
  return {entities,layers,unitCode:num(record(db.header).INSUNITS),unsupported,warnings,modelEntityCount:root.length,blockCount:blocks.length};
}
export const drawingUnits: Record<number,{label:string;metres:number}> = {1:{label:'inches',metres:.0254},2:{label:'feet',metres:.3048},4:{label:'millimetres',metres:.001},5:{label:'centimetres',metres:.01},6:{label:'metres',metres:1}};
export function parseDimension(text:string):number {
  const clean=text.trim().replace(/[′’]/g,"'").replace(/[″“”]/g,'"');
  const metric=clean.match(/^(\d+(?:\.\d+)?)\s*(m|mm|cm)$/i);
  if(metric){const n=Number(metric[1])*({m:1,mm:.001,cm:.01}[metric[2].toLowerCase()]!);if(!Number.isFinite(n)||n<=0)throw new Error('Dimension must be positive');return n;}
  const imperial=clean.match(/^(?:(\d+(?:\.\d+)?)\s*'\s*-?\s*)?(?:(\d+(?:\.\d+)?)(?:[- ](\d+)\/(\d+))?\s*"?)?$/);
  if(!imperial||(!imperial[1]&&!imperial[2])||(!clean.includes("'")&&!clean.includes('"')))throw new Error('Enter metres with m, or feet/inches such as 12\' 7-3/8"');
  const fraction=imperial[3]?Number(imperial[3])/Number(imperial[4]):0;
  if(!Number.isFinite(fraction))throw new Error('Invalid fraction');
  const metres=(Number(imperial[1]??0)*12+Number(imperial[2]??0)+fraction)*.0254;
  if(!Number.isFinite(metres)||metres<=0)throw new Error('Dimension must be positive');
  return metres;
}
export function wallFromDecision(entity:DrawingEntity,decision:WallDecision,registration:Registration,source:SourceMetadata,framingDepth:number, scope?: { min: Point2; max: Point2 }):Wall {
  if(scope && entity.points.some(p=>p.some((n,i)=>n<scope.min[i]-1e-7 || n>scope.max[i]+1e-7)))throw new Error('Source segment lies outside the registered control region');
  if(!['centerline','exterior-face','interior-face'].includes(decision.reference))throw new Error('Choose a supported framing reference');
  if(entity.id!==decision.entityId||!entity.straight||entity.points.length!==2)throw new Error('Select a straight source segment');
  if(!Number.isFinite(decision.height)||decision.height<2.2||decision.height>10||!Number.isFinite(framingDepth)||framingDepth<=0)throw new Error('Invalid wall dimensions');
  if(!Number.isFinite(registration.scale)||registration.scale<=0||!Number.isFinite(registration.angle)||registration.translation.some(n=>!Number.isFinite(n)))throw new Error('Invalid registration');
  const points=entity.points.map(p=>transformPoint(p,registration));if(decision.reverse)points.reverse();
  const [a,b]=points,length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!Number.isFinite(length)||length<.1||length>100)throw new Error('Wall length must be between 0.1 and 100 m');
  const normal:Point2=[(b[1]-a[1])/length,-(b[0]-a[0])/length];
  const offset=decision.reference==='exterior-face'?-framingDepth/2:decision.reference==='interior-face'?framingDepth/2:0;
  return {id:`${source.id}:${entity.id}:wall`,start:[a[0]+offset*normal[0],a[1]+offset*normal[1],0],end:[b[0]+offset*normal[0],b[1]+offset*normal[1],0],height:decision.height,assemblyId:decision.assemblyId,evidenceIds:[`${source.id}:${entity.id}`]};
}
