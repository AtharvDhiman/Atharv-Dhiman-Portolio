import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import gsap from 'gsap';
import { Logo } from './Logo';

const HLS_VIDEO_URL = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';
const MARQUEE_TEXT = 'ATHARV DHIMAN • DATA ANALYST • GENERATIVE AI • ML ENGINEER • ';

interface ContactFooterSectionProps {
  theme: string;
  onCycleTheme: () => void;
}

export const ContactFooterSection: React.FC<ContactFooterSectionProps> = ({
  theme,
  onCycleTheme,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  // HLS Video Init
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(HLS_VIDEO_URL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HLS_VIDEO_URL;
      video.play().catch(() => {});
    }
  }, []);

  // GSAP Infinite Marquee Animation
  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;

    const ctx = gsap.context(() => {
      gsap.to(marquee, {
        xPercent: -50,
        repeat: -1,
        duration: 40,
        ease: 'none',
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <footer
      id="contact"
      className="relative bg-bg pt-20 md:pt-28 pb-8 md:pb-12 overflow-hidden select-none"
    >
      {/* Background Video (Flipped Vertically, Heavier Overlay) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2 scale-y-[-1] opacity-60"
        />
        {/* Heavier overlay */}
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* Top GSAP Infinite Marquee */}
      <div className="relative z-10 w-full overflow-hidden mb-16 md:mb-24 py-4 border-y border-white/10 backdrop-blur-sm bg-black/40">
        <div ref={marqueeRef} className="inline-flex whitespace-nowrap">
          <span className="text-2xl md:text-4xl font-display italic text-text-primary/80 tracking-widest uppercase">
            {MARQUEE_TEXT.repeat(6)}
          </span>
          <span className="text-2xl md:text-4xl font-display italic text-text-primary/80 tracking-widest uppercase">
            {MARQUEE_TEXT.repeat(6)}
          </span>
        </div>
      </div>

      {/* Main Contact CTA */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center mb-16 md:mb-28">
        <span className="text-[10px] sm:text-xs text-muted uppercase tracking-[0.3em] font-medium mb-3 sm:mb-4">
          CONNECT &amp; COLLABORATE
        </span>

        <h2 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-display italic text-text-primary mb-4 tracking-tight leading-tight">
          Let's build something predictive.
        </h2>

        <p className="text-xs sm:text-sm text-muted max-w-xs sm:max-w-md mb-6 sm:mb-8 font-normal">
          Available for Data Analyst, Machine Learning Engineer, and Generative AI roles. Based in Ghaziabad, UP.
        </p>

        {/* Email CTA Button with gradient hover ring */}
        <a
          href="mailto:ayushdhiman.9997@gmail.com"
          className="group relative inline-flex items-center justify-center p-[2px] rounded-full hover:scale-105 transition-all duration-300 mb-6 max-w-full"
        >
          <span className="absolute inset-0 rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative z-10 rounded-full text-xs sm:text-base md:text-lg font-medium px-5 sm:px-8 md:px-10 py-3.5 sm:py-4 md:py-5 bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary transition-colors duration-300 flex items-center gap-2 sm:gap-3 truncate">
            <span className="truncate">ayushdhiman.9997@gmail.com</span>
            <span className="text-sm sm:text-lg transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 shrink-0">
              ↗
            </span>
          </span>
        </a>

        <div className="text-xs font-mono text-muted flex flex-wrap justify-center gap-3 sm:gap-4">
          <span>📱 +91 8218367873</span>
          <span>📍 Ghaziabad, Uttar Pradesh</span>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 border-t border-stroke/60 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted">
        {/* Left: Social Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <a
            href="https://linkedin.com/in/atharv-dhiman-080825329"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors duration-200"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/AtharvDhiman"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors duration-200"
          >
            GitHub
          </a>
          <a
            href="https://fin-risk-credit-risk-and-loan-recom-five.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors duration-200"
          >
            BEL FinRisk
          </a>
          <a
            href="https://employee-attrition-system.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors duration-200"
          >
            RetainAI
          </a>
        </div>

        {/* Center: Theme Cycle Button & Status Badge */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onCycleTheme}
            className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-full bg-surface border border-stroke text-text-primary hover:border-white/30 transition-all duration-200 cursor-pointer"
          >
            <span className="text-muted">THEME:</span>
            <span className="font-bold text-accent">{theme.toUpperCase()}</span>
          </button>

          <div className="flex items-center gap-2 bg-surface/80 px-3.5 py-1.5 rounded-full border border-stroke">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] text-text-primary font-medium">
              Open for Data Analyst, GenAI &amp; ML Roles
            </span>
          </div>
        </div>

        {/* Right: Logo & Copyright */}
        <div className="flex items-center gap-2.5 font-mono text-[11px] text-center">
          <Logo size={22} className="shrink-0" />
          <span>© {new Date().getFullYear()} Atharv Dhiman. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};
