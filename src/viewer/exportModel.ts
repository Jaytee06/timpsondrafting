import { BufferAttribute, Material, Mesh, MeshPhysicalMaterial, Object3D } from 'three';

export function snapshotModel(scene: Object3D) {
  scene.updateMatrixWorld(true);
  const snapshot = scene.clone(true);
  const materials = new Map<Material, Material>();
  const copyMaterial = (material: Material) => {
    let copy = materials.get(material);
    if (!copy) { copy = material.clone(); materials.set(material, copy); }
    return copy;
  };
  snapshot.traverse((object) => {
    if (object instanceof Mesh) object.material = Array.isArray(object.material)
      ? object.material.map(copyMaterial) : copyMaterial(object.material);
  });
  return snapshot;
}

export function snapshotAppleArModel(scene: Object3D) {
  const snapshot = snapshotModel(scene);
  // USDZExporter accepts one material per mesh. Split grouped surfaces in the
  // AR snapshot so multi-material walls and fixtures are not silently omitted.
  const grouped: Mesh[] = [];
  snapshot.traverse((object) => { if (object instanceof Mesh && Array.isArray(object.material)) grouped.push(object); });
  for (const mesh of grouped) {
    const materials = mesh.material as Material[];
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    const groups = mesh.geometry.groups.length ? mesh.geometry.groups : [{ start: 0, count: geometry.getAttribute('position').count, materialIndex: 0 }];
    for (const group of groups) {
      const material = materials[group.materialIndex ?? 0];
      if (!material) continue;
      const part = geometry.clone();
      part.clearGroups();
      for (const [name, attribute] of Object.entries(geometry.attributes)) {
        const array = attribute.array.slice(group.start * attribute.itemSize, (group.start + group.count) * attribute.itemSize);
        part.setAttribute(name, new BufferAttribute(array, attribute.itemSize, attribute.normalized));
      }
      const child = new Mesh(part, material);
      child.name = `${mesh.name}_AR_${group.materialIndex ?? 0}`;
      mesh.add(child);
    }
    const container = new Object3D();
    container.name = mesh.name;
    container.position.copy(mesh.position); container.quaternion.copy(mesh.quaternion); container.scale.copy(mesh.scale);
    container.visible = mesh.visible;
    for (const child of [...mesh.children]) container.add(child);
    mesh.parent?.add(container);
    mesh.removeFromParent();
  }
  const adjusted = new Set<Material>();
  snapshot.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (adjusted.has(material)) continue;
      adjusted.add(material);
      // USDZExporter omits transmission. Approximate it with Preview Surface opacity
      // in this AR-only copy, leaving opaque appliance glass and the viewer untouched.
      if (material instanceof MeshPhysicalMaterial && material.transmission > 0) {
        const retainedOpacity = Math.max(0.06, Math.min(0.3, material.roughness * 0.7));
        material.opacity *= 1 - material.transmission * (1 - retainedOpacity);
        material.transparent = true;
        material.transmission = 0;
        material.depthWrite = false;
      }
    }
  });
  return snapshot;
}

export async function exportCustomizedGlb(scene: Object3D, preserveLandscaping = false) {
  const snapshot = snapshotModel(scene);
  if (preserveLandscaping) snapshot.traverse((object) => { if (/LANDSCAPING/i.test(object.name)) object.visible = true; });
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const bytes = await new GLTFExporter().parseAsync(snapshot, { binary: true, onlyVisible: true });
  if (!(bytes instanceof ArrayBuffer)) throw new Error('Model export did not produce a GLB.');
  return new Blob([bytes], { type: 'model/gltf-binary' });
}
