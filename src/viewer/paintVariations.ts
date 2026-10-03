import { Material, MeshStandardMaterial } from 'three';

const paints = [
  { id: 'mist_blue', label: 'Mist blue', color: '#bcc4c7' },
  { id: 'soft_clay', label: 'Soft clay', color: '#c9b7aa' },
];

// Require an explicitly packaged paint base; never guess from a broad category alone.
export function createPaintVariations(category: string, base?: Material) {
  if (!['walls', 'ceilings'].includes(category) || !(base instanceof MeshStandardMaterial)
    || base.map || base.transparent || base.opacity < 1 || base.metalness > 0.05) return [];
  return paints.map((paint) => {
    const material = base.clone();
    material.name = `STUDIO_PAINT_${paint.id.toUpperCase()}`;
    material.color.set(paint.color);
    return { theme: `viewer:${paint.id}`, label: paint.label, material };
  });
}
