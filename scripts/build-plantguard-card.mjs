// ---------------------------------------------------------------------------
// build-plantguard-card.mjs — renders public/projects/plantguard.png, the
// project-card artwork for PlantGuard AI. A procedurally drawn diseased leaf
// (seeded lesions) with a Grad-CAM-style heat map over it — the same kind of
// explanation the real app shows next to each prediction. Illustrative art,
// generated from scratch (no photo, no model output): deterministic, seed 231
// (the paper ID). Supersampled 2x. Run: node scripts/build-plantguard-card.mjs
// ---------------------------------------------------------------------------

import { writeFileSync } from 'node:fs';
import { Raster, encodePng, mulberry32 } from './lib/raster.mjs';

const OUT_W = 1600;
const OUT_H = 1000;
const SS = 2;
const W = OUT_W * SS;
const H = OUT_H * SS;
const rng = mulberry32(231);

const ICE = [170, 200, 255];
const r = new Raster(W, H, [8, 12, 11]);

// soft green atmosphere behind the leaf
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - W * 0.5) / W, (y - H * 0.52) / H);
    r.blend(x, y, 30, 90, 55, Math.max(0, 0.16 - d * 0.3));
  }
}

// leaf geometry in a rotated local frame (u along the midrib, v across it)
const CX = W * 0.5;
const CY = H * 0.52;
const THETA = -0.62;
const COS = Math.cos(THETA);
const SIN = Math.sin(THETA);
const L = 2000;
const WMAX = 440;
const halfWidth = (s) => WMAX * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.85)), 0.9);
const bend = (s) => 0.16 * L * (s - 0.5) * (s - 0.5);

// seeded lesions (leaf coordinates)
const lesions = [];
for (let i = 0; i < 6; i++) {
  const s = 0.3 + rng() * 0.48;
  const f = (rng() - 0.5) * 1.05;
  lesions.push({
    u: s * L,
    v: f * halfWidth(s),
    rad: 46 + rng() * 54,
  });
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const jet = (h) => [
  255 * clamp01(1.5 - Math.abs(4 * h - 3)),
  255 * clamp01(1.5 - Math.abs(4 * h - 2)),
  255 * clamp01(1.5 - Math.abs(4 * h - 1)),
];

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - CX;
    const dy = y - CY;
    const u = dx * COS + dy * SIN + L / 2;
    const vRaw = -dx * SIN + dy * COS;
    const s = u / L;
    if (s <= 0 || s >= 1) continue;
    const v = vRaw - bend(s);
    const hw = halfWidth(s);
    const av = Math.abs(v);
    if (av >= hw) continue;

    // leaf body: darker toward the margin, brighter near the midrib
    const e = 1 - av / hw;
    let cr = 20 + 30 * e + 8 * (1 - s);
    let cg = 74 + 56 * e + 10 * (1 - s);
    let cb = 40 + 26 * e;
    // veins
    if (av < 8) {
      cr += 70; cg += 55; cb += 45;
    } else if (av < hw * 0.93) {
      const q = (((u - av * 0.7) % 170) + 170) % 170;
      if (q < 6 || q > 164) {
        cr += 28; cg += 30; cb += 22;
      }
    }
    r.blend(x, y, cr, cg, cb, 1);

    // lesions + chlorotic halo, and the Grad-CAM heat over them
    let heat = 0;
    for (const les of lesions) {
      const d2 = (u - les.u) * (u - les.u) + (v - les.v) * (v - les.v);
      const halo = Math.exp(-d2 / (2 * (1.15 * les.rad) ** 2));
      const core = Math.exp(-d2 / (2 * (0.5 * les.rad) ** 2));
      r.blend(x, y, 188, 170, 62, 0.34 * halo);
      r.blend(x, y, 108, 62, 26, 0.88 * core);
      heat = Math.max(heat, Math.exp(-d2 / (2 * (1.55 * les.rad) ** 2)));
    }
    if (heat > 0.1) {
      const [hr, hg, hb] = jet(heat);
      r.blend(x, y, hr, hg, hb, Math.min(0.74, ((heat - 0.1) / 0.9) * 0.95));
    }
  }
}

// inspection brackets
const BR = 150;
const T = 9 * SS * 0.5;
const corners = [
  [0.075 * W, 0.09 * H, 1, 1],
  [0.925 * W, 0.09 * H, -1, 1],
  [0.075 * W, 0.91 * H, 1, -1],
  [0.925 * W, 0.91 * H, -1, -1],
];
for (const [bx, by, sx, sy] of corners) {
  r.line(bx, by, bx + sx * BR, by, T, ICE, 0.75);
  r.line(bx, by, bx, by + sy * BR, T, ICE, 0.75);
}

r.vignette(0.45, 2.2);
const png = encodePng(r.downsample(SS));
const dest = new URL('../public/projects/plantguard.png', import.meta.url);
writeFileSync(dest, png);
console.log(`plantguard.png: ${OUT_W}x${OUT_H}, ${(png.length / 1024).toFixed(1)} KB`);
