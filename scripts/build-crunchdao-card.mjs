// ---------------------------------------------------------------------------
// build-crunchdao-card.mjs — renders public/projects/crunchdao.png, the
// project-card artwork for the CrunchDAO competitions entry. In the same
// spirit as build-monogram.mjs (which renders the favicon), the image is
// generated from scratch: a seeded random-walk price series with a
// structural break at 60% — the exact phenomenon the Structural Break
// competition is about — supersampled 2x and encoded with the same
// hand-rolled PNG writer. Deterministic: seed 51336.
// Run: node scripts/build-crunchdao-card.mjs
// ---------------------------------------------------------------------------

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT_W = 1600;
const OUT_H = 1000;
const SS = 2; // supersample factor
const W = OUT_W * SS;
const H = OUT_H * SS;
const SEED = 51336;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
const gauss = () => {
  // Box–Muller
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// --- canvas ----------------------------------------------------------------
const px = new Uint8ClampedArray(W * H * 4);
const BG = [11, 11, 16];
for (let i = 0; i < W * H; i++) {
  const o = i * 4;
  px[o] = BG[0];
  px[o + 1] = BG[1];
  px[o + 2] = BG[2];
  px[o + 3] = 255;
}

function blend(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const o = (y * W + x) * 4;
  px[o] = px[o] * (1 - a) + r * a;
  px[o + 1] = px[o + 1] * (1 - a) + g * a;
  px[o + 2] = px[o + 2] * (1 - a) + b * a;
}

function disc(cx, cy, rad, [r, g, b], a) {
  const x0 = Math.floor(cx - rad - 1);
  const x1 = Math.ceil(cx + rad + 1);
  const y0 = Math.floor(cy - rad - 1);
  const y1 = Math.ceil(cy + rad + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const cov = Math.min(1, Math.max(0, rad - d + 0.5));
      if (cov > 0) blend(x, y, r, g, b, a * cov);
    }
  }
}

function line(x0, y0, x1, y1, thick, color, a) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len / 0.75));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thick / 2, color, a);
  }
}

// --- 1. chart-paper grid ----------------------------------------------------
const GRID = 112 * SS;
for (let gx = GRID; gx < W; gx += GRID) {
  for (let y = 0; y < H; y++) blend(gx, y, 255, 255, 255, 0.035);
}
for (let gy = GRID; gy < H; gy += GRID) {
  for (let x = 0; x < W; x++) blend(x, gy, 255, 255, 255, 0.035);
}

// --- 2. the series: calm regime, then a structural break --------------------
const N = 640;
const BREAK_I = Math.floor(N * 0.6);
const ys = new Float64Array(N);
let v = 0;
ys[0] = 0;
for (let i = 1; i < N; i++) {
  const post = i >= BREAK_I;
  const drift = post ? -0.55 : 0.18;
  const vol = post ? 3.1 : 1.0;
  v = v * 0.9 + gauss() * vol; // AR(1)-ish momentum so it reads as a market
  ys[i] = ys[i - 1] + drift + v;
}
// normalize into the frame with headroom
let lo = Infinity, hi = -Infinity;
for (const y of ys) {
  if (y < lo) lo = y;
  if (y > hi) hi = y;
}
const yPix = (y) => H * 0.16 + ((hi - y) / (hi - lo)) * H * 0.66;
const xPix = (i) => (i / (N - 1)) * W;
const breakX = xPix(BREAK_I);

// --- 3. regime tints + rolling ±2σ band -------------------------------------
const ICE = [170, 200, 255];
const ROSE = [248, 113, 113];
const EMERALD = [52, 211, 153];
for (let x = 0; x < W; x++) {
  const post = x >= breakX;
  const [r, g, b] = post ? ROSE : ICE;
  for (let y = 0; y < H; y++) blend(x, y, r, g, b, post ? 0.022 : 0.014);
}
const WIN = 36;
for (let i = 0; i < N; i++) {
  const s = Math.max(0, i - WIN);
  let mean = 0, m2 = 0, n = 0;
  for (let j = s; j <= i; j++) {
    n++;
    const d = ys[j] - mean;
    mean += d / n;
    m2 += d * (ys[j] - mean);
  }
  const sd = n > 1 ? Math.sqrt(m2 / (n - 1)) : 0;
  const x = Math.round(xPix(i));
  const yA = Math.round(yPix(ys[i] + 2 * sd));
  const yB = Math.round(yPix(ys[i] - 2 * sd));
  for (let y = Math.min(yA, yB); y <= Math.max(yA, yB); y++) {
    blend(x, y, 255, 255, 255, 0.05);
    if (x + 1 < W) blend(x + 1, y, 255, 255, 255, 0.05);
  }
}

// --- 4. the break line (dashed, emerald) ------------------------------------
const DASH = 26 * SS;
const GAP = 18 * SS;
for (let y = Math.round(H * 0.08); y < H * 0.92; y += DASH + GAP) {
  line(breakX, y, breakX, Math.min(y + DASH, H * 0.92), 2.2 * SS, EMERALD, 0.85);
}

// --- 5. the series line: ice before the break, rose after --------------------
for (let i = 1; i < N; i++) {
  const color = i >= BREAK_I ? ROSE : ICE;
  line(xPix(i - 1), yPix(ys[i - 1]), xPix(i), yPix(ys[i]), 2.6 * SS, color, 0.95);
}
// data-point ticks every 16th sample — the tabular half of the competitions
for (let i = 0; i < N; i += 16) {
  disc(xPix(i), yPix(ys[i]), 2.4 * SS, [255, 255, 255], 0.8);
}

// --- 6. vignette -------------------------------------------------------------
const cx = W / 2, cy = H / 2;
const maxD = Math.hypot(cx, cy);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const f = 1 - 0.42 * Math.pow(Math.hypot(x - cx, y - cy) / maxD, 2.2);
    const o = (y * W + x) * 4;
    px[o] *= f;
    px[o + 1] *= f;
    px[o + 2] *= f;
  }
}

// --- 7. downsample 2x and encode ---------------------------------------------
const out = new Uint8ClampedArray(OUT_W * OUT_H * 4);
for (let y = 0; y < OUT_H; y++) {
  for (let x = 0; x < OUT_W; x++) {
    const o = (y * OUT_W + x) * 4;
    for (let c = 0; c < 3; c++) {
      const a = (2 * y * W + 2 * x) * 4 + c;
      out[o + c] = (px[a] + px[a + 4] + px[a + W * 4] + px[a + W * 4 + 4]) / 4;
    }
    out[o + 3] = 255;
  }
}

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
  const buf = Buffer.alloc(8 + data.length + 4);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  buf.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])), 8 + data.length);
  return buf;
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(OUT_W, 0);
ihdr.writeUInt32BE(OUT_H, 4);
ihdr[8] = 8;
ihdr[9] = 6; // 8-bit RGBA
const raw = Buffer.alloc(OUT_H * (OUT_W * 4 + 1));
for (let y = 0; y < OUT_H; y++) {
  Buffer.from(out.buffer, y * OUT_W * 4, OUT_W * 4).copy(raw, y * (OUT_W * 4 + 1) + 1);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const dest = new URL('../public/projects/crunchdao.png', import.meta.url);
writeFileSync(dest, png);
console.log(`crunchdao.png: ${OUT_W}x${OUT_H}, ${(png.length / 1024).toFixed(1)} KB`);
