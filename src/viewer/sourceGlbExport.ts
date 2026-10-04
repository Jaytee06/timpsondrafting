import { Material, Mesh, MeshStandardMaterial, Object3D } from 'three';

type Reference = { nodes?: number; meshes?: number; primitives?: number; materials?: number };
type GltfNode = { children?: number[]; mesh?: number; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] };
type GltfMesh = { primitives: { material?: number; [key: string]: unknown }[]; [key: string]: unknown };
type GltfMaterial = { name?: string; pbrMetallicRoughness?: { baseColorFactor?: number[]; roughnessFactor?: number; metallicFactor?: number; [key: string]: unknown }; [key: string]: unknown };
type Document = { nodes: GltfNode[]; meshes: GltfMesh[]; materials?: GltfMaterial[]; scenes: { nodes: number[] }[]; buffers: { byteLength: number; uri?: string }[]; [key: string]: unknown };
export type SourceGlb = { json: unknown; binary: () => Promise<ArrayBuffer>; associations: { get: (object: Object3D | Material) => Reference | undefined } };
const sources = new WeakMap<Object3D, SourceGlb>();
export function registerSourceGlb(scene: Object3D, source: SourceGlb) {
  sources.set(scene, source);
  return () => { sources.delete(scene); };
}

// Patch bindings and transforms only. Keep embedded image/geometry bytes as supplied,
// avoiding the large decoded-image canvases needed by a full GLTFExporter round trip.
export async function exportSourceGlb(scene: Object3D, preserveLandscaping = false): Promise<Blob | null> {
  const source = sources.get(scene);
  if (!source) return null;
  const document = JSON.parse(JSON.stringify(source.json)) as Document;
  if (document.buffers.length !== 1 || document.buffers[0].uri) throw new Error('This model needs a self-contained GLB for customized placement.');
  scene.updateMatrixWorld(true);
  const excluded = new Set<number>();
  const meshes = new Map<number, number>();
  const materials = new Map<Material, number>();
  const materialIndex = (material: Material) => {
    const existing = source.associations.get(material)?.materials;
    if (existing !== undefined) return existing;
    const cached = materials.get(material);
    if (cached !== undefined) return cached;
    const baseName = material.userData.tddExportBaseMaterial ?? material.name;
    const baseIndex = document.materials?.findIndex((candidate) => candidate.name === baseName) ?? -1;
    if (baseIndex < 0 || !(material instanceof MeshStandardMaterial)) throw new Error('A selected finish could not be included in the customized model.');
    const definition = JSON.parse(JSON.stringify(document.materials![baseIndex])) as GltfMaterial;
    definition.name = material.name;
    definition.pbrMetallicRoughness = { ...definition.pbrMetallicRoughness,
      baseColorFactor: [material.color.r, material.color.g, material.color.b, material.opacity],
      roughnessFactor: material.roughness, metallicFactor: material.metalness };
    const index = document.materials!.push(definition) - 1;
    materials.set(material, index);
    return index;
  };
  scene.traverse((object) => {
    const reference = source.associations.get(object);
    if (reference?.nodes !== undefined) {
      const node = document.nodes[reference.nodes];
      if (!object.visible && !(preserveLandscaping && /LANDSCAPING/i.test(object.name))) excluded.add(reference.nodes);
      object.updateMatrix();
      node.matrix = Array.from(object.matrix.elements);
      delete node.translation; delete node.rotation; delete node.scale;
    }
    if (!(object instanceof Mesh) || reference?.meshes === undefined || reference.primitives === undefined) return;
    let parent: Object3D | null = object;
    let nodeIndex: number | undefined;
    while (parent && nodeIndex === undefined) {
      nodeIndex = source.associations.get(parent)?.nodes;
      parent = parent.parent;
    }
    if (nodeIndex === undefined) throw new Error('A model surface could not be mapped for customized placement.');
    // Instanced glTF meshes may be shared by nodes that now have different finishes.
    let meshIndex = meshes.get(nodeIndex);
    if (meshIndex === undefined) {
      meshIndex = document.meshes.push(JSON.parse(JSON.stringify(document.meshes[reference.meshes]))) - 1;
      document.nodes[nodeIndex].mesh = meshIndex;
      meshes.set(nodeIndex, meshIndex);
    }
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    if (Array.isArray(object.material) && object.material.length > 1) throw new Error('This surface has unsupported material slots for customized placement.');
    document.meshes[meshIndex].primitives[reference.primitives].material = materialIndex(material);
  });
  document.nodes.forEach((node) => { if (node.children) node.children = node.children.filter((index) => !excluded.has(index)); });
  document.scenes.forEach((entry) => { entry.nodes = entry.nodes.filter((index) => !excluded.has(index)); });
  const binary = await source.binary();
  if (!(binary instanceof ArrayBuffer) || binary.byteLength < document.buffers[0].byteLength) throw new Error('The original model data could not be read for export.');
  const json = new TextEncoder().encode(JSON.stringify(document));
  const jsonPadding = (4 - json.byteLength % 4) % 4;
  const binaryPadding = (4 - binary.byteLength % 4) % 4;
  const header = new ArrayBuffer(20);
  const view = new DataView(header);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true);
  view.setUint32(8, 28 + json.byteLength + jsonPadding + binary.byteLength + binaryPadding, true);
  view.setUint32(12, json.byteLength + jsonPadding, true); view.setUint32(16, 0x4e4f534a, true);
  const binaryHeader = new ArrayBuffer(8);
  const binaryView = new DataView(binaryHeader);
  binaryView.setUint32(0, binary.byteLength + binaryPadding, true); binaryView.setUint32(4, 0x004e4942, true);
  return new Blob([header, json, new Uint8Array(jsonPadding).fill(32), binaryHeader, binary, new Uint8Array(binaryPadding)], { type: 'model/gltf-binary' });
}
