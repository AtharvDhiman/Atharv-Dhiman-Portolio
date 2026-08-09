import React from 'react';
import { motion } from 'framer-motion';

interface JournalEntry {
  id: string;
  title: string;
  readTime: string;
  date: string;
  imageUrl: string;
}

const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: '1',
    title: 'The Art of Micro-Interactions in Modern Interfaces',
    readTime: '4 min read',
    date: 'Jan 2026',
    imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: '2',
    title: 'Scaling Generative UI Systems with Motion Physics',
    readTime: '6 min read',
    date: 'Dec 2025',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: '3',
    title: 'Designing for Silence: Minimalism in Digital Workspaces',
    readTime: '5 min read',
    date: 'Nov 2025',
    imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: '4',
    title: 'Why Typography Shapes the Unconscious User Journey',
    readTime: '3 min read',
    date: 'Oct 2025',
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=200&q=80',
  },
];

export const JournalSection: React.FC = () => {
  return (
    <section className="bg-bg py-16 md:py-24 relative select-none">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
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
                Journal & Notes
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
              Recent <span className="font-display italic text-text-primary">thoughts</span>
            </h2>
          </div>

          <div className="flex flex-col md:items-end gap-3">
            <p className="text-sm text-muted max-w-sm font-normal">
              Explorations, essays, and architectural design breakdowns.
            </p>

            {/* "View all" button */}
            <a
              href="#journal"
              className="hidden md:inline-flex items-center gap-2 group p-[1px] rounded-full mt-2"
            >
              <div className="relative z-10 flex items-center gap-2 bg-surface px-5 py-2.5 rounded-full border border-stroke text-xs text-text-primary hover:border-transparent group-hover:bg-bg transition-all duration-300">
                <span>View all essays</span>
                <span className="text-sm transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </a>
          </div>
        </motion.div>

        {/* 4 Horizontal Pill Entries */}
        <div className="flex flex-col gap-4">
          {JOURNAL_ENTRIES.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 md:p-5 bg-surface/30 hover:bg-surface border border-stroke hover:border-white/20 rounded-[30px] sm:rounded-full transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-4 md:gap-6">
                {/* Thumbnail Image */}
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden shrink-0 border border-stroke group-hover:border-accent transition-colors duration-300">
                  <img
                    src={entry.imageUrl}
                    alt={entry.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* Title */}
                <h3 className="text-base md:text-lg font-medium text-text-primary group-hover:text-white transition-colors duration-200">
                  {entry.title}
                </h3>
              </div>

              {/* Metadata & Action */}
              <div className="flex items-center gap-6 text-xs text-muted ml-16 sm:ml-0">
                <span className="font-mono bg-bg/60 px-3 py-1 rounded-full border border-stroke">
                  {entry.readTime}
                </span>
                <span className="font-mono text-muted">{entry.date}</span>
                <div className="w-8 h-8 rounded-full border border-stroke flex items-center justify-center text-text-primary group-hover:bg-text-primary group-hover:text-bg transition-all duration-300">
                  ↗
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
