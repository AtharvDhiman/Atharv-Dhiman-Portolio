// ---------------------------------------------------------------------------
// radar — "mechanism 06: The Fraud Radar".
// Online anomaly detection on the visitor's own movement kinematics.
//
// Honesty contract:
//   • Features (speed, acceleration, curvature, tremor) are computed per
//     100ms window from real pointer/touch samples. Idle windows are
//     neither scored nor learned.
//   • "Normal" is the visitor's OWN rolling baseline (mean vector μ and
//     covariance Σ over their recent windows). The anomaly score is a
//     genuine squared Mahalanobis distance D² = (x−μ)ᵀΣ⁻¹(x−μ).
//   • The flag threshold is the real 99th-percentile chi-square quantile
//     for 4 degrees of freedom (13.2767). Under an IDEAL world (gaussian
//     features, independent windows, infinite baseline) ~1% of windows
//     would flag; real kinematics are non-gaussian and autocorrelated, and
//     the finite baseline widens the true quantile (Hotelling T² ≈ 17.7 at
//     n=40, → 13.28 as n→∞), so the observed rate runs above 1%. The UI
//     shows the live rate against the ideal so that gap is visible, not
//     hidden.
//   • Flagged windows are excluded from baseline updates (standard robust
//     practice) so an anomaly can't normalize itself.
//   • Zero network, zero storage. Nothing eased.
// ---------------------------------------------------------------------------

export const DIMS = 4;
export const CHI2_99_DF4 = 13.2767; // χ²₀.₉₉ with 4 degrees of freedom
const BASELINE_CAP = 300; // ~30s of active windows
export const BASELINE_MIN = 40; // windows required before scoring starts
const RIDGE = 1e-4;

export interface WindowFeatures {
  speed: number; // path length per second, in viewport diagonals
  accel: number; // |Δspeed| per second
  curvature: number; // mean |angle change| between segments (radians)
  tremor: number; // fraction of segment pairs that reverse direction
}

interface RawSample {
  x: number;
  y: number;
  t: number;
}

/** Collects raw pointer samples and emits per-window kinematic features. */
export class WindowBuilder {
  private samples: RawSample[] = [];
  private prevSpeed: number | null = null;
  private lastSampleT: number | null = null;

  add(x: number, y: number, t: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.samples.push({ x, y, t });
    if (this.samples.length > 80) this.samples.shift();
  }

  /** Close the current window; returns features or null if it was idle. */
  close(windowMs: number, now: number = performance.now()): WindowFeatures | null {
    // drop stale samples (buffered across a hidden-tab gap or long jank)
    const s = this.samples.filter((p) => now - p.t <= windowMs * 2.5);
    this.samples = [];
    if (s.length < 3) {
      this.prevSpeed = null;
      return null;
    }
    // if this window doesn't continue the previous one, accel is meaningless
    if (this.lastSampleT !== null && s[0].t - this.lastSampleT > windowMs * 5) {
      this.prevSpeed = null;
    }
    this.lastSampleT = s[s.length - 1].t;
    const diag = Math.hypot(window.innerWidth, window.innerHeight) || 1;
    let path = 0;
    let curvSum = 0;
    let curvN = 0;
    let reversals = 0;
    let pairs = 0;
    let prevVx = 0;
    let prevVy = 0;
    let havePrev = false;
    for (let i = 1; i < s.length; i++) {
      const vx = s[i].x - s[i - 1].x;
      const vy = s[i].y - s[i - 1].y;
      const len = Math.hypot(vx, vy);
      path += len;
      if (len > 0.5 && havePrev) {
        const prevLen = Math.hypot(prevVx, prevVy);
        if (prevLen > 0.5) {
          const dot = (vx * prevVx + vy * prevVy) / (len * prevLen);
          curvSum += Math.acos(Math.min(Math.max(dot, -1), 1));
          curvN++;
          pairs++;
          if (dot < 0) reversals++;
        }
      }
      if (len > 0.5) {
        prevVx = vx;
        prevVy = vy;
        havePrev = true;
      }
    }
    // real elapsed time of the window's samples — hardcoding the nominal
    // 100ms would inflate speed ~3x whenever the event loop janks
    const span = (s[s.length - 1].t - s[0].t) / 1000;
    const dt = Math.max(span, (windowMs / 1000) * 0.5);
    const speed = path / diag / dt;
    if (speed < 0.005) {
      this.prevSpeed = null;
      return null; // effectively idle
    }
    const accel = this.prevSpeed === null ? 0 : Math.abs(speed - this.prevSpeed) / dt;
    this.prevSpeed = speed;
    return {
      speed,
      accel,
      curvature: curvN ? curvSum / curvN : 0,
      tremor: pairs ? reversals / pairs : 0,
    };
  }
}

