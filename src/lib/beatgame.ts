// ---------------------------------------------------------------------------
// beatgame — "mechanism 09: Beat My Model".
// Human vs classifier on the same held-out points, scored with real
// confusion matrices.
//
// Honesty contract:
//   • The data is a seeded two-moons distribution — visibly curved. The
//     model is logistic regression on raw (x, y): DELIBERATELY linear on
//     curved data, so it has a structural blind spot a human can exploit.
//     Its dashed decision boundary is drawn on the field.
//   • The model is genuinely fit in your browser at game start (SGD over
//     the seeded training set; fit time and train accuracy displayed).
//   • The model's predictions for each round are computed the moment the
//     points spawn — before the human labels anything — and never change.
//   • All metrics (accuracy, precision, recall, F1) come from the real
//     cumulative confusion counts of both players on identical points.
//   • Same seed ⇒ same game. Zero network, zero storage.
// ---------------------------------------------------------------------------

import { mulberry32, gaussianFactory } from './herosim';

export interface Pt {
  x: number; // in [0,1]²
  y: number;
  cls: 0 | 1; // ground truth: 1 = repaid (emerald), 0 = defaulted (rose)
}

export interface TestPt extends Pt {
  modelPred: 0 | 1; // locked at spawn
  humanLabel: 0 | 1 | null;
}

export interface Confusion {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

export interface Metrics {
  n: number;
  correct: number;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
}

export const ROUND_SIZE = 12;
const TRAIN_N = 400;

/** seeded two-moons sample in [0,1]² — standard interleaved crescents,
    which a LINEAR classifier structurally cannot separate (~85% ceiling) */
function sampleMoons(rng: () => number, gauss: () => number, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const cls = (i % 2) as 0 | 1;
    const u = rng() * Math.PI;
    // sklearn parametrization, affine-mapped into the unit square
    const mx = cls === 1 ? Math.cos(u) : 1 - Math.cos(u);
    const my = cls === 1 ? Math.sin(u) : 0.5 - Math.sin(u);
    const X = 0.08 + 0.84 * ((mx + 1) / 3);
    const Y = 0.12 + 0.76 * (1 - (my + 0.5) / 1.5);
    out.push({
      x: Math.min(Math.max(X + gauss() * 0.045, 0.03), 0.97),
      y: Math.min(Math.max(Y + gauss() * 0.05, 0.03), 0.97),
      cls,
    });
  }
  return out;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export class BeatGame {
  readonly seed: number;
  train: Pt[];
  w = [0, 0];
  b = 0;
  fitMs = 0;
  trainAcc = 0;
  round = 0;
  test: TestPt[] = [];
  human: Confusion = { tp: 0, fp: 0, fn: 0, tn: 0 };
  model: Confusion = { tp: 0, fp: 0, fn: 0, tn: 0 };
  revealed = false;

  private rng: () => number;
  private gauss: () => number;

  constructor(seed: number) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.gauss = gaussianFactory(this.rng);
    this.train = sampleMoons(this.rng, this.gauss, TRAIN_N);
    this.fit();
    this.newRound();
  }

  /** genuine logistic-regression fit by SGD on the seeded training set */
  private fit() {
    const t0 = performance.now();
    const lr = 0.5;
    for (let epoch = 0; epoch < 300; epoch++) {
      let gw0 = 0;
      let gw1 = 0;
      let gb = 0;
      for (const p of this.train) {
        const z = this.w[0] * (p.x - 0.5) + this.w[1] * (p.y - 0.5) + this.b;
        const g = sigmoid(z) - p.cls;
        gw0 += g * (p.x - 0.5);
        gw1 += g * (p.y - 0.5);
        gb += g;
      }
      const n = this.train.length;
      this.w[0] -= (lr / n) * gw0;
      this.w[1] -= (lr / n) * gw1;
      this.b -= (lr / n) * gb;
    }
    let correct = 0;
    for (const p of this.train) if (this.predict(p.x, p.y) === p.cls) correct++;
    this.trainAcc = correct / this.train.length;
    this.fitMs = performance.now() - t0;
  }

  predict(x: number, y: number): 0 | 1 {
    return sigmoid(this.w[0] * (x - 0.5) + this.w[1] * (y - 0.5) + this.b) >= 0.5 ? 1 : 0;
  }

  /** fresh held-out points; model predictions locked immediately */
  newRound() {
    this.round++;
    this.revealed = false;
    this.test = sampleMoons(this.rng, this.gauss, ROUND_SIZE).map((p) => ({
      ...p,
      modelPred: this.predict(p.x, p.y),
      humanLabel: null,
    }));
  }

  get allLabeled(): boolean {
    return this.test.every((p) => p.humanLabel !== null);
  }

  /** cycle a point's label: null → 1 → 0 → 1 → … (no unlabeling mid-game) */
  cycleLabel(i: number) {
    if (this.revealed) return;
    const p = this.test[i];
    p.humanLabel = p.humanLabel === null ? 1 : p.humanLabel === 1 ? 0 : 1;
  }

  /** reveal: update both cumulative confusion matrices from this round */
  score(): boolean {
    if (!this.allLabeled || this.revealed) return false;
    for (const p of this.test) {
      const h = p.humanLabel as 0 | 1;
      const m = p.modelPred;
      if (p.cls === 1) {
        h === 1 ? this.human.tp++ : this.human.fn++;
        m === 1 ? this.model.tp++ : this.model.fn++;
      } else {
        h === 1 ? this.human.fp++ : this.human.tn++;
        m === 1 ? this.model.fp++ : this.model.tn++;
      }
    }
    this.revealed = true;
    return true;
  }

  static metrics(c: Confusion): Metrics {
    const n = c.tp + c.fp + c.fn + c.tn;
    if (n === 0) {
      return { n: 0, correct: 0, accuracy: null, precision: null, recall: null, f1: null };
    }
    const correct = c.tp + c.tn;
    const accuracy = correct / n;
    const precision = c.tp + c.fp > 0 ? c.tp / (c.tp + c.fp) : null;
    const recall = c.tp + c.fn > 0 ? c.tp / (c.tp + c.fn) : null;
    const f1 =
      precision !== null && recall !== null && precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : null;
    return { n, correct, accuracy, precision, recall, f1 };
  }
}
