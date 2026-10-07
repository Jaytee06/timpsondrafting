export type ReviewCallout = {
  id: string; createdAt: string; model: string; modelUrl: string; note: string;
  camera: { position: number[]; quaternion: number[]; fov?: number };
  points: { x: number; y: number }[]; screenshot: string;
};
export function reviewSummary(items: ReviewCallout[], includeImages = false) {
  return '# Model review\n\n' + items.map((item, i) => {
    const [x, y, z, w] = item.camera.quaternion;
    // Camera forward is local -Z, rotated by the recorded quaternion.
    const direction = [-2 * (x * z + w * y), 2 * (w * x - y * z), 2 * (x * x + y * y) - 1];
    const format = (values: number[]) => values.map(value => value.toFixed(3)).join(', ');
    return `## ${i + 1}. ${item.model}\n\n${item.note || '(Visual callout; no note)'}\n\nModel: ${item.model} (${item.modelUrl})\nCaptured: ${item.createdAt}\nCamera position (viewer coordinates, meters): [${format(item.camera.position)}]\nViewing direction: [${format(direction)}]${item.camera.fov ? `\nField of view: ${item.camera.fov}°` : ''}${includeImages ? `\n\n![Callout ${i + 1}](callout-${i + 1}.png)` : ''}`;
  }).join('\n\n');
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
// Uncompressed ZIP, keeping screenshot bytes intact without a runtime dependency.
export function reviewZip(items: ReviewCallout[]): Blob {
  const encoder = new TextEncoder();
  const files = [{ name: 'review.md', bytes: encoder.encode(reviewSummary(items, true)) }, { name: 'review.json', bytes: encoder.encode(JSON.stringify({ schema: 'tdd-review-v1', callouts: items.map(({ screenshot, ...item }, i) => ({ ...item, screenshot: `callout-${i + 1}.png` })) }, null, 2)) }, ...items.map((item, i) => ({ name: `callout-${i + 1}.png`, bytes: Uint8Array.from(atob(item.screenshot.split(',')[1]), c => c.charCodeAt(0)) }))];
  const parts: Uint8Array[] = [], central: Uint8Array[] = []; let offset = 0, centralSize = 0;
  for (const file of files) {
    const name = encoder.encode(file.name), crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint32(14, crc, true); lv.setUint32(18, file.bytes.length, true); lv.setUint32(22, file.bytes.length, true); lv.setUint16(26, name.length, true); local.set(name, 30);
    const entry = new Uint8Array(46 + name.length), ev = new DataView(entry.buffer);
    ev.setUint32(0, 0x02014b50, true); ev.setUint16(4, 20, true); ev.setUint16(6, 20, true); ev.setUint32(16, crc, true); ev.setUint32(20, file.bytes.length, true); ev.setUint32(24, file.bytes.length, true); ev.setUint16(28, name.length, true); ev.setUint32(42, offset, true); entry.set(name, 46);
    parts.push(local, file.bytes); central.push(entry); offset += local.length + file.bytes.length; centralSize += entry.length;
  }
  const end = new Uint8Array(22), v = new DataView(end.buffer); v.setUint32(0, 0x06054b50, true); v.setUint16(8, files.length, true); v.setUint16(10, files.length, true); v.setUint32(12, centralSize, true); v.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end].map(part => new Uint8Array(part).buffer), { type: 'application/zip' });
}
