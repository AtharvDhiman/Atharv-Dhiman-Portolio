import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SessionUnderwriting } from './SessionUnderwriting';
import { ModelObservatory } from './ModelObservatory';
import { SegmentationSection } from './SegmentationSection';
import { ForecastSection } from './ForecastSection';
import { FraudRadarSection } from './FraudRadarSection';
import { GaltonSection } from './GaltonSection';
import { OptimizerRacesSection } from './OptimizerRacesSection';

// ---------------------------------------------------------------------------
// MechanismsSection — the chooser. Seven live mechanisms, one open at a
// time: visitors pick which demo to run, so the page only pays for the
// mechanism actually in use. 01 is always live behind the hero; 07 lives
// on /lab. Each mechanism cleans up fully on close (verified effects).
// ---------------------------------------------------------------------------

type MechId = '02' | '03' | '04' | '05' | '06' | '07' | '08';

interface Card {
  id: string;
  title: string;
  discipline: string;
  blurb: string;
  action: 'mount' | 'hero' | 'lab';
}

const CARDS: Card[] = [
  {
    id: '01', title: 'The Boundary', discipline: 'Supervised learning',
    blurb: 'A neural network training live on drifting credit-risk data — always running behind my name.',
    action: 'hero',
  },
  {
    id: '02', title: 'The Underwriting', discipline: 'Explainable inference',
    blurb: 'A logistic model refit in your browser underwrites this visit, with exact Shapley attributions.',
    action: 'mount',
  },
  {
    id: '03', title: 'The Control Room', discipline: 'MLOps observability',
    blurb: 'Live monitoring of the other mechanisms: drift alerts, web vitals, and an honest event log.',
    action: 'mount',
  },
  {
    id: '04', title: 'The Segmentation', discipline: 'Unsupervised learning',
    blurb: 'k-means clustering your cursor trail live, with a real elbow sweep choosing k.',
    action: 'mount',
  },
  {
    id: '05', title: 'The Forecast', discipline: 'Time-series forecasting',
    blurb: 'An AR model predicts your scroll 600ms ahead and reports its skill against the naive baseline.',
    action: 'mount',
  },
  {
    id: '06', title: 'The Fraud Radar', discipline: 'Anomaly detection',
    blurb: 'Mahalanobis scoring of your movement against your own baseline, flagged past a real χ² threshold.',
    action: 'mount',
  },
  {
    id: '07', title: 'The Galton Machine', discipline: 'Statistical foundations',
    blurb: 'The Central Limit Theorem assembling itself from real random walks — with a live χ² verdict.',
    action: 'mount',
  },
  {
    id: '08', title: 'The Optimizer Races', discipline: 'Optimization',
    blurb: 'Drop SGD, Momentum and Adam anywhere on a real loss landscape and watch them race downhill.',
    action: 'mount',
  },
];

export const MechanismsSection: React.FC = () => {
  const [active, setActive] = useState<MechId | null>(null);

  const onCard = (c: Card) => {
    if (c.action === 'hero') {
      document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (c.action === 'lab') {
      window.location.href = '/lab';
      return;
    }
    setActive((cur) => (cur === c.id ? null : (c.id as MechId)));
  };

  return (
    <>
      <section id="mechanisms" className="bg-bg py-16 md:py-24 relative select-none border-t border-stroke/40">
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
                Eight Live Mechanisms — Choose One
              </span>
              <div className="w-8 h-px bg-stroke" />
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
              Pick a <span className="font-display italic">mechanism</span>
            </h2>
            <p className="text-sm text-muted max-w-lg mx-auto mt-4 font-normal">
              Each one is a real, live system — trained, scored, and computed in
              your browser, never canned. One runs at a time so the page stays
              fast: open one below and it boots fresh for you.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
          >
            {CARDS.map((c) => {
              const isActive = active === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onCard(c)}
                  className={`group rounded-3xl border p-5 text-left transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'border-accent/60 bg-surface/70'
                      : 'border-stroke bg-surface/40 hover:border-stroke/90 hover:bg-surface/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-muted">{c.id}</span>
                    <span className={`font-mono text-[9px] uppercase tracking-widest ${
                      isActive ? 'text-accent' : 'text-muted/70'
                    }`}>
                      {c.action === 'hero' ? 'always live ↑' : c.action === 'lab' ? '/lab ↗' : isActive ? '● running — close' : 'open ↓'}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-medium text-text-primary">{c.title}</h3>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-accent/80">
                    {c.discipline}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{c.blurb}</p>
                </button>
              );
            })}
          </motion.div>

          <p className="mt-4 text-center font-mono text-[9px] text-muted/70">
            every mechanism makes zero network requests and stores nothing about
            you. closing one shuts it down completely.
          </p>
        </div>
      </section>

      {/* the chosen mechanism boots fresh below; closing unmounts it fully */}
      {active === '02' && <SessionUnderwriting />}
      {active === '03' && <ModelObservatory />}
      {active === '04' && <SegmentationSection />}
      {active === '05' && <ForecastSection />}
      {active === '06' && <FraudRadarSection />}
      {active === '07' && <GaltonSection />}
      {active === '08' && <OptimizerRacesSection />}
    </>
  );
};
