import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Logo } from './Logo';
import { Starfield, sampleGlyphs } from '../lib/starfield';

// ---------------------------------------------------------------------------
// HeroSection — the launch stage.
// A seeded deep-space starfield in which a swarm of stars assembles into
// "ATHARV / DHIMAN". The letterforms are sampled live from the loaded
// display font's actual glyph pixels (see lib/starfield.ts), the assembly
// is integrated spring physics, and the cursor genuinely perturbs the
// field — nothing on this stage is a video or a tween.
// ---------------------------------------------------------------------------

const SEED = 51336; // the BEL portfolio size, reused as the site-wide seed
const ASSEMBLE_DELAY_MS = 2800; // begin once the loading screen has faded

export const HeroSection: React.FC = () => {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [starCount, setStarCount] = useState(0);

  // GSAP entrance for the statement block
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(
        '.name-reveal',
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.2, delay: 0.1 }
      ).fromTo(
        '.blur-in',
        { opacity: 0, filter: 'blur(10px)', y: 20 },
        { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1, stagger: 0.1 },
        '-=0.8'
      );
    }, heroRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = heroRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let disposed = false;
    let raf = 0;
    let stallTimer = 0;
    let startTimer = 0;
    let resizeTimer = 0;
    let field: Starfield | null = null;
    let dpr = 1;
    let lastTickAt = 0;
    let assemblyBegun = false;

    // ---- theme-aware star palette ----------------------------------------
    const cssVar = (name: string, fallback: string) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    };
    let colors: [string, string, string] = ['#f5f5f5', '#aac8ff', '#ffd9a8'];
    const refreshColors = () => {
      colors = [cssVar('--text', '#f5f5f5'), '#aac8ff', '#ffd9a8'];
    };
    refreshColors();
    const themeObserver = new MutationObserver(() => {
      refreshColors();
      if (prefersReduced) draw(performance.now());
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // ---- pointer (window-level; canvas stays pointer-events-none) --------
    const ptr = { clientX: NaN, clientY: NaN };
    const onMove = (e: PointerEvent) => {
      ptr.clientX = e.clientX;
      ptr.clientY = e.clientY;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // ---- build / rebuild --------------------------------------------------
    const build = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      const mobile = w < 640;
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      field = new Starfield(SEED, w, h, mobile ? 150 : 420);
      const block = sampleGlyphs(['ATHARV', 'DHIMAN'], mobile ? 420 : 900);
      if (block.count > 0) {
        // fit the constellation into the open sky between the navbar and the
        // statement block, wherever that lands on this viewport
        const cr = canvas.getBoundingClientRect();
        const contentTop = contentRef.current
          ? contentRef.current.getBoundingClientRect().top - cr.top
          : h * 0.62;
        const regionTop = Math.max(72, h * 0.1);
        const regionH = Math.max(120, Math.min(h * 0.9, contentTop - 16) - regionTop);
        const targetW = Math.min(w * 0.86, 980);
        const scale = Math.min(targetW / block.w, (regionH * 0.92) / block.h);
        const bx = (w - block.w * scale) / 2;
        const by = regionTop + (regionH - block.h * scale) / 2;
        field.setTargets(block, bx, by, scale);
      }
      setStarCount(field.bg.length + field.con.length);
      if (assemblyBegun || prefersReduced) {
        // fonts/resize rebuilt an already-running stage — don't replay the intro
        field.beginAssembly(performance.now() - 8000);
        field.snapAssembled();
      }
    };

    const draw = (nowMs: number) => {
      if (!field) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const t = nowMs / 1000;
      for (let ci = 0; ci < 3; ci++) {
        ctx.fillStyle = colors[ci];
        for (const s of field.bg) {
          if (s.ci !== ci) continue;
          ctx.globalAlpha = s.baseA * (0.72 + 0.28 * Math.sin(s.twPhase + t * s.twSpeed));
          const d = s.r * 2;
          ctx.fillRect(s.x - s.r, s.y - s.r, d, d);
        }
        for (const s of field.con) {
          if (s.ci !== ci) continue;
          ctx.globalAlpha = s.baseA * (0.78 + 0.22 * Math.sin(s.twPhase + t * s.twSpeed));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    // ---- main loop (rAF + stall fallback, pause when tab hidden) ----------
    const scheduleNext = () => {
      if (disposed) return;
      cancelAnimationFrame(raf);
      window.clearTimeout(stallTimer);
      raf = requestAnimationFrame(tick);
      stallTimer = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        tick();
      }, 250);
    };

    const tick = () => {
      if (disposed) return;
      window.clearTimeout(stallTimer);
      if (document.hidden) return; // resumes via visibilitychange
      const now = performance.now();
      const dt = lastTickAt > 0 ? (now - lastTickAt) / 1000 : 0.016;
      lastTickAt = now;

      if (field) {
        const r = canvas.getBoundingClientRect();
        const px = r.width > 0 ? ptr.clientX - r.left : NaN;
        const py = r.height > 0 ? ptr.clientY - r.top : NaN;
        field.step(dt, now, px, py);
        draw(now);
      }
      scheduleNext();
    };

    const onVisibility = () => {
      if (!document.hidden && !disposed && !prefersReduced) {
        lastTickAt = 0;
        scheduleNext();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        build();
        if (prefersReduced) draw(performance.now());
      }, 160);
    };
    window.addEventListener('resize', onResize);

    build();
    // the GSAP entrance shifts the statement block for ~1.3s — re-fit the
    // constellation once it settles (cheap while assembly hasn't started)
    const remeasureTimer = window.setTimeout(() => {
      if (!disposed && !assemblyBegun && !prefersReduced) build();
    }, 1900);
    // the display font may load after the first sample — resample once ready
    document.fonts?.ready.then(() => {
      if (!disposed) {
        build();
        if (prefersReduced) draw(performance.now());
      }
    });

    if (prefersReduced) {
      field?.beginAssembly(performance.now() - 8000);
      field?.snapAssembled();
      draw(performance.now());
    } else {
      startTimer = window.setTimeout(() => {
        assemblyBegun = true;
        field?.beginAssembly(performance.now());
      }, ASSEMBLE_DELAY_MS);
      scheduleNext();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(stallTimer);
      window.clearTimeout(startTimer);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(remeasureTimer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      themeObserver.disconnect();
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative w-full min-h-[100svh] flex flex-col overflow-hidden select-none"
    >
      {/* The starfield — the name assembles up here */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Bottom fade into the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-bg to-transparent"
      />

      {/* Statement block, pinned to the lower third like a launch page */}
      <div
        ref={contentRef}
        className="relative z-10 mt-auto w-full max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-[7svh] text-center flex flex-col items-center"
      >
        <div className="blur-in mb-4 w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] hover:scale-105 transition-transform duration-300">
          <Logo size="100%" />
        </div>

        <span className="blur-in inline-block text-[10px] sm:text-xs text-muted uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 font-medium px-2">
          DATA ANALYST &amp; MACHINE LEARNING // ABES IT '27
        </span>

        <h1 className="name-reveal text-4xl sm:text-6xl md:text-7xl font-medium tracking-[-0.03em] leading-[1.04] text-text-primary mb-4">
          <span className="sr-only">Atharv Dhiman — </span>
          A new generation of{' '}
          <em className="font-display italic font-normal">analytics</em>.
        </h1>

        <p className="blur-in text-xs sm:text-sm md:text-base text-muted max-w-xs sm:max-w-lg md:max-w-xl mb-7 font-normal leading-relaxed px-2">
          Not a mockup and not a reel — the models on this page train, score,
          forecast, and verify themselves in your browser while you watch.
          Built by a final-year B.Tech (IT) student who modeled 51,000+ credit
          applicants at Bharat Electronics Limited.
        </p>

        <div className="blur-in flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto max-w-xs sm:max-w-none">
          <button
            onClick={() => scrollTo('boundary')}
            className="group relative w-full sm:w-auto inline-flex items-center justify-center p-[2px] rounded-full hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <span className="absolute inset-0 rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 w-full sm:w-auto text-center rounded-full text-xs sm:text-sm font-medium px-6 sm:px-7 py-3 sm:py-3.5 bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary transition-colors duration-300">
              Watch it train live
            </span>
          </button>

          <button
            onClick={() => scrollTo('works')}
            className="group relative w-full sm:w-auto inline-flex items-center justify-center p-[2px] rounded-full hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <span className="absolute inset-0 rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 w-full sm:w-auto text-center rounded-full text-xs sm:text-sm font-medium px-6 sm:px-7 py-3 sm:py-3.5 border border-stroke bg-bg text-text-primary group-hover:border-transparent transition-all duration-300">
              Explore projects
            </span>
          </button>
        </div>

        {/* honesty caption — the numbers behind the spectacle */}
        <p className="blur-in mt-5 hidden sm:block font-mono text-[9px] text-muted/70 px-2">
          {starCount > 0 ? `${starCount} stars` : 'stars'} · name sampled live
          from the font's glyph pixels · seed {SEED} · move your cursor through
          them
        </p>
      </div>

      {/* Scroll cue */}
      <div
        className="relative z-20 flex flex-col items-center gap-1.5 pb-3 sm:pb-4 cursor-pointer"
        onClick={() => scrollTo('boundary')}
      >
        <span className="text-[9px] sm:text-[10px] text-muted uppercase tracking-[0.2em] font-medium">
          SCROLL
        </span>
        <div className="relative w-px h-6 sm:h-8 bg-stroke/60 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 accent-gradient animate-scroll-down" />
        </div>
      </div>
    </section>
  );
};
