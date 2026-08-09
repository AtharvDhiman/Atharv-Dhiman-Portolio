import React from 'react';
import { motion } from 'framer-motion';

interface StatItem {
  value: string;
  label: string;
  sublabel: string;
}

const STATS: StatItem[] = [
  {
    value: '51,336+',
    label: 'Applicants Scored',
    sublabel: 'Bharat Electronics Ltd (BEL) credit pipeline',
  },
  {
    value: '99.4%',
    label: 'ML Model Accuracy',
    sublabel: 'Gradient Boosting (F1 0.989) on BEL FinRisk',
  },
  {
    value: '91.6%',
    label: 'RetainAI Accuracy',
    sublabel: 'Employee flight risk forecasting runtime',
  },
];

export const StatsSection: React.FC = () => {
  return (
    <section className="bg-bg py-16 md:py-24 border-y border-stroke/50 select-none">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {STATS.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: idx * 0.15 }}
              viewport={{ once: true }}
              className="flex flex-col items-start p-8 bg-surface/20 border border-stroke rounded-3xl relative overflow-hidden group hover:border-stroke/80 transition-all duration-300"
            >
              {/* Subtle background glow */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 accent-gradient rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />

              <span className="text-4xl md:text-5xl lg:text-6xl font-display italic text-text-primary mb-3 tracking-tight">
                {stat.value}
              </span>
              <h3 className="text-base md:text-lg font-medium text-text-primary mb-1">
                {stat.label}
              </h3>
              <p className="text-xs text-muted font-normal">
                {stat.sublabel}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
