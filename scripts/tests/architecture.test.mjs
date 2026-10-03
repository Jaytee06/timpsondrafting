import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, applyChange, generate, openings, ceilingVertices, exportConfiguration, undoChange, validate } from '../../.architecture-test/model.js';
test('fixture wall volumes independently equal rectangles minus openings', () => {
 const parts = generate(fixture);
 for (const [id, length, holeArea] of [['wall-front', 4, 1.2 * 1.2], ['wall-left', 3, .9 * 2.1]]) {
  const volume = parts.filter(p => p.owner === id).reduce((sum, p) => sum + p.size.reduce((a,b) => a*b,1),0);
  assert.ok(Math.abs(volume - (length * 2.7 - holeArea) * .15) < 1e-10);
 }
});
test('governing edit regenerates centered opening and preserves IDs and evidence', () => {
 const next = applyChange(fixture, { revision: 0, field: 'width', value: 6 });
 assert.equal(openings(next)[0].offset + .6, 3);
 assert.deepEqual(generate(next).map(p => p.id), generate(fixture).map(p => p.id));
 assert.deepEqual(next.evidence, fixture.evidence);
 assert.equal(next.revision, 1);
 assert.equal(fixture.width, 4);
});
test('plane slope measured from vertices matches rise over run', () => {
 const p = applyChange(fixture, { revision: 0, field: 'depth', value: 5 });
 const v = ceilingVertices(p);
 assert.equal((v[2][2] - v[1][2]) / (v[2][1] - v[1][1]), .25);
 assert.equal(v[2][2], 3.95);
});
test('invalid and stale operations leave starting model intact', () => {
 for (const value of [NaN, Infinity, -1, 1, 31]) assert.throws(() => applyChange(fixture, { revision: 0, field: 'width', value }));
 assert.throws(() => applyChange(fixture, { revision: 1, field: 'width', value: 6 }), /Stale/);
 assert.equal(fixture.revision, 0);
});
test('confirmed evidence conflict is rejected', () => {
 const p = { ...fixture, evidence: [{ ...fixture.evidence[0], status: 'confirmed' }] };
 assert.throws(() => applyChange(p, { revision: 0, field: 'width', value: 6 }), /conflicts/);
});
test('undo restores parameters with a new monotonic revision', () => {
 const changed = applyChange(fixture, { revision: 0, field: 'width', value: 6 });
 const restored = undoChange(changed, fixture);
 assert.equal(restored.width, 4); assert.equal(restored.revision, 2);
 assert.deepEqual(generate(restored), generate(fixture));
});
test('configuration readback preserves dimensions, evidence and geometry', () => {
 const readback = JSON.parse(exportConfiguration(fixture));
 assert.deepEqual(readback, fixture);
 assert.deepEqual(validate(readback), []);
 assert.deepEqual(generate(readback), generate(fixture));
});
