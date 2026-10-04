import { Material, Mesh, MeshPhysicalMaterial, Object3D } from 'three';

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

export async function exportCustomizedGlb(scene: Object3D) {
  const snapshot = snapshotModel(scene);
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const bytes = await new GLTFExporter().parseAsync(snapshot, { binary: true, onlyVisible: true });
  if (!(bytes instanceof ArrayBuffer)) throw new Error('Model export did not produce a GLB.');
  return new Blob([bytes], { type: 'model/gltf-binary' });
}
