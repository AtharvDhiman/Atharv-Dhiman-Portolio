// ---------------------------------------------------------------------------
// underwrite — "The Underwriting": live, explainable inference on the visit.
//
// Honesty contract (nothing canned):
//   • At page load a logistic-regression baseline is genuinely FIT in the
//     visitor's browser by minibatch SGD over a seeded synthetic population
//     of N=51,336 sessions (the BEL portfolio size; the label is synthetic
//     and says so in the UI). Same seed ⇒ same fit within a JS engine
//     (transcendental functions may differ in the last ulp across engines).
//   • Every displayed feature value is read live from browser APIs or
//     measured pointer/scroll kinematics. Absent APIs (Safari/Firefox lack
//     navigator.connection) are imputed with the population mean and
//     labeled "imputed" — real missing-data hygiene, not a fake value.
//   • Contribution bars are w_i · z_i — mathematically exact Shapley values
//     on the log-odds of a linear model. The probability is sigmoid(w·z + b).
//     Raw numbers, never eased.
//   • Zero network calls, zero storage from this mechanism.
// ---------------------------------------------------------------------------

import { mulberry32, gaussianFactory } from './herosim';

export const POPULATION_N = 51336;
export const UNDERWRITE_SEED = 51336;

export interface FeatureSpec {
  key: string;
  label: string;
  /** live reader; undefined ⇒ imputed with population mean */
  read: (k: Kinematics) => number | undefined;
  format: (v: number) => string;
  dynamic: boolean; // updates during the visit vs fixed at load
}

export interface FeatureState {
  key: string;
  label: string;
  value: number;
  display: string;
  imputed: boolean;
  z: number;
  contribution: number; // w_i * z_i — exact linear Shapley
  dynamic: boolean;
}

export interface Underwriter {
  features: FeatureSpec[];
  mu: Float64Array;
  sigma: Float64Array;
  w: Float64Array;
  b: number;
  fitMs: number;
  finalLoss: number;
}

// --- live kinematics measured from real pointer/scroll events --------------
export class Kinematics {
  private lastX = 0;
  private lastY = 0;
  private lastT = 0;
  private emaSpeed = 0; // fraction of viewport diagonal per second
  private moved = false;
  private startedAt = performance.now();
  maxScroll = 0;

  onPointer(x: number, y: number, t: number) {
    if (this.lastT > 0) {
      const dt = (t - this.lastT) / 1000;
      if (dt > 0.001 && dt < 0.4) {
        const diag = Math.hypot(window.innerWidth, window.innerHeight) || 1;
        const v = Math.hypot(x - this.lastX, y - this.lastY) / diag / dt;
        this.emaSpeed = this.emaSpeed * 0.85 + v * 0.15;
        this.moved = true;
      }
    }
    this.lastX = x;
    this.lastY = y;
    this.lastT = t;
  }

  onScroll() {
    const doc = document.documentElement;
    const denom = doc.scrollHeight - window.innerHeight;
    if (denom > 0) {
      this.maxScroll = Math.max(this.maxScroll, Math.min(window.scrollY / denom, 1));
    }
  }

  pointerSpeed(): number | undefined {
    return this.moved ? this.emaSpeed : undefined; // undefined until first movement
  }

  scrollDepth(): number {
    return this.maxScroll;
  }

  dwellSeconds(): number {
    return (performance.now() - this.startedAt) / 1000;
  }
}

// --- feature definitions ----------------------------------------------------
const conn = () =>
  (navigator as unknown as { connection?: { downlink?: number; rtt?: number } }).connection;

