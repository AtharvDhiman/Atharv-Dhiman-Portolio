import React from 'react';
import { motion } from 'framer-motion';

interface Project {
  id: string;
  title: string;
  category: string;
  year: string;
  colSpan: string;
  aspectRatio: string;
  imageUrl: string;
}

const PROJECTS: Project[] = [
  {
    id: 'automotive-motion',
    title: 'Automotive Motion',
    category: '3D Simulation & WebGL',
    year: '2026',
    colSpan: 'md:col-span-7',
    aspectRatio: 'aspect-[16/10]',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'urban-architecture',
    title: 'Urban Architecture',
    category: 'Spatial Design',
    year: '2025',
    colSpan: 'md:col-span-5',
    aspectRatio: 'aspect-[4/3]',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'human-perspective',
    title: 'Human Perspective',
    category: 'AI Generative Systems',
    year: '2025',
    colSpan: 'md:col-span-5',
    aspectRatio: 'aspect-[4/3]',
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'brand-identity',
    title: 'Brand Identity',
    category: 'Digital Product',
    year: '2026',
    colSpan: 'md:col-span-7',
    aspectRatio: 'aspect-[16/10]',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  },
];

export const SelectedWorksSection: React.FC = () => {
  return (
    <section id="works" className="bg-bg py-16 md:py-24 relative select-none">
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
                Selected Work
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
              Featured <span className="font-display italic text-text-primary">projects</span>
            </h2>
          </div>

          <div className="flex flex-col md:items-end gap-3">
            <p className="text-sm text-muted max-w-sm font-normal">
              A selection of projects I've worked on, from concept to launch.
            </p>

            {/* "View all work" button (desktop only) */}
            <a
              href="#works"
              className="hidden md:inline-flex items-center gap-2 group p-[1px] rounded-full mt-2"
            >
              <div className="relative z-10 flex items-center gap-2 bg-surface px-5 py-2.5 rounded-full border border-stroke text-xs text-text-primary hover:border-transparent group-hover:bg-bg transition-all duration-300">
                <span>View all work</span>
                <span className="text-sm transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </a>
          </div>
        </motion.div>

        {/* Bento Grid (7 / 5 / 5 / 7 span layout) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          {PROJECTS.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              viewport={{ once: true, margin: '-50px' }}
              className={`group relative overflow-hidden bg-surface border border-stroke rounded-3xl ${project.colSpan} cursor-pointer`}
            >
              <div className={`w-full ${project.aspectRatio} relative overflow-hidden`}>
                {/* Background Image */}
                <img
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Halftone Overlay */}
                <div className="absolute inset-0 halftone-overlay opacity-20 mix-blend-multiply pointer-events-none" />

                {/* Card Top Information */}
                <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 text-xs font-mono text-white/80">
                  <span className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    {project.category}
                  </span>
                  <span className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    {project.year}
                  </span>
                </div>

                {/* Hover Backdrop Overlay with Animated Gradient Pill Label */}
                <div className="absolute inset-0 bg-bg/75 opacity-0 group-hover:opacity-100 transition-all duration-400 backdrop-blur-md flex items-center justify-center p-6 z-20">
                  {/* Pill with animated gradient border */}
                  <div className="relative p-[1.5px] rounded-full accent-gradient animate-gradient-shift transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="bg-white text-black px-6 py-3 rounded-full text-sm font-medium shadow-xl flex items-center gap-2">
                      <span>View —</span>
                      <span className="font-display italic font-semibold text-base">
                        {project.title}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
