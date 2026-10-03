import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../../src/viewer/finishControls.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { parseModelVariant, parseModelFinish, cycleFinishTheme, availableFinishThemes, walkAction } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('door operation and finish selection use independent keys', () => {
 assert.equal(walkAction('KeyE'), 'door'); assert.equal(walkAction('ShiftLeft'), 'finish'); assert.equal(walkAction('ShiftRight'), 'finish'); assert.equal(walkAction('KeyF'), null); assert.equal(walkAction('KeyW'), null);
});
test('discovers named model palettes without confusing palette and category', () => {
 assert.deepEqual(parseModelVariant('THEME_EARTHEN_TUSCAN__WALLS__WALLS'), { theme: 'model:earthen_tuscan', category: 'WALLS', surface: 'WALLS' });
 assert.deepEqual(parseModelVariant('THEME_LIGHT__TRIM__MAIN_FLOOR_DOOR_INSET'), { theme: 'light', category: 'TRIM', surface: 'MAIN_FLOOR_DOOR_INSET' });
 assert.equal(parseModelFinish('FINISH_TRIM__MAIN_FLOOR_DOOR_INSET').category, 'TRIM');
});
test('cycles only packaged samples and handles original-only surfaces', () => {
 const available = availableFinishThemes({ original: {}, 'model:quiet_organic': {}, 'model:earthen_tuscan': {} });
 assert.deepEqual(available, ['original', 'model:quiet_organic', 'model:earthen_tuscan']);
 assert.equal(cycleFinishTheme('original', 1, available), 'model:quiet_organic');
 assert.equal(cycleFinishTheme('original', -1, available), 'model:earthen_tuscan');
 assert.equal(cycleFinishTheme('original', 1, ['original']), 'original');
});
test('published models expose their actual surface variants', () => {
 for (const id of ['model-01', 'model-02', 'model-03']) {
  const bytes = readFileSync(new URL(`../../public/models/${id}.glb`, import.meta.url));
  const model = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const variants = model.materials.map((material) => parseModelVariant(material.name ?? '')).filter(Boolean);
  assert.ok(variants.length > 0);
  if (id === 'model-01') assert.ok(variants.some((variant) => variant.theme === 'model:earthen_tuscan'));
  if (id === 'model-02') {
   const originals = model.materials.map((material) => parseModelFinish(material.name ?? '')).filter(Boolean);
   assert.equal(originals.length, 337);
   assert.equal(variants.length, 637);
   assert.equal(new Set(variants.map((variant) => variant.theme)).size, 21);
   assert.ok(originals.some((finish) => finish.category === 'DOORS'));
   assert.ok(variants.some((variant) => variant.category === 'WALLS' && variant.surface === '*' && variant.theme === 'model:warm_white'));

  }
 }
});
