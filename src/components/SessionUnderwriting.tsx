import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  fitUnderwriter,
  assess,
  Kinematics,
  POPULATION_N,
  UNDERWRITE_SEED,
} from '../lib/underwrite';
import type { Underwriter, Assessment } from '../lib/underwrite';
import { telemetry } from '../lib/telemetry';

// ---------------------------------------------------------------------------
// SessionUnderwriting — "mechanism 02": the page underwrites YOUR visit, live.
// A logistic baseline is genuinely refit in the browser at load over a seeded
// synthetic population (N=51,336 — the BEL portfolio size), then scores the
// session from real browser signals with exact per-feature Shapley
// contributions. Missing APIs are imputed and labeled. Nothing leaves the page.
// ---------------------------------------------------------------------------

const POS = '#34d399'; // emerald-400
const NEG = '#f87171'; // rose-400

const Dial: React.FC<{ p: number; approved: boolean }> = ({ p, approved }) => {
  const r = 56;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--stroke)" strokeWidth="9" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={approved ? POS : NEG}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - p * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl italic text-text-primary sm:text-4xl">
          {(p * 100).toFixed(1)}%
        </span>
        <span className="text-[9px] uppercase tracking-widest text-muted">
          engagement p
        </span>
      </div>
    </div>
  );
};

