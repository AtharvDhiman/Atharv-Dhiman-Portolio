import React from 'react';
import { motion } from 'framer-motion';

interface StatItem {
  value: string;
  label: string;
  sublabel: string;
}

const STATS: StatItem[] = [
  {
    value: '20+',
    label: 'Years Experience',
    sublabel: 'Crafting digital products',
  },
  {
    value: '95+',
    label: 'Projects Done',
    sublabel: 'From concept to production',
  },
  {
    value: '200%',
    label: 'Satisfied Clients',
    sublabel: 'Delivering exceptional impact',
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

              <span className="text-5xl md:text-6xl lg:text-7xl font-display italic text-text-primary mb-4 tracking-tight">
                {stat.value}
              </span>
              <h3 className="text-lg font-medium text-text-primary mb-1">
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
