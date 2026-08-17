// ---------------------------------------------------------------------------
// herosim — a real binary credit-risk classifier training live in the hero.
//
// Nothing here is canned:
//   • Data: two applicant classes ("repaid" / "defaulted") drawn from seeded
//     Gaussian mixtures whose means wander under Ornstein–Uhlenbeck drift,
//     so the distribution never repeats.
//   • Model: a tiny MLP (2-16-16-1, tanh, sigmoid head) written on plain
//     Float32Arrays, trained by minibatch SGD every frame.
//   • Metrics: cross-entropy on the live training stream and accuracy on a
//     FRESH holdout sample from the generator (an honest metric).
// The visitor's pointer shoves real particles, which shifts the empirical
// distribution SGD sees — the boundary re-learns causally, not on a script.
// ---------------------------------------------------------------------------

// Seeded PRNG (mulberry32) + Box-Muller gaussian
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

export function gaussianFactory(rng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    v = rng();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}

// ---------------------------------------------------------------------------
// TinyMLP 2-16-16-1 — forward, backward, SGD. No libraries.
// ---------------------------------------------------------------------------
const H = 16;

export class TinyMLP {
  w1 = new Float32Array(H * 2);
  b1 = new Float32Array(H);
  w2 = new Float32Array(H * H);
  b2 = new Float32Array(H);
  w3 = new Float32Array(H);
  b3 = 0;

  // scratch (per-sample activations)
  private a1 = new Float32Array(H);
  private a2 = new Float32Array(H);
  // scratch (gradient accumulators)
  private gw1 = new Float32Array(H * 2);
  private gb1 = new Float32Array(H);
  private gw2 = new Float32Array(H * H);
  private gb2 = new Float32Array(H);
  private gw3 = new Float32Array(H);
  private gb3 = 0;
  private dz1 = new Float32Array(H);
  private dz2 = new Float32Array(H);

  constructor(rng: () => number) {
    const g = gaussianFactory(rng);
    const s1 = Math.sqrt(2 / 2);
    const s2 = Math.sqrt(2 / H);
    for (let i = 0; i < this.w1.length; i++) this.w1[i] = g() * s1 * 0.6;
    for (let i = 0; i < this.w2.length; i++) this.w2[i] = g() * s2 * 0.6;
    for (let i = 0; i < this.w3.length; i++) this.w3[i] = g() * s2 * 0.6;
  }

  /** Forward pass for one sample (also used for inference); caches activations for backward. */
  forward(x0: number, x1: number): number {
    const { w1, b1, w2, b2, w3, a1, a2 } = this;
    for (let j = 0; j < H; j++) {
      a1[j] = Math.tanh(w1[j * 2] * x0 + w1[j * 2 + 1] * x1 + b1[j]);
    }
    for (let k = 0; k < H; k++) {
      let z = b2[k];
      const row = k * H;
      for (let j = 0; j < H; j++) z += w2[row + j] * a1[j];
      a2[k] = Math.tanh(z);
    }
    let z3 = this.b3;
    for (let k = 0; k < H; k++) z3 += w3[k] * a2[k];
    return 1 / (1 + Math.exp(-z3));
  }

