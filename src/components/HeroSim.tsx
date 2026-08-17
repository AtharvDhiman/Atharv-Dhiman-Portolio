import React, { useEffect, useRef, useState } from 'react';
import { TinyMLP, World, Field } from '../lib/herosim';
import { telemetry } from '../lib/telemetry';

// ---------------------------------------------------------------------------
// HeroSim — "The Boundary"
// A binary credit-risk classifier (2-16-16-1 MLP) trains live behind the
// hero. Two applicant classes drift under an OU process; SGD runs every
// frame on the CURRENT particle positions, so dragging points causally
// changes what the model learns. Freeze the model and the world keeps
// drifting — holdout accuracy honestly decays. Every HUD value is the raw
// computed number for that frame: nothing is eased, tweened, or scripted.
// ---------------------------------------------------------------------------

const BEL_APPLICANTS = 51336; // the real BEL portfolio size (résumé claim)
const SEED = BEL_APPLICANTS; // deliberately reused as the RNG seed, shown in the HUD
const BATCH = 32;
const BATCHES_PER_FRAME = 3;
const LR = 0.12;
const WEIGHT_DECAY = 1e-4;
// Start after the loading screen fades (~3.1s) so visitors actually SEE the
// early convergence — the fun part — instead of arriving at a solved model.
const START_DELAY_MS = 2600;

const COL_REPAID = [52, 211, 153] as const; // emerald-400
const COL_DEFAULT = [248, 113, 113] as const; // rose-400
const FILL_REPAID = `rgba(${COL_REPAID.join(',')},0.8)`;
const FILL_DEFAULT = `rgba(${COL_DEFAULT.join(',')},0.8)`;

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

interface HeroSimProps {
  headlineRef?: React.RefObject<HTMLElement | null>;
}

