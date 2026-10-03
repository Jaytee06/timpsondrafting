import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anonymizeGlb } from '../anonymize-glb.mjs';
function sampleGlb() {
 const document = { asset: { version: '2.0', generator: 'Private Client' }, scenes: [{ name: 'Private Client House' }], nodes: [{ name: 'DOOR_SWING_Private Client', extras: { author: 'Private Client', sourcePath: '/private/client.blend', viewerOptionsJSON: JSON.stringify({ doors: [{ node: 'DOOR_SWING_Private Client', durationSeconds: 0.65 }] }), tddDoor: { maxAngleDegrees: 90 }, tddFinish: { label: 'Kitchen', category: 'walls' } } }] };
 const json = Buffer.from(JSON.stringify(document)); const size = Math.ceil(json.length / 4) * 4;
 const result = Buffer.alloc(20 + size + 12, 0x20); result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8); result.writeUInt32LE(size, 12); result.writeUInt32LE(0x4e4f534a, 16); json.copy(result, 20);
 result.writeUInt32LE(4,20+size); result.writeUInt32LE(0x004e4942,24+size); result.writeUInt32LE(123,28+size); return result;
}
test('removes identities while retaining door references, finishes and binary data', () => {
 const original = sampleGlb(); const result = anonymizeGlb(original, 'model-01', ['Private Client']);
 const data = JSON.parse(result.subarray(20,20+result.readUInt32LE(12)).toString());
 assert.ok(!result.toString().includes('Private Client')); assert.equal(data.scenes[0].name, 'model-01');
 assert.equal(JSON.parse(data.nodes[0].extras.viewerOptionsJSON).doors[0].node, data.nodes[0].name);
 assert.equal(data.nodes[0].extras.tddFinish.label, 'Kitchen'); assert.equal(data.nodes[0].extras.tddDoor.maxAngleDegrees, 90);
 assert.equal(data.nodes[0].extras.sourcePath, undefined);
 assert.deepEqual(result.subarray(20+result.readUInt32LE(12)),original.subarray(20+original.readUInt32LE(12)));
 assert.equal(result.readUInt32LE(8), result.length);
});
