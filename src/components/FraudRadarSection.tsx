import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { WindowBuilder, Radar, CHI2_99_DF4, BASELINE_MIN } from '../lib/radar';
import { telemetry } from '../lib/telemetry';

// ---------------------------------------------------------------------------
// FraudRadarSection — "mechanism 06: The Fraud Radar".
// A polar plot of real anomaly scores: each blip is a 100ms movement window,
// angle = time, radius = its Mahalanobis distance from YOUR own rolling
// baseline. The dashed ring is the actual χ²₀.₉₉(4) threshold — blips beyond
// it are genuine statistical anomalies in your movement. Zero network.
// ---------------------------------------------------------------------------

const OK_COLOR = '#34d399';
const FLAG_COLOR = '#f87171';
const WINDOW_MS = 100;
const REV_WINDOWS = 200; // one full sweep = 20s of active movement
const THRESH_R = 0.62; // threshold ring at 62% of radius

interface Blip {
  angle: number;
  d2: number;
  flagged: boolean;
  born: number;
}

export const FraudRadarSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<{ [k: string]: HTMLElement[] }>({});
  const statusRef = useRef<HTMLSpanElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let inView = false;
    let dpr = 1;
    let tickCount = 0;
    let windowIdx = 0;
    let lastFlagEventAt = -Infinity;
    let baselineAnnounced = false;

    const builder = new WindowBuilder();
    const radar = new Radar();
    const blips: Blip[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const onMove = (e: PointerEvent) => builder.add(e.clientX, e.clientY, e.timeStamp);
    window.addEventListener('pointermove', onMove, { passive: true });

    const muted = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#888';

    // D² → radius fraction: linear up to the threshold ring, compressed beyond
    const radiusOf = (d2: number) => {
      if (d2 <= CHI2_99_DF4) return (d2 / CHI2_99_DF4) * THRESH_R;
      return THRESH_R + Math.min((d2 - CHI2_99_DF4) / (2.5 * CHI2_99_DF4), 1) * (0.97 - THRESH_R);
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.46;

      // range rings
      ctx.strokeStyle = muted();
      ctx.lineWidth = 1;
      for (const f of [0.2, 0.4, 0.82]) {
        ctx.globalAlpha = 0.14;
        ctx.beginPath();
        ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // the real χ² threshold ring
      ctx.beginPath();
      ctx.setLineDash([6, 5]);
      ctx.arc(cx, cy, R * THRESH_R, 0, Math.PI * 2);
      ctx.strokeStyle = FLAG_COLOR;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // sweep marker at the current write angle
      const sweep = ((windowIdx % REV_WINDOWS) / REV_WINDOWS) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
      ctx.strokeStyle = muted();
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // blips (age-faded)
      const now = performance.now();
      for (const b of blips) {
        const age = (now - b.born) / 20000;
        const alpha = Math.max(0.12, 1 - age) * (b.flagged ? 1 : 0.75);
        const r = radiusOf(b.d2) * R;
        const x = cx + Math.cos(b.angle) * r;
        const y = cy + Math.sin(b.angle) * r;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = b.flagged ? FLAG_COLOR : OK_COLOR;
        ctx.beginPath();
        ctx.arc(x, y, b.flagged ? 3.4 : 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (b.flagged) {
          ctx.beginPath();
          ctx.arc(x, y, 6.5, 0, Math.PI * 2);
          ctx.strokeStyle = FLAG_COLOR;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const setHud = () => {
      const H = hudRef.current;
      const set = (k: string, txt: string) => H[k]?.forEach((el) => (el.textContent = txt));
      set('d2', radar.lastD2 !== null ? radar.lastD2.toFixed(1) : '—');
      set('thresh', CHI2_99_DF4.toFixed(1));
      set('flags', String(radar.flags));
      set('rate', radar.flagRate !== null ? `${(radar.flagRate * 100).toFixed(1)}%` : '—');
      set('nbase', String(radar.baselineN));
      const st = statusRef.current;
      if (st) {
        if (!radar.ready) {
          st.textContent = `learning your normal… ${radar.baselineN}/${BASELINE_MIN}`;
          st.style.color = 'var(--muted)';
        } else if (radar.lastFlagged) {
          st.textContent = 'ANOMALY FLAGGED';
          st.style.color = FLAG_COLOR;
        } else {
          st.textContent = 'nominal';
          st.style.color = OK_COLOR;
        }
      }
    };

    const loop = window.setInterval(() => {
      if (disposed || document.hidden) return;
      const features = builder.close(WINDOW_MS);
      if (features) {
        const { d2, flagged } = radar.observe(features);
        if (d2 !== null) {
          const angle = ((windowIdx % REV_WINDOWS) / REV_WINDOWS) * Math.PI * 2 - Math.PI / 2;
          blips.push({ angle, d2, flagged, born: performance.now() });
          if (blips.length > REV_WINDOWS) blips.shift();
          windowIdx++;
          if (flagged && performance.now() - lastFlagEventAt > 6000) {
            lastFlagEventAt = performance.now();
            telemetry.event(
              `fraud radar: anomaly flagged — D²=${d2.toFixed(1)} (${(d2 / CHI2_99_DF4).toFixed(1)}× the χ² threshold)`,
              'warn'
            );
          }
        }
        if (!baselineAnnounced && radar.ready) {
          baselineAnnounced = true;
          telemetry.event(`fraud radar: baseline established from your movement (n=${BASELINE_MIN})`, 'info');
        }
      }
      tickCount++;
      if (tickCount % 3 === 0) setHud(); // HUD stays fresh regardless of IO quirks
      if (!inView) return;
      const drawEvery = prefersReduced ? 10 : 1;
      if (tickCount % drawEvery === 0) draw();
    }, WINDOW_MS);

    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => (inView = en.isIntersecting)),
      { threshold: 0.05 }
    );
    if (sectionRef.current) io.observe(sectionRef.current);

    resize();
    window.addEventListener('resize', resize);

    return () => {
      disposed = true;
      window.clearInterval(loop);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      io.disconnect();
    };
  }, []);

  const hud = (key: string) => (el: HTMLElement | null) => {
    if (!el) return;
    const list = (hudRef.current[key] ||= []);
    if (!list.includes(el)) list.push(el);
  };

  return (
    <section id="radar" ref={sectionRef} className="bg-bg py-16 md:py-24 relative select-none border-t border-stroke/40">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
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
              Mechanism 06 — Anomaly Detection
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
            The fraud <span className="font-display italic">radar</span>
          </h2>
          <p className="text-sm text-muted max-w-lg mx-auto mt-4 font-normal">
            The statistics banks run against fraudulent transactions, pointed at
            your cursor. It learns your own movement as the baseline, scores
            every moment with a Mahalanobis distance, and flags deviations past
            a real χ² threshold. Move naturally — then shake the cursor
            violently, and get flagged.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true, margin: '-60px' }}
          className="rounded-3xl border border-stroke bg-surface/40 p-3 sm:p-5"
        >
          <div className="relative">
            <canvas
              ref={canvasRef}
              aria-label="Polar radar of anomaly scores: each blip is a movement window, radius is its Mahalanobis distance, the dashed ring is the chi-square flag threshold"
              className="h-72 w-full rounded-2xl border border-stroke/60 bg-bg/50 sm:h-96"
            />
            <span
              ref={statusRef}
              className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-widest sm:text-[11px]"
            >
              learning your normal…
            </span>
          </div>

          {/* legend + HUD */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted sm:text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: OK_COLOR }} />
                normal window
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: FLAG_COLOR }} />
                flagged
              </span>
              <span>dashed ring = χ²₀.₉₉(4)</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted sm:text-[11px]">
              <span>D² <span ref={hud('d2')} className="text-text-primary">—</span></span>
              <span>threshold <span ref={hud('thresh')} className="text-text-primary">13.3</span></span>
              <span>flags <span ref={hud('flags')} className="text-text-primary">0</span></span>
              <span>rate <span ref={hud('rate')} className="text-text-primary">—</span> <span className="text-muted/60">(ideal 1%)</span></span>
              <span>baseline n=<span ref={hud('nbase')} className="text-text-primary">0</span></span>
            </div>
          </div>

          <p className="mt-3 px-1 font-mono text-[9px] leading-relaxed text-muted/70">
            features per 100ms window: speed, acceleration, curvature, tremor.
            your baseline is your own recent movement; flagged windows are
            excluded from it so an anomaly can't normalize itself. the 1% is
            the ideal rate for gaussian, independent windows scored against an
            infinite baseline — real kinematics are none of those things, so
            the live rate runs above it. that gap is itself a lesson in
            calibration. idle moments are neither scored nor learned. this
            mechanism makes zero network requests and stores nothing about you.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
