import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { telemetry } from '../lib/telemetry';
import type { BoundaryMetrics, UnderwriterMetrics, TelemetryEvent } from '../lib/telemetry';

// ---------------------------------------------------------------------------
// ModelObservatory — "mechanism 03: the control room".
// Live MLOps observability for THIS page's own models. Every panel reads
// real telemetry published by mechanisms 01 (The Boundary) and 02 (The
// Underwriting), plus web-vitals measured in-page via PerformanceObserver.
// Alerts derive from real thresholds — freeze the hero's classifier and the
// drift alert here genuinely fires. Zero network, zero storage: this is
// monitoring, not tracking.
// ---------------------------------------------------------------------------

const OK = '#34d399'; // emerald-400
const WARN = '#fbbf24'; // amber-400
const ALERT = '#f87171'; // rose-400

const ACC_ALERT = 0.88; // drift alert threshold on holdout accuracy
const ACC_CLEAR = 0.92;

interface Vitals {
  lcp: number | null;
  cls: number;
  longTasks: number;
}

interface Snapshot {
  boundary: BoundaryMetrics | null;
  underwriter: UnderwriterMetrics | null;
  events: TelemetryEvent[];
  uptime: number;
}

const Led: React.FC<{ color: string }> = ({ color }) => (
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ background: color }} />
    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
  </span>
);

const Row: React.FC<{ k: string; v: string; accent?: boolean }> = ({ k, v, accent }) => (
  <div className="flex items-baseline justify-between gap-2">
    <span className="text-muted">{k}</span>
    <span className={accent ? 'text-accent' : 'text-text-primary'}>{v}</span>
  </div>
);

