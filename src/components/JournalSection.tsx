import React from 'react';
import { motion } from 'framer-motion';

interface Certification {
  title: string;
  issuer: string;
  date: string;
  badgeColor: string;
}

const CERTIFICATIONS: Certification[] = [
  {
    title: 'Oracle Cloud Infrastructure 2025 Certified Data Science Professional',
    issuer: 'Oracle University',
    date: 'Aug 2025',
    badgeColor: 'text-amber-400 border-amber-900 bg-amber-950/40',
  },
  {
    title: 'Data Analytics Job Simulation',
    issuer: 'Deloitte Australia (Forage)',
    date: 'Jan – Jun 2026',
    badgeColor: 'text-emerald-400 border-emerald-900 bg-emerald-950/40',
  },
  {
    title: 'Data Analytics with Generative AI',
    issuer: 'Simplilearn SkillUp',
    date: 'Aug 2026',
    badgeColor: 'text-cyan-400 border-cyan-900 bg-cyan-950/40',
  },
  {
    title: 'SQL (Basic) Certificate',
    issuer: 'HackerRank',
    date: 'Aug 2025',
    badgeColor: 'text-purple-400 border-purple-900 bg-purple-950/40',
  },
];

export const JournalSection: React.FC = () => {
  return (
    <section id="experience" className="bg-bg py-16 md:py-24 relative select-none">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Experience Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-100px' }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-6"
        >
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em] font-medium">
                Experience &amp; Industry Placement
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
              Defence PSU <span className="font-display italic text-text-primary">experience</span>
            </h2>
          </div>

          <div className="flex flex-col md:items-end gap-3">
            <p className="text-sm text-muted max-w-sm font-normal">
              Applied data analytics &amp; machine learning R&amp;D at Bharat Electronics Limited (BEL).
            </p>
          </div>
        </motion.div>

        {/* Featured Internship Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="p-8 md:p-10 bg-surface/40 border border-stroke rounded-3xl mb-16 relative overflow-hidden group hover:border-stroke/80 transition-all duration-300"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-stroke/60 pb-6">
            <div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
                IT Intern — Central Research Laboratory (CRL)
              </span>
              <h3 className="text-2xl md:text-3xl font-display italic text-text-primary mt-2">
                Bharat Electronics Limited (BEL), Ghaziabad
              </h3>
            </div>
            <span className="text-xs font-mono text-muted bg-bg px-4 py-2 rounded-full border border-stroke shrink-0">
              Jul – Aug 2026
            </span>
          </div>

          <p className="text-sm text-muted leading-relaxed mb-6 font-normal">
            Sole owner of an end-to-end credit risk brief at BEL's Central Research Laboratory, taking raw data to a deployed scoring application inside a one-month placement.
          </p>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-normal text-text-primary/90 mb-6">
            <li className="flex items-start gap-2 bg-bg/50 p-3.5 rounded-2xl border border-stroke/50">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Built pipeline over 51,336 applicant records merged from internal bank systems and CIBIL bureau data into four risk tiers (P1–P4).</span>
            </li>
            <li className="flex items-start gap-2 bg-bg/50 p-3.5 rounded-2xl border border-stroke/50">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Engineered domain features and pruned 19 redundant columns; Gradient Boosting achieved 99.4% accuracy (F1 0.989).</span>
            </li>
            <li className="flex items-start gap-2 bg-bg/50 p-3.5 rounded-2xl border border-stroke/50">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Discovered approval was credit history driven (85-91% approval across income bands with boundary near 650-660 score).</span>
            </li>
            <li className="flex items-start gap-2 bg-bg/50 p-3.5 rounded-2xl border border-stroke/50">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Implemented FOIR (≤30%) guardrails, real-time Flask dashboard, debt simulation, and Power BI star-schema export.</span>
            </li>
          </ul>

          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-wrap gap-2">
              {['Python', 'Flask', 'scikit-learn', 'PostgreSQL', 'Power BI'].map((tech) => (
                <span key={tech} className="text-[11px] font-mono text-muted bg-surface px-3 py-1 rounded-full border border-stroke">
                  {tech}
                </span>
              ))}
            </div>
            <a
              href="https://fin-risk-credit-risk-and-loan-recom-five.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Live FinRisk Demo</span>
              <span>↗</span>
            </a>
          </div>
        </motion.div>

        {/* Education & Certifications Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Education Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em] font-medium">
                Academic Background
              </span>
            </div>

            <div className="p-6 bg-surface/30 border border-stroke rounded-3xl">
              <span className="text-xs font-mono text-accent">Oct 2023 – Jul 2027</span>
              <h4 className="text-lg font-medium text-text-primary mt-1">
                B.Tech, Information Technology
              </h4>
              <p className="text-xs text-muted mt-1">
                ABES Engineering College (AKTU), Ghaziabad
              </p>
            </div>

            <div className="p-6 bg-surface/30 border border-stroke rounded-3xl">
              <span className="text-xs font-mono text-muted">2022</span>
              <h4 className="text-lg font-medium text-text-primary mt-1">
                Class 12th (CBSE) — Science &amp; Math
              </h4>
              <p className="text-xs text-muted mt-1">
                Cambridge International School · 67.6%
              </p>
            </div>
          </div>

          {/* Certifications Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em] font-medium">
                Verified Certifications
              </span>
            </div>

            {CERTIFICATIONS.map((cert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center justify-between p-4 md:p-5 bg-surface/30 hover:bg-surface border border-stroke rounded-2xl transition-all duration-200"
              >
                <div>
                  <h4 className="text-sm font-medium text-text-primary">
                    {cert.title}
                  </h4>
                  <span className="text-xs text-muted font-normal">
                    {cert.issuer}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className={`text-[10px] font-mono px-3 py-1 rounded-full border ${cert.badgeColor}`}>
                    {cert.date}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