export function buildFeatureSpecs(): FeatureSpec[] {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  return [
    {
      key: 'vw', label: 'viewport width', dynamic: false,
      read: () => window.innerWidth,
      format: (v) => `${Math.round(v)}px`,
    },
    {
      key: 'dpr', label: 'pixel ratio', dynamic: false,
      read: () => window.devicePixelRatio || 1,
      format: (v) => `${v.toFixed(2)}x`,
    },
    {
      key: 'cores', label: 'cpu cores', dynamic: false,
      read: () => navigator.hardwareConcurrency,
      format: (v) => String(Math.round(v)),
    },
    {
      key: 'touch', label: 'touch device', dynamic: false,
      read: () => (window.matchMedia('(pointer: coarse)').matches ? 1 : 0),
      format: (v) => (v > 0.5 ? 'yes' : 'no'),
    },
    {
      key: 'dark', label: 'dark mode pref', dynamic: false,
      read: () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 1 : 0),
      format: (v) => (v > 0.5 ? 'yes' : 'no'),
    },
    {
      key: 'hsin', label: 'hour of day (sin)', dynamic: false,
      read: () => Math.sin((hour / 24) * 2 * Math.PI),
      format: (v) => v.toFixed(2),
    },
    {
      key: 'hcos', label: 'hour of day (cos)', dynamic: false,
      read: () => Math.cos((hour / 24) * 2 * Math.PI),
      format: (v) => v.toFixed(2),
    },
    {
      key: 'down', label: 'downlink', dynamic: false,
      read: () => conn()?.downlink,
      format: (v) => `${v.toFixed(1)}Mb/s`,
    },
    {
      key: 'rtt', label: 'network rtt', dynamic: false,
      read: () => conn()?.rtt,
      format: (v) => `${Math.round(v)}ms`,
    },
    {
      key: 'speed', label: 'pointer speed', dynamic: true,
      read: (k) => k.pointerSpeed(),
      format: (v) => `${v.toFixed(2)}dg/s`,
    },
    {
      key: 'scroll', label: 'scroll depth', dynamic: true,
      read: (k) => k.scrollDepth(),
      format: (v) => `${Math.round(v * 100)}%`,
    },
    {
      key: 'dwell', label: 'dwell time', dynamic: true,
      read: (k) => k.dwellSeconds(),
      format: (v) => `${Math.round(v)}s`,
    },
  ];
}

// --- seeded synthetic population + genuine in-browser logistic fit ----------
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * Generates the seeded synthetic population, computes real μ/σ, and fits
 * logistic regression by minibatch SGD over it. Runs in a few tens of ms.
 */
