import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../src/viewer/cesiumGlb.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { prepareGlbForCesium } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('Cesium drops only unusable texture slots on primitives that lack their UV sets', async () => {
  const material = {
    pbrMetallicRoughness: { baseColorFactor: [0.5, 0.5, 0.5, 1], baseColorTexture: { index: 0 } },
    normalTexture: { index: 1 },
    extensions: {
      KHR_materials_specular: {
        specularTexture: { index: 2, extensions: { KHR_texture_transform: { texCoord: 1 } } },
      },
    },
  };
  const document = {
    asset: { version: '2.0' },
    materials: [material],
    meshes: [{ primitives: [
      { material: 0, attributes: { POSITION: 0 } },
      { material: 0, attributes: { POSITION: 0, TEXCOORD_0: 1 } },
      { material: 0, attributes: { POSITION: 0, TEXCOORD_0: 1, TEXCOORD_1: 2 } },
      { material: 0, attributes: { POSITION: 0 } },
    ] }],
  };
  const json = Buffer.from(JSON.stringify(document));
  const paddedLength = Math.ceil(json.length / 4) * 4;
  const header = Buffer.alloc(20 + paddedLength, 0x20);
  const binChunk = Buffer.from([4, 0, 0, 0, 0x42, 0x49, 0x4e, 0, 9, 8, 7, 6]);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(header.length + binChunk.length, 8);
  header.writeUInt32LE(paddedLength, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  json.copy(header, 20);

  const input = new Blob([header, binChunk]);
  const { blob } = await prepareGlbForCesium(input);
  const bytes = Buffer.from(await blob.arrayBuffer());
  const jsonEnd = 20 + bytes.readUInt32LE(12);
  const result = JSON.parse(bytes.subarray(20, jsonEnd));
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(jsonEnd % 4, 0);
  assert.deepEqual(bytes.subarray(jsonEnd), binChunk);
  assert.deepEqual(result.meshes[0].primitives.map((primitive) => primitive.material), [1, 2, 0, 1]);
  assert.deepEqual(result.materials[0], material);
  assert.deepEqual(result.materials[1].pbrMetallicRoughness, { baseColorFactor: [0.5, 0.5, 0.5, 1] });
  assert.equal(result.materials[1].normalTexture, undefined);
  assert.deepEqual(result.materials[2].normalTexture, material.normalTexture);
  assert.equal(result.materials[2].extensions.KHR_materials_specular.specularTexture, undefined);
  assert.equal((await prepareGlbForCesium(blob)).blob, blob);
});