export const SessionUnderwriting: React.FC = () => {
  const [model, setModel] = useState<Underwriter | null>(null);
  const [result, setResult] = useState<Assessment | null>(null);
  const kinRef = useRef<Kinematics | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inViewRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    const kin = (kinRef.current ??= new Kinematics());
    // Genuine fit at load — synchronous, a few tens of ms, seeded.
    const m = fitUnderwriter();
    if (disposed) return;
    setModel(m);
    let rescores = 1;
    let lastApproved: boolean | null = null;
    const score = () => {
      const a = assess(m, kin);
      setResult(a);
      telemetry.publishUnderwriter({ p: a.p, rescores, fitMs: m.fitMs });
      if (lastApproved !== null && a.approved !== lastApproved) {
        telemetry.event(
          a.approved
            ? `underwriter: session APPROVED at p=${(a.p * 100).toFixed(1)}%`
            : `underwriter: session back under review (p=${(a.p * 100).toFixed(1)}%)`,
          a.approved ? 'info' : 'warn'
        );
      }
      lastApproved = a.approved;
      rescores++;
    };
    // ms deliberately omitted so StrictMode's dev double-mount dedups cleanly;
    // the exact fit time lives in the metrics card
    telemetry.event('underwriter: baseline refit in-browser (N=51,336, seeded)', 'info');
    score();
    const onPointer = (e: PointerEvent) => kin.onPointer(e.clientX, e.clientY, e.timeStamp);
    const onScroll = () => kin.onScroll();
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // only re-score while the band is on screen (battery-friendly)
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => (inViewRef.current = en.isIntersecting)),
      { threshold: 0.05 }
    );
    if (sectionRef.current) io.observe(sectionRef.current);

    const interval = window.setInterval(() => {
      if (disposed || document.hidden || !inViewRef.current) return;
      score(); // raw values, never eased
    }, 300);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  const maxAbs = result
    ? Math.max(0.15, ...result.features.map((f) => Math.abs(f.contribution)))
    : 1;

  return (
    <section
      id="underwriting"
      ref={sectionRef}
      className="bg-bg py-16 md:py-24 relative select-none border-t border-stroke/40"
    >
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
              Mechanism 02 — Live Explainable Inference
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
            This visit, <span className="font-display italic">underwritten</span>
          </h2>
          <p className="text-sm text-muted max-w-lg mx-auto mt-4 font-normal">
            The same idea as FinRisk, turned on you — playfully and privately. A
            logistic model was just refit in your browser and is now scoring this
            session from live signals, with exact per-feature attributions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true, margin: '-60px' }}
          className="grid gap-6 md:grid-cols-5 md:gap-8"
        >
          {/* Score card — first on mobile, right on desktop */}
          <div className="order-1 md:order-2 md:col-span-2">
            <div className="rounded-3xl border border-stroke bg-surface/40 p-6 sm:p-8 flex flex-col items-center text-center">
              {result && <Dial p={result.p} approved={result.approved} />}
              <div
                className="mt-5 rotate-[-4deg] rounded-md border-2 px-4 py-1 font-mono text-sm font-bold uppercase tracking-[0.2em]"
                style={{
                  borderColor: result?.approved ? POS : NEG,
                  color: result?.approved ? POS : NEG,
                }}
              >
                {result?.approved ? 'Approved' : 'Under review'}
              </div>
              <p className="mt-3 text-xs text-muted">
                {result?.approved
                  ? 'This session clears the synthetic engagement bar.'
                  : 'Keep scrolling — watch the model change its mind.'}
              </p>
              <div className="mt-5 w-full space-y-1 border-t border-stroke/60 pt-4 text-left font-mono text-[10px] leading-relaxed text-muted">
                <p>baseline: synthetic population, N={POPULATION_N.toLocaleString('en-US')}, seed={UNDERWRITE_SEED}</p>
                <p>
                  refit in your browser at load:{' '}
                  <span className="text-text-primary">{model ? `${model.fitMs.toFixed(0)}ms` : '…'}</span>
                  {' · '}final loss{' '}
                  <span className="text-text-primary">{model ? model.finalLoss.toFixed(3) : '…'}</span>
                </p>
                <p>attributions: w·z — exact Shapley on the log-odds (linear model)</p>
                <p className="text-muted/70">
                  computed entirely in your browser — this section makes zero
                  network requests and stores nothing.
                </p>
              </div>
            </div>
          </div>

          {/* Feature ledger */}
          <div className="order-2 md:order-1 md:col-span-3">
            <div className="rounded-3xl border border-stroke bg-surface/40 p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between px-2 font-mono text-[9px] uppercase tracking-widest text-muted">
                <span>signal</span>
                <span className="hidden sm:inline">value · z · contribution</span>
                <span className="sm:hidden">value · contrib</span>
              </div>
              <ul className="space-y-1">
                {result?.features.map((f) => {
                  const width = Math.min(Math.abs(f.contribution) / maxAbs, 1) * 50;
                  const pos = f.contribution >= 0;
                  return (
                    <li
                      key={f.key}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-mono text-[10px] sm:text-[11px] odd:bg-bg/40"
                    >
                      <span className="flex w-[7.5rem] shrink-0 items-center gap-1.5 text-muted sm:w-36">
                        {f.dynamic && (
                          <span className="inline-block h-1 w-1 shrink-0 animate-pulse rounded-full bg-accent" title="live signal" />
                        )}
                        {f.label}
                      </span>
                      <span className="w-14 shrink-0 text-right text-text-primary sm:w-16">
                        {f.display}
                      </span>
                      {!f.imputed && (
                        <span className="hidden w-12 shrink-0 text-right text-muted sm:inline">
                          z={f.z >= 0 ? '+' : ''}{f.z.toFixed(1)}
                        </span>
                      )}
                      {/* imputed ⇒ contribution is exactly 0, so the pill takes
                          the bar's slot instead of squeezing the row wider */}
                      {f.imputed ? (
                        <span className="min-w-0 flex-1 text-center">
                          <span
                            className="inline-block max-w-full truncate rounded-full border border-stroke px-1.5 text-[8px] uppercase text-muted"
                            title={
                              f.key === 'speed'
                                ? 'no pointer movement yet — population mean used'
                                : 'API unavailable in this browser — population mean used'
                            }
                          >
                            imputed
                          </span>
                        </span>
                      ) : (
                        <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded bg-stroke/50">
                          <span className="absolute left-1/2 top-0 h-full w-px bg-stroke" />
                          <span
                            className="absolute top-0 h-full rounded"
                            style={{
                              left: pos ? '50%' : `${50 - width}%`,
                              width: `${width}%`,
                              background: pos ? POS : NEG,
                            }}
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 px-2 font-mono text-[9px] leading-relaxed text-muted/70">
                pulsing dots are behavioural signals — move, scroll, and linger
                to shift your score. the rest are device &amp; context readings
                that rarely change mid-visit.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
