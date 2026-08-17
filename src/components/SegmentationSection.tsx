import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Segmenter, K_MAX } from '../lib/segment';
import { telemetry } from '../lib/telemetry';

// ---------------------------------------------------------------------------
// SegmentationSection — "mechanism 04: The Segmentation".
// Live k-means over the visitor's own cursor/touch trail inside the field.
// Every dot is a real sample, centroids are live means, k comes from a real
// elbow sweep, and the HUD numbers (inertia, silhouette, iterations) are the
// actual computed values — never eased. Zero network, zero storage.
// ---------------------------------------------------------------------------

const CLUSTER_COLORS = ['#34d399', '#a78bfa', '#fbbf24', '#38bdf8', '#f87171', '#f472b6'];
const UNSEGMENTED = '#8892a6';

export const SegmentationSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elbowRef = useRef<HTMLCanvasElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<{ [k: string]: HTMLElement[] }>({});
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const elbow = elbowRef.current;
    if (!canvas || !elbow) return;
    const ctx = canvas.getContext('2d');
    const ectx = elbow.getContext('2d');
    if (!ctx || !ectx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let raf = 0;
    let stallTimer = 0;
    let inView = false;
    let announcedEntry = false;

    const seg = new Segmenter();
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(); // never leave a blank bitmap after a resize
    };

    // ---- input: real cursor/touch samples inside the field ---------------
    const toNorm = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
    };
    const onMove = (e: PointerEvent) => {
      const p = toNorm(e.clientX, e.clientY);
      if (!p || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;
      if (seg.addPoint(p.x, p.y, e.timeStamp) && !announcedEntry && seg.n >= 10) {
        announcedEntry = true;
        telemetry.event('segmentation: visitor entered the feature space', 'info');
        hintRef.current?.classList.add('opacity-0');
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.target !== canvas) return;
      const p = toNorm(e.clientX, e.clientY);
      if (!p) return;
      seg.splat(p.x, p.y, e.timeStamp);
      if (!announcedEntry && seg.n >= 10) {
        announcedEntry = true;
        telemetry.event('segmentation: visitor entered the feature space', 'info');
        hintRef.current?.classList.add('opacity-0');
      }
    };
    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerdown', onDown);

    // ---- drawing ----------------------------------------------------------
    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const pts = seg.trail;

      // recent trail thread
      if (pts.length > 1) {
        ctx.beginPath();
        const start = Math.max(0, pts.length - 40);
        for (let i = start; i < pts.length; i++) {
          const px = pts[i].x * w;
          const py = pts[i].y * h;
          if (i === start) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = UNSEGMENTED;
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // points, colored by live assignment
      for (let i = 0; i < pts.length; i++) {
        const c = seg.k > 1 ? CLUSTER_COLORS[seg.assign[i] % CLUSTER_COLORS.length] : UNSEGMENTED;
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(pts[i].x * w, pts[i].y * h, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // centroids: X marks + dashed reach circles (RMS of members)
      for (let c = 0; c < seg.centroids.length; c++) {
        const col = seg.k > 1 ? CLUSTER_COLORS[c % CLUSTER_COLORS.length] : UNSEGMENTED;
        const cx = seg.centroids[c].x * w;
        const cy = seg.centroids[c].y * h;
        if (seg.rms[c] > 0) {
          ctx.beginPath();
          ctx.setLineDash([5, 4]);
          ctx.arc(cx, cy, seg.rms[c] * Math.min(w, h), 0, Math.PI * 2);
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy - 6);
        ctx.lineTo(cx + 6, cy + 6);
        ctx.moveTo(cx + 6, cy - 6);
        ctx.lineTo(cx - 6, cy + 6);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    };

    const drawElbow = () => {
      const w = elbow.clientWidth;
      const h = elbow.clientHeight;
      if (w === 0) return;
      if (elbow.width !== Math.round(w * dpr)) {
        elbow.width = Math.round(w * dpr);
        elbow.height = Math.round(h * dpr);
      }
      ectx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ectx.clearRect(0, 0, w, h);
      const vals = seg.sweepInertias.filter((v): v is number => v !== null);
      if (vals.length < 2) return;
      const max = Math.max(...vals, 1e-9);
      ectx.beginPath();
      vals.forEach((v, i) => {
        const x = 4 + (i / (K_MAX - 1)) * (w - 8);
        const y = h - 4 - (v / max) * (h - 8);
        if (i === 0) ectx.moveTo(x, y);
        else ectx.lineTo(x, y);
      });
      ectx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f5f5f5';
      ectx.lineWidth = 1.25;
      ectx.stroke();
      // mark the active k
      const ki = seg.k - 1;
      if (ki < vals.length) {
        const x = 4 + (ki / (K_MAX - 1)) * (w - 8);
        const y = h - 4 - (vals[ki] / max) * (h - 8);
        ectx.beginPath();
        ectx.arc(x, y, 3, 0, Math.PI * 2);
        ectx.strokeStyle = '#f87171';
        ectx.lineWidth = 1.5;
        ectx.stroke();
      }
    };

    const setHud = () => {
      const H = hudRef.current;
      const set = (key: string, txt: string) => H[key]?.forEach((el) => (el.textContent = txt));
      const now = performance.now();
      set('n', String(seg.n));
      set('k', String(seg.k));
      set('inertia', seg.n ? seg.inertia.toFixed(4) : '—');
      set('sil', seg.silhouette !== null ? seg.silhouette.toFixed(2) : '—');
      set('iters', seg.n ? String(seg.iterations) : '—');
      set('age', seg.n ? `${seg.oldestAgeS(now).toFixed(0)}s` : '—');
    };

    // ---- loop (stall-fallback scheduler; pauses hidden/off-screen) --------
    let frame = 0;
    let lastHudAt = 0;
    const scheduleNext = () => {
      if (disposed) return;
      cancelAnimationFrame(raf);
      window.clearTimeout(stallTimer);
      if (prefersReduced) {
        // reduced motion: gentle 2Hz updates, no 60fps redraw loop —
        // the field only changes in response to the visitor's own input
        stallTimer = window.setTimeout(tick, 500);
        return;
      }
      raf = requestAnimationFrame(tick);
      stallTimer = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        tick();
      }, 250);
    };

    const tick = () => {
      if (disposed) return;
      window.clearTimeout(stallTimer);
      if (document.hidden || !inView) return; // resumed by observers below
      const now = performance.now();
      seg.prune(now);
      seg.step();
      if (frame % 120 === 0) {
        const newK = seg.elbowSweep();
        if (newK !== null && seg.n >= 12) {
          telemetry.event(`segmentation: elbow adapted k → ${newK}`, 'info');
        }
        drawElbow();
      }
      if (frame % 60 === 30) seg.computeSilhouette();
      draw();
      if (now - lastHudAt > 250) {
        lastHudAt = now;
        setHud();
      }
      frame++;
      scheduleNext();
    };

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          const was = inView;
          inView = en.isIntersecting;
          if (inView && !was && !disposed) scheduleNext();
        }),
      { threshold: 0.05 }
    );
    if (sectionRef.current) io.observe(sectionRef.current);

    const onVisibility = () => {
      if (!document.hidden && inView && !disposed) scheduleNext();
    };
    document.addEventListener('visibilitychange', onVisibility);

    resize();
    window.addEventListener('resize', resize);
    scheduleNext();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(stallTimer);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
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
    <section id="segmentation" ref={sectionRef} className="bg-bg py-16 md:py-24 relative select-none border-t border-stroke/40">
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
              Mechanism 04 — Unsupervised Learning
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
            You, <span className="font-display italic">segmented</span>
          </h2>
          <p className="text-sm text-muted max-w-lg mx-auto mt-4 font-normal">
            Customer segmentation is the classic analyst deliverable — here,
            k-means runs on the only dataset that matters right now: your own
            movement. Draw in the field below and watch clusters form, centroids
            chase you, and the elbow method choose k. Live.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true, margin: '-60px' }}
          className="rounded-3xl border border-stroke bg-surface/40 p-3 sm:p-5"
        >
          {/* The field */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              aria-label="Interactive k-means field: move your cursor or tap to add points"
              className="h-[300px] w-full cursor-crosshair rounded-2xl border border-stroke/60 bg-bg/50 sm:h-[380px]"
              style={{ touchAction: 'pan-y' }}
            />
            <div
              ref={hintRef}
              className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center transition-opacity duration-700"
            >
              <p className="font-mono text-[10px] leading-relaxed text-muted sm:text-[11px]">
                an empty feature space — move your cursor here (or tap) and you
                become the dataset
              </p>
            </div>
          </div>

          {/* HUD */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted sm:text-[11px]">
              <span>n=<span ref={hud('n')} className="text-text-primary">0</span></span>
              <span>k=<span ref={hud('k')} className="text-accent">1</span></span>
              <span>inertia <span ref={hud('inertia')} className="text-text-primary">—</span></span>
              <span>silhouette <span ref={hud('sil')} className="text-text-primary">—</span></span>
              <span>lloyd iters <span ref={hud('iters')} className="text-text-primary">—</span></span>
              <span>oldest point <span ref={hud('age')} className="text-text-primary">—</span></span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] text-muted">
              <span>elbow (inertia vs k)</span>
              <canvas ref={elbowRef} aria-hidden className="h-8 w-24 rounded border border-stroke/60" />
            </div>
          </div>

          <p className="mt-3 px-1 font-mono text-[9px] leading-relaxed text-muted/70">
            every dot is a real sample of your cursor; centroids are the live
            means of their clusters; k comes from a genuine elbow sweep refit
            every ~2s (with a two-sweep stability rule). points older than 45s
            dissolve. zero network requests, zero storage.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
