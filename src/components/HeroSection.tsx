import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import gsap from 'gsap';
import { Logo } from './Logo';

const HLS_VIDEO_URL = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';
const ROLES = [
  'Data Analyst',
  'Generative AI Specialist',
  'Machine Learning Engineer',
  'IT Scholar @ ABES',
];

export const HeroSection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [roleIndex, setRoleIndex] = useState<number>(0);

  // Initialize HLS video stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(HLS_VIDEO_URL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HLS_VIDEO_URL;
      video.play().catch(() => {});
    }
  }, []);

  // Cycling roles every 2.2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % ROLES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // GSAP Entrance animation
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

  const scrollToWorks = () => {
    const element = document.getElementById('works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToExperience = () => {
    const element = document.getElementById('experience');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative w-full min-h-screen py-12 sm:py-16 flex flex-col items-center justify-between overflow-hidden select-none"
    >
      {/* Background HLS Video */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2 opacity-70"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Bottom gradient fade to bg */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />
      </div>

      {/* Hero Content (Centered, z-10) */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center my-auto pt-14 sm:pt-16 pb-6">
        {/* Animated Logo Badge */}
        <div className="blur-in mb-3 hover:scale-105 transition-transform duration-300">
          <Logo size={48} className="sm:w-[56px] sm:h-[56px]" />
        </div>

        {/* Eyebrow */}
        <span className="blur-in inline-block text-[10px] sm:text-xs text-muted uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4 font-medium px-2">
          DATA ANALYST &amp; GENERATIVE AI // ABES IT '27
        </span>

        {/* Name */}
        <h1 className="name-reveal text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display italic leading-[0.95] tracking-tight text-text-primary mb-3 sm:mb-4">
          Atharv Dhiman
        </h1>

        {/* Role line */}
        <div className="blur-in text-xs sm:text-base md:text-lg text-text-primary/90 mb-3 min-h-[2rem] flex flex-wrap items-center justify-center gap-1.5 font-light px-2">
          <span>A</span>
          <span
            key={roleIndex}
            className="font-display italic text-text-primary animate-role-fade-in inline-block text-sm sm:text-lg md:text-xl font-medium"
          >
            {ROLES[roleIndex]}
          </span>
          <span>based in Ghaziabad, UP.</span>
        </div>

        {/* Description */}
        <p className="blur-in text-xs sm:text-sm text-muted max-w-xs sm:max-w-md md:max-w-lg mb-6 font-normal leading-relaxed px-2">
          Final-year B.Tech (IT) student building end-to-end analytics products — ML pipelines, Flask applications, and BI models deployed to the cloud. Built credit risk models over 51,000+ applicants at Bharat Electronics Limited (BEL).
        </p>

        {/* CTA Buttons */}
        <div className="blur-in flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto max-w-xs sm:max-w-none">
          {/* Solid "View Projects" button */}
          <button
            onClick={scrollToWorks}
            className="group relative w-full sm:w-auto inline-flex items-center justify-center p-[2px] rounded-full hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <span className="absolute inset-0 rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 w-full sm:w-auto text-center rounded-full text-xs sm:text-sm font-medium px-6 sm:px-7 py-3 sm:py-3.5 bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary transition-colors duration-300">
              Explore Projects
            </span>
          </button>

          {/* Outlined "BEL Internship" button */}
          <button
            onClick={scrollToExperience}
            className="group relative w-full sm:w-auto inline-flex items-center justify-center p-[2px] rounded-full hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <span className="absolute inset-0 rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 w-full sm:w-auto text-center rounded-full text-xs sm:text-sm font-medium px-6 sm:px-7 py-3 sm:py-3.5 border border-stroke bg-bg text-text-primary group-hover:border-transparent transition-all duration-300">
              BEL Internship Brief
            </span>
          </button>
        </div>
      </div>

      {/* Scroll Indicator (Shifted cleanly to downside) */}
      <div className="relative z-20 flex flex-col items-center gap-1.5 mt-auto pt-2 sm:pt-4 cursor-pointer" onClick={scrollToWorks}>
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