  /**
   * One SGD minibatch. xs = [x0,x1,...], ys = 0|1 labels.
   * Returns mean binary cross-entropy over the batch.
   */
  trainBatch(xs: Float32Array, ys: Float32Array, n: number, lr: number, wd: number): number {
    const { gw1, gb1, gw2, gb2, gw3, a1, a2, dz1, dz2, w2, w3 } = this;
    gw1.fill(0); gb1.fill(0); gw2.fill(0); gb2.fill(0); gw3.fill(0);
    this.gb3 = 0;
    let loss = 0;

    for (let s = 0; s < n; s++) {
      const x0 = xs[s * 2];
      const x1 = xs[s * 2 + 1];
      const y = ys[s];
      const p = this.forward(x0, x1);
      const pc = Math.min(Math.max(p, 1e-6), 1 - 1e-6);
      loss += -(y * Math.log(pc) + (1 - y) * Math.log(1 - pc));

      const d3 = p - y; // dL/dz3
      for (let k = 0; k < H; k++) {
        gw3[k] += d3 * a2[k];
        dz2[k] = w3[k] * d3 * (1 - a2[k] * a2[k]);
      }
      this.gb3 += d3;
      for (let k = 0; k < H; k++) {
        const row = k * H;
        const d = dz2[k];
        gb2[k] += d;
        for (let j = 0; j < H; j++) gw2[row + j] += d * a1[j];
      }
      for (let j = 0; j < H; j++) {
        let da1 = 0;
        for (let k = 0; k < H; k++) da1 += w2[k * H + j] * dz2[k];
        dz1[j] = da1 * (1 - a1[j] * a1[j]);
      }
      for (let j = 0; j < H; j++) {
        gb1[j] += dz1[j];
        gw1[j * 2] += dz1[j] * x0;
        gw1[j * 2 + 1] += dz1[j] * x1;
      }
    }

    const scale = lr / n;
    for (let i = 0; i < this.w1.length; i++) this.w1[i] -= scale * gw1[i] + lr * wd * this.w1[i];
    for (let j = 0; j < H; j++) this.b1[j] -= scale * gb1[j];
    for (let i = 0; i < this.w2.length; i++) this.w2[i] -= scale * gw2[i] + lr * wd * this.w2[i];
    for (let k = 0; k < H; k++) this.b2[k] -= scale * gb2[k];
    for (let k = 0; k < H; k++) this.w3[k] -= scale * gw3[k] + lr * wd * this.w3[k];
    this.b3 -= scale * this.gb3;

    return loss / n;
  }
}

// ---------------------------------------------------------------------------
// World — drifting Gaussian-mixture applicants with light physics.
// Coordinates are normalized [0,1]²; rendering scales to pixels.
// ---------------------------------------------------------------------------
export interface Particle {
  cls: 0 | 1; // 0 = defaulted, 1 = repaid
  x: number;  // current (normalized)
  y: number;
  vx: number;
  vy: number;
  ox: number; // offset from its cluster mean (its "home" follows drift)
  oy: number;
  cluster: number; // index into means of its class
  r: number;  // draw radius px
}

interface Cluster {
  x: number;
  y: number;
  ax: number; // OU anchor
  ay: number;
}

export class World {
  particles: Particle[] = [];
  /** Indexed by class: clusters[0] = defaulted, clusters[1] = repaid. */
  clusters: [Cluster[], Cluster[]];
  rng: () => number;
  gauss: () => number;
  readonly std = 0.075;

  constructor(seed: number, count: number) {
    this.rng = mulberry32(seed);
    this.gauss = gaussianFactory(this.rng);
    // XOR-ish layout ⇒ a genuinely non-linear boundary
    this.clusters = [
      [
        { x: 0.26, y: 0.72, ax: 0.26, ay: 0.72 },
        { x: 0.76, y: 0.28, ax: 0.76, ay: 0.28 },
      ],
      [
        { x: 0.22, y: 0.32, ax: 0.22, ay: 0.32 },
        { x: 0.78, y: 0.70, ax: 0.78, ay: 0.70 },
      ],
    ];
    for (let i = 0; i < count; i++) this.particles.push(this.spawn((i % 2) as 0 | 1));
  }

  private spawn(cls: 0 | 1): Particle {
    const means = this.clusters[cls];
    const cluster = this.rng() < 0.5 ? 0 : 1;
    const m = means[cluster];
    const ox = this.gauss() * this.std;
    const oy = this.gauss() * this.std;
    return {
      cls,
      cluster,
      ox,
      oy,
      x: m.x + ox,
      y: m.y + oy,
      vx: 0,
      vy: 0,
      r: 1.3 + this.rng() * 1.2,
    };
  }

