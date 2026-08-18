import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BeatGame, ROUND_SIZE } from '../lib/beatgame';
import type { Confusion } from '../lib/beatgame';

// ---------------------------------------------------------------------------
// BeatMyModelSection — "mechanism 09: Beat My Model".
// Human vs a deliberately linear classifier on curved (two-moons) data.
// Label the round's points, reveal, and compare real confusion matrices.
// Event-driven: nothing animates, everything redraws on interaction.
// ---------------------------------------------------------------------------

const REPAID = '#34d399'; // class 1
const DEFAULTED = '#f87171'; // class 0
const BASE_SEED = 51336;

const MatrixCard: React.FC<{
  title: string;
  c: Confusion;
  accent: boolean;
}> = ({ title, c, accent }) => {
  const m = BeatGame.metrics(c);
  const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);
  const cell = (v: number, good: boolean) => (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-stroke/60 py-1.5"
      style={{ background: good ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)' }}
    >
      <span className="text-sm text-text-primary">{v}</span>
    </div>
  );
  return (
    <div className={`rounded-2xl border p-4 font-mono text-[10px] sm:text-[11px] ${accent ? 'border-accent/50 bg-surface/70' : 'border-stroke bg-bg/50'}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="uppercase tracking-widest text-text-primary">{title}</span>
        <span className="text-muted">n={m.n}</span>
      </div>
      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-1 text-muted">
        <span></span>
        <span className="text-center text-[8px] uppercase">truth: repaid</span>
        <span className="text-center text-[8px] uppercase">truth: defaulted</span>
        <span className="text-[8px] uppercase [writing-mode:initial]">said repaid</span>
        {cell(c.tp, true)}
        {cell(c.fp, false)}
        <span className="text-[8px] uppercase">said defaulted</span>
        {cell(c.fn, false)}
        {cell(c.tn, true)}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted">
        <span>accuracy <span className="text-text-primary">{pct(m.accuracy)}</span></span>
        <span>precision <span className="text-text-primary">{pct(m.precision)}</span></span>
        <span>recall <span className="text-text-primary">{pct(m.recall)}</span></span>
        <span>F1 <span className="text-accent">{pct(m.f1)}</span></span>
      </div>
    </div>
  );
};

export const BeatMyModelSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<BeatGame | null>(null);
  const [seedIdx, setSeedIdx] = useState(0);
  const [, setTick] = useState(0); // re-render trigger after interactions
  const [error, setError] = useState<string | null>(null);

  const game = useMemo(() => new BeatGame(BASE_SEED + seedIdx * 13), [seedIdx]);
  // ref tracks the instance React actually rendered (assigning inside the
  // memo factory would desync under StrictMode's double-invocation)
  gameRef.current = game;

  const rerender = () => setTick((t) => t + 1);

  const draw = () => {
    const canvas = canvasRef.current;
    const g = gameRef.current;
    if (!canvas || !g) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(canvas.clientWidth * dpr)) {
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // training data, faint — the shape the model was fit on
    for (const p of g.train) {
      ctx.fillStyle = p.cls === 1 ? REPAID : DEFAULTED;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // the model's LINEAR decision boundary: w0(x-.5)+w1(y-.5)+b = 0
    const [w0, w1] = g.w;
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (Math.abs(w1) > Math.abs(w0)) {
      const yAt = (x: number) => 0.5 - (g.b + w0 * (x - 0.5)) / w1;
      ctx.moveTo(0, yAt(0) * h);
      ctx.lineTo(w, yAt(1) * h);
    } else if (Math.abs(w0) > 1e-9) {
      const xAt = (y: number) => 0.5 - (g.b + w1 * (y - 0.5)) / w0;
      ctx.moveTo(xAt(0) * w, 0);
      ctx.lineTo(xAt(1) * w, h);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // test points
    for (const p of g.test) {
      const x = p.x * w;
      const y = p.y * h;
      if (!g.revealed) {
        if (p.humanLabel === null) {
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 1.75;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.humanLabel === 1 ? REPAID : DEFAULTED;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
      } else {
        // fill = truth
        ctx.fillStyle = p.cls === 1 ? REPAID : DEFAULTED;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        // human wrong → white ✗
        if (p.humanLabel !== p.cls) {
          ctx.strokeStyle = '#0a0a0a';
          ctx.lineWidth = 2.25;
          ctx.beginPath();
          ctx.moveTo(x - 3.5, y - 3.5);
          ctx.lineTo(x + 3.5, y + 3.5);
          ctx.moveTo(x + 3.5, y - 3.5);
          ctx.lineTo(x - 3.5, y + 3.5);
          ctx.stroke();
        }
        // model wrong → dashed outer ring
        if (p.modelPred !== p.cls) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  };

  useEffect(() => {
    draw();
    const canvas = canvasRef.current;
    const onResize = () => draw();
    // native listener (matches every other mechanism's proven input path)
    const onCanvasDown = (e: PointerEvent) => {
      const g = gameRef.current;
      if (!g || !canvas || g.revealed) return;
      const r = canvas.getBoundingClientRect();
      if (r.width === 0) return;
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      let best = -1;
      let bestD = 0.0025; // ~0.05 normalized hit radius, squared
      g.test.forEach((p, i) => {
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best >= 0) {
        g.cycleLabel(best);
        setError(null);
        rerender();
      }
    };
    window.addEventListener('resize', onResize);
    canvas?.addEventListener('pointerdown', onCanvasDown);
    return () => {
      window.removeEventListener('resize', onResize);
      canvas?.removeEventListener('pointerdown', onCanvasDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // redraw after every state-changing interaction
  useEffect(() => {
    draw();
  });

  const onScore = () => {
    const g = gameRef.current!;
    if (!g.allLabeled) {
      setError(`label all ${ROUND_SIZE} points first — ${g.test.filter((p) => p.humanLabel === null).length} still hollow`);
      return;
    }
    setError(null);
    g.score();
    rerender();
  };

  const labeled = game.test.filter((p) => p.humanLabel !== null).length;
  const hm = BeatGame.metrics(game.human);
  const mm = BeatGame.metrics(game.model);
  const roundHuman = game.revealed ? game.test.filter((p) => p.humanLabel === p.cls).length : null;
  const roundModel = game.revealed ? game.test.filter((p) => p.modelPred === p.cls).length : null;
  const lead =
    hm.f1 !== null && mm.f1 !== null
      ? hm.f1 > mm.f1 ? 'you lead' : hm.f1 < mm.f1 ? 'the model leads' : 'dead even'
      : null;

  return (
    <section id="beatmodel" className="bg-bg py-16 md:py-24 relative select-none border-t border-stroke/40">
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
              Mechanism 09 — Model Evaluation
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
            Beat my <span className="font-display italic">model</span>
          </h2>
          <p className="text-sm text-muted max-w-lg mx-auto mt-4 font-normal">
            My logistic model was fit on the curved data below — but it can only
            draw a straight line, and that blind spot is yours to exploit. Label
            the hollow points (click to flip repaid/defaulted), score the round,
            and compare real confusion matrices. Evaluation is about finding
            where models fail. Can you?
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true, margin: '-60px' }}
          className="rounded-3xl border border-stroke bg-surface/40 p-3 sm:p-5"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div>
              <canvas
                ref={canvasRef}
                aria-label="Two-moons data field. Click the hollow test points to label them repaid or defaulted, then score the round against the model."
                className="h-[340px] w-full cursor-pointer rounded-2xl border border-stroke/60 bg-bg/50 sm:h-[430px]"
                style={{ touchAction: 'pan-y' }}
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 font-mono text-[9px] text-muted sm:text-[10px]">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: REPAID }} /> repaid</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: DEFAULTED }} /> defaulted</span>
                <span>○ unlabeled test point</span>
                <span>┄ model's linear boundary</span>
                {game.revealed && <span>✗ = your miss · dashed ring = model's miss</span>}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-stroke bg-bg/50 px-4 py-3 font-mono text-[10px] text-muted sm:text-[11px]">
                <div className="flex items-center justify-between">
                  <span>round {game.round}</span>
                  <span>{game.revealed ? 'revealed' : `${labeled}/${ROUND_SIZE} labeled`}</span>
                </div>
                {game.revealed && (
                  <div className="mt-1 text-text-primary">
                    this round: you {roundHuman}/{ROUND_SIZE} · model {roundModel}/{ROUND_SIZE}
                  </div>
                )}
                {lead && (
                  <div className="mt-1">
                    cumulative F1: <span className="text-accent">{lead}</span>
                  </div>
                )}
                {error && <div className="mt-1.5 text-[10px]" style={{ color: DEFAULTED }}>{error}</div>}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {!game.revealed ? (
                    <button onClick={onScore} className="cursor-pointer rounded-full border border-accent/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-text-primary transition-colors hover:bg-accent/10">
                      score round
                    </button>
                  ) : (
                    <button onClick={() => { game.newRound(); setError(null); rerender(); }} className="cursor-pointer rounded-full border border-accent/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-text-primary transition-colors hover:bg-accent/10">
                      next round →
                    </button>
                  )}
                  <button onClick={() => { setSeedIdx((i) => i + 1); setError(null); }} className="cursor-pointer rounded-full border border-stroke px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent/60 hover:text-text-primary">
                    new game
                  </button>
                </div>
              </div>

              <MatrixCard title="you" c={game.human} accent={hm.f1 !== null && mm.f1 !== null && hm.f1 >= mm.f1} />
              <MatrixCard title="the model" c={game.model} accent={hm.f1 !== null && mm.f1 !== null && mm.f1 > hm.f1} />
            </div>
          </div>

          <p className="mt-3 px-1 font-mono text-[9px] leading-relaxed text-muted/70">
            the model is a logistic regression genuinely fit in your browser
            ({game.fitMs.toFixed(0)}ms, train accuracy {(game.trainAcc * 100).toFixed(1)}%
            on 400 seeded points, seed {game.seed}) — deliberately linear on
            curved data. its predictions for each round are locked the moment
            the points spawn, before you label anything. all metrics come from
            the real cumulative confusion counts on identical points. positive
            class for precision/recall: repaid. this mechanism makes zero
            network requests and stores nothing about you.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
