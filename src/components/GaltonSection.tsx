import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Galton, ROWS, BINS, fairPmf } from '../lib/galton';

// ---------------------------------------------------------------------------
// GaltonSection — "mechanism 07: The Galton Machine" (on /lab).
// Seeded balls random-walk through pegs into a live histogram; the bell
// curve assembles itself. A real χ² goodness-of-fit test against the fair
// binomial runs continuously — hold a side of the board to bias the walk
// and watch the test genuinely reject; release and watch the pile heal.
// ---------------------------------------------------------------------------

const AMBER = '#fbbf24';
const ROSE = '#f87171';
const EMERALD = '#34d399';
const TILT_P = 0.13; // bias while held

export const GaltonSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<{ [k: string]: HTMLElement[] }>({});
  const verdictRef = useRef<HTMLSpanElement>(null);
  const tiltRef = useRef<HTMLSpanElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let raf = 0;
    let stallTimer = 0;
    let reducedTimer = 0;
    let inView = false;
    let ioFired = false; // some embeds never deliver IO — fall back to running
    let dpr = 1;
    let lastT = 0;
    let spawnAcc = 0;

    const g = new Galton();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    // geometry helpers
    const geom = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const topPad = 26;
      const pegAreaH = h * 0.56;
      const binAreaTop = topPad + pegAreaH + 8;
      const binAreaH = h - binAreaTop - 6;
      const sx = Math.min((w * 0.9) / BINS, 46);
      const rowDy = pegAreaH / (ROWS + 1);
      const slotX = (slot: number, row: number) => cx + (slot - row / 2) * sx;
      return { w, h, cx, topPad, rowDy, sx, binAreaTop, binAreaH, slotX };
    };

    const muted = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#888';
    const textCol = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#eee';
    const accent = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#eee';

    const draw = () => {
      const { w, h, topPad, rowDy, sx, binAreaTop, binAreaH, slotX } = geom();
      ctx.clearRect(0, 0, w, h);

      // pegs
      ctx.fillStyle = muted();
      ctx.globalAlpha = 0.75;
      for (let r = 0; r < ROWS; r++) {
        const y = topPad + (r + 1) * rowDy;
        for (let s = 0; s <= r; s++) {
          ctx.beginPath();
          ctx.arc(slotX(s, r), y, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // falling balls — real walks, smoothly interpolated between rows
      ctx.fillStyle = textCol();
      for (const b of g.balls) {
        const yFrom = topPad + b.row * rowDy;
        const x0 = b.row === 0 ? slotX(0, 0) : slotX(b.fromSlot, b.row - 1);
        const x1 = b.row >= ROWS ? slotX(b.toSlot, ROWS) : slotX(b.toSlot, b.row);
        const e = b.progress * b.progress * (3 - 2 * b.progress); // smoothstep
        const x = x0 + (x1 - x0) * e;
        const y = yFrom + rowDy * b.progress;
        ctx.beginPath();
        ctx.arc(x, Math.min(y, binAreaTop - 4), 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // bins: observed bars + fair-binomial expectation overlay
      const maxCount = Math.max(...g.counts, Math.ceil(g.n * fairPmf(Math.floor(ROWS / 2))), 1);
      const barW = sx * 0.82;
      ctx.fillStyle = accent();
      for (let k = 0; k < BINS; k++) {
        const bh = (g.counts[k] / maxCount) * (binAreaH - 4);
        const x = slotX(k, ROWS) - barW / 2;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x, binAreaTop + binAreaH - bh, barW, bh);
      }
      ctx.globalAlpha = 1;
      if (g.n >= 20) {
        ctx.beginPath();
        for (let k = 0; k < BINS; k++) {
          const eh = ((g.n * fairPmf(k)) / maxCount) * (binAreaH - 4);
          const x = slotX(k, ROWS);
          const y = binAreaTop + binAreaH - eh;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = AMBER;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // bin baseline
      ctx.beginPath();
      ctx.moveTo(slotX(0, ROWS) - sx / 2, binAreaTop + binAreaH);
      ctx.lineTo(slotX(BINS - 1, ROWS) + sx / 2, binAreaTop + binAreaH);
      ctx.strokeStyle = muted();
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const setHud = () => {
      const s = g.stats();
      const H = hudRef.current;
      const set = (k: string, txt: string) => H[k]?.forEach((el) => (el.textContent = txt));
      set('n', s.n.toLocaleString('en-US'));
      set('p', g.p.toFixed(2));
      set('mean', s.mean !== null ? s.mean.toFixed(2) : '—');
      set('tmean', s.theoryMean.toFixed(2));
      set('sigma', s.sigma !== null ? s.sigma.toFixed(2) : '—');
      set('tsigma', s.theorySigma.toFixed(2));
      set('skew', s.skewness !== null ? (s.skewness >= 0 ? '+' : '') + s.skewness.toFixed(2) : '—');
      set('chi2', s.chi2 !== null ? `${s.chi2.toFixed(1)} (df ${s.chi2df}, crit ${s.chi2crit?.toFixed(1)})` : '—');
      const v = verdictRef.current;
      if (v) {
        if (s.chi2 === null) {
          v.textContent = 'collecting…';
          v.style.color = 'var(--muted)';
        } else if (s.rejectsFair) {
          v.textContent = 'REJECTS fair binomial — the board is biased';
          v.style.color = ROSE;
        } else {
          v.textContent = 'consistent with a fair board';
          v.style.color = EMERALD;
        }
      }
      const t = tiltRef.current;
      if (t) {
        t.textContent = g.p === 0.5 ? 'level' : g.p < 0.5 ? '← tilted left' : 'tilted right →';
        t.style.color = g.p === 0.5 ? 'var(--muted)' : AMBER;
      }
    };

    // tilt interaction: hold a side of the board to bias the walk
    const onDown = (e: PointerEvent) => {
      if (e.target !== canvas) return;
      const r = canvas.getBoundingClientRect();
      if (r.width === 0) return;
      g.p = (e.clientX - r.left) / r.width < 0.5 ? 0.5 - TILT_P : 0.5 + TILT_P;
    };
    const onUp = () => {
      g.p = 0.5;
    };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // main loop
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

    let hudAcc = 0;
    const tick = () => {
      if (disposed) return;
      window.clearTimeout(stallTimer);
      if (document.hidden) return; // resumed by visibilitychange
      const now = performance.now();
      const dt = lastT ? Math.min((now - lastT) / 1000, 0.25) : 0.016;
      lastT = now;

      const running = ioFired ? inView : true;
      if (running) {
        spawnAcc += dt * 7; // ~7 balls per second
        while (spawnAcc >= 1 && g.balls.length < 50) {
          g.spawn();
          spawnAcc -= 1;
        }
        g.tick(dt, 7.5);
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
      (entries) =>
        entries.forEach((en) => {
          ioFired = true;
          inView = en.isIntersecting;
        }),
      { threshold: 0.05 }
    );
    if (sectionRef.current) io.observe(sectionRef.current);

    resize();
    window.addEventListener('resize', resize);

    if (prefersReduced) {
      // no falling animation — the same real walks land instantly
      reducedTimer = window.setInterval(() => {
        if (disposed || document.hidden || (ioFired && !inView)) return;
        g.dropInstant();
        g.dropInstant();
        draw();
        setHud();
      }, 500);
    } else {
      scheduleNext();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(stallTimer);
      window.clearInterval(reducedTimer);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
    };
  }, []);

  const hud = (key: string) => (el: HTMLElement | null) => {
    if (!el) return;
    const list = (hudRef.current[key] ||= []);
    if (!list.includes(el)) list.push(el);
  };

  return (
    <section id="galton" ref={sectionRef} className="bg-bg py-16 md:py-24 relative select-none">
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
              Mechanism 07 — Statistical Foundations
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
            The Galton <span className="font-display italic">machine</span>
          </h2>
          <p className="text-sm text-muted max-w-lg mx-auto mt-4 font-normal">
            Pure randomness, assembling perfect order: every ball takes a real
            random walk, and the bell curve builds itself — the Central Limit
            Theorem, live. Hold either side of the board to bias the walk and
            watch a genuine χ² test call the fraud; release, and the pile heals.
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
            aria-label="Galton board: balls fall through pegs into a histogram; hold left or right to bias the walk"
            className="h-[420px] w-full cursor-pointer rounded-2xl border border-stroke/60 bg-bg/50 sm:h-[500px]"
            style={{ touchAction: 'pan-y' }}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted sm:text-[11px]">
              <span>n=<span ref={hud('n')} className="text-text-primary">0</span></span>
              <span>p=<span ref={hud('p')} className="text-accent">0.50</span></span>
              <span ref={tiltRef}>level</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4" style={{ background: AMBER }} />
                fair binomial × n
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted sm:text-[11px]">
              <span>μ <span ref={hud('mean')} className="text-text-primary">—</span>/<span ref={hud('tmean')} className="text-muted">5.50</span></span>
              <span>σ <span ref={hud('sigma')} className="text-text-primary">—</span>/<span ref={hud('tsigma')} className="text-muted">1.66</span></span>
              <span>skew <span ref={hud('skew')} className="text-text-primary">—</span></span>
              <span>χ² <span ref={hud('chi2')} className="text-text-primary">—</span></span>
            </div>
          </div>

          <div className="mt-2 px-1 font-mono text-[10px] sm:text-[11px]">
            <span className="text-muted">verdict: </span>
            <span ref={verdictRef} className="uppercase tracking-wider">collecting…</span>
          </div>

          <p className="mt-3 px-1 font-mono text-[9px] leading-relaxed text-muted/70">
            every ball's path is a real seeded random walk; μ, σ and skewness
            come from the balls that actually landed; the verdict is a live χ²
            goodness-of-fit test against the fair binomial (expected≥5 bins
            merged, 1% significance). sample stats vs theory: μ→5.50, σ→1.66 as
            n grows. this mechanism makes zero network requests and stores
            nothing about you.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