export function fitUnderwriter(): Underwriter {
  const t0 = performance.now();
  const rng = mulberry32(UNDERWRITE_SEED);
  const gauss = gaussianFactory(rng);
  const specs = buildFeatureSpecs();
  const D = specs.length;
  const N = POPULATION_N;
  const X = new Float32Array(N * D);
  const Y = new Uint8Array(N);

  // Hidden generative weights: engaged sessions dwell longer, scroll deeper,
  // move the pointer, and skew to bigger screens. (Synthetic by declaration.)
  const wTrue = [0.25, 0.05, 0.1, -0.1, 0.05, 0.05, 0.05, 0.15, -0.2, 0.45, 0.9, 1.0];

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  for (let i = 0; i < N; i++) {
    const isMobile = rng() < 0.55;
    const vw = clamp(isMobile ? 390 + gauss() * 60 : 1500 + gauss() * 300, 320, 3840);
    const dpr = [1, 1.5, 2, 2.5, 3][(rng() * 5) | 0];
    const cores = [2, 4, 4, 6, 8, 8, 12, 16][(rng() * 8) | 0];
    const touch = (isMobile ? rng() < 0.9 : rng() < 0.1) ? 1 : 0;
    const dark = rng() < 0.6 ? 1 : 0;
    const hour = rng() * 24;
    const hsin = Math.sin((hour / 24) * 2 * Math.PI);
    const hcos = Math.cos((hour / 24) * 2 * Math.PI);
    const down = clamp(8 + gauss() * 5, 0.4, 50);
    const rtt = clamp(80 + gauss() * 45, 5, 400);
    const speed = Math.abs(0.4 + gauss() * 0.25);
    const scroll = clamp(0.5 + gauss() * 0.3, 0, 1);
    const dwell = Math.abs(45 + gauss() * 30);
    const row = [vw, dpr, cores, touch, dark, hsin, hcos, down, rtt, speed, scroll, dwell];
    for (let d = 0; d < D; d++) X[i * D + d] = row[d];
  }

  // real population statistics
  const mu = new Float64Array(D);
  const sigma = new Float64Array(D);
  for (let i = 0; i < N; i++) for (let d = 0; d < D; d++) mu[d] += X[i * D + d];
  for (let d = 0; d < D; d++) mu[d] /= N;
  for (let i = 0; i < N; i++) {
    for (let d = 0; d < D; d++) {
      const e = X[i * D + d] - mu[d];
      sigma[d] += e * e;
    }
  }
  for (let d = 0; d < D; d++) sigma[d] = Math.sqrt(sigma[d] / N) || 1;

  // labels from the hidden weights on standardized features + noise
  for (let i = 0; i < N; i++) {
    let z = -0.2;
    for (let d = 0; d < D; d++) z += wTrue[d] * ((X[i * D + d] - mu[d]) / sigma[d]);
    Y[i] = rng() < sigmoid(z + gauss() * 0.7) ? 1 : 0;
  }

  // genuine minibatch SGD logistic fit (2 passes over all 51,336 rows)
  const w = new Float64Array(D);
  let b = 0;
  const lr = 0.25;
  const BATCHSZ = 256;
  for (let pass = 0; pass < 2; pass++) {
    for (let start = 0; start < N; start += BATCHSZ) {
      const end = Math.min(start + BATCHSZ, N);
      const gw = new Float64Array(D);
      let gb = 0;
      for (let i = start; i < end; i++) {
        let z = b;
        for (let d = 0; d < D; d++) z += w[d] * ((X[i * D + d] - mu[d]) / sigma[d]);
        const p = sigmoid(z);
        const g = p - Y[i];
        gb += g;
        for (let d = 0; d < D; d++) gw[d] += g * ((X[i * D + d] - mu[d]) / sigma[d]);
      }
      const n = end - start;
      for (let d = 0; d < D; d++) w[d] -= (lr / n) * gw[d];
      b -= (lr / n) * gb;
    }
  }

  // exact final loss: one full pass over all N rows with the fitted weights
  let finalLoss = 0;
  for (let i = 0; i < N; i++) {
    let z = b;
    for (let d = 0; d < D; d++) z += w[d] * ((X[i * D + d] - mu[d]) / sigma[d]);
    const pc = Math.min(Math.max(sigmoid(z), 1e-7), 1 - 1e-7);
    finalLoss += -(Y[i] * Math.log(pc) + (1 - Y[i]) * Math.log(1 - pc));
  }
  finalLoss /= N;

  return { features: specs, mu, sigma, w, b, fitMs: performance.now() - t0, finalLoss };
}

// --- live scoring -----------------------------------------------------------
export interface Assessment {
  p: number;
  features: FeatureState[];
  approved: boolean;
}

export function assess(model: Underwriter, kin: Kinematics): Assessment {
  const states: FeatureState[] = [];
  let z = model.b;
  for (let d = 0; d < model.features.length; d++) {
    const spec = model.features[d];
    const raw = spec.read(kin);
    const imputed = raw === undefined || !Number.isFinite(raw);
    const value = imputed ? model.mu[d] : (raw as number);
    const zi = (value - model.mu[d]) / model.sigma[d];
    const contribution = model.w[d] * zi;
    z += contribution;
    states.push({
      key: spec.key,
      label: spec.label,
      value,
      display: spec.format(value),
      imputed,
      z: zi,
      contribution,
      dynamic: spec.dynamic,
    });
  }
  const p = sigmoid(z);
  return { p, features: states, approved: p >= 0.5 };
}
