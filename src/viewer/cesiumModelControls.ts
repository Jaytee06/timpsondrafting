import { Cartesian3, Matrix3, Matrix4, Model, Quaternion } from 'cesium';

type Node = { name?: string; children?: number[]; extras?: { openAngleDegrees?: number; closedQuaternionGLTF?: number[]; initialState?: string; tddDoor?: { direction?: string; maxAngleDegrees?: number; initialState?: string }; viewerOptionsJSON?: string } };
type DoorMetadata = { id?: string; node?: string; openAngleDegrees?: number; closedQuaternion?: number[]; axis?: number[]; initialState?: string; pairGroup?: string };

export function configureCesiumModel(model: Model, nodes: Node[]) {
  const landscaping: string[] = [];
  const doors = new Map<string, { name: string; closed: Matrix4; opened: Matrix4; open: boolean; pairGroup?: string }>();
  const metadata = new Map<string, DoorMetadata>();
  for (const node of nodes) {
    try {
      const manifest = JSON.parse(node.extras?.viewerOptionsJSON ?? '{}');
      for (const door of manifest.doors ?? []) {
        const name = door.node ?? door.id;
        if (name) metadata.set(name, door);
      }
    } catch { /* Ignore optional invalid manifests. */ }
  }
  nodes.forEach((node) => {
    if (!node.name) return;
    if (/LANDSCAPING/i.test(node.name)) landscaping.push(node.name);
    if (/MATERIAL_LIBRARY|^COLLISION/i.test(node.name)) {
      try { model.getNode(node.name).show = false; } catch { /* Unreachable source node. */ }
    }
    if (!/DOOR_SWING/i.test(node.name)) return;
    let runtime;
    try { runtime = model.getNode(node.name); } catch { return; }
    const extras = node.extras ?? {}, meta = metadata.get(node.name);
    const closed = Matrix4.clone(runtime.matrix);
    const rotation = meta?.closedQuaternion ?? extras.closedQuaternionGLTF;
    if (rotation?.length === 4) {
      const scale = Matrix4.getScale(closed, new Cartesian3());
      const position = Matrix4.getTranslation(closed, new Cartesian3());
      Matrix4.fromTranslationQuaternionRotationScale(position, Quaternion.normalize(new Quaternion(...rotation as [number, number, number, number]), new Quaternion()), scale, closed);
    }
    const match = node.name.toUpperCase().match(/(?:^|_)MAX_?(\d+)|(?:^|_)(\d{2,3})(?:_|$)/);
    const direction = extras.tddDoor?.direction === 'R' || /SWING_R|RIGHT/i.test(node.name) ? -1 : 1;
    const angle = meta?.openAngleDegrees ?? extras.openAngleDegrees ?? direction * (extras.tddDoor?.maxAngleDegrees ?? Number(match?.[1] ?? match?.[2] ?? 90));
    const axis = meta?.axis?.length === 3 ? new Cartesian3(...meta.axis as [number, number, number]) : Cartesian3.UNIT_Y;
    const turn = Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(Quaternion.fromAxisAngle(Cartesian3.normalize(axis, new Cartesian3()), Math.sign(angle) * Math.min(170, Math.max(15, Math.abs(angle))) * Math.PI / 180)));
    const opened = Matrix4.multiply(closed, turn, new Matrix4());
    const state = { name: node.name, closed, opened, open: (meta?.initialState ?? extras.initialState ?? extras.tddDoor?.initialState) === 'open', pairGroup: meta?.pairGroup };
    runtime.matrix = state.open ? opened : closed;
    const register = (entry: Node) => {
      if (entry.name) doors.set(entry.name.toLowerCase(), state);
      entry.children?.forEach((index) => { if (nodes[index]) register(nodes[index]); });
    };
    register(node);
  });
  return {
    landscaping,
    toggleDoor(name: string) {
      const door = doors.get(name.toLowerCase());
      if (!door) return false;
      const next = !door.open;
      for (const entry of new Set(doors.values())) {
        if (entry !== door && (!door.pairGroup || entry.pairGroup !== door.pairGroup)) continue;
        entry.open = next;
        model.getNode(entry.name).matrix = next ? entry.opened : entry.closed;
      }
      return true;
    },
  };
}
