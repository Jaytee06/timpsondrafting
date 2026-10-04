// Architectural steps have a height limit; sampled outdoor terrain does not.
export function canReachSiteSurface(modelFloorHeight: number | undefined, currentHeight: number, stepUp: number, stepDown: number) {
  return modelFloorHeight === undefined || (modelFloorHeight - currentHeight <= stepUp + 0.05 && modelFloorHeight - currentHeight >= -stepDown - 0.1);
}

export function siteSlideCandidates(north: number, east: number): [number, number][] {
  const candidates: [number, number][] = [[north, east]];
  if (north && east) candidates.push(...(Math.abs(north) >= Math.abs(east) ? [[north, 0], [0, east]] : [[0, east], [north, 0]]) as [number, number][]);
  return candidates;
}

export function droneDisplacement(forward: number, right: number, vertical: number, heading: number, pitch: number, distance: number) {
  const north = forward * Math.cos(pitch) * Math.cos(heading) - right * Math.sin(heading);
  const east = forward * Math.cos(pitch) * Math.sin(heading) + right * Math.cos(heading);
  const up = forward * Math.sin(pitch) + vertical;
  const length = Math.hypot(north, east, up) || 1;
  return { north: north / length * distance, east: east / length * distance, up: up / length * distance };
}
