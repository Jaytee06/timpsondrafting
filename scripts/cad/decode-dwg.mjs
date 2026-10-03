// Local development adapter. GPL decoder stays outside the browser production bundle.
import { LibreDwg } from '@mlightcad/libredwg-web';
import { fileURLToPath } from 'node:url';
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = Buffer.concat(chunks);
if (input.length > 20 * 1024 * 1024 || !/^AC\d{4}$/.test(input.subarray(0, 6).toString('ascii'))) throw new Error('Invalid or oversized DWG');
const decoder = await LibreDwg.create(fileURLToPath(new URL('../../node_modules/@mlightcad/libredwg-web/wasm/', import.meta.url)));
const warnings = [];
const warn = console.warn;
console.warn = (...args) => { warnings.push(args.map(String).join(' ')); };
let data;
try {
  data = decoder.dwg_read_data(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength), 0);
  if (warnings.some(w => Number(w.split(':').pop()) >= 128)) throw new Error('Decoder reported a critical DWG error');
  if (!data) throw new Error('Decoder returned no drawing');
  const database = decoder.convert(data);
  process.stdout.write(JSON.stringify({ decoder: 'libredwg-web@0.7.14', warnings, database }, (_key, value) => typeof value === 'bigint' ? value.toString() : value));
} finally {
  console.warn = warn;
  if (data) decoder.dwg_free(data);
}
