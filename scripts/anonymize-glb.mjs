import { readFileSync, writeFileSync } from 'node:fs';

// JSON-only rewrite: geometry, embedded textures and buffer offsets stay byte-identical.
export function anonymizeGlb(bytes, id, privateTerms = []) {
  const source = Buffer.from(bytes);
  if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2 || source.readUInt32LE(8) !== source.length) throw new Error('Invalid GLB 2.0 file.');
  const length = source.readUInt32LE(12);
  if (source.readUInt32LE(16) !== 0x4e4f534a) throw new Error('GLB JSON chunk is missing.');
  const document = JSON.parse(source.subarray(20, 20 + length).toString());
  const expressions = privateTerms.filter(Boolean).map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
  const allowedExtras = new Set(['viewerOptionsJSON', 'finishCategoriesJSON', 'tddFinishMaterialsJSON', 'tddFinish', 'tddDoor', 'interactionType', 'doorType', 'doorId', 'animationClip', 'closedPosition', 'openPosition', 'closedQuaternion', 'openQuaternion', 'slideDirection', 'travelMeters', 'initialOpenFraction', 'openAngleDegrees', 'initialState', 'closedQuaternionGLTF', 'excludeFromCollision', 'collisionOnly', 'collisionType', 'walkable', 'viewerHidden', 'forwardAxis', 'eyeHeightMeters', 'viewerGroundHeightMeters', 'upAxis']);
  function clean(value) {
    if (typeof value === 'string') {
      if (value.startsWith('{') || value.startsWith('[')) {
        try { return JSON.stringify(clean(JSON.parse(value))); } catch { /* Ordinary text. */ }
      }
      let result = value;
      for (const expression of expressions) result = result.replace(expression, id);
      return result.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, 'redacted');
    }
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
        if (key === 'extras') {
          const extras = Object.fromEntries(Object.entries(child ?? {}).filter(([field]) => allowedExtras.has(field)).map(([field, content]) => [field, clean(content)]));
          return Object.keys(extras).length ? [[key, extras]] : [];
        }
        return [[key, clean(child)]];
      }));
    }
    return value;
  }
  const sanitized = clean(document);
  sanitized.asset = { version: '2.0', generator: 'Timpson Drafting model viewer' };
  (sanitized.scenes ?? []).forEach((scene) => { scene.name = id; });
  const json = Buffer.from(JSON.stringify(sanitized));
  const paddedLength = Math.ceil(json.length / 4) * 4;
  const tail = source.subarray(20 + length);
  const output = Buffer.alloc(20 + paddedLength + tail.length, 0x20);
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(paddedLength, 12); output.writeUInt32LE(0x4e4f534a, 16);
  json.copy(output, 20); tail.copy(output, 20 + paddedLength);
  return output;
}
if (process.argv[1]?.endsWith('anonymize-glb.mjs')) {
  const [input, output, id, ...terms] = process.argv.slice(2);
  if (input && output && id) {
    writeFileSync(output, anonymizeGlb(readFileSync(input), id, terms));
    console.log(`Prepared ${id}`);
  }
}
