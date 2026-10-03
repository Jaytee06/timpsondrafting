import { openings, validate, type Project } from './model.js';

export type Vec3 = [number, number, number];
export type Layer = 'framing' | 'cavity' | 'gypsum' | 'sheathing' | 'membrane' | 'siding';
export type SourceValue = { metres: number; original: string; status: 'documented' | 'assumed'; source: string };
export type WallAssembly = {
  id: string;
  label: string;
  framingDepth: SourceValue;
  studWidth: SourceValue;
  spacing: SourceValue;
  layers: { id: Layer; label: string; thickness: SourceValue; side: 'interior' | 'exterior'; solid: boolean }[];
  unresolved: string[];
};
export type Wall = { id: string; start: Vec3; end: Vec3; height: number; assemblyId: string; evidenceIds: string[] };
export type Component = { id: string; owner: string; assemblyId: string; layer: Layer; role: string; status: 'documented-layout' | 'proposal'; surfaceSide?: 'interior' | 'exterior'; center: Vec3; size: Vec3; rotation: number };
export const layerColors: Record<Layer, string> = { framing: '#c69c65', cavity: '#93c5fd', gypsum: '#eee8dc', sheathing: '#a07847', membrane: '#60a5fa', siding: '#7c9b91' };
const inch = .0254;
const value = (inches: number, original: string, status: SourceValue['status'], source: string): SourceValue => ({ metres: inches * inch, original, status, source });
export const buttsExterior: WallAssembly = {
  id: 'butts-exterior-study-v1', label: 'Butts exterior wall study',
  framingDepth: value(5.5, '2×6 nominal; 5½ in modeled depth', 'assumed', 'Sheet 5 / B specifies nominal 2×6; actual dressed size assumed'),
  studWidth: value(1.5, '1½ in dressed member width', 'assumed', 'Dressed lumber assumption'),
  spacing: value(16, '16 in O.C.', 'documented', 'Sheet 5 / B'),
  layers: [
    { id: 'gypsum', label: 'Interior gypsum', thickness: value(.5, '½ in gypsum board', 'documented', 'Sheet 5 / B'), side: 'interior', solid: true },
    { id: 'sheathing', label: 'Exterior sheathing', thickness: value(7 / 16, '7⁄16 in OSB/plywood', 'documented', 'Sheet 5 / B'), side: 'exterior', solid: true },
    { id: 'membrane', label: 'Barrier (schematic)', thickness: value(.02, '0.02 in display proxy', 'assumed', 'Sheet 5 / B labels vapor barrier; thickness and exact placement unresolved'), side: 'exterior', solid: false },
    { id: 'siding', label: 'Siding (thickness proposal)', thickness: value(.75, '¾ in placeholder thickness', 'assumed', 'Sheet 4 and 5 specify vertical batt n’ board; thickness unresolved'), side: 'exterior', solid: true },
  ],
  unresolved: ['Structural header sizing and connections require structural drawings.', 'Opening dimensions are clear voids in this study; rough-opening allowances are unresolved.', 'Double top plate and jamb/header arrangement are layout proposals.', 'R-19 is documented; insulation product and exact fit remain unresolved.', 'Corner junctions, sheet joints, fasteners, trim and window/door assemblies are not generated yet.', 'Barrier placement and siding thickness require confirmation.'],
};
/** Generic partition proposal, not evidence of the Butts interior wall specification. */
export const interiorPartition: WallAssembly = {
  id: 'interior-partition-proposal-v1', label: 'Interior 2×4 partition proposal',
  framingDepth: value(3.5, '2×4 nominal; 3½ in modeled depth', 'assumed', 'Generic partition proposal; verify wall schedule'),
  studWidth: value(1.5, '1½ in member width', 'assumed', 'Generic dressed lumber assumption'),
  spacing: value(16, '16 in O.C.', 'assumed', 'Generic layout proposal'),
  layers: [
    {id:'gypsum',label:'Interior gypsum',thickness:value(.5,'½ in gypsum board','assumed','Generic partition proposal'),side:'interior',solid:true},
    {id:'gypsum',label:'Opposite gypsum',thickness:value(.5,'½ in gypsum board','assumed','Generic partition proposal'),side:'exterior',solid:true},
  ],
  unresolved: ['Interior wall specification is unverified.', 'Load bearing status, fire/acoustic requirements and connections are unresolved.', 'Headers and rough-opening allowances remain proposals.'],
};
export const drawingAssemblies = [buttsExterior, interiorPartition];
export function drawingAssembly(id: string): WallAssembly {
  const assembly=drawingAssemblies.find(a=>a.id===id);
  if(!assembly)throw new Error('Unsupported wall assembly');return assembly;
}
export const buttsStudy: Project = {
  schemaVersion: 1, revision: 0, width: 4, depth: 3, height: 109 * inch, thickness: 5.5 * inch, pitch: .25,
  evidence: [{ id: 'study-span', original: '4 m × 3 m study spans (not house dimensions)', metres: 4, status: 'fixture' }, { id: 'butts-wall-height', original: '9′-1″ typical wall height — Sheet 3 notes / Sheet 5 B', metres: 109 * inch, status: 'confirmed', field: 'height' }],
};

