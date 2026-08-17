// ---------------------------------------------------------------------------
// optimizers — "mechanism 08: The Optimizer Races" (on /lab).
// A seeded loss landscape (mixture of gaussians over a bowl) and three real
// optimizers racing on it: SGD, SGD+Momentum, and Adam.
//
// Honesty contract:
//   • The terrain is a closed-form function; gradients are ANALYTIC (exact
//     partial derivatives of the mixture), not numeric approximations.
//   • Each racer runs its textbook update rule with the hyperparameters
//     printed on screen. Losses, step counts, and verdicts (converged /
//     local minimum / wandering) are raw measurements of what happened.
//   • "best known minimum" is found by grid search over the rendered
//     terrain and labeled as exactly that.
//   • Same seed ⇒ same terrain. Zero network, zero storage.
// ---------------------------------------------------------------------------

import { mulberry32 } from './herosim';

export interface Bump {
  x: number;
  y: number;
  amp: number; // negative = valley, positive = hill
  s2: number; // sigma squared
}

export interface Terrain {
  seed: number;
  bumps: Bump[];
  /** grid-search argmin over the unit square (labeled "best known") */
  best: { x: number; y: number; loss: number };
}

export function makeTerrain(seed: number): Terrain {
  const rng = mulberry32(seed);
  const bumps: Bump[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    bumps.push({
      x: 0.12 + rng() * 0.76,
      y: 0.12 + rng() * 0.76,
      amp: (rng() < 0.55 ? -1 : 1) * (0.35 + rng() * 0.65),
      s2: Math.pow(0.06 + rng() * 0.1, 2),
    });
  }
  const t: Terrain = { seed, bumps, best: { x: 0.5, y: 0.5, loss: Infinity } };
  // grid search for the best known minimum (96×96)
  for (let gy = 0; gy < 96; gy++) {
    for (let gx = 0; gx < 96; gx++) {
      const x = (gx + 0.5) / 96;
      const y = (gy + 0.5) / 96;
      const l = loss(t, x, y);
      if (l < t.best.loss) t.best = { x, y, loss: l };
    }
  }
  return t;
}

/** the closed-form loss: gentle centering bowl + gaussian bumps/valleys */
export function loss(t: Terrain, x: number, y: number): number {
  let v = 1.2 * ((x - 0.5) ** 2 + (y - 0.5) ** 2);
  for (const b of t.bumps) {
    const dx = x - b.x;
    const dy = y - b.y;
    v += b.amp * Math.exp(-(dx * dx + dy * dy) / (2 * b.s2));
  }
  return v;
}

/** exact analytic gradient of the loss above */
export function grad(t: Terrain, x: number, y: number): [number, number] {
  let gx = 2.4 * (x - 0.5);
  let gy = 2.4 * (y - 0.5);
  for (const b of t.bumps) {
    const dx = x - b.x;
    const dy = y - b.y;
    const e = b.amp * Math.exp(-(dx * dx + dy * dy) / (2 * b.s2));
    gx += e * (-dx / b.s2);
    gy += e * (-dy / b.s2);
  }
  return [gx, gy];
}

export type RacerKind = 'sgd' | 'momentum' | 'adam';

export interface RacerSpec {
  kind: RacerKind;
  label: string;
  rule: string; // the formula, shown on screen
  hyper: string;
}

export const RACERS: RacerSpec[] = [
  { kind: 'sgd', label: 'SGD', rule: 'θ ← θ − η∇L', hyper: 'η=0.010' },
  { kind: 'momentum', label: 'Momentum', rule: 'v ← βv − η∇L; θ ← θ + v', hyper: 'η=0.010, β=0.90' },
  { kind: 'adam', label: 'Adam', rule: 'm̂/√v̂ update', hyper: 'η=0.020, β₁=0.9, β₂=0.999' },
];

export type RacerStatus = 'racing' | 'converged' | 'local-min' | 'wandering';

export interface Racer {
  kind: RacerKind;
  x: number;
  y: number;
  vx: number; // momentum velocity
  vy: number;
  mx: number; // adam first moment
  my: number;
  sx: number; // adam second moment
  sy: number;
  steps: number;
  loss: number;
  gradNorm: number;
  calmSteps: number;
  status: RacerStatus;
  trail: number[]; // x,y pairs, capped
}

const MAX_STEPS = 4000;
const GRAD_EPS = 2e-3;
const CALM_NEEDED = 12;
const TRAIL_CAP = 700 * 2;

export function spawnRacers(t: Terrain, x: number, y: number): Racer[] {
  return RACERS.map((r) => ({
    kind: r.kind,
    x, y, vx: 0, vy: 0, mx: 0, my: 0, sx: 0, sy: 0,
    steps: 0,
    loss: loss(t, x, y),
    gradNorm: Math.hypot(...grad(t, x, y)),
    calmSteps: 0,
    status: 'racing' as RacerStatus,
    trail: [x, y],
  }));
}

/** one real optimizer step; returns false when the racer is finished */
export function step(t: Terrain, r: Racer, bestLoss: number): boolean {
  if (r.status !== 'racing') return false;
  const [gx, gy] = grad(t, r.x, r.y);
  r.gradNorm = Math.hypot(gx, gy);

  if (r.kind === 'sgd') {
    const lr = 0.01;
    r.x -= lr * gx;
    r.y -= lr * gy;
  } else if (r.kind === 'momentum') {
    const lr = 0.01;
    const beta = 0.9;
    r.vx = beta * r.vx - lr * gx;
    r.vy = beta * r.vy - lr * gy;
    r.x += r.vx;
    r.y += r.vy;
  } else {
    const lr = 0.02;
    const b1 = 0.9;
    const b2 = 0.999;
    const eps = 1e-8;
    r.mx = b1 * r.mx + (1 - b1) * gx;
    r.my = b1 * r.my + (1 - b1) * gy;
    r.sx = b2 * r.sx + (1 - b2) * gx * gx;
    r.sy = b2 * r.sy + (1 - b2) * gy * gy;
    const tt = r.steps + 1;
    const mhx = r.mx / (1 - Math.pow(b1, tt));
    const mhy = r.my / (1 - Math.pow(b1, tt));
    const shx = r.sx / (1 - Math.pow(b2, tt));
    const shy = r.sy / (1 - Math.pow(b2, tt));
    r.x -= (lr * mhx) / (Math.sqrt(shx) + eps);
    r.y -= (lr * mhy) / (Math.sqrt(shy) + eps);
  }

  // keep racers on the map (walls, honestly reported by position clamp)
  r.x = Math.min(Math.max(r.x, 0.01), 0.99);
  r.y = Math.min(Math.max(r.y, 0.01), 0.99);
  r.steps++;
  r.loss = loss(t, r.x, r.y);
  r.trail.push(r.x, r.y);
  if (r.trail.length > TRAIL_CAP) r.trail.splice(0, 2);

  if (r.gradNorm < GRAD_EPS) {
    r.calmSteps++;
    if (r.calmSteps >= CALM_NEEDED) {
      r.status = r.loss <= bestLoss + 0.05 ? 'converged' : 'local-min';
      return false;
    }
  } else {
    r.calmSteps = 0;
  }
  if (r.steps >= MAX_STEPS) {
    r.status = 'wandering';
    return false;
  }
  return true;
}
