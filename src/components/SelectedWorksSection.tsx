import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Project {
  id: string;
  title: string;
  category: string;
  year: string;
  colSpan: string;
  aspectRatio: string;
  imageUrl: string;
  demoUrl?: string;
  description: string;
  highlights: string[];
  skills: string[];
}

const PROJECTS: Project[] = [
  {
    id: 'finrisk',
    title: 'FinRisk — Credit Risk & Smart Loan Engine',
    category: 'BEL Internship Assigned Project',
    year: '2026',
    colSpan: 'md:col-span-6',
    aspectRatio: 'aspect-[16/10]',
    imageUrl: '/projects/finrisk.jpg',
    demoUrl: 'https://fin-risk-credit-risk-and-loan-recom-five.vercel.app',
    description: 'Sole owner of an end-to-end credit risk assessment brief at Bharat Electronics Limited (BEL) Central Research Laboratory. Scored 51,336 applicant records merged from internal bank systems and CIBIL bureau data into four risk tiers (P1–P4) with tier-specific caps and FOIR (≤30%) guardrails.',
    highlights: ['99.4% Accuracy (F1 0.989)', '51,336 Applicants Scored', 'Power BI Star-Schema Export'],
    skills: ['Python', 'Flask', 'Scikit-Learn', 'PostgreSQL', 'Power BI'],
  },
  {
    id: 'retainai',
    title: 'RetainAI — Employee Flight Risk Platform',
    category: 'Predictive HR Analytics & ML',
    year: '2026',
    colSpan: 'md:col-span-6',
    aspectRatio: 'aspect-[16/10]',
    imageUrl: '/projects/retainai.jpg',
    demoUrl: 'https://employee-attrition-system.vercel.app/',
    description: 'Cloud-deployed predictive analytics web application forecasting employee attrition risk at 91.6% accuracy. Model comparison across Logistic Regression, Random Forest and Gradient Boosting surfaces the key attrition drivers — overtime, commute distance and compensation.',
    highlights: ['91.6% Attrition Accuracy', 'Key Driver Analysis', 'Batch CSV Processor'],
    skills: ['Python', 'Flask', 'Scikit-Learn', 'Chart.js', 'PostgreSQL'],
  },
];

export const SelectedWorksSection: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
                Featured Live Analytics Products
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal text-text-primary tracking-tight">
              Selected <span className="font-display italic text-text-primary">projects</span>
            </h2>
          </div>

          <div className="flex flex-col md:items-end gap-3">
            <p className="text-sm text-muted max-w-sm font-normal">
              Cloud-deployed machine learning models and analytics applications for credit risk assessment and workforce analytics.
            </p>
          </div>
        </motion.div>

        {/* 2 Featured Projects Grid (Side by side 6 / 6 span) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          {PROJECTS.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              viewport={{ once: true, margin: '-50px' }}
              onClick={() => setSelectedProject(project)}
              className={`group relative overflow-hidden bg-surface border border-stroke rounded-3xl ${project.colSpan} cursor-pointer hover:border-stroke/90 transition-all duration-300`}
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
                <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 text-xs font-mono text-white/90">
                  <span className="bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
                    {project.category}
                  </span>
                  <span className="bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
                    {project.year}
                  </span>
                </div>

                {/* Hover Backdrop Overlay with Animated Gradient Pill Label */}
                <div className="absolute inset-0 bg-bg/80 opacity-0 group-hover:opacity-100 transition-all duration-400 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 text-center">
                  {/* Highlights pills */}
                  <div className="flex flex-wrap justify-center gap-2 mb-4 max-w-md">
                    {project.highlights.map((h, i) => (
                      <span key={i} className="text-[11px] font-mono bg-surface border border-stroke px-2.5 py-1 rounded-full text-emerald-400">
                        ✓ {h}
                      </span>
                    ))}
                  </div>

                  {/* Pill with animated gradient border */}
                  <div className="relative p-[1.5px] rounded-full accent-gradient animate-gradient-shift transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="bg-white text-black px-6 py-3 rounded-full text-sm font-medium shadow-xl flex items-center gap-2">
                      <span>View Details —</span>
                      <span className="font-display italic font-semibold text-base">
                        {project.title.split('—')[0].trim()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card Title Bar */}
              <div className="p-6 md:p-7 bg-surface border-t border-stroke/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg md:text-xl font-medium text-text-primary mb-1">
                    {project.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {project.skills.map((skill) => (
                      <span key={skill} className="text-[11px] font-mono text-muted">
                        • {skill}
                      </span>
                    ))}
                  </div>
                </div>
                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-4 py-2 rounded-full hover:bg-emerald-900 transition-colors shrink-0 inline-flex items-center gap-1.5"
                  >
                    <span>Live Demo</span>
                    <span>↗</span>
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Project Details Lightbox Modal */}
      {selectedProject && (
        <div
          onClick={() => setSelectedProject(null)}
          className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 cursor-zoom-out animate-fadeIn overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-surface border border-stroke rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 cursor-default my-8"
          >
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-6 right-6 z-10 w-9 h-9 rounded-full bg-bg/80 border border-stroke text-white flex items-center justify-center text-sm hover:bg-white hover:text-black transition-colors"
            >
              ✕
            </button>

            {/* Modal Image Header */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-6 border border-stroke">
              <img
                src={selectedProject.imageUrl}
                alt={selectedProject.title}
                className="w-full h-full object-cover"
              />
            </div>

            <span className="text-xs font-mono text-accent uppercase tracking-widest">
              {selectedProject.category} // {selectedProject.year}
            </span>

            <h3 className="text-2xl md:text-3xl font-display italic text-text-primary mt-1 mb-4">
              {selectedProject.title}
            </h3>

            <p className="text-sm text-muted leading-relaxed mb-6 font-normal">
              {selectedProject.description}
            </p>

            <div className="mb-6">
              <h4 className="text-xs font-mono text-text-primary uppercase tracking-wider mb-2">
                Key Metrics &amp; Implementations
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedProject.highlights.map((h, i) => (
                  <span key={i} className="text-xs font-mono bg-bg border border-stroke px-3 py-1.5 rounded-full text-emerald-400">
                    ✓ {h}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-stroke/60">
              <div className="flex flex-wrap gap-2">
                {selectedProject.skills.map((s) => (
                  <span key={s} className="text-xs font-mono bg-surface border border-stroke px-3 py-1 rounded-full text-muted">
                    {s}
                  </span>
                ))}
              </div>

              {selectedProject.demoUrl && (
                <a
                  href={selectedProject.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 accent-gradient text-bg font-medium px-6 py-3 rounded-full text-xs hover:opacity-90 transition-opacity"
                >
                  <span>Launch Live App</span>
                  <span>↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
