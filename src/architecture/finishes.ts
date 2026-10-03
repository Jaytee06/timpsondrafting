import { drawingAssembly, generateWall, type WallAssembly, type Wall } from './assemblies.js';
import { parseDimension } from './drawings.js';
import { openingHole, type HostedOpening } from './openings.js';
export type FinishChoice = { hostEntityId: string; layerId: 'gypsum' | 'siding'; side: 'interior' | 'exterior'; thicknessText: string; appearance: { label: string; color: string; roughness: number }; note: string };
export const finishKey = (f: Pick<FinishChoice,'hostEntityId'|'layerId'|'side'>) => `${f.hostEntityId}/${f.layerId}/${f.side}`;
/** The base recipe remains evidence. Authored overrides change only surface panels. */
export function resolveFinishes(assembly: WallAssembly, entityId: string, choices: FinishChoice[]): WallAssembly {
  return {...assembly,layers:assembly.layers.map(layer=>{
    const choice=choices.find(f=>f.hostEntityId===entityId&&f.layerId===layer.id&&f.side===layer.side);
    return choice?{...layer,thickness:{metres:parseDimension(choice.thicknessText),original:choice.thicknessText,status:'assumed' as const,source:`Designer finish proposal: ${choice.note}`}}:layer;
  })};
}
export function validateFinishes(value: unknown, hosts: {entityId:string;wall:Wall}[], openings:HostedOpening[]):FinishChoice[] {
  if(!Array.isArray(value)||value.length>2000)throw new Error('Invalid finish choices');
  const choices=value.map(v=>{
    if(!v||typeof v!=='object')throw new Error('Invalid finish choice');
    const f=v as FinishChoice,host=hosts.find(h=>h.entityId===f.hostEntityId);
    if(!host)throw new Error('Finish choice requires an accepted host wall');
    if(!['gypsum','siding'].includes(f.layerId)||!['interior','exterior'].includes(f.side)||typeof f.thicknessText!=='string'||f.thicknessText.length>200||typeof f.note!=='string'||!f.note.trim()||f.note.length>500)throw new Error('Invalid finish proposal');
    const layer=drawingAssembly(host.wall.assemblyId).layers.find(l=>l.id===f.layerId&&l.side===f.side);
    if(!layer)throw new Error('Finish layer is absent from the host assembly');
    const thickness=parseDimension(f.thicknessText);
    if(thickness<.001||thickness>.1)throw new Error('Finish panel thickness must be between 1 and 100 mm');
    if(!f.appearance||typeof f.appearance.label!=='string'||!f.appearance.label.trim()||f.appearance.label.length>100||typeof f.appearance.color!=='string'||!/^#[0-9a-f]{6}$/i.test(f.appearance.color)||!Number.isFinite(f.appearance.roughness)||f.appearance.roughness<0||f.appearance.roughness>1)throw new Error('Invalid finish appearance');
    return {hostEntityId:f.hostEntityId,layerId:f.layerId,side:f.side,thicknessText:f.thicknessText,note:f.note,appearance:{...f.appearance}};
  });
  if(new Set(choices.map(finishKey)).size!==choices.length)throw new Error('Duplicate finish targets');
  for(const host of hosts)generateWall(host.wall,resolveFinishes(drawingAssembly(host.wall.assemblyId),host.entityId,choices),openings.filter(o=>o.hostEntityId===host.entityId).map(openingHole));
  return choices;
}
