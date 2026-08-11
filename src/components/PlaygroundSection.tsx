import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditRiskSimulator } from './CreditRiskSimulator';
import { DataAssistant } from './DataAssistant';

interface Tab {
  id: 'finrisk' | 'retainai';
  label: string;
  short: string;
  tag: string;
  blurb: string;
  demo: string;
}

const TABS: Tab[] = [
  {
    id: 'finrisk',
    label: 'Credit-Risk Simulator',
    short: 'FinRisk',
    tag: 'Machine Learning',
    blurb:
      "Drag the sliders to score a synthetic applicant — the model assigns a risk tier, approval likelihood and loan terms in real time. Modeled on FinRisk's real logic: credit-history-driven, with a decision boundary near 655 and a FOIR ≤30% guardrail.",
    demo: 'https://fin-risk-credit-risk-and-loan-recom-five.vercel.app',
  },
  {
    id: 'retainai',
    label: 'Ask the Data',
    short: 'RetainAI',
    tag: 'Generative AI',
    blurb:
      'Query the workforce-attrition dataset in plain English and get instant, data-backed answers — the same natural-language interface RetainAI puts in front of non-technical HR stakeholders.',
    demo: 'https://employee-attrition-system.vercel.app/',
  },
];

export const PlaygroundSection: React.FC = () => {
  const [active, setActive] = useState<Tab['id']>('finrisk');
  const current = TABS.find((t) => t.id === active)!;

  return (
    <section id="playground" className="bg-bg py-16 md:py-24 relative select-none">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-12 md:mb-16"
        >
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em] font-medium">
              Interactive Model Demos
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>

          {/* Heading */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
            Live <span className="font-display italic text-text-primary">playground</span>
          </h2>

          <p className="text-sm text-muted max-w-md mx-auto mt-4 font-normal">
            Don't just read about the models — play with them. Two in-browser demos
            of the Machine Learning and Generative AI behind my projects.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true, margin: '-50px' }}
          className="mx-auto flex max-w-md rounded-full border border-stroke bg-surface p-1"
        >
          {TABS.map((t) => {
            const on = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                  on
                    ? 'accent-gradient text-bg'
                    : 'text-muted hover:text-text-primary'
                }`}
              >
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Panel */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mt-8 rounded-3xl border border-stroke bg-surface/40 p-6 sm:p-9"
        >
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-stroke bg-bg px-2.5 py-1 font-mono text-[0.7rem] text-accent">
                  {current.tag}
                </span>
                <h3 className="text-lg font-medium text-text-primary">
                  {current.label}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {current.blurb}
              </p>
            </div>
            <a
              href={current.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stroke bg-bg px-4 py-2 text-xs font-mono text-emerald-400 transition-colors hover:bg-surface"
            >
              <span>Full app</span>
              <span>↗</span>
            </a>
          </div>

          {active === 'finrisk' ? <CreditRiskSimulator /> : <DataAssistant />}
        </motion.div>

        <p className="mt-5 text-center text-xs text-muted">
          These demos are simplified, client-side re-creations for illustration —
          the production models run in the linked full apps.
        </p>
      </div>
    </section>
  );
};
