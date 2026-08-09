import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ExplorationItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  rotation: string;
}

const EXPLORATIONS: ExplorationItem[] = [
  {
    id: 'exp-1',
    title: 'Neon Kinetic Fluid Dynamics',
    category: '3D & Shader Experiment',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    rotation: '-rotate-3',
  },
  {
    id: 'exp-2',
    title: 'Glassmorphism Design Systems',
    category: 'Interface Exploration',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80',
    rotation: 'rotate-2',
  },
  {
    id: 'exp-3',
    title: 'Monochrome Parametric Mesh',
    category: 'Procedural Geometry',
    imageUrl: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?auto=format&fit=crop&w=800&q=80',
    rotation: '-rotate-2',
  },
  {
    id: 'exp-4',
    title: 'Chromatic Particle System',
    category: 'WebGL Physics',
    imageUrl: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=800&q=80',
    rotation: 'rotate-3',
  },
  {
    id: 'exp-5',
    title: 'Abstract Organic Sculptures',
    category: 'AI Generative Modeling',
    imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
    rotation: '-rotate-1',
  },
  {
    id: 'exp-6',
    title: 'Cybernetic HUD Interface',
    category: 'Framer Motion Prototype',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
    rotation: 'rotate-2',
  },
];

export const ExplorationsSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const colLeftRef = useRef<HTMLDivElement>(null);
  const colRightRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState<ExplorationItem | null>(null);

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

      // 2. Parallax left column (moves slower)
      if (colLeftRef.current) {
        gsap.fromTo(
          colLeftRef.current,
          { y: '0px' },
          {
            y: '-250px',
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

      // 3. Parallax right column (moves faster)
      if (colRightRef.current) {
        gsap.fromTo(
          colRightRef.current,
          { y: '120px' },
          {
            y: '-450px',
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

  const colLeft = EXPLORATIONS.filter((_, i) => i % 2 === 0);
  const colRight = EXPLORATIONS.filter((_, i) => i % 2 !== 0);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[250vh] bg-bg py-24 select-none overflow-hidden"
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
              Explorations
            </span>
            <div className="w-8 h-px bg-stroke" />
          </div>

          {/* Heading */}
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-normal text-text-primary tracking-tight mb-4">
            Visual <span className="font-display italic text-text-primary">playground</span>
          </h2>

          <p className="text-sm text-muted max-w-sm mx-auto mb-8 font-normal">
            Experimental UI concepts, 3D shaders, and interaction prototypes.
          </p>

          <a
            href="https://dribbble.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 group p-[2px] rounded-full"
          >
            <div className="relative z-10 flex items-center gap-2 bg-surface px-6 py-3 rounded-full border border-stroke text-xs text-text-primary hover:border-transparent group-hover:bg-bg transition-all duration-300">
              <span>View Dribbble</span>
              <span className="text-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                ↗
              </span>
            </div>
          </a>
        </div>
      </div>

      {/* Layer 2: Parallax Columns (z-20, absolute overlay) */}
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
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end">
                  <span className="text-[10px] font-mono text-accent uppercase tracking-widest mb-1">
                    {item.category}
                  </span>
                  <h3 className="text-sm font-medium text-white">{item.title}</h3>
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
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end">
                  <span className="text-[10px] font-mono text-accent uppercase tracking-widest mb-1">
                    {item.category}
                  </span>
                  <h3 className="text-sm font-medium text-white">{item.title}</h3>
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
            className="relative max-w-2xl w-full bg-surface border border-stroke rounded-3xl overflow-hidden shadow-2xl p-4"
          >
            <button
              onClick={() => setActiveItem(null)}
              className="absolute top-6 right-6 z-10 w-8 h-8 rounded-full bg-bg/80 border border-stroke text-white flex items-center justify-center text-xs hover:bg-white hover:text-black transition-colors"
            >
              ✕
            </button>
            <img
              src={activeItem.imageUrl}
              alt={activeItem.title}
              className="w-full aspect-video object-cover rounded-2xl mb-4"
            />
            <div className="p-2">
              <span className="text-xs font-mono text-accent uppercase tracking-widest">
                {activeItem.category}
              </span>
              <h3 className="text-xl font-display italic text-text-primary mt-1">
                {activeItem.title}
              </h3>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
