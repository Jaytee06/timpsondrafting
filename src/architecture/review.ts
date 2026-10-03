import { normalizeDrawing, wallFromDecision, type SourceMetadata, type WallDecision } from './drawings.js';
import { registerPoints, type ControlPoint } from './registration.js';
import { buttsExterior, generateWall, drawingAssemblies, drawingAssembly } from './assemblies.js';
import { validateDimensions, checkDimensions, type DimensionEvidence } from './dimensions.js';
import { validateHostedOpenings, type HostedOpening } from './openings.js';
import { validateFinishes, type FinishChoice } from './finishes.js';
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid review object');
  return v as Record<string, unknown>;
};
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export type PdfReference = { name: string; sha256: string; bytes: number; lastModified: number };
export type ReviewInput = { source: SourceMetadata; database: unknown; decoderWarnings: string[]; controlPoints: ControlPoint[]; registrationAccepted: boolean; toleranceMetres: number; decisions: WallDecision[]; pdfReference: PdfReference | null; dimensions?: DimensionEvidence[]; openings?: HostedOpening[]; finishes?: FinishChoice[] };
const metadata = (v: unknown) => {
  const m=object(v);
  if(typeof m.name!=='string'||!m.name||typeof m.sha256!=='string'||!/^[a-f0-9]{64}$/.test(m.sha256)||!finite(m.bytes)||!Number.isInteger(m.bytes)||m.bytes<=0||!finite(m.lastModified)||m.lastModified<0)throw new Error('Invalid source metadata');
  return m;
};
/** Rebuild derived geometry; imported transforms and meshes never become authoritative. */
export function restoreReview(value: unknown) {
  const v=object(value);
  if(v.schemaVersion!==1&&v.schemaVersion!==2&&v.schemaVersion!==3&&v.schemaVersion!==4&&v.schemaVersion!==5)throw new Error('Unsupported source review version');
  const s=metadata(v.source);
  if(s.id!==s.sha256||typeof s.version!=='string'||!/^AC\d{4}$/.test(s.version)||typeof s.decoder!=='string'||!s.decoder)throw new Error('Invalid DWG source identity');
  const source=s as SourceMetadata;
  if(!Array.isArray(v.decoderWarnings)||v.decoderWarnings.some(w=>typeof w!=='string'))throw new Error('Invalid decoder warnings');
  const drawing=normalizeDrawing(v.database);
  if(!drawing.entities.length)throw new Error('Review contains no supported geometry');
  if(!Array.isArray(v.controlPoints)||v.controlPoints.length>20)throw new Error('Invalid control points');
  const controlPoints=v.controlPoints.map(item=>{
    const p=object(item);
    if(typeof p.id!=='string'||!p.id||![p.drawing,p.building].every(a=>Array.isArray(a)&&a.length===2&&a.every(finite)))throw new Error('Invalid control point');
    return {id:p.id,drawing:p.drawing,building:p.building} as ControlPoint;
  });
  if(new Set(controlPoints.map(p=>p.id)).size!==controlPoints.length)throw new Error('Duplicate control identities');
  if(!finite(v.toleranceMetres)||v.toleranceMetres<=0||v.toleranceMetres>.1||typeof v.registrationAccepted!=='boolean')throw new Error('Invalid registration acceptance');
  let registration=null;
  try {registration=registerPoints(controlPoints);}catch(e){if(v.registrationAccepted)throw e;}
  if(v.registrationAccepted&&(!registration||registration.max>v.toleranceMetres))throw new Error('Accepted registration exceeds residual tolerance');
  const scope=controlPoints.length?{min:[0,1].map(i=>Math.min(...controlPoints.map(p=>p.drawing[i]))) as [number,number],max:[0,1].map(i=>Math.max(...controlPoints.map(p=>p.drawing[i]))) as [number,number]}:undefined;
  const dimensions=validateDimensions((v.schemaVersion===3||v.schemaVersion===4||v.schemaVersion===5)?v.dimensions:[],drawing,source.id);
  if(v.registrationAccepted&&checkDimensions(dimensions,drawing,registration,v.toleranceMetres,scope).some(d=>d.conflict))throw new Error('Confirmed written dimensions conflict with registration');
  if(!Array.isArray(v.decisions)||v.decisions.length>10000)throw new Error('Invalid wall decisions');
  if(v.decisions.length&&!v.registrationAccepted)throw new Error('Wall decisions require accepted registration');
  // Assembly definitions are evidence, but this implementation only supports its current study recipe.
  if(JSON.stringify(v.assemblies)!==JSON.stringify((v.schemaVersion===4||v.schemaVersion===5)?drawingAssemblies:[buttsExterior]))throw new Error('Review uses an unsupported or changed wall assembly');
  const decisions=v.decisions.map(item=>{
    const d=object(item);
    if(typeof d.entityId!=='string'||!['centerline','exterior-face','interior-face'].includes(String(d.reference))||typeof d.reverse!=='boolean'||!finite(d.height)||!((v.schemaVersion===4||v.schemaVersion===5)?drawingAssemblies:[buttsExterior]).some(a=>a.id===d.assemblyId)||d.status!=='accepted')throw new Error('Invalid wall decision');
    return {...d} as WallDecision;
  });
  if(new Set(decisions.map(d=>d.entityId)).size!==decisions.length)throw new Error('Duplicate wall decisions');

  const walls=decisions.map(d=>{
    const entity=drawing.entities.find(e=>e.id===d.entityId);
    if(!entity||!registration)throw new Error('Wall decision references missing evidence');
    const wall=wallFromDecision(entity,d,registration,source,drawingAssembly(d.assemblyId).framingDepth.metres,scope);
    generateWall(wall,drawingAssembly(d.assemblyId),[]);return wall;
  });
  const openings=validateHostedOpenings((v.schemaVersion===4||v.schemaVersion===5)?v.openings:[],decisions.map((d,i)=>({entityId:d.entityId,wall:walls[i],assembly:drawingAssembly(d.assemblyId)})));
  const finishes=validateFinishes(v.schemaVersion===5?v.finishes:[],decisions.map((d,i)=>({entityId:d.entityId,wall:walls[i]})),openings);
  const pdfReference=v.pdfReference==null?null:metadata(v.pdfReference) as PdfReference;
  return {finishes,openings,dimensions,source,database:v.database,drawing,decoderWarnings:v.decoderWarnings as string[],controlPoints,registration,registrationAccepted:v.registrationAccepted,toleranceMetres:v.toleranceMetres,decisions,walls,pdfReference};
}
export function createReview(input: ReviewInput) {
  const validated=restoreReview({...input,schemaVersion:5,finishes:input.finishes??[],dimensions:input.dimensions??[],openings:input.openings??[],assemblies:drawingAssemblies});
  return {...input,schemaVersion:5,finishes:validated.finishes,openings:validated.openings,dimensions:validated.dimensions,registration:validated.registration,assemblies:drawingAssemblies,walls:validated.walls};
}
