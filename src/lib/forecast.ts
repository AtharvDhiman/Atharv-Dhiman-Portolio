// ---------------------------------------------------------------------------
// forecast — "mechanism 05: The Forecast".
// An online autoregressive model predicts the visitor's scroll position a
// fixed horizon ahead, trained continuously on what they actually do.
//
// Honesty contract:
//   • The input series is the real page scroll, sampled on a fixed 100ms
//     grid. Nothing is synthetic.
//   • The model is linear AR(P) on recent scroll deltas, updated by SGD
//     only when a forecast's target time has ARRIVED and the truth is
//     known. Weights start at zero, which makes the model exactly the
//     naive persistence baseline on day one — any skill it shows was
//     genuinely learned from the visitor.
//   • MAE is computed over realized forecasts only, and always alongside
//     the persistence baseline's MAE on the same targets. The skill score
//     1 − MAE_model/MAE_naive is shown even when it is negative.
//   • Zero network, zero storage.
// ---------------------------------------------------------------------------

export const SAMPLE_MS = 100;
export const AR_ORDER = 8;
export const HORIZON_STEPS = 6; // 600ms ahead
const HISTORY_CAP = 240; // chart window (24s)
const ERR_WINDOW = 120; // rolling error window (12s of realized forecasts)
const DELTA_CLIP = 0.08; // outlier clip per 100ms step (nav jumps etc.)
const MOVE_EPS = 1e-4; // a target counts as "movement" if naive err exceeds this

export interface ForecastSample {
  y: number; // actual normalized scroll position at this step
  pred: number | null; // what was forecast FOR this step, HORIZON ago
}

interface Pending {
  dueIdx: number;
  yBase: number;
  deltas: number[];
  pred: number;
}

export class Forecaster {
  /** chart history, index-aligned on the sample grid */
  history: ForecastSample[] = [];
  /** current one-shot forecast for now + HORIZON (null until warm) */
  currentPred: number | null = null;

  w = new Float64Array(AR_ORDER); // zero init ⇒ starts as persistence
  b = 0;

  maeModel: number | null = null;
  maeNaive: number | null = null;
  skill: number | null = null;
  residStd = 0;
  updates = 0; // realized-forecast SGD updates (movement targets only)

  private idx = -1;
  private ys: number[] = [];
  private pending: Pending[] = [];
  private errs: { e: number; eN: number; r: number }[] = [];
  private lr = 1.6;

  /** Feed one sample of the real, normalized scroll position (0..1). */
  sample(yRaw: number): void {
    if (!Number.isFinite(yRaw)) return; // never let one bad read poison the model
    const y = Math.min(Math.max(yRaw, 0), 1);
    this.idx++;
    this.ys.push(y);
    if (this.ys.length > HISTORY_CAP + HORIZON_STEPS + AR_ORDER + 2) this.ys.shift();

    // resolve any forecast whose target time is now
    while (this.pending.length && this.pending[0].dueIdx <= this.idx) {
      const p = this.pending.shift()!;
      if (p.dueIdx === this.idx) this.resolve(p, y);
    }

    // make the next forecast once enough lags exist
    let pred: number | null = null;
    if (this.ys.length > AR_ORDER + 1) {
      const deltas = this.recentDeltas();
      let dHat = this.b;
      for (let i = 0; i < AR_ORDER; i++) dHat += this.w[i] * deltas[i];
      pred = Math.min(Math.max(y + dHat, 0), 1);
      this.pending.push({ dueIdx: this.idx + HORIZON_STEPS, yBase: y, deltas, pred });
    }
    this.currentPred = pred;

    this.history.push({ y, pred: null });
    if (this.history.length > HISTORY_CAP) this.history.shift();
    // attach the realized forecast for THIS step (made HORIZON ago) to history
    const h = this.history[this.history.length - 1];
    const realized = this.lastResolvedPred;
    if (realized !== null) h.pred = realized;
    this.lastResolvedPred = null;
  }

  private lastResolvedPred: number | null = null;

  private recentDeltas(): number[] {
    const n = this.ys.length;
    const out: number[] = [];
    for (let i = 0; i < AR_ORDER; i++) {
      const a = this.ys[n - 1 - i];
      const b = this.ys[n - 2 - i];
      const d = a - b;
      out.push(Math.min(Math.max(d, -DELTA_CLIP), DELTA_CLIP));
    }
    return out;
  }

  private resolve(p: Pending, yTrue: number) {
    this.lastResolvedPred = p.pred;
    const e = Math.abs(p.pred - yTrue);
    const eN = Math.abs(p.yBase - yTrue); // persistence baseline on the same target
    const active = eN > MOVE_EPS || e > MOVE_EPS;
    if (active) {
      const r = p.pred - yTrue;
      this.errs.push({ e, eN, r });
      if (this.errs.length > ERR_WINDOW) this.errs.shift();

      // SGD on squared error of the realized forecast
      for (let i = 0; i < AR_ORDER; i++) {
        this.w[i] -= this.lr * r * p.deltas[i];
        this.w[i] = Math.min(Math.max(this.w[i], -5), 5);
      }
      this.b -= this.lr * r * 0.05;
      this.b = Math.min(Math.max(this.b, -0.05), 0.05);
      this.updates++;

      // rolling metrics (movement targets only — idle would flatter both)
      let se = 0;
      let sn = 0;
      let sr2 = 0;
      for (const x of this.errs) {
        se += x.e;
        sn += x.eN;
        sr2 += x.r * x.r;
      }
      const n = this.errs.length;
      this.maeModel = se / n;
      this.maeNaive = sn / n;
      this.skill = this.maeNaive > 1e-6 ? 1 - this.maeModel / this.maeNaive : null;
      // RMS about zero (not about the residual mean): the fan is centered on
      // the raw prediction, so its σ must include any bias the model carries.
      this.residStd = Math.sqrt(sr2 / n);
    }
  }
}
