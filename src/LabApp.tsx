import React, { useEffect, useState } from 'react';
import { Logo } from './components/Logo';
import { GaltonSection } from './components/GaltonSection';

// ---------------------------------------------------------------------------
// LabApp — /lab: live statistical experiments that don't fit the landing
// page's train → deploy → monitor → segment → forecast → detect story.
// Shares the main site's theme system (same tokens, same localStorage key).
// ---------------------------------------------------------------------------

export function LabApp() {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('portfolio-theme') || 'classic');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    const themes = ['classic', 'cyberpunk', 'nord', 'midnight', 'solarized'];
    setTheme(themes[(themes.indexOf(theme) + 1) % themes.length]);
  };

  return (
    <div className="bg-bg min-h-screen text-text-primary selection:bg-white/20 selection:text-white transition-colors duration-400">
      {/* Slim lab header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2.5 sm:pt-4 px-2 select-none">
        <nav className="inline-flex items-center gap-1.5 rounded-full backdrop-blur-md border border-white/10 bg-surface/90 px-2 py-1.5 sm:py-2">
          <a
            href="/"
            className="group relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full p-[1px] shrink-0"
            title="Back to the portfolio"
          >
            <div className="absolute inset-0 rounded-full accent-gradient transition-transform duration-500 group-hover:rotate-180" />
            <div className="relative z-10 w-full h-full bg-bg rounded-full flex items-center justify-center overflow-hidden p-0.5">
              <Logo size="100%" />
            </div>
          </a>
          <span className="px-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            the lab
          </span>
          <a
            href="/"
            className="rounded-full px-3 py-1.5 text-[11px] sm:text-xs text-muted hover:text-text-primary hover:bg-stroke/50 transition-all duration-200 whitespace-nowrap"
          >
            ← portfolio
          </a>
          <button
            onClick={cycleTheme}
            className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-bg/80 border border-stroke text-accent hover:border-white/30 transition-all duration-200 shrink-0 cursor-pointer"
            title="Click to switch theme"
          >
            <span className="w-2 h-2 rounded-full accent-gradient animate-pulse shrink-0" />
            <span className="font-bold">{theme.toUpperCase()}</span>
          </button>
        </nav>
      </header>

      <main className="pt-24">
        {/* Lab intro */}
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 pt-8 md:pt-14 text-center">
          <h1 className="text-4xl md:text-6xl font-normal text-text-primary tracking-tight">
            The <span className="font-display italic">lab</span>
          </h1>
          <p className="text-sm text-muted max-w-lg mx-auto mt-4 font-normal">
            Live statistical experiments, built on the same honesty contract as
            the landing page's six mechanisms: everything on screen is genuinely
            computed in your browser — nothing canned, nothing eased, nothing
            leaves the page.
          </p>
          <a
            href="/"
            className="mt-5 inline-block font-mono text-[11px] text-muted hover:text-text-primary transition-colors"
          >
            mechanisms 01–06 live on the main page ↗
          </a>
        </div>

        <GaltonSection />
      </main>

      <footer className="border-t border-stroke/40 py-8 text-center">
        <p className="font-mono text-[11px] text-muted">
          © {new Date().getFullYear()} Atharv Dhiman — <a href="/" className="hover:text-text-primary transition-colors">atharvdhiman.vercel.app</a>
        </p>
      </footer>
    </div>
  );
}

export default LabApp;
