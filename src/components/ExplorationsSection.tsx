import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface SkillItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  rotation: string;
  description: string;
  tags: string[];
}

const SKILLS_PLAYGROUND: SkillItem[] = [
  {
    id: 'skill-1',
    title: 'Python & SQL for Analytics',
    category: 'Languages',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    rotation: '-rotate-3',
    description: 'Writing analysis-ready Python and SQL — from data pulls and joins to scripted pipelines powering scoring applications.',
    tags: ['Python', 'SQL'],
  },
  {
    id: 'skill-2',
    title: 'Machine Learning Classifiers & Models',
    category: 'Machine Learning',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80',
    rotation: 'rotate-2',
    description: 'Cross-validated classification pipelines comparing Logistic Regression, Random Forest and Gradient Boosting, with model evaluation and feature-importance analysis for predictive modelling.',
    tags: ['scikit-learn', 'Gradient Boosting', 'Cross-Validation', 'Feature Importance'],
  },
  {
    id: 'skill-3',
    title: 'Relational Databases & Data Modelling',
    category: 'Databases',
    imageUrl: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?auto=format&fit=crop&w=800&q=80',
    rotation: '-rotate-2',
    description: 'Designing relational schemas and data models in PostgreSQL and MySQL that feed analytics pipelines and BI exports.',
    tags: ['PostgreSQL', 'MySQL', 'Relational Data Modelling'],
  },
  {
    id: 'skill-4',
    title: 'Exploratory Data Analysis & Feature Engineering',
    category: 'Data Analysis',
    imageUrl: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=800&q=80',
    rotation: 'rotate-3',
    description: 'Data cleaning, wrangling and EDA with statistical testing (Chi-Square, correlation analysis), plus Excel Power Query and pivot-table reporting.',
    tags: ['pandas', 'NumPy', 'SciPy', 'Excel (Power Query)'],
  },
  {
    id: 'skill-5',
    title: 'Power BI & Interactive Visualizations',
    category: 'BI & Visualisation',
    imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
    rotation: '-rotate-1',
    description: 'Dashboard development and KPI reporting with Power BI, DAX and star-schema modelling, alongside Matplotlib, Seaborn and Chart.js visuals.',
    tags: ['Power BI', 'DAX', 'Seaborn', 'Chart.js'],
  },
  {
    id: 'skill-6',
    title: 'Flask Apps, Git & Cloud Deployment',
    category: 'Tools & Deployment',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
    rotation: 'rotate-2',
    description: 'Shipping Flask analytics apps from Jupyter notebooks to production on Vercel and Render, versioned with Git and GitHub.',
    tags: ['Flask', 'Git & GitHub', 'Jupyter', 'Vercel', 'Render'],
  },
];

export const ExplorationsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const colLeftRef = useRef<HTMLDivElement>(null);
  const colRightRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState<SkillItem | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Pin the center title layer
      ScrollTrigger.create({
        trigger: sectionRef.current,
        pin: pinnedRef.current,
        pinSpacing: false,
        start: 'top top',
        end: 'bottom bottom',
      });

      // 2. Parallax left column
      if (colLeftRef.current) {
        gsap.fromTo(
          colLeftRef.current,
          { y: '0px' },
          {
            y: '-220px',
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1,
            },
          }
        );
      }

      // 3. Parallax right column
      if (colRightRef.current) {
        gsap.fromTo(
          colRightRef.current,
          { y: '100px' },
          {
            y: '-400px',
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1.5,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const colLeft = SKILLS_PLAYGROUND.filter((_, i) => i % 2 === 0);
  const colRight = SKILLS_PLAYGROUND.filter((_, i) => i % 2 !== 0);

  return (
    <section
      id="skills"
      ref={sectionRef}
      className="relative min-h-[240vh] bg-bg py-24 select-none overflow-hidden"
    >
      {/* Layer 1: Pinned Center Title (z-10) */}
      <div
        ref={pinnedRef}
        className="h-screen w-full flex items-center justify-center pointer-events-none z-10 sticky top-0"
      >
        <div className="text-center px-6 pointer-events-auto">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em] font-medium">
              Technical Competencies
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>

          {/* Heading */}
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-normal text-text-primary tracking-tight mb-4">
            Skills <span className="font-display italic text-text-primary">matrix</span>
          </h2>

          <p className="text-sm text-muted max-w-sm mx-auto mb-8 font-normal">
            Languages, data analysis, ML modelling, and BI reporting tools.
          </p>

          <a
            href="https://github.com/AtharvDhiman"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 group p-[2px] rounded-full"
          >
            <div className="relative z-10 flex items-center gap-2 bg-surface px-6 py-3 rounded-full border border-stroke text-xs text-text-primary hover:border-transparent group-hover:bg-bg transition-all duration-300">
              <span>View GitHub Repositories</span>
              <span className="text-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                ↗
              </span>
            </div>
          </a>
        </div>
      </div>

      {/* Layer 2: Parallax Columns (z-20) */}
      <div className="relative z-20 max-w-[1200px] mx-auto px-6 pt-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-32 items-start">
          {/* Left Column */}
          <div ref={colLeftRef} className="flex flex-col gap-16 md:gap-24">
            {colLeft.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveItem(item)}
                className={`group relative aspect-square max-w-[320px] mx-auto w-full bg-surface border border-stroke rounded-3xl overflow-hidden cursor-pointer shadow-2xl transition-all duration-500 hover:scale-105 ${item.rotation}`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/40 to-transparent p-6 flex flex-col justify-end">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1">
                    {item.category}
                  </span>
                  <h3 className="text-sm font-medium text-white mb-2">{item.title}</h3>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[9px] font-mono bg-black/60 px-2 py-0.5 rounded text-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div ref={colRightRef} className="flex flex-col gap-16 md:gap-24">
            {colRight.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveItem(item)}
                className={`group relative aspect-square max-w-[320px] mx-auto w-full bg-surface border border-stroke rounded-3xl overflow-hidden cursor-pointer shadow-2xl transition-all duration-500 hover:scale-105 ${item.rotation}`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/40 to-transparent p-6 flex flex-col justify-end">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1">
                    {item.category}
                  </span>
                  <h3 className="text-sm font-medium text-white mb-2">{item.title}</h3>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[9px] font-mono bg-black/60 px-2 py-0.5 rounded text-muted">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeItem && (
        <div
          onClick={() => setActiveItem(null)}
          className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 cursor-zoom-out animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl w-full bg-surface border border-stroke rounded-3xl overflow-hidden shadow-2xl p-6 cursor-default"
          >
            <button
              onClick={() => setActiveItem(null)}
              className="absolute top-6 right-6 z-10 w-8 h-8 rounded-full bg-bg/80 border border-stroke text-white flex items-center justify-center text-xs hover:bg-white hover:text-black transition-colors"
            >
              ✕
            </button>
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
              {activeItem.category}
            </span>
            <h3 className="text-2xl font-display italic text-text-primary mt-1 mb-3">
              {activeItem.title}
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              {activeItem.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {activeItem.tags.map((t) => (
                <span key={t} className="text-xs font-mono bg-bg border border-stroke px-3 py-1 rounded-full text-emerald-400">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