  /** Ornstein–Uhlenbeck drift of the cluster means: the world never repeats.
      Weak mean-reversion ⇒ long excursions, so a frozen model visibly decays. */
  drift() {
    const theta = 0.006;
    const sigma = 0.0042;
    for (const list of this.clusters) {
      for (const c of list) {
        c.x += theta * (c.ax - c.x) + sigma * this.gauss();
        c.y += theta * (c.ay - c.y) + sigma * this.gauss();
        c.x = Math.min(Math.max(c.x, 0.12), 0.88);
        c.y = Math.min(Math.max(c.y, 0.14), 0.86);
      }
    }
  }

  /**
   * Physics step. Pointer is in normalized coords (or far offscreen).
   * void zone (cx,cy,rx,ry) keeps the name/CTA block readable.
   */
  step(ptrX: number, ptrY: number, ptrPush: number, voidZone: { cx: number; cy: number; rx: number; ry: number } | null) {
    for (const p of this.particles) {
      const m = this.clusters[p.cls][p.cluster];
      const hx = m.x + p.ox;
      const hy = m.y + p.oy;
      // spring home + damping
      p.vx = p.vx * 0.86 + (hx - p.x) * 0.02;
      p.vy = p.vy * 0.86 + (hy - p.y) * 0.02;

      // pointer shove
      const dx = p.x - ptrX;
      const dy = p.y - ptrY;
      const d2 = dx * dx + dy * dy;
      const rad = 0.09 + ptrPush * 0.05;
      if (d2 < rad * rad && d2 > 1e-7) {
        const d = Math.sqrt(d2);
        const f = ((rad - d) / rad) * (0.012 + ptrPush * 0.02);
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }

      // soft ellipse repulsion under the headline so text stays readable
      if (voidZone) {
        const ex = (p.x - voidZone.cx) / voidZone.rx;
        const ey = (p.y - voidZone.cy) / voidZone.ry;
        const e2 = ex * ex + ey * ey;
        if (e2 < 1 && e2 > 1e-7) {
          const e = Math.sqrt(e2);
          const f = (1 - e) * 0.006;
          p.vx += (ex / e) * f * voidZone.rx;
          p.vy += (ey / e) * f * voidZone.ry;
        }
      }

      p.x += p.vx;
      p.y += p.vy;
    }
  }

  /** Fill xs/ys with a random minibatch from CURRENT particle positions. */
  sampleBatch(xs: Float32Array, ys: Float32Array, n: number): void {
    for (let s = 0; s < n; s++) {
      const p = this.particles[(this.rng() * this.particles.length) | 0];
      xs[s * 2] = p.x * 2 - 1;
      xs[s * 2 + 1] = p.y * 2 - 1;
      ys[s] = p.cls;
    }
  }

  /** Honest holdout: FRESH samples from the generator (not the particles). */
  holdoutAccuracy(net: TinyMLP, n: number): number {
    let correct = 0;
    for (let s = 0; s < n; s++) {
      const cls = (s % 2) as 0 | 1;
      const m = this.clusters[cls][this.rng() < 0.5 ? 0 : 1];
      const x = m.x + this.gauss() * this.std;
      const y = m.y + this.gauss() * this.std;
      const p = net.forward(x * 2 - 1, y * 2 - 1);
      if ((p > 0.5 ? 1 : 0) === cls) correct++;
    }
    return correct / n;
  }

  /** Press-and-hold: inject a burst cluster of applicants at the pointer. */
  inject(cls: 0 | 1, cx: number, cy: number, count: number, cap: number) {
    // clamp so bad pointer math can never seed NaN/off-world positions
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    cx = Math.min(Math.max(cx, 0.02), 0.98);
    cy = Math.min(Math.max(cy, 0.02), 0.98);
    for (let i = 0; i < count; i++) {
      const p = this.spawn(cls);
      p.x = cx + this.gauss() * 0.03;
      p.y = cy + this.gauss() * 0.03;
      // re-home the burst near where it was dropped, relative to its cluster
      const m = this.clusters[cls][p.cluster];
      p.ox = p.x - m.x;
      p.oy = p.y - m.y;
      this.particles.push(p);
    }
    while (this.particles.length > cap) this.particles.shift();
  }
}

