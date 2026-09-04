import React from 'react';
import { motion } from 'framer-motion';
import { HeroSim } from './HeroSim';

// ---------------------------------------------------------------------------
// BoundaryFrame — the "launch video" slot, except nothing here is a video.
// Mechanism 01 (The Boundary) runs inside a media frame right under the
// hero: a real 2-16-16-1 classifier fitting drifting credit-risk data in
// the visitor's browser. Below it, the launch-page editorial introduction.
// ---------------------------------------------------------------------------

export const BoundaryFrame: React.FC = () => {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="boundary" className="relative bg-bg pt-2 pb-16 md:pb-24 select-none">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
        {/* the media frame */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-60px' }}
        >
          <div className="rounded-2xl md:rounded-3xl border border-stroke bg-surface/30 overflow-hidden">
            {/* player chrome — except this player has no timeline */}
            <div className="flex items-center justify-between gap-3 border-b border-stroke/70 px-4 py-2.5 md:px-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-text-primary shrink-0">
                  Live
                </span>
                <span className="hidden sm:inline font-mono text-[10px] text-muted truncate">
                  mechanism 01 — the boundary · a credit-risk classifier training in this frame right now
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted shrink-0">
                not a recording
              </span>
            </div>

            {/* the living world */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[72svh]">
              <HeroSim framed />
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.15 }}
          viewport={{ once: true }}
          className="mt-4 text-center text-xs md:text-sm italic text-muted max-w-2xl mx-auto leading-relaxed"
        >
          This is not a 15-second condensed playback. A hand-written 2-16-16-1
          neural network is fitting drifting credit-risk data on your device —
          drag the applicants, hold to inject a cohort, or freeze the model and
          watch its holdout accuracy honestly decay.
        </motion.p>

        {/* launch-page editorial introduction */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="mt-16 md:mt-24 max-w-3xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em] font-medium">
              Introducing
            </span>
          </div>

          <p className="text-xl sm:text-2xl md:text-[1.7rem] leading-snug text-text-primary font-normal">
            We&rsquo;re introducing{' '}
            <em className="font-display italic">Atharv Dhiman</em> — a
            final-year B.Tech (IT) student who ships analytics that run, not
            screenshots of them. Launch pages show you videos of a model
            working; this page hands you the model.
          </p>

          <p className="mt-6 text-sm md:text-base leading-relaxed text-muted">
            State of the art on his own benchmarks: a credit-risk portfolio of
            51,336 applicants modeled to 0.989 F1 during his internship at
            Bharat Electronics Limited, end-to-end ML pipelines and Flask applications
            deployed to the cloud, and six live mechanisms on this page — each
            one trained, scored, and verified on your device, with every
            displayed number genuinely computed. Nothing is eased, canned, or
            pre-rendered.
          </p>

          <p className="mt-6 text-sm md:text-base leading-relaxed text-text-primary/90">
            Atharv is rolling out to the industry in 2027 — and is available
            today to a limited set of employers for internships, projects, and
            full-time conversations.{' '}
            <button
              onClick={scrollToContact}
              className="cursor-pointer text-accent underline decoration-stroke underline-offset-4 hover:decoration-accent transition-colors"
            >
              Request access ↓
            </button>
          </p>
        </motion.div>
      </div>
    </section>
  );
};
