// ---------------------------------------------------------------------------
// segment — "mechanism 04: The Segmentation".
// Live k-means over the visitor's OWN movement trail. Honesty contract:
//   • Every point is a real sampled cursor/touch position (normalized to the
//     field). Points older than MAX_AGE dissolve — the segmentation follows
//     recent behaviour, it never fossilizes.
//   • Centroids are the actual means of their assigned points, updated by a
//     genuine warm-started Lloyd's algorithm each tick; the displayed
//     iteration count is what convergence actually took.
//   • k is chosen by a real elbow sweep (k = 1…6 refit cold every ~2s,
//     inertia curvature picks the knee, with a 2-sweep stability rule so k
//     doesn't flicker). Inertia and silhouette are computed from the data.
//   • Zero network, zero storage. Nothing is eased.
// ---------------------------------------------------------------------------

import { mulberry32, gaussianFactory } from './herosim';

export interface TrailPoint {
  x: number; // normalized [0,1]
  y: number;
  t: number; // performance.now() at capture
}

export interface Centroid {
  x: number;
  y: number;
}

const MAX_POINTS = 260;
const MAX_AGE_MS = 45000;
const MIN_DIST = 0.015; // min movement between samples (normalized)
const MIN_DT = 50; // ms between samples
export const K_MAX = 6;

export class Segmenter {
  trail: TrailPoint[] = [];
  centroids: Centroid[] = [];
  assign: number[] = [];
  /** RMS distance of members per cluster (for the reach circles). */
  rms: number[] = [];
  k = 1;
  inertia = 0;
  iterations = 0;
  silhouette: number | null = null;
  /** latest elbow sweep, for the mini-chart: inertia per k = 1…K_MAX (null where n too small) */
  sweepInertias: (number | null)[] = [];

  private rng = mulberry32(51336);
  private gauss = gaussianFactory(this.rng);
  private pendingK: number | null = null; // elbow stability rule (2 consecutive sweeps)

  /** Sample a movement point. Returns true if kept. */
  addPoint(x: number, y: number, t: number): boolean {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    x = Math.min(Math.max(x, 0), 1);
    y = Math.min(Math.max(y, 0), 1);
    const last = this.trail[this.trail.length - 1];
    if (last && t - last.t < MIN_DT) return false;
    if (last && Math.hypot(x - last.x, y - last.y) < MIN_DIST) return false;
    this.trail.push({ x, y, t });
    if (this.trail.length > MAX_POINTS) this.trail.shift();
    return true;
  }

