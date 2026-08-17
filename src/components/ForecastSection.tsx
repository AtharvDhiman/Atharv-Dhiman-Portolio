import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Forecaster, SAMPLE_MS, AR_ORDER, HORIZON_STEPS } from '../lib/forecast';
import { telemetry } from '../lib/telemetry';

// ---------------------------------------------------------------------------
// ForecastSection — "mechanism 05: The Forecast".
// A strip chart of the visitor's real scroll position with an online AR
// model's 600ms-ahead forecast drawn against it, plus a fan of ±2σ real
// residual uncertainty. Skill is reported against the persistence baseline
// — even when negative. Zero network, zero storage.
// ---------------------------------------------------------------------------

const AMBER = '#fbbf24';
const ROSE = '#f87171';

export const ForecastSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<{ [k: string]: HTMLElement[] }>({});
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let inView = false;
    let tickCount = 0;
    let dpr = 1;
    let hintHidden = false;
    let skillState: 'none' | 'winning' | 'losing' = 'none';

    const fc = new Forecaster();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const scrollNorm = () => {
      const denom = document.documentElement.scrollHeight - window.innerHeight;
      return denom > 0 ? window.scrollY / denom : 0;
    };

    const accent = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f5f5f5';
    const muted = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#888';

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const hist = fc.history;
      if (hist.length < 2) return;

      // reserve the right 14% for the future fan
      const nowX = w * 0.86;
      const stepX = nowX / Math.max(hist.length - 1, 1);
      // visually stretched horizon, clamped on-canvas so early visitors
      // (short history ⇒ large stepX) still see the fan and forecast dot
      const fanX = Math.min(nowX + HORIZON_STEPS * stepX * 2.2, w - 8);

      // auto-zoom y-range over visible data
      let lo = Infinity;
      let hi = -Infinity;
      for (const s of hist) {
        lo = Math.min(lo, s.y, s.pred ?? s.y);
        hi = Math.max(hi, s.y, s.pred ?? s.y);
      }
      if (fc.currentPred !== null) {
        lo = Math.min(lo, fc.currentPred);
        hi = Math.max(hi, fc.currentPred);
      }
      const span = Math.max(hi - lo, 0.08);
      const mid = (hi + lo) / 2;
      lo = mid - span * 0.62;
      hi = mid + span * 0.62;
      const Y = (v: number) => h - ((v - lo) / (hi - lo)) * h;

      // 1s grid
      ctx.strokeStyle = muted();
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1;
      for (let i = hist.length - 1; i >= 0; i -= 10) {
        const x = i * stepX;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // realized forecasts (what the model said this moment would be)
      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      let started = false;
      hist.forEach((s, i) => {
        if (s.pred === null) return;
        const x = i * stepX;
        const y = Y(s.pred);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 1.25;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // actual scroll
      ctx.beginPath();
      hist.forEach((s, i) => {
        const x = i * stepX;
        const y = Y(s.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = accent();
      ctx.lineWidth = 1.75;
      ctx.stroke();

      // now line
      ctx.beginPath();
      ctx.moveTo(nowX, 0);
      ctx.lineTo(nowX, h);
      ctx.strokeStyle = muted();
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // future: current forecast + ±2σ fan from real residuals
      const yNow = hist[hist.length - 1].y;
      if (fc.currentPred !== null) {
        const band = 2 * fc.residStd;
        ctx.beginPath();
        ctx.moveTo(nowX, Y(yNow));
        ctx.lineTo(fanX, Y(fc.currentPred - band));
        ctx.lineTo(fanX, Y(fc.currentPred + band));
        ctx.closePath();
        ctx.fillStyle = AMBER;
        ctx.globalAlpha = 0.14;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(nowX, Y(yNow));
        ctx.lineTo(fanX, Y(fc.currentPred));
        ctx.strokeStyle = AMBER;
        ctx.lineWidth = 1.75;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(fanX, Y(fc.currentPred), 3, 0, Math.PI * 2);
        ctx.fillStyle = AMBER;
        ctx.fill();
      }
    };

    const setHud = () => {
      const H = hudRef.current;
      const set = (k: string, txt: string) => H[k]?.forEach((el) => (el.textContent = txt));
      const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(2)}%`);
      set('mae', pct(fc.maeModel));
      set('naive', pct(fc.maeNaive));
      set('updates', String(fc.updates));
      set('sigma', pct(fc.residStd));
      const el = H.skill?.[0];
      H.skill?.forEach((s) => {
        s.textContent = fc.skill === null ? '—' : `${fc.skill >= 0 ? '+' : ''}${(fc.skill * 100).toFixed(1)}%`;
      });
      if (el) {
        const color = fc.skill === null ? '' : fc.skill >= 0 ? 'var(--accent)' : ROSE;
        H.skill?.forEach((s) => ((s as HTMLElement).style.color = color));
      }
    };

    const maybeEvents = () => {
      if (fc.skill === null || fc.updates < 40) return;
      // true hysteresis: the reset band (-0.05..0.10) sits strictly inside
      // the trigger thresholds so a skill hovering at a boundary can't spam
      if (fc.skill > 0.15 && skillState !== 'winning') {
        skillState = 'winning';
        telemetry.event('forecast: model beats the persistence baseline — it learned your rhythm', 'info');
      } else if (fc.skill < -0.1 && skillState !== 'losing') {
        skillState = 'losing';
        telemetry.event('forecast: model losing to the naive baseline — erratic scrolling detected', 'warn');
      } else if (fc.skill >= -0.05 && fc.skill <= 0.1) {
        skillState = 'none';
      }
    };

    const loop = window.setInterval(() => {
      if (disposed || document.hidden) return;
      fc.sample(scrollNorm()); // the series stays on its grid whenever visible
      tickCount++;
      if (!hintHidden && fc.updates > 5) {
        hintHidden = true;
        hintRef.current?.classList.add('opacity-0');
        telemetry.event('forecast: visitor became a time series', 'info');
      }
      // HUD text + events are a handful of span writes — keep them fresh
      // regardless of IntersectionObserver quirks; only gate the canvas work.
      if (tickCount % 3 === 0) {
        setHud();
        maybeEvents();
      }
      if (!inView) return; // sample + train always; draw only on screen
      const drawEvery = prefersReduced ? 10 : 1;
      if (tickCount % drawEvery === 0) draw();
    }, SAMPLE_MS);

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
    <section id="forecast" ref={sectionRef} className="bg-bg py-16 md:py-24 relative select-none border-t border-stroke/40">
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
              Mechanism 05 — Time-Series Forecasting
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
            Your next move, <span className="font-display italic">forecast</span>
          </h2>
          <p className="text-sm text-muted max-w-lg mx-auto mt-4 font-normal">
            Forecasting demand is bread-and-butter analytics. Here the series
            is you: an autoregressive model predicts your scroll position 600ms
            ahead, learns from every miss, and reports its skill against the
            naive baseline — honestly, even when it's losing. Scroll around and
            teach it your rhythm.
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
              aria-label="Live strip chart of your actual scroll position versus the model's 600ms-ahead forecast"
              className="h-48 w-full rounded-2xl border border-stroke/60 bg-bg/50 sm:h-56"
            />
            <div
              ref={hintRef}
              className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center transition-opacity duration-700"
            >
              <p className="font-mono text-[10px] leading-relaxed text-muted sm:text-[11px]">
                a flat line so far — scroll up and down and you become a time series
              </p>
            </div>
          </div>

          {/* legend + HUD */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted sm:text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4" style={{ background: 'var(--accent)' }} />
                actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4" style={{ background: AMBER }} />
                forecast (+600ms)
              </span>
              <span>model AR({AR_ORDER})</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted sm:text-[11px]">
              <span>MAE <span ref={hud('mae')} className="text-text-primary">—</span></span>
              <span>naive <span ref={hud('naive')} className="text-text-primary">—</span></span>
              <span>skill <span ref={hud('skill')} className="text-text-primary">—</span></span>
              <span>σ <span ref={hud('sigma')} className="text-text-primary">—</span></span>
              <span>updates <span ref={hud('updates')} className="text-text-primary">0</span></span>
            </div>
          </div>

          <p className="mt-3 px-1 font-mono text-[9px] leading-relaxed text-muted/70">
            the model's weights start at zero — it is born as the naive
            "no-change" baseline and any skill above 0% was learned from your
            scrolling. errors count only realized forecasts; the fan is ±2σ of
            real residuals. this mechanism makes zero network requests and
            stores nothing about you.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
