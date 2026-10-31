// ---------------------------------------------------------------------------
// build-clv-card.mjs — renders public/projects/clv.png, the project-card art
// for the Customer Lifetime Value project. The plotted point is the résumé's
// own result: the top 20% of 500 customers hold 92% of predicted 12-month
// value. The curve through it is the one-parameter family y = 1 - (1-x)^k
// solved so it passes EXACTLY through (0.20, 0.92) — an illustration of the
// result, not the model's actual per-customer output. The rug along the
// bottom is the 500 customers, the first 100 (top 20%) highlighted.
// Run: node scripts/build-clv-card.mjs
// ---------------------------------------------------------------------------

import { writeFileSync } from 'node:fs';
import { Raster, encodePng } from './lib/raster.mjs';

const OUT_W = 1600;
const OUT_H = 1000;
const SS = 2;
const W = OUT_W * SS;
const H = OUT_H * SS;

const ICE = [170, 200, 255];
const EMERALD = [52, 211, 153];
const WHITE = [255, 255, 255];
const r = new Raster(W, H, [11, 11, 16]);

const PL = 170 * SS;
const PR = 1430 * SS;
const PT = 110 * SS;
const PB = 790 * SS;
const X = (f) => PL + f * (PR - PL);
const Y = (f) => PB - f * (PB - PT);

// chart-paper grid
const GRID = 112 * SS;
for (let gx = GRID; gx < W; gx += GRID) for (let y = 0; y < H; y++) r.blend(gx, y, 255, 255, 255, 0.035);
for (let gy = GRID; gy < H; gy += GRID) for (let x = 0; x < W; x++) r.blend(x, gy, 255, 255, 255, 0.035);

// the "top 20%" band
for (let x = Math.round(X(0)); x <= Math.round(X(0.2)); x++) {
  for (let y = Math.round(PT); y <= Math.round(PB); y++) r.blend(x, y, EMERALD[0], EMERALD[1], EMERALD[2], 0.055);
}

// curve through (0.20, 0.92): y = 1 - (1-x)^k
const K = Math.log(0.08) / Math.log(0.8);
const curve = (x) => 1 - Math.pow(1 - x, K);

// fill under the curve
for (let px = Math.round(PL); px <= Math.round(PR); px++) {
  const f = (px - PL) / (PR - PL);
  const top = Math.round(Y(curve(f)));
  for (let y = top; y <= PB; y++) {
    const g = (y - top) / Math.max(1, PB - top);
    r.blend(px, y, ICE[0], ICE[1], ICE[2], 0.1 * (1 - 0.8 * g));
  }
}

// equality line (what an even spread of value would look like)
r.dashedLine(X(0), Y(0), X(1), Y(1), 2.2 * SS, WHITE, 0.28, 20 * SS, 16 * SS);

// axes + ticks
r.line(PL, PT, PL, PB, 2 * SS, WHITE, 0.3);
r.line(PL, PB, PR, PB, 2 * SS, WHITE, 0.3);
for (let i = 1; i <= 5; i++) {
  r.line(X(i / 5), PB, X(i / 5), PB + 14 * SS, 2 * SS, WHITE, 0.3);
  r.line(PL, Y(i / 5), PL - 14 * SS, Y(i / 5), 2 * SS, WHITE, 0.3);
}

// the curve
let prev = null;
for (let i = 0; i <= 480; i++) {
  const f = i / 480;
  const p = [X(f), Y(curve(f))];
  if (prev) r.line(prev[0], prev[1], p[0], p[1], 3.2 * SS, ICE, 0.97);
  prev = p;
}

// the result marker: top 20% -> 92% of value
const mx = X(0.2);
const my = Y(0.92);
r.dashedLine(mx, my, mx, PB, 2.2 * SS, EMERALD, 0.8, 18 * SS, 12 * SS);
r.dashedLine(mx, my, PL, my, 2.2 * SS, EMERALD, 0.8, 18 * SS, 12 * SS);
r.disc(mx, my, 26 * SS, EMERALD, 0.18);
r.disc(mx, my, 12 * SS, EMERALD, 1);
r.disc(mx, my, 4.5 * SS, WHITE, 1);

// rug: the 500 customers, ranked by predicted value; top 20% highlighted
const N = 500;
const rugY = 868 * SS;
for (let i = 0; i < N; i++) {
  const x = PL + ((i + 0.5) / N) * (PR - PL);
  const top = i < N * 0.2;
  r.line(x, rugY - 11 * SS, x, rugY + 11 * SS, 1.15 * SS, top ? EMERALD : ICE, top ? 0.95 : 0.55);
}

r.vignette(0.42, 2.2);
const png = encodePng(r.downsample(SS));
const dest = new URL('../public/projects/clv.png', import.meta.url);
writeFileSync(dest, png);
console.log(`clv.png: ${OUT_W}x${OUT_H}, ${(png.length / 1024).toFixed(1)} KB`);