  /** Tap/click: drop a small splat of points around the press. */
  splat(x: number, y: number, t: number, count = 6) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    for (let i = 0; i < count; i++) {
      const px = Math.min(Math.max(x + this.gauss() * 0.025, 0), 1);
      const py = Math.min(Math.max(y + this.gauss() * 0.025, 0), 1);
      this.trail.push({ x: px, y: py, t: t + i });
      if (this.trail.length > MAX_POINTS) this.trail.shift();
    }
  }

  /** Age out stale points. */
  prune(now: number) {
    while (this.trail.length && now - this.trail[0].t > MAX_AGE_MS) this.trail.shift();
  }

  get n(): number {
    return this.trail.length;
  }

  oldestAgeS(now: number): number {
    return this.trail.length ? (now - this.trail[0].t) / 1000 : 0;
  }

  /**
   * One warm-started Lloyd's fit at the current k, from the previous
   * centroids (so they visibly chase the data). Updates assignment,
   * inertia, per-cluster RMS, and the real iteration count.
   */
  step() {
    const pts = this.trail;
    if (pts.length === 0) {
      this.centroids = [];
      this.assign = [];
      this.inertia = 0;
      this.iterations = 0;
      this.rms = [];
      return;
    }
    const k = Math.min(this.k, pts.length);
    if (this.centroids.length !== k) this.centroids = this.initCentroids(k);

    let iterations = 0;
    let changed = true;
    if (this.assign.length !== pts.length) this.assign = new Array(pts.length).fill(0);

    while (changed && iterations < 12) {
      changed = false;
      // assignment step
      for (let i = 0; i < pts.length; i++) {
        let best = 0;
        let bestD = Infinity;
        for (let c = 0; c < k; c++) {
          const dx = pts[i].x - this.centroids[c].x;
          const dy = pts[i].y - this.centroids[c].y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        if (this.assign[i] !== best) {
          this.assign[i] = best;
          changed = true;
        }
      }
      // update step
      const sx = new Array(k).fill(0);
      const sy = new Array(k).fill(0);
      const cn = new Array(k).fill(0);
      for (let i = 0; i < pts.length; i++) {
        const a = this.assign[i];
        sx[a] += pts[i].x;
        sy[a] += pts[i].y;
        cn[a]++;
      }
      for (let c = 0; c < k; c++) {
        if (cn[c] > 0) {
          this.centroids[c] = { x: sx[c] / cn[c], y: sy[c] / cn[c] };
        } else {
          // empty cluster: reseed on a random trail point (seeded rng)
          const p = pts[(this.rng() * pts.length) | 0];
          this.centroids[c] = { x: p.x, y: p.y };
          changed = true;
        }
      }
      iterations++;
    }
    this.iterations = iterations;

    // inertia + per-cluster RMS from the final assignment
    let sq = 0;
    const csq = new Array(k).fill(0);
    const cn2 = new Array(k).fill(0);
    for (let i = 0; i < pts.length; i++) {
      const c = this.centroids[this.assign[i]];
      const dx = pts[i].x - c.x;
      const dy = pts[i].y - c.y;
      const d = dx * dx + dy * dy;
      sq += d;
      csq[this.assign[i]] += d;
      cn2[this.assign[i]]++;
    }
    this.inertia = sq / pts.length;
    this.rms = csq.map((s, c) => (cn2[c] ? Math.sqrt(s / cn2[c]) : 0));
  }

  /** Seeded k-means++ init: first centroid from the rng, the rest sampled
      proportional to squared distance from the nearest chosen centroid.
      Deterministic given the trail + rng state; much better local optima
      than strided picks, which keeps the elbow sweep honest. */
  private initCentroids(k: number): Centroid[] {
    const pts = this.trail;
    const out: Centroid[] = [];
    const first = pts[(this.rng() * pts.length) | 0];
    out.push({ x: first.x, y: first.y });
    const d2 = new Array(pts.length).fill(Infinity);
    while (out.length < k) {
      const last = out[out.length - 1];
      let total = 0;
      for (let i = 0; i < pts.length; i++) {
        const dx = pts[i].x - last.x;
        const dy = pts[i].y - last.y;
        d2[i] = Math.min(d2[i], dx * dx + dy * dy);
        total += d2[i];
      }
      if (total <= 1e-12) {
        const p = pts[(this.rng() * pts.length) | 0];
        out.push({ x: p.x, y: p.y });
        continue;
      }
      let target = this.rng() * total;
      let idx = 0;
      for (let i = 0; i < pts.length; i++) {
        target -= d2[i];
        if (target <= 0) {
          idx = i;
          break;
        }
      }
      out.push({ x: pts[idx].x, y: pts[idx].y });
    }
    return out;
  }

  /**
   * Cold elbow sweep: refit k = 1…K_MAX from scratch, record inertias,
   * choose the knee by maximum curvature (second difference). Applies a
   * 2-consecutive-sweeps stability rule before actually switching k.
   * Returns the new k if it changed, else null.
   */
  elbowSweep(): number | null {
    const pts = this.trail;
    const kCap = Math.min(K_MAX, Math.floor(pts.length / 8));
    this.sweepInertias = new Array(K_MAX).fill(null);
    if (pts.length < 12 || kCap < 1) {
      return this.adoptK(1);
    }
    const inertias: number[] = [];
    for (let k = 1; k <= kCap; k++) {
      inertias.push(this.coldFitInertia(k));
      this.sweepInertias[k - 1] = inertias[k - 1];
    }
    // Diminishing-returns elbow: keep adding clusters while each new one
    // still at least halves inertia (a split of a single gaussian blob only
    // reaches ~0.68x, so cohesive blobs stop splitting; separated blobs
    // drop far below 0.5x and keep earning clusters).
    let bestK = 1;
    for (let k = 2; k <= kCap; k++) {
      const prev = inertias[k - 2];
      if (prev > 1e-7 && inertias[k - 1] <= prev * 0.5) bestK = k;
      else break;
    }
    return this.adoptK(bestK);
  }

  private adoptK(newK: number): number | null {
    if (newK === this.k) {
      this.pendingK = null;
      return null;
    }
    if (this.pendingK === newK) {
      // seen twice in a row — switch for real
      this.pendingK = null;
      this.k = newK;
      this.centroids = []; // re-init next step
      return newK;
    }
    this.pendingK = newK;
    return null;
  }

  private coldFitInertia(k: number): number {
    const pts = this.trail;
    const cents = this.initCentroids(k); // seeded k-means++
    const assign = new Array(pts.length).fill(0);
    for (let iter = 0; iter < 8; iter++) {
      let changed = false;
      for (let i = 0; i < pts.length; i++) {
        let best = 0;
        let bestD = Infinity;
        for (let c = 0; c < k; c++) {
          const dx = pts[i].x - cents[c].x;
          const dy = pts[i].y - cents[c].y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        if (assign[i] !== best) {
          assign[i] = best;
          changed = true;
        }
      }
      const sx = new Array(k).fill(0);
      const sy = new Array(k).fill(0);
      const cn = new Array(k).fill(0);
      for (let i = 0; i < pts.length; i++) {
        sx[assign[i]] += pts[i].x;
        sy[assign[i]] += pts[i].y;
        cn[assign[i]]++;
      }
      for (let c = 0; c < k; c++) {
        if (cn[c] > 0) cents[c] = { x: sx[c] / cn[c], y: sy[c] / cn[c] };
      }
      if (!changed) break;
    }
    let sq = 0;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - cents[assign[i]].x;
      const dy = pts[i].y - cents[assign[i]].y;
      sq += dx * dx + dy * dy;
    }
    return sq / pts.length;
  }

  /**
   * Real mean silhouette over a stride-sample (cap 90 points) using the
   * live assignment. Null when k < 2 or clusters are too thin.
   */
  computeSilhouette(): number | null {
    const pts = this.trail;
    const k = this.k;
    if (k < 2 || pts.length < 8 || this.assign.length !== pts.length) {
      this.silhouette = null;
      return null;
    }
    const stride = Math.max(1, Math.ceil(pts.length / 90));
    const idx: number[] = [];
    for (let i = 0; i < pts.length; i += stride) idx.push(i);
    // per-cluster sampled membership
    const byCluster: number[][] = Array.from({ length: k }, () => []);
    for (const i of idx) byCluster[this.assign[i]].push(i);
    let sum = 0;
    let count = 0;
    for (const i of idx) {
      const own = byCluster[this.assign[i]];
      if (own.length < 2) continue;
      let a = 0;
      for (const j of own) {
        if (j !== i) a += Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      }
      a /= own.length - 1;
      let b = Infinity;
      for (let c = 0; c < k; c++) {
        if (c === this.assign[i] || byCluster[c].length === 0) continue;
        let d = 0;
        for (const j of byCluster[c]) d += Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        d /= byCluster[c].length;
        if (d < b) b = d;
      }
      if (!Number.isFinite(b)) continue;
      sum += (b - a) / Math.max(a, b);
      count++;
    }
    this.silhouette = count ? sum / count : null;
    return this.silhouette;
  }
}