// ---------------------------------------------------------------------------
// Decision field — evaluate the net over a coarse grid (time-sliced), then
// marching squares for the p=0.5 contour.
// ---------------------------------------------------------------------------
export class Field {
  readonly gw: number;
  readonly gh: number;
  readonly probs: Float32Array;
  /** Persistent contour segment buffer: [x1,y1,x2,y2]* — no per-frame allocation. */
  readonly segs: Float32Array;
  segCount = 0;
  private nextRow = 0;

  constructor(gw: number, gh: number) {
    this.gw = gw;
    this.gh = gh;
    this.probs = new Float32Array(gw * gh);
    this.segs = new Float32Array(gw * gh * 4);
  }

  /** Evaluate a slice of rows this frame; a full pass completes every `slices` frames. */
  evalSlice(net: TinyMLP, slices: number) {
    const rows = Math.max(1, Math.ceil(this.gh / slices));
    for (let r = 0; r < rows; r++) {
      const gy = (this.nextRow + r) % this.gh;
      const y = ((gy + 0.5) / this.gh) * 2 - 1;
      for (let gx = 0; gx < this.gw; gx++) {
        const x = ((gx + 0.5) / this.gw) * 2 - 1;
        this.probs[gy * this.gw + gx] = net.forward(x, y);
      }
    }
    this.nextRow = (this.nextRow + rows) % this.gh;
  }

  /** Marching squares at p=0.5 → fills this.segs, sets this.segCount (grid coords). */
  contour(): void {
    const { gw, gh, probs, segs } = this;
    const t = 0.5;
    const lerp = (a: number, b: number) => (t - a) / (b - a || 1e-9);
    let n = 0;
    const max = segs.length - 4;
    const push = (x1: number, y1: number, x2: number, y2: number) => {
      if (n > max) return;
      segs[n] = x1; segs[n + 1] = y1; segs[n + 2] = x2; segs[n + 3] = y2;
      n += 4;
    };
    for (let y = 0; y < gh - 1; y++) {
      for (let x = 0; x < gw - 1; x++) {
        const p00 = probs[y * gw + x];
        const p10 = probs[y * gw + x + 1];
        const p01 = probs[(y + 1) * gw + x];
        const p11 = probs[(y + 1) * gw + x + 1];
        let idx = 0;
        if (p00 > t) idx |= 1;
        if (p10 > t) idx |= 2;
        if (p11 > t) idx |= 4;
        if (p01 > t) idx |= 8;
        if (idx === 0 || idx === 15) continue;
        // interpolated crossing points on each edge
        const tx = x + lerp(p00, p10); // top
        const rx = y + lerp(p10, p11); // right (y-coord)
        const bx = x + lerp(p01, p11); // bottom
        const lx = y + lerp(p00, p01); // left (y-coord)
        switch (idx) {
          case 1: case 14: push(x, lx, tx, y); break;
          case 2: case 13: push(tx, y, x + 1, rx); break;
          case 3: case 12: push(x, lx, x + 1, rx); break;
          case 4: case 11: push(x + 1, rx, bx, y + 1); break;
          case 6: case 9: push(tx, y, bx, y + 1); break;
          case 7: case 8: push(x, lx, bx, y + 1); break;
          case 5: push(x, lx, tx, y); push(x + 1, rx, bx, y + 1); break;
          case 10: push(tx, y, x + 1, rx); push(x, lx, bx, y + 1); break;
        }
      }
    }
    this.segCount = n;
  }
}
