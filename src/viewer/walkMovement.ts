import { Matrix3, Object3D, Raycaster, Vector3 } from 'three';

// Sweep the player's horizontal footprint, then keep the component along the wall.
export function slideMovement(position: Vector3, movement: Vector3, walls: Object3D[], radius = 0.24) {
  const result = position.clone();
  const remaining = movement.clone();
  const ray = new Raycaster();
  for (let pass = 0; pass < 3 && remaining.lengthSq() > 1e-8; pass += 1) {
    const distance = remaining.length();
    const direction = remaining.clone().normalize();
    const side = new Vector3(-direction.z, 0, direction.x).multiplyScalar(radius);
    let clearance = distance;
    let collisionNormal: Vector3 | null = null;
    for (const offset of [new Vector3(), side, side.clone().negate()]) {
      ray.set(result.clone().add(offset), direction);
      ray.far = distance + radius;
      for (const hit of ray.intersectObjects(walls, false)) {
        if (!hit.face) continue;
        const normal = hit.face.normal.clone().applyMatrix3(new Matrix3().getNormalMatrix(hit.object.matrixWorld));
        normal.y = 0;
        if (normal.lengthSq() < 1e-8) continue;
        normal.normalize();
        if (normal.dot(direction) > 0) normal.negate();
        if (Math.abs(normal.dot(direction)) < 1e-5) continue;
        const allowed = Math.max(0, hit.distance - radius - 0.002);
        if (allowed < clearance) {
          clearance = allowed;
          collisionNormal = normal;
        }
      }
    }
    result.addScaledVector(direction, clearance);
    if (!collisionNormal) break;
    remaining.multiplyScalar(1 - clearance / distance);
    remaining.addScaledVector(collisionNormal, -remaining.dot(collisionNormal));
  }
  return result;
}