/** Rolling multivariate baseline + Mahalanobis scoring. */
export class Radar {
  private baseline: number[][] = [];
  scored = 0;
  flags = 0;
  lastD2: number | null = null;
  lastFlagged = false;

  get baselineN(): number {
    return this.baseline.length;
  }

  get ready(): boolean {
    return this.baseline.length >= BASELINE_MIN;
  }

  get flagRate(): number | null {
    return this.scored > 0 ? this.flags / this.scored : null;
  }

  /** Score a window (if the baseline is ready), then learn from it unless flagged. */
  observe(f: WindowFeatures): { d2: number | null; flagged: boolean } {
    const x = [f.speed, f.accel, f.curvature, f.tremor];
    let d2: number | null = null;
    let flagged = false;
    if (this.ready) {
      d2 = this.mahalanobis2(x);
      this.scored++;
      flagged = d2 > CHI2_99_DF4;
      if (flagged) this.flags++;
    }
    // robust update: anomalies must not drag the baseline toward themselves
    if (!flagged) {
      this.baseline.push(x);
      if (this.baseline.length > BASELINE_CAP) this.baseline.shift();
    }
    this.lastD2 = d2;
    this.lastFlagged = flagged;
    return { d2, flagged };
  }

  private mahalanobis2(x: number[]): number {
    const n = this.baseline.length;
    const mu = new Array(DIMS).fill(0);
    for (const b of this.baseline) for (let d = 0; d < DIMS; d++) mu[d] += b[d];
    for (let d = 0; d < DIMS; d++) mu[d] /= n;

    // covariance with ridge for invertibility
    const cov: number[][] = Array.from({ length: DIMS }, () => new Array(DIMS).fill(0));
    for (const b of this.baseline) {
      for (let i = 0; i < DIMS; i++) {
        for (let j = i; j < DIMS; j++) {
          cov[i][j] += (b[i] - mu[i]) * (b[j] - mu[j]);
        }
      }
    }
    for (let i = 0; i < DIMS; i++) {
      for (let j = i; j < DIMS; j++) {
        cov[i][j] /= n;
        cov[j][i] = cov[i][j];
      }
      cov[i][i] += RIDGE;
    }

    // solve Σ·z = (x−μ) by Gauss-Jordan, then D² = (x−μ)·z
    const diff = x.map((v, d) => v - mu[d]);
    const A = cov.map((row, i) => [...row, diff[i]]);
    for (let col = 0; col < DIMS; col++) {
      let pivot = col;
      for (let r = col + 1; r < DIMS; r++) {
        if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
      }
      [A[col], A[pivot]] = [A[pivot], A[col]];
      const pv = A[col][col];
      if (Math.abs(pv) < 1e-12) return 0; // degenerate — treat as unscorable-normal
      for (let c = col; c <= DIMS; c++) A[col][c] /= pv;
      for (let r = 0; r < DIMS; r++) {
        if (r === col) continue;
        const f = A[r][col];
        if (f === 0) continue;
        for (let c = col; c <= DIMS; c++) A[r][c] -= f * A[col][c];
      }
    }
    let d2 = 0;
    for (let d = 0; d < DIMS; d++) d2 += diff[d] * A[d][DIMS];
    return Math.max(d2, 0);
  }
}
