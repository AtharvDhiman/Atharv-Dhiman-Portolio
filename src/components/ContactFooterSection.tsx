import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import gsap from 'gsap';

const HLS_VIDEO_URL = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';
const MARQUEE_TEXT = 'BUILDING THE FUTURE • ';

export const ContactFooterSection: React.FC = () => {
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
          className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2 scale-y-[-1]"
        />
        {/* Heavier overlay */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Top GSAP Infinite Marquee */}
      <div className="relative z-10 w-full overflow-hidden mb-16 md:mb-24 py-4 border-y border-white/10 backdrop-blur-sm bg-black/30">
        <div ref={marqueeRef} className="inline-flex whitespace-nowrap">
          <span className="text-3xl md:text-5xl font-display italic text-text-primary/70 tracking-widest uppercase">
            {MARQUEE_TEXT.repeat(10)}
          </span>
          <span className="text-3xl md:text-5xl font-display italic text-text-primary/70 tracking-widest uppercase">
            {MARQUEE_TEXT.repeat(10)}
          </span>
        </div>
      </div>

      {/* Main Contact CTA */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center mb-20 md:mb-28">
        <span className="text-xs text-muted uppercase tracking-[0.3em] font-medium mb-4">
          Got a project in mind?
        </span>

        <h2 className="text-5xl md:text-7xl lg:text-8xl font-display italic text-text-primary mb-8 tracking-tight">
          Let's work together.
        </h2>

        {/* Email CTA Button with gradient hover ring */}
        <a
          href="mailto:hello@michaelsmith.com"
          className="group relative inline-flex items-center justify-center p-[2px] rounded-full hover:scale-105 transition-all duration-300"
        >
          <span className="absolute inset-0 rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative z-10 rounded-full text-base md:text-lg font-medium px-8 md:px-10 py-4 md:py-5 bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary transition-colors duration-300 flex items-center gap-3">
            <span>hello@michaelsmith.com</span>
            <span className="text-lg transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
              ↗
            </span>
          </span>
        </a>
      </div>

      {/* Footer Bottom Bar */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-8 border-t border-stroke/60 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted">
        {/* Left: Social Links */}
        <div className="flex items-center gap-6">
          {['Twitter', 'LinkedIn', 'Dribbble', 'GitHub'].map((platform) => (
            <a
              key={platform}
              href={`https://${platform.toLowerCase()}.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors duration-200"
            >
              {platform}
            </a>
          ))}
        </div>

        {/* Center: Available status badge */}
        <div className="flex items-center gap-2 bg-surface/80 px-3.5 py-1.5 rounded-full border border-stroke">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-text-primary font-medium">
            Available for projects
          </span>
        </div>

        {/* Right: Copyright */}
        <div className="font-mono text-[11px]">
          © {new Date().getFullYear()} Michael Smith. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
