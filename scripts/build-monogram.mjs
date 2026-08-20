// ---------------------------------------------------------------------------
// build-monogram.mjs — one-time asset pipeline for the 3D "AD" monogram.
//   1. Parses assets/ad-monogram.obj + .mtl (exported from three-d-stage)
//   2. Dedups + quantizes vertices to Int16 and writes public/ad-monogram.bin
//      (custom little-endian layout, ~1/20th the OBJ's size before gzip)
//   3. Software-renders one hero frame (the same math the site renderer
//      uses) and writes public/favicon.png via a minimal PNG encoder.
// Run: node scripts/build-monogram.mjs
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// --- parse MTL -------------------------------------------------------------
const mtlSrc = readFileSync(new URL('../assets/ad-monogram.mtl', import.meta.url), 'utf8');
const materials = []; // { name, rgb: [r,g,b] 0-255 }
{
  let cur = null;
  for (const line of mtlSrc.split('\n')) {
    const t = line.trim();
    if (t.startsWith('newmtl ')) {
      cur = { name: t.slice(7).trim(), rgb: [128, 128, 128] };
      materials.push(cur);
    } else if (t.startsWith('Kd ') && cur) {
      cur.rgb = t.slice(3).trim().split(/\s+/).map((v) => Math.round(Number(v) * 255));
    }
  }
}
const matIndex = new Map(materials.map((m, i) => [m.name, i]));

// --- parse OBJ ---------------------------------------------------------------
const objSrc = readFileSync(new URL('../assets/ad-monogram.obj', import.meta.url), 'utf8');
const rawVerts = [];
const faces = []; // [a,b,c, matId]
{
  let curMat = 0;
  for (const line of objSrc.split('\n')) {
    if (line.startsWith('v ')) {
      rawVerts.push(line.slice(2).trim().split(/\s+/).map(Number));
    } else if (line.startsWith('usemtl ')) {
      curMat = matIndex.get(line.slice(7).trim()) ?? 0;
    } else if (line.startsWith('f ')) {
      const idx = line.slice(2).trim().split(/\s+/).map((tok) => parseInt(tok, 10) - 1);
      if (idx.length === 3) faces.push([idx[0], idx[1], idx[2], curMat]);
    }
  }
}

// --- center, scale, quantize, dedup ----------------------------------------
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (const v of rawVerts) {
  for (let i = 0; i < 3; i++) {
    if (v[i] < min[i]) min[i] = v[i];
    if (v[i] > max[i]) max[i] = v[i];
  }
}
const center = [0, 1, 2].map((i) => (min[i] + max[i]) / 2);
const half = Math.max(...[0, 1, 2].map((i) => (max[i] - min[i]) / 2));
const Q = 32000;
const quant = (v) => [0, 1, 2].map((i) => Math.round(((v[i] - center[i]) / half) * Q));

const dedup = new Map();
const positions = []; // flat Int16 triples
const remap = new Array(rawVerts.length);
rawVerts.forEach((v, i) => {
  const q = quant(v);
  const key = q.join(',');
  let id = dedup.get(key);
  if (id === undefined) {
    id = positions.length / 3;
    dedup.set(key, id);
    positions.push(...q);
  }
  remap[i] = id;
});
const vertCount = positions.length / 3;
const outFaces = faces.map(([a, b, c, m]) => [remap[a], remap[b], remap[c], m]);
console.log(`verts ${rawVerts.length} → ${vertCount} (dedup), faces ${outFaces.length}, mats ${materials.length}`);