export const HeroSim: React.FC<HeroSimProps> = ({ headlineRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparkRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<{ [k: string]: HTMLElement[] }>({});
  const frozenRef = useRef(false);
  const [frozen, setFrozen] = useState(false);
  const [reduced, setReduced] = useState(false);
  frozenRef.current = frozen; // ref mirrors state; single writer below

  const toggleFreeze = () => {
    const next = !frozenRef.current;
    telemetry.event(
      next ? 'boundary: model frozen by visitor — drift unmitigated' : 'boundary: training resumed',
      next ? 'warn' : 'info'
    );
    setFrozen(next);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const spark = sparkRef.current;
    if (!canvas || !spark) return;
    const ctx = canvas.getContext('2d');
    const sctx = spark.getContext('2d');
    if (!ctx || !sctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduced(prefersReduced);

    let disposed = false;
    let raf = 0;
    let stallTimer = 0;
    let startTimer = 0;
    let loopStarted = false;
    let accent = cssVar('--accent', '#f5f5f5');
    const themeObserver = new MutationObserver(() => {
      accent = cssVar('--accent', '#f5f5f5');
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // ---- sizing -----------------------------------------------------------
    const mobile = window.innerWidth < 640;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measureVoid();
      // reduced-motion has no loop to repaint after the bitmap reset
      if (prefersReduced) paintStatic();
    };

    // Soft ellipse around the headline so applicants flow around the name
    let voidZone: { cx: number; cy: number; rx: number; ry: number } | null = null;
    const measureVoid = () => {
      const h1 = headlineRef?.current ?? document.querySelector('#hero h1');
      if (!h1) return;
      const hr = h1.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      if (cr.width === 0 || cr.height === 0 || hr.width === 0) return;
      voidZone = {
        cx: (hr.left + hr.width / 2 - cr.left) / cr.width,
        cy: (hr.top + hr.height / 2 - cr.top) / cr.height,
        rx: Math.min(((hr.width / 2) * 1.3) / cr.width, 0.46),
        ry: Math.min(((hr.height / 2) * 3.2) / cr.height, 0.34),
      };
    };
    // The GSAP name-reveal animates the h1's transform for ~1.3s; re-measure
    // after it settles (and again later as belt-and-braces after the loader).
    const remeasure1 = window.setTimeout(measureVoid, 1800);
    const remeasure2 = window.setTimeout(measureVoid, 3600);
    document.fonts?.ready.then(() => {
      if (!disposed) window.setTimeout(measureVoid, 1600);
    });

    // ---- sim objects ------------------------------------------------------
    const world = new World(SEED, mobile ? 260 : 780);
    const net = new TinyMLP(world.rng);
    const field = new Field(mobile ? 48 : 88, mobile ? 30 : 50);
    const fieldCanvas = document.createElement('canvas');
    fieldCanvas.width = field.gw;
    fieldCanvas.height = field.gh;
    const fieldCtx = fieldCanvas.getContext('2d')!;
    const fieldImg = fieldCtx.createImageData(field.gw, field.gh);
    const xs = new Float32Array(BATCH * 2);
    const ys = new Float32Array(BATCH);

    let epoch = 0;
    let scored = 0;
    let lastLoss = 1;
    let holdoutAcc = 0.5;
    const lossHist: number[] = [];

    // ---- pointer (store raw client coords; convert once per frame) --------
    const ptr = {
      clientX: -9999,
      clientY: -9999,
      x: -99, // normalized, refreshed in tick
      y: -99,
      push: 0,
      holding: false,
      holdTimer: 0,
      injectTimer: 0,
    };
    const refreshPtr = () => {
      const r = canvas.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        ptr.x = -99;
        ptr.y = -99;
        return;
      }
      ptr.x = (ptr.clientX - r.left) / r.width;
      ptr.y = (ptr.clientY - r.top) / r.height;
    };
    const onMove = (e: PointerEvent) => {
      ptr.clientX = e.clientX;
      ptr.clientY = e.clientY;
    };
    const startHold = (e: PointerEvent) => {
      if (e.target !== canvas || prefersReduced) return; // don't hijack buttons/links
      ptr.holding = true;
      ptr.push = 1;
      ptr.clientX = e.clientX;
      ptr.clientY = e.clientY;
      refreshPtr();
      let side: 0 | 1 = world.rng() < 0.5 ? 0 : 1;
      ptr.holdTimer = window.setTimeout(function burst() {
        if (!ptr.holding || disposed) return;
        const burstN = mobile ? 8 : 14;
        world.inject(side, ptr.x, ptr.y, burstN, mobile ? 420 : 1150);
        telemetry.event(
          `boundary: visitor injected a ${side === 1 ? 'repaid' : 'defaulted'} cohort (n=${burstN})`,
          'info'
        );
        side = side === 0 ? 1 : 0;
        ptr.injectTimer = window.setTimeout(burst, 260);
      }, 200);
    };
    const endHold = () => {
      ptr.holding = false;
      window.clearTimeout(ptr.holdTimer);
      window.clearTimeout(ptr.injectTimer);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerdown', startHold);
    window.addEventListener('pointerup', endHold);
    window.addEventListener('pointercancel', endHold);

    // ---- drawing ----------------------------------------------------------
    const rebuildFieldImage = () => {
      const { probs } = field;
      const data = fieldImg.data;
      for (let i = 0; i < probs.length; i++) {
        const p = probs[i];
        const conf = Math.abs(p - 0.5) * 2;
        const c = p > 0.5 ? COL_REPAID : COL_DEFAULT;
        const o = i * 4;
        data[o] = c[0];
        data[o + 1] = c[1];
        data[o + 2] = c[2];
        data[o + 3] = Math.round(conf * 30); // max ~12% wash
      }
      fieldCtx.putImageData(fieldImg, 0, 0);
    };

    const drawField = (w: number, h: number) => {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(fieldCanvas, 0, 0, w, h);
      // p=0.5 contour — cell centers sit at (g + 0.5) * cell, matching the wash
      const { segs, segCount, gw, gh } = field;
      if (segCount > 0) {
        ctx.beginPath();
        const sx = w / gw;
        const sy = h / gh;
        for (let i = 0; i < segCount; i += 4) {
          ctx.moveTo((segs[i] + 0.5) * sx, (segs[i + 1] + 0.5) * sy);
          ctx.lineTo((segs[i + 2] + 0.5) * sx, (segs[i + 3] + 0.5) * sy);
        }
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    };

    const drawParticles = (w: number, h: number) => {
      // two batched paths (one per class) instead of 780 fills
      for (const cls of [0, 1] as const) {
        ctx.fillStyle = cls === 1 ? FILL_REPAID : FILL_DEFAULT;
        ctx.beginPath();
        for (const p of world.particles) {
          if (p.cls !== cls) continue;
          const px = p.x * w;
          const py = p.y * h;
          ctx.moveTo(px + p.r, py);
          ctx.arc(px, py, p.r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };

    const drawSpark = () => {
      const sw = spark.clientWidth;
      const sh = spark.clientHeight;
      if (sw === 0) return;
      if (spark.width !== Math.round(sw * dpr)) {
        spark.width = Math.round(sw * dpr);
        spark.height = Math.round(sh * dpr);
      }
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.clearRect(0, 0, sw, sh);
      if (lossHist.length < 2) return;
      let max = 1e-6;
      for (const v of lossHist) if (v > max) max = v;
      sctx.beginPath();
      lossHist.forEach((v, i) => {
        const x = (i / (lossHist.length - 1)) * sw;
        const y = sh - (v / max) * (sh - 2) - 1;
        if (i === 0) sctx.moveTo(x, y);
        else sctx.lineTo(x, y);
      });
      sctx.strokeStyle = accent;
      sctx.lineWidth = 1.2;
      sctx.stroke();
    };

    const setHud = () => {
      const H = hudRef.current;
      const set = (k: string, txt: string) => H[k]?.forEach((el) => (el.textContent = txt));
      set('epoch', String(epoch).padStart(4, '0'));
      set('loss', lastLoss.toFixed(4));
      set('acc', `${(holdoutAcc * 100).toFixed(1)}%`);
      set('n', String(world.particles.length));
      set('scored', scored.toLocaleString('en-US'));
    };

    const paintStatic = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      rebuildFieldImage();
      drawField(w, h);
      drawParticles(w, h);
      setHud();
    };

    // ---- main loop --------------------------------------------------------
    let frame = 0;
    let lastHudAt = 0;
    let lastTickAt = 0;
    let emaFps = 0;

    // Self-canceling scheduler: cancelling any pending pair before scheduling
    // guarantees a single tick chain even across rapid hide/show cycles.
    const scheduleNext = () => {
      if (disposed) return;
      cancelAnimationFrame(raf);
      window.clearTimeout(stallTimer);
      raf = requestAnimationFrame(tick);
      // keep advancing (slowly) in throttled/non-composited contexts
      stallTimer = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        tick();
      }, 250);
    };

    const tick = () => {
      if (disposed) return;
      window.clearTimeout(stallTimer);
      if (document.hidden) {
        // fully pause when the tab is hidden; resume via visibilitychange
        return;
      }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      refreshPtr();
      world.drift();
      world.step(ptr.x, ptr.y, ptr.push, voidZone);
      if (ptr.push > 0) ptr.push = Math.max(0, ptr.push - 0.03);

      const isFrozen = frozenRef.current;
      if (!isFrozen) {
        let lossSum = 0;
        for (let b = 0; b < BATCHES_PER_FRAME; b++) {
          world.sampleBatch(xs, ys, BATCH);
          lossSum += net.trainBatch(xs, ys, BATCH, LR, WEIGHT_DECAY);
        }
        lastLoss = lossSum / BATCHES_PER_FRAME; // raw, never eased
        epoch++;
        scored += BATCH * BATCHES_PER_FRAME;
        if (frame % 4 === 0) {
          lossHist.push(lastLoss);
          if (lossHist.length > 80) lossHist.shift();
        }
        // the field only changes while the weights do
        field.evalSlice(net, 3);
        field.contour();
        rebuildFieldImage();
      }
      if (frame % 30 === 0) holdoutAcc = world.holdoutAccuracy(net, 120);

      ctx.clearRect(0, 0, w, h);
      drawField(w, h);
      drawParticles(w, h);
      if (frame % 6 === 0 && !isFrozen) drawSpark();

      const now = performance.now();
      if (lastTickAt > 0) {
        const dt = now - lastTickAt;
        if (dt > 0 && dt < 1000) emaFps = emaFps * 0.9 + (1000 / dt) * 0.1;
      }
      lastTickAt = now;
      if (now - lastHudAt > 250) {
        lastHudAt = now;
        setHud();
        telemetry.publishBoundary({
          epoch,
          loss: lastLoss,
          acc: holdoutAcc,
          frozen: isFrozen,
          n: world.particles.length,
          fps: emaFps,
          drift: world.driftMagnitude(),
        });
      }
      frame++;
      scheduleNext();
    };

    const onVisibility = () => {
      // reduced-motion visitors must never gain the animated loop this way
      if (!document.hidden && !disposed && loopStarted && !prefersReduced) {
        scheduleNext();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    resize();
    window.addEventListener('resize', resize);

    if (prefersReduced) {
      // Still real — train to convergence in chunks, then paint one frame.
      let steps = 0;
      const warm = () => {
        if (disposed) return;
        for (let i = 0; i < 40 && steps < 800; i++, steps++) {
          world.sampleBatch(xs, ys, BATCH);
          lastLoss = net.trainBatch(xs, ys, BATCH, LR, WEIGHT_DECAY);
          epoch++;
          scored += BATCH;
        }
        if (steps < 800) {
          window.setTimeout(warm, 0);
        } else {
          field.evalSlice(net, 1);
          field.contour();
          holdoutAcc = world.holdoutAccuracy(net, 200);
          paintStatic();
        }
      };
      warm();
    } else {
      // draw the untrained world immediately; SGD starts as the loader fades
      field.evalSlice(net, 1);
      field.contour();
      paintStatic();
      startTimer = window.setTimeout(() => {
        loopStarted = true;
        telemetry.event('boundary: SGD training started', 'info');
        scheduleNext();
      }, START_DELAY_MS);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(stallTimer);
      window.clearTimeout(startTimer);
      window.clearTimeout(remeasure1);
      window.clearTimeout(remeasure2);
      endHold();
      window.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', startHold);
      window.removeEventListener('pointerup', endHold);
      window.removeEventListener('pointercancel', endHold);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      themeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Both HUDs (desktop + mobile) share ref keys; setHud formats each value once.
  const hud = (key: string) => (el: HTMLElement | null) => {
    if (!el) return;
    const list = (hudRef.current[key] ||= []);
    if (!list.includes(el)) list.push(el);
  };

  const freezeBtnClasses = (compact: boolean) =>
    `pointer-events-auto cursor-pointer rounded-full border font-mono uppercase tracking-wider transition-colors ${
      compact ? 'px-2 py-0.5 text-[8px]' : 'px-2.5 py-0.5 text-[9px]'
    } ${
      frozen
        ? 'border-rose-400/60 text-rose-300'
        : 'border-stroke text-muted hover:border-accent/60 hover:text-text-primary'
    }`;

  return (
    <>
      {/* The living world — pan-y keeps mobile swipe-scrolling intact */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: 'pan-y' }}
      />

      {/* Radial dim so the headline always wins the contrast fight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 62% 48% at 50% 44%, var(--bg) 0%, color-mix(in srgb, var(--bg) 62%, transparent) 55%, transparent 100%)',
        }}
      />

      {/* Telemetry HUD — raw values straight from the sim, updated at 4Hz.
          pointer-events-none so the strip never shields the canvas; only the
          freeze button re-enables events. */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden flex-col gap-1 text-left sm:flex md:bottom-4 md:left-5">
        <div className="flex items-center gap-2.5 font-mono text-[10px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: `rgb(${COL_REPAID.join(',')})` }} />
            repaid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: `rgb(${COL_DEFAULT.join(',')})` }} />
            defaulted
          </span>
          <canvas ref={sparkRef} aria-hidden className="h-3.5 w-16" />
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[10px] text-muted">
          <span>epoch <span ref={hud('epoch')} className="text-text-primary">0000</span></span>
          <span>loss <span ref={hud('loss')} className="text-text-primary">—</span></span>
          <span>holdout acc <span ref={hud('acc')} className="text-accent">—</span></span>
          <span>n=<span ref={hud('n')} className="text-text-primary">—</span></span>
          <span>seed={SEED}</span>
        </div>
        <div className="flex items-center gap-2.5 font-mono text-[10px] text-muted">
          <span>applicants scored this visit: <span ref={hud('scored')} className="text-text-primary">0</span></span>
          <button onClick={toggleFreeze} disabled={reduced} className={freezeBtnClasses(false)}
            title="Stop SGD while the data keeps drifting — watch holdout accuracy decay"
          >
            {frozen ? 'frozen — drift is degrading accuracy' : 'freeze model'}
          </button>
        </div>
        <p className="max-w-[300px] font-mono text-[9px] leading-relaxed text-muted/80">
          live: a risk classifier is training on this page, in your browser —
          nothing leaves it. drag the applicants; hold to inject a cohort.
        </p>
      </div>

      {/* Compact mobile HUD — same raw values via shared ref keys */}
      <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 flex w-full -translate-x-1/2 flex-col items-center gap-0.5 px-3 sm:hidden">
        <div className="flex items-center gap-2 whitespace-nowrap font-mono text-[9px] text-muted">
          <span>epoch <span ref={hud('epoch')} className="text-text-primary">0000</span></span>
          <span>loss <span ref={hud('loss')} className="text-text-primary">—</span></span>
          <span>acc <span ref={hud('acc')} className="text-accent">—</span></span>
          <button onClick={toggleFreeze} disabled={reduced} className={freezeBtnClasses(true)}>
            {frozen ? 'frozen' : 'freeze'}
          </button>
        </div>
        <p className="font-mono text-[8px] text-muted/70">
          a live classifier trains in your browser — nothing leaves this page
        </p>
      </div>
    </>
  );
};