const AccSpark: React.FC<{ hist: number[] }> = ({ hist }) => {
  if (hist.length < 2) return null;
  const pts = hist
    .map((v, i) => `${(i / (hist.length - 1)) * 100},${28 - Math.max(0, Math.min(1, (v - 0.4) / 0.6)) * 26}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-7 w-full" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1={28 - ((ACC_ALERT - 0.4) / 0.6) * 26} x2="100" y2={28 - ((ACC_ALERT - 0.4) / 0.6) * 26} stroke={ALERT} strokeWidth="0.75" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export const ModelObservatory: React.FC = () => {
  const [snap, setSnap] = useState<Snapshot>({ boundary: null, underwriter: null, events: [], uptime: 0 });
  const [vitals, setVitals] = useState<Vitals>({ lcp: null, cls: 0, longTasks: 0 });
  const accHistRef = useRef<number[]>([]);
  const driftAlertRef = useRef(false);
  // the drift alert only arms once the model has converged the first time —
  // low accuracy during initial training is learning, not drift
  const armedRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    // real web-vitals, measured in this page
    const observers: PerformanceObserver[] = [];
    const observe = (type: string, cb: (entries: PerformanceEntry[]) => void) => {
      try {
        const po = new PerformanceObserver((list) => cb(list.getEntries()));
        po.observe({ type, buffered: true } as PerformanceObserverInit);
        observers.push(po);
      } catch {
        /* entry type unsupported in this browser — panel shows "—" */
      }
    };
    let cls = 0;
    let longTasks = 0;
    observe('largest-contentful-paint', (es) => {
      const last = es[es.length - 1];
      if (last) setVitals((v) => ({ ...v, lcp: last.startTime }));
    });
    observe('layout-shift', (es) => {
      for (const e of es as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!e.hadRecentInput) cls += e.value;
      }
      setVitals((v) => ({ ...v, cls }));
    });
    observe('longtask', (es) => {
      longTasks += es.length;
      setVitals((v) => ({ ...v, longTasks }));
    });

    const poll = window.setInterval(() => {
      if (disposed || document.hidden) return;
      const s = telemetry.read();

      // alert derivation from real thresholds
      const b = s.boundary;
      if (b) {
        accHistRef.current.push(b.acc);
        if (accHistRef.current.length > 60) accHistRef.current.shift();
        if (!armedRef.current && b.acc >= ACC_CLEAR) {
          armedRef.current = true;
          telemetry.event(`observatory: boundary converged (${(b.acc * 100).toFixed(1)}%) — drift monitoring armed`, 'info');
        }
        if (armedRef.current) {
          if (b.acc < ACC_ALERT && !driftAlertRef.current) {
            driftAlertRef.current = true;
            telemetry.event(
              `observatory: DRIFT ALERT — holdout accuracy ${(b.acc * 100).toFixed(1)}% < ${ACC_ALERT * 100}%${b.frozen ? ' (model frozen)' : ''}`,
              'alert'
            );
          } else if (b.acc >= ACC_CLEAR && driftAlertRef.current) {
            driftAlertRef.current = false;
            telemetry.event(`observatory: drift alert cleared — accuracy recovered to ${(b.acc * 100).toFixed(1)}%`, 'info');
          }
        }
      }

      setSnap({
        boundary: s.boundary,
        underwriter: s.underwriter,
        events: [...s.events],
        uptime: performance.now() / 1000,
      });
    }, 500);

    return () => {
      disposed = true;
      window.clearInterval(poll);
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  const b = snap.boundary;
  const u = snap.underwriter;

  const boundaryStatus = !b
    ? { led: WARN, word: 'booting…', color: WARN }
    : armedRef.current && b.acc < ACC_ALERT
      ? { led: ALERT, word: 'DRIFT ALERT', color: ALERT }
      : b.frozen
        ? { led: WARN, word: 'frozen', color: WARN }
        : armedRef.current
          ? { led: OK, word: 'nominal', color: OK }
          : { led: OK, word: 'training', color: OK };

  const underwriterStatus = !u
    ? { led: WARN, word: 'standby', color: WARN }
    : u.p >= 0.5
      ? { led: OK, word: 'approved', color: OK }
      : { led: WARN, word: 'under review', color: WARN };

  const runtimeStatus =
    vitals.longTasks > 15
      ? { led: WARN, word: 'jank detected', color: WARN }
      : { led: OK, word: 'healthy', color: OK };

  const fmtT = (t: number) => `+${(t / 1000).toFixed(1)}s`;

  return (
    <section id="observatory" className="bg-bg py-16 md:py-24 relative select-none border-t border-stroke/40">
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
              Mechanism 03 — Live Model Observability
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
            The <span className="font-display italic">control room</span>
          </h2>
          <p className="text-sm text-muted max-w-lg mx-auto mt-4 font-normal">
            Training and deploying models is half the job — the other half is
            watching them. These panels monitor this page's own two mechanisms,
            live. Try it: freeze the classifier up in the hero, let the world
            drift, and watch a real alert fire below.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true, margin: '-60px' }}
          className="grid gap-4 md:grid-cols-3 md:gap-6"
        >
          {/* 01 — The Boundary */}
          <div className="rounded-3xl border border-stroke bg-surface/40 p-5 font-mono text-[11px]">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
                <Led color={boundaryStatus.led} /> 01 · the boundary
              </span>
              <span className="text-[10px] font-bold uppercase" style={{ color: boundaryStatus.color }}>
                {boundaryStatus.word}
              </span>
            </div>
            <div className="space-y-1.5">
              <Row k="epoch" v={b ? String(b.epoch) : '—'} />
              <Row k="train loss" v={b ? b.loss.toFixed(4) : '—'} />
              <Row k="holdout acc" v={b ? `${(b.acc * 100).toFixed(1)}%` : '—'} accent />
              <Row k="world drift" v={b ? b.drift.toFixed(3) : '—'} />
              <Row k="applicants" v={b ? String(b.n) : '—'} />
              <Row k="sim rate" v={b && b.fps > 0 ? `${b.fps.toFixed(0)}/s` : '—'} />
            </div>
            <AccSpark hist={accHistRef.current} />
            <p className="mt-1 text-[9px] text-muted/70">holdout accuracy · dashed line = {ACC_ALERT * 100}% alert threshold</p>
          </div>

          {/* 02 — The Underwriting */}
          <div className="rounded-3xl border border-stroke bg-surface/40 p-5 font-mono text-[11px]">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
                <Led color={underwriterStatus.led} /> 02 · the underwriting
              </span>
              <span className="text-[10px] font-bold uppercase" style={{ color: underwriterStatus.color }}>
                {underwriterStatus.word}
              </span>
            </div>
            <div className="space-y-1.5">
              <Row k="engagement p" v={u ? `${(u.p * 100).toFixed(1)}%` : '—'} accent />
              <Row k="re-scores this visit" v={u ? String(u.rescores) : '—'} />
              <Row k="baseline fit time" v={u ? `${u.fitMs.toFixed(0)}ms` : '—'} />
              <Row k="decision threshold" v="p ≥ 50%" />
            </div>
            <p className="mt-4 text-[9px] leading-relaxed text-muted/70">
              standby means The Underwriting isn't open this session — mechanisms
              run one at a time. its last published score appears here once you
              open it from the menu.
            </p>
          </div>

          {/* 03 — Page runtime */}
          <div className="rounded-3xl border border-stroke bg-surface/40 p-5 font-mono text-[11px]">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
                <Led color={runtimeStatus.led} /> 03 · page runtime
              </span>
              <span className="text-[10px] font-bold uppercase" style={{ color: runtimeStatus.color }}>
                {runtimeStatus.word}
              </span>
            </div>
            <div className="space-y-1.5">
              <Row k="uptime" v={`${snap.uptime.toFixed(0)}s`} />
              <Row k="LCP" v={vitals.lcp !== null ? `${(vitals.lcp / 1000).toFixed(2)}s` : '—'} />
              <Row k="CLS" v={vitals.cls.toFixed(3)} />
              <Row k="long tasks" v={String(vitals.longTasks)} />
            </div>
            <p className="mt-4 text-[9px] leading-relaxed text-muted/70">
              web-vitals measured in this page via PerformanceObserver — the
              same numbers Lighthouse would report, read live.
            </p>
          </div>
        </motion.div>

        {/* Event log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          viewport={{ once: true, margin: '-40px' }}
          className="mt-4 rounded-3xl border border-stroke bg-surface/40 p-5 md:mt-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">event log — this visit</span>
            <span className="font-mono text-[9px] text-muted/70">timestamps relative to page load</span>
          </div>
          <ul className="max-h-44 space-y-1 overflow-y-auto font-mono text-[10px] leading-relaxed sm:text-[11px]">
            {snap.events.length === 0 && <li className="text-muted">awaiting first event…</li>}
            {snap.events.map((e, i) => (
              <li key={`${e.t}-${i}`} className="flex gap-2">
                <span className="shrink-0 text-muted/60">{fmtT(e.t)}</span>
                <span style={{ color: e.level === 'alert' ? ALERT : e.level === 'warn' ? WARN : 'var(--muted)' }}>
                  {e.msg}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[9px] text-muted/70">
            every entry is a real runtime event from this page's mechanisms —
            nothing is logged anywhere but your screen.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