// --- write binary ------------------------------------------------------------
{
  const headerSize = 4 + 2 + 2 + 1 + materials.length * 3;
  const buf = Buffer.alloc(headerSize + vertCount * 6 + outFaces.length * 7);
  let o = 0;
  buf.write('ADM1', o); o += 4;
  buf.writeUInt16LE(vertCount, o); o += 2;
  buf.writeUInt16LE(outFaces.length, o); o += 2;
  buf.writeUInt8(materials.length, o); o += 1;
  for (const m of materials) { buf.writeUInt8(m.rgb[0], o++); buf.writeUInt8(m.rgb[1], o++); buf.writeUInt8(m.rgb[2], o++); }
  for (const p of positions) { buf.writeInt16LE(p, o); o += 2; }
  for (const f of outFaces) { buf.writeUInt16LE(f[0], o); o += 2; buf.writeUInt16LE(f[1], o); o += 2; buf.writeUInt16LE(f[2], o); o += 2; }
  for (const f of outFaces) { buf.writeUInt8(f[3], o); o += 1; }
  writeFileSync(new URL('../public/ad-monogram.bin', import.meta.url), buf);
  console.log(`public/ad-monogram.bin: ${(buf.length / 1024).toFixed(1)} KB`);
}

// --- software render one frame for the favicon ------------------------------
// (identical math to src/lib/monogram3d.ts — keep in sync)
function renderFrame(size, yaw, pitch) {
  const px = new Uint8ClampedArray(size * size * 4); // RGBA, transparent
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cx = Math.cos(pitch), sx = Math.sin(pitch);
  const n = vertCount;
  const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x0 = positions[i * 3] / Q, y0 = positions[i * 3 + 1] / Q, z0 = positions[i * 3 + 2] / Q;
    const x1 = x0 * cy + z0 * sy;
    const z1 = -x0 * sy + z0 * cy;
    const y2 = y0 * cx - z1 * sx;
    const z2 = y0 * sx + z1 * cx;
    const s = size * 0.46;
    X[i] = size / 2 + x1 * s;
    Y[i] = size / 2 - y2 * s;
    Z[i] = z2;
  }
  const L = [-0.45, 0.62, 0.64];
  const order = outFaces.map((f, i) => ({ i, z: Z[f[0]] + Z[f[1]] + Z[f[2]] })).sort((a, b) => a.z - b.z);
  for (const { i } of order) {
    const [a, b, c, m] = outFaces[i];
    const ux = X[b] - X[a], uy = Y[b] - Y[a], uz = Z[b] - Z[a];
    const vx = X[c] - X[a], vy = Y[c] - Y[a], vz = Z[c] - Z[a];
    // screen-space normal z (note Y is flipped): cull back faces
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nz >= 0) continue;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny = -ny / len; nz = -nz / len; // world-ish normal (undo Y flip)
    nx = -nx;
    const ndl = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const inten = 0.32 + 0.72 * ndl;
    const spec = Math.pow(Math.max(0, ndl), 14) * 55;
    const lift = 26 * inten; // keeps near-black materials readable on dark bg
    const col = materials[m].rgb.map((v) => Math.min(255, v * inten + lift + spec));
    fillTri(px, size, X[a], Y[a], X[b], Y[b], X[c], Y[c], col);
  }
  return px;
}

function fillTri(px, size, x0, y0, x1, y1, x2, y2, col) {
  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(y0, y1, y2)));
  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(area) < 1e-9) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / area;
      const w1 = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < -0.001 || w1 < -0.001 || w2 < -0.001) continue;
      const o = (y * size + x) * 4;
      px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
    }
  }
}

// --- minimal PNG encoder ------------------------------------------------------
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])), 8 + data.length);
  return out;
}
function writePng(path, px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
  console.log(`${path.pathname ?? path}: ${(png.length / 1024).toFixed(1)} KB`);
}

const FAVICON_SIZE = 128;
const px = renderFrame(FAVICON_SIZE, -0.5, -0.32);
let painted = 0;
for (let i = 3; i < px.length; i += 4) if (px[i] > 0) painted++;
console.log(`favicon painted pixels: ${painted} / ${FAVICON_SIZE * FAVICON_SIZE}`);
writePng(new URL('../public/favicon.png', import.meta.url), px, FAVICON_SIZE);
