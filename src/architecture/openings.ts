import { generateWall, type Wall, type WallAssembly } from './assemblies.js';
import { parseDimension } from './drawings.js';
export type HostedOpening = { id: string; hostEntityId: string; kind: 'door' | 'window'; offsetText: string; widthText: string; sillText: string; headText: string; sourceLabel: string; status: 'proposed' };
const dimension = (text: string, zero=false) => zero && /^0\s*(m|mm|cm|"|')$/.test(text.trim()) ? 0 : parseDimension(text);
export function openingHole(o: HostedOpening) {
  return {id:o.id,offset:dimension(o.offsetText),width:dimension(o.widthText),sill:dimension(o.sillText,true),head:dimension(o.headText)};
}
/** Explicit void proposals; windows, doors and structural products remain separate future objects. */
export function validateHostedOpenings(value: unknown, hosts: { entityId: string; wall: Wall; assembly: WallAssembly }[]): HostedOpening[] {
  if(!Array.isArray(value)||value.length>1000)throw new Error('Invalid hosted openings');
  const openings=value.map(v=>{
    if(!v||typeof v!=='object')throw new Error('Invalid opening record');
    const o=v as HostedOpening;
    if(typeof o.id!=='string'||!o.id||!['door','window'].includes(o.kind)||o.status!=='proposed'||typeof o.sourceLabel!=='string'||!o.sourceLabel.trim()||o.sourceLabel.length>500||[o.offsetText,o.widthText,o.sillText,o.headText].some(s=>typeof s!=='string'||s.length>200))throw new Error('Invalid opening evidence');
    const host=hosts.find(h=>h.entityId===o.hostEntityId);if(!host)throw new Error('Opening requires an accepted host wall');
    const hole=openingHole(o);
    if(o.kind==='door'&&hole.sill!==0)throw new Error('Door void must start at the floor');
    if(o.kind==='window'&&hole.sill<=0)throw new Error('Window sill must be above the floor');
    return {id:o.id,hostEntityId:o.hostEntityId,kind:o.kind,offsetText:o.offsetText,widthText:o.widthText,sillText:o.sillText,headText:o.headText,sourceLabel:o.sourceLabel,status:o.status};
  });
  if(new Set(openings.map(o=>o.id)).size!==openings.length)throw new Error('Duplicate opening identities');
  for(const host of hosts)generateWall(host.wall,host.assembly,openings.filter(o=>o.hostEntityId===host.entityId).map(openingHole));
  return openings;
}