/** Local u follows wall, v points outward; framing centerline is fixed at v=0. */
export function wallFrame(wall: Wall) {
  const dx = wall.end[0] - wall.start[0], dy = wall.end[1] - wall.start[1];
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length <= 0 || wall.end[2] !== wall.start[2]) throw new Error('Wall must have a nonzero horizontal reference line');
  const angle = Math.atan2(dy, dx);
  return { length, angle, point: (u: number, v: number, z: number): Vec3 => [wall.start[0] + u * dx / length + v * dy / length, wall.start[1] + u * dy / length - v * dx / length, wall.start[2] + z] };
}
export function studyWalls(p: Project): Wall[] {
  return [
    { id: 'wall-front', start: [0, 0, 0], end: [p.width, 0, 0], height: p.height, assemblyId: buttsExterior.id, evidenceIds: ['butts-wall-height'] },
    { id: 'wall-left', start: [0, p.depth, 0], end: [0, 0, 0], height: p.height, assemblyId: buttsExterior.id, evidenceIds: ['butts-wall-height'] },
  ];
}
export function generateWall(wall: Wall, assembly: WallAssembly, holes: { id: string; offset: number; width: number; sill: number; head: number }[]): Component[] {
  if (wall.assemblyId !== assembly.id) throw new Error('Wall assembly reference mismatch');
  const frame = wallFrame(wall), length = frame.length, height = wall.height;
  const depth = assembly.framingDepth.metres, stud = assembly.studWidth.metres, spacing = assembly.spacing.metres;
  if (![height, depth, stud, spacing].every(n => Number.isFinite(n) && n > 0) || height <= 3 * stud || spacing <= stud) throw new Error('Invalid framing parameters');
  const sorted = [...holes].sort((a, b) => a.offset - b.offset);
  for (let i = 0; i < sorted.length; i++) {
    const h = sorted[i];
    if (![h.offset, h.width, h.sill, h.head].every(Number.isFinite) || h.offset < stud || h.width <= 0 || h.offset + h.width > length - stud || h.sill < 0 || h.head <= h.sill || h.head > height - 3 * stud || (i && sorted[i-1].offset + sorted[i-1].width + 2 * stud > h.offset)) throw new Error('Opening does not fit wall framing');
  }
  const parts: Component[] = [];
  const add = (id: string, layer: Layer, role: string, u0: number, u1: number, v0: number, v1: number, z0: number, z1: number, status: Component['status'] = 'proposal') => {
    if (u1 > u0 && v1 > v0 && z1 > z0) parts.push({ id: `${wall.id}/${id}`, owner: wall.id, assemblyId: assembly.id, layer, role, status, center: frame.point((u0+u1)/2, (v0+v1)/2, (z0+z1)/2), size: [u1-u0, v1-v0, z1-z0], rotation: frame.angle });
  };
  // Surface panels partition around holes; panels and empty cavities remain distinct objects.
  const panels = (prefix: string, layer: Layer, v0: number, v1: number, status: Component['status']) => {
    let cursor = 0;
    for (const h of sorted) {
      add(`${prefix}/${h.id}/before`, layer, 'panel', cursor, h.offset, v0, v1, 0, height, status);
      add(`${prefix}/${h.id}/below`, layer, 'panel', h.offset, h.offset+h.width, v0, v1, 0, h.sill, status);
      add(`${prefix}/${h.id}/above`, layer, 'panel', h.offset, h.offset+h.width, v0, v1, h.head, height, status);
      cursor = h.offset+h.width;
    }
    add(`${prefix}/end`, layer, 'panel', cursor, length, v0, v1, 0, height, status);
  };
  let inside = -depth / 2, outside = depth / 2;
  for (const layer of assembly.layers) {
    const t = layer.thickness.metres;
    if (!Number.isFinite(t) || t <= 0) throw new Error('Invalid layer thickness');
    const v0 = layer.side === 'interior' ? inside - t : outside;
    const v1 = layer.side === 'interior' ? inside : outside + t;
    const panelStart=parts.length;
    panels(assembly.layers.filter(l=>l.id===layer.id).length>1?`${layer.id}-${layer.side}`:layer.id, layer.id, v0, v1, layer.thickness.status === 'documented' ? 'documented-layout' : 'proposal');
    for(const component of parts.slice(panelStart))component.surfaceSide=layer.side;
    if (layer.side === 'interior') inside -= t; else outside += t;
  }
  // Plates; door voids interrupt the bottom plate.
  let bottomCursor = 0;
  for (const h of sorted.filter(h => h.sill === 0)) { add(`plate/bottom/${h.id}`, 'framing', 'bottom plate', bottomCursor, h.offset, -depth/2, depth/2, 0, stud); bottomCursor = h.offset + h.width; }
  add('plate/bottom/end', 'framing', 'bottom plate', bottomCursor, length, -depth/2, depth/2, 0, stud);
  add('plate/top/1', 'framing', 'top plate', 0, length, -depth/2, depth/2, height-2*stud, height-stud);
  add('plate/top/2', 'framing', 'top plate', 0, length, -depth/2, depth/2, height-stud, height);
  const strips: { id: string; u0: number; u1: number }[] = [{ id: 'end/start', u0: 0, u1: stud }, { id: 'end/finish', u0: length-stud, u1: length }];
  sorted.forEach(h => { strips.push({ id: `${h.id}/jamb-left`, u0: h.offset-stud, u1: h.offset }, { id: `${h.id}/jamb-right`, u0: h.offset+h.width, u1: h.offset+h.width+stud }); });
  for (let index = 1; index * spacing < length; index++) {
    const u0 = index * spacing-stud/2, u1 = u0+stud;
    if (u0 <= stud || u1 >= length-stud || strips.some(s => u0 < s.u1 && u1 > s.u0)) continue;
    strips.push({ id: `grid/${index}`, u0, u1 });
  }
  for (const s of strips) {
    const h = sorted.find(h => s.u0 < h.offset+h.width && s.u1 > h.offset);
    if (h) {
      add(`stud/${s.id}/lower`, 'framing', 'cripple stud', s.u0, s.u1, -depth/2, depth/2, stud, h.sill-stud);
      add(`stud/${s.id}/upper`, 'framing', 'cripple stud', s.u0, s.u1, -depth/2, depth/2, h.head+stud, height-2*stud);
    } else add(`stud/${s.id}`, 'framing', 'stud', s.u0, s.u1, -depth/2, depth/2, stud, height-2*stud);
  }
  for (const h of sorted) {
    add(`${h.id}/header-proxy`, 'framing', 'header placeholder (not sized)', h.offset, h.offset+h.width, -depth/2, depth/2, h.head, h.head+stud);
    if (h.sill > 0) add(`${h.id}/sill`, 'framing', 'rough sill', h.offset, h.offset+h.width, -depth/2, depth/2, h.sill-stud, h.sill);
  }
  // Cavity cells are the complement of framing/voids. No hidden solid wall core.
  const framing = parts.filter(p => p.layer === 'framing');
  const coords = (p: Component) => {
    const dx = p.center[0]-wall.start[0], dy = p.center[1]-wall.start[1];
    const u = dx*Math.cos(frame.angle)+dy*Math.sin(frame.angle), z = p.center[2]-wall.start[2];
    return { u0: u-p.size[0]/2, u1: u+p.size[0]/2, z0: z-p.size[2]/2, z1: z+p.size[2]/2 };
  };
  const rects = [...framing.map(coords), ...sorted.map(h => ({ u0:h.offset,u1:h.offset+h.width,z0:h.sill,z1:h.head }))];
  const us = [...new Set([0,length,...rects.flatMap(r=>[r.u0,r.u1])].map(n=>Number(n.toFixed(10))))].sort((a,b)=>a-b);
  const zs = [...new Set([0,height,...rects.flatMap(r=>[r.z0,r.z1])].map(n=>Number(n.toFixed(10))))].sort((a,b)=>a-b);
  for (let i=0;i<us.length-1;i++) for (let j=0;j<zs.length-1;j++) {
    const u=(us[i]+us[i+1])/2,z=(zs[j]+zs[j+1])/2;
    if (!rects.some(r=>u>r.u0-1e-9&&u<r.u1+1e-9&&z>r.z0-1e-9&&z<r.z1+1e-9)) add(`cavity/${i}/${j}`, 'cavity', 'insulation/cavity region', us[i],us[i+1],-depth/2,depth/2,zs[j],zs[j+1]);
  }
  return parts;
}
export function generateAssemblies(p: Project, assembly = buttsExterior): Component[] {
  const errors = validate(p); if (errors.length) throw new Error(errors.join('; '));
  return studyWalls(p).flatMap(w => generateWall({ ...w, assemblyId: assembly.id }, assembly, openings(p).filter(o=>o.wall===w.id).map(o=> w.id === 'wall-left' ? {...o,offset:p.depth-o.offset-o.width} : o)));
}

export function exportAssemblyConfiguration(project: Project, assembly = buttsExterior): string {
  generateAssemblies(project, assembly);
  return JSON.stringify({ schemaVersion: 1, project, assembly }, null, 2);
}
