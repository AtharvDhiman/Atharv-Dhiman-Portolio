import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { makeTerrain, loss, spawnRacers, step, RACERS } from '../lib/optimizers';
import type { Terrain, Racer } from '../lib/optimizers';

// ---------------------------------------------------------------------------
// OptimizerRacesSection — "mechanism 08: The Optimizer Races" (on /lab).
// A seeded loss landscape drawn as a topographic map. Click anywhere to drop
// SGD, Momentum and Adam at that initialization and watch them race downhill
// with their real update rules on exact analytic gradients. Verdicts are
// honest: converged, stuck in a local minimum, or still wandering.
// ---------------------------------------------------------------------------

const COLORS: Record<string, string> = {
  sgd: '#f87171',      // rose
  momentum: '#38bdf8', // sky
  adam: '#34d399',     // emerald
};

const BASE_SEED = 51336;

export const OptimizerRacesSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<{ [k: string]: HTMLElement[] }>({});
  const sectionRef = useRef<HTMLElement>(null);
  const [seedIdx, setSeedIdx] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let raf = 0;
    let stallTimer = 0;
    let inView = false;
    let ioFired = false;
    let dpr = 1;

    const seed = BASE_SEED + seedIdx * 7;
    const terrain: Terrain = makeTerrain(seed);
    let racers: Racer[] = [];
    const terrainCanvas = document.createElement('canvas');

    const accent = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7fd1c0';

    // --- terrain rendering (cached; posterized bands read as contours) ----
    const renderTerrain = () => {
      const gw = 132;
      const gh = 76;
      terrainCanvas.width = gw;
      terrainCanvas.height = gh;
      const tctx = terrainCanvas.getContext('2d')!;
      const img = tctx.createImageData(gw, gh);
      let lo = Infinity;
      let hi = -Infinity;
      const vals = new Float32Array(gw * gh);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const v = loss(terrain, (x + 0.5) / gw, (y + 0.5) / gh);
          vals[y * gw + x] = v;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
      // accent color parsed to rgb
      const probe = document.createElement('canvas').getContext('2d')!;
      probe.fillStyle = accent();
      const hex = probe.fillStyle as string; // normalized #rrggbb
      const ar = parseInt(hex.slice(1, 3), 16);
      const ag = parseInt(hex.slice(3, 5), 16);
      const ab = parseInt(hex.slice(5, 7), 16);
      for (let i = 0; i < vals.length; i++) {
        const t01 = (vals[i] - lo) / (hi - lo || 1);
        // valleys glow, peaks go dark; posterize into 12 bands = free contours
        const band = Math.round((1 - t01) * 12) / 12;
        const bright = 0.06 + band * 0.5;
        const o = i * 4;
        img.data[o] = Math.round(ar * bright);
        img.data[o + 1] = Math.round(ag * bright);
        img.data[o + 2] = Math.round(ab * bright);
        img.data[o + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(terrainCanvas, 0, 0, w, h);

      // best-known minimum marker
      const bx = terrain.best.x * w;
      const by = terrain.best.y * h;
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 9, by);
      ctx.lineTo(bx + 9, by);
      ctx.moveTo(bx, by - 9);
      ctx.lineTo(bx, by + 9);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // trails + racers
      for (const r of racers) {
        const col = COLORS[r.kind];
        ctx.beginPath();
        for (let i = 0; i < r.trail.length; i += 2) {
          const x = r.trail[i] * w;
          const y = r.trail[i + 1] * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 1.75;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(r.x * w, r.y * h, 4, 0, Math.PI * 2);
        ctx.fill();
        if (r.status !== 'racing') {
          ctx.beginPath();
          ctx.arc(r.x * w, r.y * h, 7.5, 0, Math.PI * 2);
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
      }
    };

    const setHud = () => {
      const H = hudRef.current;
      const set = (k: string, txt: string) => H[k]?.forEach((el) => (el.textContent = txt));
      set('seed', String(seed));
      set('best', terrain.best.loss.toFixed(3));
      for (const r of racers) {
        set(`${r.kind}-steps`, String(r.steps));
        set(`${r.kind}-loss`, r.loss.toFixed(3));
        const el = H[`${r.kind}-status`]?.[0];
        H[`${r.kind}-status`]?.forEach((s) => {
          s.textContent =
            r.status === 'racing' ? 'racing…'
            : r.status === 'converged' ? 'converged ✓'
            : r.status === 'local-min' ? 'stuck: local minimum'
            : 'wandering (step cap)';
          (s as HTMLElement).style.color =
            r.status === 'converged' ? COLORS.adam : r.status === 'racing' ? 'var(--muted)' : '#fbbf24';
        });
        void el;
      }
      if (racers.length === 0) {
        for (const spec of RACERS) {
          set(`${spec.kind}-steps`, '—');
          set(`${spec.kind}-loss`, '—');
          H[`${spec.kind}-status`]?.forEach((s) => {
            s.textContent = 'awaiting drop';
            (s as HTMLElement).style.color = 'var(--muted)';
          });
        }
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.target !== canvas) return;
      const rct = canvas.getBoundingClientRect();
      if (rct.width === 0) return;
      const x = Math.min(Math.max((e.clientX - rct.left) / rct.width, 0.02), 0.98);
      const y = Math.min(Math.max((e.clientY - rct.top) / rct.height, 0.02), 0.98);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      racers = spawnRacers(terrain, x, y);
      if (prefersReduced) {
        // no animation: run the full races synchronously, then paint once
        for (const r of racers) while (step(terrain, r, terrain.best.loss)) { /* real steps */ }
        draw();
        setHud();
      }
    };
    canvas.addEventListener('pointerdown', onDown);

    // --- loop ---------------------------------------------------------------
    let hudAcc = 0;
    let lastT = 0;
    const scheduleNext = () => {
      if (disposed) return;
      cancelAnimationFrame(raf);
      window.clearTimeout(stallTimer);
      raf = requestAnimationFrame(tick);
      stallTimer = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        tick();
      }, 250);
    };
    const tick = () => {
      if (disposed) return;
      window.clearTimeout(stallTimer);
      if (document.hidden) return;
      const now = performance.now();
      const dt = lastT ? Math.min((now - lastT) / 1000, 0.25) : 0.016;
      lastT = now;
      const running = ioFired ? inView : true;
      if (running) {
        // ~120 real optimizer steps per second per racer
        const k = Math.max(1, Math.round(dt * 120));
        for (const r of racers) {
          for (let i = 0; i < k; i++) if (!step(terrain, r, terrain.best.loss)) break;
        }
        draw();
      }
      hudAcc += dt;
      if (hudAcc > 0.25) {
        hudAcc = 0;
        setHud();
      }
      scheduleNext();
    };

    const onVisibility = () => {
      if (!document.hidden && !disposed && !prefersReduced) {
        lastT = 0;
        scheduleNext();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { ioFired = true; inView = en.isIntersecting; }),
      { threshold: 0.05 }
    );
    if (sectionRef.current) io.observe(sectionRef.current);

    renderTerrain();
    resize();
    setHud();
    window.addEventListener('resize', resize);
    if (!prefersReduced) scheduleNext();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(stallTimer);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
    };
  }, [seedIdx]);

  const hud = (key: string) => (el: HTMLElement | null) => {
    if (!el) return;
    const list = (hudRef.current[key] ||= []);
    if (!list.includes(el)) list.push(el);
  };

  return (
    <section id="races" ref={sectionRef} className="bg-bg py-16 md:py-24 relative select-none border-t border-stroke/40">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-10 md:mb-14"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em] font-medium">
              Mechanism 08 — Optimization
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
            The optimizer <span className="font-display italic">races</span>
          </h2>
          <p className="text-sm text-muted max-w-lg mx-auto mt-4 font-normal">
            Gradient descent is the engine under every model I train. This is a
            real loss landscape — click anywhere to drop SGD, Momentum and Adam
            at that spot and watch them race downhill with their true update
            rules. Some starts favour Adam. Some let Momentum escape a valley
            the others die in. The verdicts don't lie.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true, margin: '-60px' }}
          className="rounded-3xl border border-stroke bg-surface/40 p-3 sm:p-5"
        >
          <canvas
            ref={canvasRef}
            aria-label="Topographic loss landscape. Click or tap to drop three optimizers at that point and race them to the minimum."
            className="h-[340px] w-full cursor-crosshair rounded-2xl border border-stroke/60 sm:h-[440px]"
            style={{ touchAction: 'pan-y' }}
          />

          {/* results board */}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {RACERS.map((spec) => (
              <div key={spec.kind} className="rounded-2xl border border-stroke bg-bg/50 px-4 py-3 font-mono text-[10px] sm:text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-text-primary">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[spec.kind] }} />
                    {spec.label}
                  </span>
                  <span ref={hud(`${spec.kind}-status`)} className="text-muted">awaiting drop</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-muted">
                  <span>steps <span ref={hud(`${spec.kind}-steps`)} className="text-text-primary">—</span></span>
                  <span>loss <span ref={hud(`${spec.kind}-loss`)} className="text-text-primary">—</span></span>
                </div>
                <div className="mt-1 text-[9px] text-muted/70">{spec.rule} · {spec.hyper}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 font-mono text-[10px] text-muted sm:text-[11px]">
            <span>
              terrain seed=<span ref={hud('seed')} className="text-text-primary">—</span>
              {' · '}best known minimum <span ref={hud('best')} className="text-accent">—</span>
              {' '}<span className="text-muted/60">(96×96 grid search, marked ⊕)</span>
            </span>
            <button
              onClick={() => setSeedIdx((i) => i + 1)}
              className="cursor-pointer rounded-full border border-stroke px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent/60 hover:text-text-primary"
            >
              new terrain
            </button>
          </div>

          <p className="mt-3 px-1 font-mono text-[9px] leading-relaxed text-muted/70">
            the landscape is a closed-form mixture of gaussians; gradients are
            exact analytic derivatives (verified against numerical
            differentiation to 1e-9). every step is the textbook update rule
            with the hyperparameters shown. "converged" means the gradient
            genuinely vanished within 0.05 of the best known minimum; "local
            minimum" means it vanished somewhere worse. same seed, same
            terrain. this mechanism makes zero network requests and stores
            nothing about you.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
