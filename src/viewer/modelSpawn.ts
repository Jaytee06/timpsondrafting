import { Matrix4, Object3D, Quaternion, Vector3 } from 'three';

// Owner-selected camera height: 5 feet 7 inches above the walking surface.
export const DEFAULT_EYE_HEIGHT = 67 * 0.0254;
export type ModelSpawn = { position: [number, number, number]; direction: [number, number, number]; eyeHeight: number };
type SpawnExtras = { forwardAxis?: string; eyeHeightMeters?: number };

export function spawnForwardAxis(value?: string) {
  const axis = value?.trim().toUpperCase() ?? '-Z';
  // These legacy handoffs describe Blender local Y, before glTF's Y-up conversion.
  if (/^LOCAL -Y\b/.test(axis)) return new Vector3(0, 0, 1);
  if (/^LOCAL \+Y\b/.test(axis)) return new Vector3(0, 0, -1);
  const vectors: Record<string, [number, number, number]> = { '-Z': [0, 0, -1], '+Z': [0, 0, 1], '-X': [-1, 0, 0], '+X': [1, 0, 0] };
  return new Vector3(...(vectors[axis] ?? vectors['-Z']));
}

function spawnFromMatrix(matrix: Matrix4, extras: SpawnExtras): ModelSpawn {
  const position = new Vector3().setFromMatrixPosition(matrix);
  const direction = spawnForwardAxis(extras.forwardAxis).transformDirection(matrix);
  const eyeHeight = Number(extras.eyeHeightMeters);
  return { position: position.toArray(), direction: direction.toArray(), eyeHeight: Number.isFinite(eyeHeight) && eyeHeight > 0 && eyeHeight < 3 ? eyeHeight : DEFAULT_EYE_HEIGHT };
}

export function sceneModelSpawn(scene: Object3D): ModelSpawn | null {
  scene.updateMatrixWorld(true);
  let primary: Object3D | undefined;
  let fallback: Object3D | undefined;
  scene.traverse((node) => {
    const name = node.name.trim().toUpperCase();
    if (!primary && name === 'SPAWN_FRONT') primary = node;
    if (!fallback && name.startsWith('SPAWN_FRONT_')) fallback = node;
  });
  const node = primary ?? fallback;
  return node ? spawnFromMatrix(node.matrixWorld, node.userData as SpawnExtras) : null;
}

type GltfNode = { name?: string; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[]; extras?: SpawnExtras };
export function gltfModelSpawn(gltf: { nodes?: GltfNode[]; scenes?: { nodes?: number[] }[]; scene?: number }): ModelSpawn | null {
  const nodes = gltf.nodes ?? [];
  const childNodes = new Set(nodes.flatMap((node) => node.children ?? []));
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? nodes.flatMap((_, index) => childNodes.has(index) ? [] : [index]);
  let primary: ModelSpawn | null = null;
  let fallback: ModelSpawn | null = null;
  const visited = new Set<number>();
  const visit = (index: number, parent: Matrix4) => {
    const node = nodes[index];
    if (!node || visited.has(index)) return;
    visited.add(index);
    const local = node.matrix?.length === 16 ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3().fromArray(node.translation ?? [0, 0, 0]),
      new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
      new Vector3().fromArray(node.scale ?? [1, 1, 1]),
    );
    const world = parent.clone().multiply(local);
    const name = node.name?.trim().toUpperCase() ?? '';
    if (!primary && name === 'SPAWN_FRONT') primary = spawnFromMatrix(world, node.extras ?? {});
    if (!fallback && name.startsWith('SPAWN_FRONT_')) fallback = spawnFromMatrix(world, node.extras ?? {});
    node.children?.forEach((child) => visit(child, world));
  };
  roots.forEach((index) => visit(index, new Matrix4()));
  return primary ?? fallback;
}

export async function readGlbModelSpawn(blob: Blob) {
  const header = new DataView(await blob.slice(0, 20).arrayBuffer());
  if (header.byteLength < 20 || header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(16, true) !== 0x4e4f534a) return null;
  const jsonLength = header.getUint32(12, true);
  if (20 + jsonLength > blob.size) return null;
  return gltfModelSpawn(JSON.parse(await blob.slice(20, 20 + jsonLength).text()));
}

// Match Cesium's default glTF axis correction: Y-up to Z-up, then Z-forward to X-forward.
export function cesiumSpawnFrame(spawn: ModelSpawn) {
  const convert = ([x, y, z]: [number, number, number]): [number, number, number] => [z, x, y];
  return { position: convert(spawn.position), direction: convert(spawn.direction), eyeHeight: spawn.eyeHeight };
}
