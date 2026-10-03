import { parseDimension, type Drawing } from './drawings.js';
import { type Registration } from './registration.js';
export type DimensionEvidence = { id: string; entityId: string; original: string; sourceLabel: string; sourceId: string; status: 'proposed' | 'confirmed' | 'disputed' };
/** Written dimensions remain distinct from lengths measured from preview geometry. */
export function validateDimensions(value: unknown, drawing: Drawing, sourceId: string): DimensionEvidence[] {
  if(!Array.isArray(value)||value.length>1000)throw new Error('Invalid dimension evidence');
  const dimensions=value.map(v=>{
    if(!v||typeof v!=='object')throw new Error('Invalid dimension evidence');
    const d=v as DimensionEvidence;
    if(typeof d.id!=='string'||!d.id||typeof d.original!=='string'||d.original.length>200||typeof d.sourceLabel!=='string'||!d.sourceLabel.trim()||d.sourceLabel.length>500||d.sourceId!==sourceId||!['proposed','confirmed','disputed'].includes(d.status))throw new Error('Invalid dimension provenance');
    parseDimension(d.original);
    const entity=drawing.entities.find(e=>e.id===d.entityId);
    if(!entity||!entity.straight||entity.points.length!==2)throw new Error('Dimension must reference a straight source segment');
    return {id:d.id,entityId:d.entityId,original:d.original,sourceLabel:d.sourceLabel,sourceId:d.sourceId,status:d.status};
  });
  if(new Set(dimensions.map(d=>d.id)).size!==dimensions.length)throw new Error('Duplicate dimension identities');
  return dimensions;
}
export function checkDimensions(dimensions: DimensionEvidence[], drawing: Drawing, registration: Registration | null, tolerance: number, scope?: { min: [number,number]; max: [number,number] }) {
  return dimensions.map(d=>{
    const entity=drawing.entities.find(e=>e.id===d.entityId)!;
    const writtenMetres=parseDimension(d.original);
    const measuredMetres=registration?Math.hypot(entity.points[1][0]-entity.points[0][0],entity.points[1][1]-entity.points[0][1])*registration.scale:null;
    const difference=measuredMetres===null?null:measuredMetres-writtenMetres;
    const outsideRegion=!!scope&&entity.points.some(p=>p.some((n,i)=>n<scope.min[i]-1e-7||n>scope.max[i]+1e-7));
    return {...d,outsideRegion,writtenMetres,measuredMetres,difference,conflict:d.status==='confirmed'&&(outsideRegion||(difference!==null&&Math.abs(difference)>tolerance))};
  });
}
