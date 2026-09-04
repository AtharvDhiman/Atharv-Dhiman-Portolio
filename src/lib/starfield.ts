// ---------------------------------------------------------------------------
// starfield.ts — the deep-space landing field.
// A seeded star system in which a subset of stars assembles into glyph
// constellations. The glyph targets are REAL: the name is rasterized to an
// offscreen canvas at runtime and star targets are sampled from the actual
// glyph pixels of the loaded font — nothing is traced by hand or pre-baked.
// Motion is plain integrated physics (drift, critically-damped springs,
// pointer repulsion); every star position is computed, never keyframed.
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** color index: 0 = theme text, 1 = ice blue, 2 = warm amber */
interface StarBase {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bvx: number; // base drift velocity to relax back to after a pointer shove
  bvy: number;
  r: number;
  baseA: number;
  twPhase: number;
  twSpeed: number;
  ci: number;
}

interface BgStar extends StarBase {
  z: number; // depth, used for wrap-around parallax speed
}

interface ConStar extends StarBase {
  tx: number;
  ty: number;
  delayMs: number; // per-star stagger after assembly begins
}

export interface GlyphBlock {
  /** interleaved x,y pairs in tight-bbox space */
  pts: Float32Array;
  count: number;
  w: number;
  h: number;
}

/**
 * Rasterize lines of text and sample star targets from the glyph pixels.
 * The stride adapts upward until the sample count fits maxPts, so the
 * constellation stays dense enough to read at any cap.
 */
