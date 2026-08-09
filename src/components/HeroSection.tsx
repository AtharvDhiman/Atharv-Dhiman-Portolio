import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import gsap from 'gsap';

const HLS_VIDEO_URL = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';
const ROLES = ['Creative', 'Fullstack', 'Founder', 'Scholar'];

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

  // Cycling roles every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % ROLES.length);
    }, 2000);
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

  const scrollToContact = () => {
    const element = document.getElementById('contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative w-full h-screen min-h-[700px] flex items-center justify-center overflow-hidden select-none"
    >
      {/* Background HLS Video */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20" />
        {/* Bottom gradient fade to bg */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />
      </div>

      {/* Hero Content (Centered, z-10) */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center pt-16">
        {/* Eyebrow */}
        <span className="blur-in inline-block text-xs text-muted uppercase tracking-[0.3em] mb-8 font-medium">
          COLLECTION '26
        </span>

        {/* Name */}
        <h1 className="name-reveal text-6xl md:text-8xl lg:text-9xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-6">
          Michael Smith
        </h1>

        {/* Role line */}
        <div className="blur-in text-base md:text-lg text-text-primary/90 mb-4 h-8 flex items-center justify-center gap-1.5 font-light">
          <span>A</span>
          <span
            key={roleIndex}
            className="font-display italic text-text-primary animate-role-fade-in inline-block text-lg md:text-xl font-medium"
          >
            {ROLES[roleIndex]}
          </span>
          <span>lives in Chicago.</span>
        </div>

        {/* Description */}
        <p className="blur-in text-sm md:text-base text-muted max-w-md mb-12 font-normal leading-relaxed">
          Designing seamless digital interactions by focusing on the unique nuances which bring systems to life.
        </p>

        {/* CTA Buttons */}
        <div className="blur-in inline-flex items-center gap-4">
          {/* Solid "See Works" button */}
          <button
            onClick={scrollToWorks}
            className="group relative inline-flex items-center justify-center p-[2px] rounded-full hover:scale-105 transition-all duration-300"
          >
            <span className="absolute inset-0 rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 rounded-full text-sm font-medium px-7 py-3.5 bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary transition-colors duration-300">
              See Works
            </span>
          </button>

          {/* Outlined "Reach out..." button */}
          <button
            onClick={scrollToContact}
            className="group relative inline-flex items-center justify-center p-[2px] rounded-full hover:scale-105 transition-all duration-300"
          >
            <span className="absolute inset-0 rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 rounded-full text-sm font-medium px-7 py-3.5 border-2 border-stroke bg-bg text-text-primary group-hover:border-transparent transition-all duration-300">
              Reach out...
            </span>
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <span className="text-[10px] text-muted uppercase tracking-[0.2em] font-medium">
          SCROLL
        </span>
        <div className="relative w-px h-10 bg-stroke/60 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 accent-gradient animate-scroll-down" />
        </div>
      </div>
    </section>
  );
};
