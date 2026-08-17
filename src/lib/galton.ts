// ---------------------------------------------------------------------------
// galton — "mechanism 07: The Galton Machine" (lives on /lab).
// A seeded Galton board: balls take a real random walk over ROWS peg rows
// (right with probability p at each peg) and land in BINS bins.
//
// Honesty contract:
//   • Every ball's path comes from the seeded RNG (seed 51336) — the walk
//     is genuinely random per ball, reproducible per visit.
//   • All statistics (n, mean, σ, skewness) are computed from the balls
//     that actually landed. The theoretical overlay is the exact binomial
//     pmf for a FAIR board (p = 0.5) scaled by n.
//   • The χ² goodness-of-fit statistic tests the landed histogram against
//     the fair binomial, with standard low-expectation bin merging
//     (expected ≥ 5), and is compared against the real χ²₀.₉₉ critical
//     value for the merged degrees of freedom. Tilting the board (which
//     biases p) makes this test genuinely reject — the verdict is a live
//     hypothesis test, not theater.
//   • Zero network, zero storage.
// ---------------------------------------------------------------------------

import { mulberry32 } from './herosim';

export const ROWS = 11;
export const BINS = ROWS + 1;
export const FAIR_P = 0.5;

// χ²₀.₉₉ critical values by degrees of freedom (1..11), for the live verdict
const CHI2_99: Record<number, number> = {
  1: 6.635, 2: 9.21, 3: 11.345, 4: 13.277, 5: 15.086, 6: 16.812,
  7: 18.475, 8: 20.09, 9: 21.666, 10: 23.209, 11: 24.725,
};

// binomial coefficients C(ROWS, k)
const CHOOSE: number[] = (() => {
  const c = [1];
  for (let k = 1; k <= ROWS; k++) c[k] = (c[k - 1] * (ROWS - k + 1)) / k;
  return c;
})();

/** Exact fair-binomial pmf for bin k. */
export function fairPmf(k: number): number {
  return CHOOSE[k] / Math.pow(2, ROWS);
}

export interface Ball {
  /** which peg row the ball is between (0..ROWS) */
  row: number;
  /** 0..1 progress to the next row */
  progress: number;
  /** rights taken so far — the walk's real state */
  rights: number;
  /** previous horizontal slot, for smooth drawing */
  fromSlot: number;
  /** next horizontal slot (fromSlot or fromSlot+1) */
  toSlot: number;
  /** falling into a bin after the last row */
  landed: boolean;
}

export interface GaltonStats {
  n: number;
  mean: number | null;
  sigma: number | null;
  skewness: number | null;
  theoryMean: number;
  theorySigma: number;
  chi2: number | null;
  chi2df: number | null;
  chi2crit: number | null;
  rejectsFair: boolean;
}

export class Galton {
  counts = new Array(BINS).fill(0);
  n = 0;
  /** current right-step probability; 0.5 = fair, changed by tilting */
  p = FAIR_P;
  balls: Ball[] = [];
  private rng = mulberry32(51336);

  spawn() {
    this.balls.push({ row: 0, progress: 0, rights: 0, fromSlot: 0, toSlot: 0, landed: false });
  }

  /** Advance all balls; speed is rows per second. Returns bins hit this tick. */
  tick(dtS: number, rowsPerSec: number): number[] {
    const landedBins: number[] = [];
    for (const b of this.balls) {
      b.progress += dtS * rowsPerSec;
      while (b.progress >= 1) {
        b.progress -= 1;
        b.row++;
        b.fromSlot = b.toSlot;
        if (b.row <= ROWS) {
          // the real random step
          const right = this.rng() < this.p;
          if (right) b.rights++;
          b.toSlot = b.rights;
        } else {
          b.landed = true;
          this.counts[b.rights]++;
          this.n++;
          landedBins.push(b.rights);
          break;
        }
      }
    }
    this.balls = this.balls.filter((b) => !b.landed);
    return landedBins;
  }

  /** Instantly complete a whole ball (reduced-motion path) — same real walk. */
  dropInstant(): number {
    let rights = 0;
    for (let r = 0; r < ROWS; r++) if (this.rng() < this.p) rights++;
    this.counts[rights]++;
    this.n++;
    return rights;
  }

  stats(): GaltonStats {
    const theoryMean = ROWS * FAIR_P;
    const theorySigma = Math.sqrt(ROWS * FAIR_P * (1 - FAIR_P));
    if (this.n < 2) {
      return {
        n: this.n, mean: null, sigma: null, skewness: null,
        theoryMean, theorySigma, chi2: null, chi2df: null, chi2crit: null, rejectsFair: false,
      };
    }
    let m = 0;
    for (let k = 0; k < BINS; k++) m += k * this.counts[k];
    const mean = m / this.n;
    let m2 = 0;
    let m3 = 0;
    for (let k = 0; k < BINS; k++) {
      const d = k - mean;
      m2 += this.counts[k] * d * d;
      m3 += this.counts[k] * d * d * d;
    }
    m2 /= this.n;
    m3 /= this.n;
    const sigma = Math.sqrt(m2);
    const skewness = m2 > 1e-9 ? m3 / Math.pow(m2, 1.5) : 0;

    // χ² vs fair binomial with expected≥5 merging (standard practice)
    let chi2: number | null = null;
    let chi2df: number | null = null;
    let chi2crit: number | null = null;
    let rejectsFair = false;
    if (this.n >= 50) {
      const groups: { obs: number; exp: number }[] = [];
      let accObs = 0;
      let accExp = 0;
      for (let k = 0; k < BINS; k++) {
        accObs += this.counts[k];
        accExp += this.n * fairPmf(k);
        if (accExp >= 5) {
          groups.push({ obs: accObs, exp: accExp });
          accObs = 0;
          accExp = 0;
        }
      }
      if (accExp > 0 && groups.length > 0) {
        // fold the remaining tail into the last group
        groups[groups.length - 1].obs += accObs;
        groups[groups.length - 1].exp += accExp;
      }
      if (groups.length >= 2) {
        let x2 = 0;
        for (const g of groups) x2 += ((g.obs - g.exp) * (g.obs - g.exp)) / g.exp;
        const df = groups.length - 1;
        chi2 = x2;
        chi2df = df;
        chi2crit = CHI2_99[Math.min(df, 11)] ?? 24.725;
        rejectsFair = x2 > chi2crit;
      }
    }
    return { n: this.n, mean, sigma, skewness, theoryMean, theorySigma, chi2, chi2df, chi2crit, rejectsFair };
  }
}