export function sampleGlyphs(
  lines: string[],
  maxPts: number,
  fontFamily = "'Instrument Serif', Georgia, serif"
): GlyphBlock {
  const empty: GlyphBlock = { pts: new Float32Array(0), count: 0, w: 1, h: 1 };
  if (typeof document === 'undefined') return empty;
  const LINE_H = 150;
  const PAD = 24;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return empty;

  const font = `italic 500 ${LINE_H}px ${fontFamily}`;
  ctx.font = font;
  let maxW = 0;
  for (const ln of lines) maxW = Math.max(maxW, ctx.measureText(ln).width);
  if (maxW === 0) return empty;
  const lineGap = LINE_H * 1.14;
  const w = Math.ceil(maxW + PAD * 2);
  const h = Math.ceil(lineGap * lines.length + PAD * 2);
  canvas.width = w;
  canvas.height = h;
  // canvas reset on resize — set the state again
  ctx.font = font;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, PAD + lineGap * (i + 0.5)));

  const data = ctx.getImageData(0, 0, w, h).data;
  const collect = (stride: number): number[] => {
    const out: number[] = [];
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        if (data[(y * w + x) * 4 + 3] > 140) {
          // deterministic sub-pixel jitter so the grid never shows
          const j = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000;
          const k = (((x * 83492791) ^ (y * 2654435761)) >>> 0) % 1000;
          out.push(x + (j / 1000 - 0.5) * stride, y + (k / 1000 - 0.5) * stride);
        }
      }
    }
    return out;
  };

  let flat: number[] = [];
  for (let stride = 3; stride <= 12; stride++) {
    flat = collect(stride);
    if (flat.length / 2 <= maxPts) break;
  }
  if (flat.length === 0) return empty;

  // tight bounding box so the caller can center the block precisely
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < flat.length; i += 2) {
    if (flat[i] < minX) minX = flat[i];
    if (flat[i] > maxX) maxX = flat[i];
    if (flat[i + 1] < minY) minY = flat[i + 1];
    if (flat[i + 1] > maxY) maxY = flat[i + 1];
  }
  const pts = new Float32Array(flat.length);
  for (let i = 0; i < flat.length; i += 2) {
    pts[i] = flat[i] - minX;
    pts[i + 1] = flat[i + 1] - minY;
  }
  return {
    pts,
    count: flat.length / 2,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

const SPRING_K = 26;
const SPRING_D = 8.5;
const POINTER_R = 96;
const POINTER_F = 1500;

export class Starfield {
  readonly bg: BgStar[] = [];
  readonly con: ConStar[] = [];
  private rng: () => number;
  private w: number;
  private h: number;
  /** performance.now() timestamp when assembly begins; Infinity = not yet */
  assembleAt = Infinity;

  constructor(seed: number, w: number, h: number, bgCount: number) {
    this.rng = mulberry32(seed);
    this.w = w;
    this.h = h;
    for (let i = 0; i < bgCount; i++) {
      const z = 0.25 + this.rng() * 0.75;
      const speed = (4 + this.rng() * 9) * z;
      const ang = Math.PI * (0.9 + this.rng() * 0.3); // drift gently left-ish
      const cr = this.rng();
      this.bg.push({
        x: this.rng() * w,
        y: this.rng() * h,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed * 0.35,
        bvx: Math.cos(ang) * speed,
        bvy: Math.sin(ang) * speed * 0.35,
        z,
        r: (0.4 + this.rng() * 0.9) * (0.5 + z),
        baseA: (0.2 + this.rng() * 0.6) * z,
        twPhase: this.rng() * Math.PI * 2,
        twSpeed: 0.4 + this.rng() * 1.6,
        ci: cr < 0.78 ? 0 : cr < 0.92 ? 1 : 2,
      });
    }
  }

  /**
   * (Re)build the constellation from glyph targets placed into canvas space.
   * blockX/blockY = top-left of the scaled text block; scale maps sample
   * space onto the canvas. Per-star delays sweep left→right so the name
   * writes itself in.
   */
  setTargets(block: GlyphBlock, blockX: number, blockY: number, scale: number): void {
    this.con.length = 0;
    const rng = mulberry32(0xad0517 ^ block.count);
    for (let i = 0; i < block.count; i++) {
      const tx = blockX + block.pts[i * 2] * scale;
      const ty = blockY + block.pts[i * 2 + 1] * scale;
      const cr = rng();
      const ang = rng() * Math.PI * 2;
      const speed = 3 + rng() * 6;
      this.con.push({
        x: rng() * this.w,
        y: rng() * this.h,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        bvx: Math.cos(ang) * speed,
        bvy: Math.sin(ang) * speed,
        tx,
        ty,
        delayMs: ((tx - blockX) / Math.max(1, block.w * scale)) * 1000 + rng() * 550,
        r: 0.9 + rng() * 0.9,
        baseA: 0.68 + rng() * 0.32,
        twPhase: rng() * Math.PI * 2,
        twSpeed: 0.5 + rng() * 1.4,
        ci: cr < 0.84 ? 0 : cr < 0.94 ? 1 : 2,
      });
    }
  }

  /** place every constellation star exactly on target (reduced motion / snap) */
  snapAssembled(): void {
    for (const s of this.con) {
      s.x = s.tx;
      s.y = s.ty;
      s.vx = 0;
      s.vy = 0;
    }
  }

  beginAssembly(now: number): void {
    this.assembleAt = now;
  }

  /** integrate one step. px/py in canvas space; pass NaN to disable pointer. */
  step(dtSec: number, nowMs: number, px: number, py: number): void {
    const dt = Math.min(0.05, Math.max(0.004, dtSec));
    const usePtr = Number.isFinite(px) && Number.isFinite(py);

    for (const s of this.bg) {
      if (usePtr) this.shove(s, px, py, dt);
      // relax back toward the base drift after any shove
      s.vx += (s.bvx - s.vx) * Math.min(1, 1.6 * dt);
      s.vy += (s.bvy - s.vy) * Math.min(1, 1.6 * dt);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // wrap with a small margin so stars fade in off-edge
      if (s.x < -6) s.x += this.w + 12;
      else if (s.x > this.w + 6) s.x -= this.w + 12;
      if (s.y < -6) s.y += this.h + 12;
      else if (s.y > this.h + 6) s.y -= this.h + 12;
    }

    for (const s of this.con) {
      if (usePtr) this.shove(s, px, py, dt);
      const t = nowMs - this.assembleAt - s.delayMs;
      if (t > 0) {
        // critically-damped-ish spring onto the glyph target
        s.vx += ((s.tx - s.x) * SPRING_K - s.vx * SPRING_D) * dt;
        s.vy += ((s.ty - s.y) * SPRING_K - s.vy * SPRING_D) * dt;
      } else {
        s.vx += (s.bvx - s.vx) * Math.min(1, 1.6 * dt);
        s.vy += (s.bvy - s.vy) * Math.min(1, 1.6 * dt);
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
  }

  private shove(s: StarBase, px: number, py: number, dt: number): void {
    const dx = s.x - px;
    const dy = s.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 > POINTER_R * POINTER_R || d2 < 1e-4) return;
    const d = Math.sqrt(d2);
    const f = (POINTER_F * (1 - d / POINTER_R)) / d;
    s.vx += dx * f * dt;
    s.vy += dy * f * dt;
  }
}
