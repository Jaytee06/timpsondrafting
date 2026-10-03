/** Authoritative coordinates are metres, Z up. Rendering converts Z to Three's Y. */
export type Evidence = { id: string; original: string; metres: number; status: 'fixture' | 'confirmed'; field?: 'width' | 'depth' | 'height' | 'pitch' };
export type Project = { schemaVersion: 1; revision: number; width: number; depth: number; height: number; thickness: number; pitch: number; evidence: Evidence[] };
export type Part = { id: string; owner: string; kind: 'wall' | 'floor' | 'ceiling'; center: [number, number, number]; size: [number, number, number] };
export type Opening = { id: string; wall: string; offset: number; width: number; sill: number; head: number };
export type Change = { revision: number; field: 'width' | 'depth' | 'height' | 'pitch'; value: number };
export const fixture: Project = { schemaVersion: 1, revision: 0, width: 4, depth: 3, height: 2.7, thickness: .15, pitch: .25, evidence: [{ id: 'fixture-width', original: '4 m (synthetic)', metres: 4, status: 'fixture' }] };
export function validate(p: Project): string[] {
  const errors: string[] = [];
  for (const key of ['width', 'depth', 'height', 'thickness', 'pitch'] as const) if (!Number.isFinite(p[key])) errors.push(`${key} must be finite`);
  if (p.width < 2 || p.width > 30) errors.push('Width must be between 2 and 30 m');
  if (p.depth < 2 || p.depth > 30) errors.push('Depth must be between 2 and 30 m');
  if (p.height < 2.2 || p.height > 10) errors.push('Height must be between 2.2 and 10 m');
  if (p.thickness <= 0 || p.thickness > .5) errors.push('Wall thickness must be between 0 and 0.5 m');
  if (p.pitch < 0 || p.pitch > 1) errors.push('Pitch must be between 0 and 1');
  for (const e of p.evidence) {
    if (!Number.isFinite(e.metres) || e.metres <= 0) errors.push(`Invalid evidence: ${e.id}`);
    const field = e.field ?? (e.id === 'fixture-width' ? 'width' : undefined);
    if (e.status === 'confirmed' && field && Math.abs(e.metres - p[field]) > 1e-6) errors.push(`${field} conflicts with confirmed evidence ${e.id}`);
  }
  return errors;
}
export function applyChange(p: Project, change: Change): Project {
  if (change.revision !== p.revision) throw new Error('Stale project revision');
  const next = { ...p, [change.field]: change.value, revision: p.revision + 1 };
  const errors = validate(next);
  if (errors.length) throw new Error(errors.join('; '));
  return next;
}
export function openings(p: Project): Opening[] {
  return [{ id: 'window-1', wall: 'wall-front', offset: (p.width - 1.2) / 2, width: 1.2, sill: .9, head: 2.1 }, { id: 'door-1', wall: 'wall-left', offset: .5, width: .9, sill: 0, head: 2.1 }];
}
export function generate(p: Project): Part[] {
  const errors = validate(p); if (errors.length) throw new Error(errors.join('; '));
  const parts: Part[] = [];
  const add = (id: string, owner: string, kind: Part['kind'], center: Part['center'], size: Part['size']) => { if (size.every(n => n > 0)) parts.push({ id, owner, kind, center, size }); };
  for (const o of openings(p)) {
    const front = o.wall === 'wall-front', length = front ? p.width : p.depth;
    const segment = (name: string, start: number, end: number, bottom: number, top: number) => add(`${o.wall}/${name}`, o.wall, 'wall', front ? [(start + end) / 2, 0, (bottom + top) / 2] : [0, (start + end) / 2, (bottom + top) / 2], front ? [end - start, p.thickness, top - bottom] : [p.thickness, end - start, top - bottom]);
    segment('before', 0, o.offset, 0, p.height);
    segment('after', o.offset + o.width, length, 0, p.height);
    segment('sill', o.offset, o.offset + o.width, 0, o.sill);
    segment('head', o.offset, o.offset + o.width, o.head, p.height);
  }
  add('floor', 'floor', 'floor', [p.width / 2, p.depth / 2, -.075], [p.width, p.depth, .15]);
  // Ceiling is rendered from its plane vertices, not this bounding box.
  return parts;
}
export function ceilingVertices(p: Project): [number, number, number][] {
  return [[0, 0, p.height], [p.width, 0, p.height], [p.width, p.depth, p.height + p.pitch * p.depth], [0, p.depth, p.height + p.pitch * p.depth]];
}
export function exportConfiguration(p: Project): string { return JSON.stringify(p, null, 2); }
export function undoChange(current: Project, previous: Project): Project { return { ...previous, revision: current.revision + 1 }; }
