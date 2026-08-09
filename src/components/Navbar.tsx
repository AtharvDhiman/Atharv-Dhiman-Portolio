import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface NavbarProps {
  activeSection?: string;
  theme: string;
  onCycleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection = 'home',
  theme,
  onCycleTheme,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(activeSection);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveTab(id.toLowerCase());
    const element = document.getElementById(id.toLowerCase());
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4 select-none">
      <nav
        className={`inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface px-2 py-2 transition-shadow duration-300 gap-1 sm:gap-1.5 ${
          isScrolled ? 'shadow-md shadow-black/40' : ''
        }`}
      >
        {/* 1. Logo Circle */}
        <button
          onClick={() => scrollToSection('hero')}
          className="group relative flex items-center justify-center w-10 h-10 rounded-full p-[1px] transition-transform duration-300 hover:scale-110 shrink-0 cursor-pointer"
          title="Atharv Dhiman — Home"
        >
          {/* Accent gradient border (reverses on hover) */}
          <div className="absolute inset-0 rounded-full accent-gradient transition-transform duration-500 group-hover:rotate-180" />
          <div className="relative z-10 w-full h-full bg-bg rounded-full flex items-center justify-center overflow-hidden p-0.5">
            <Logo size="100%" />
          </div>
        </button>

        {/* 2. Divider (hidden on mobile) */}
        <div className="hidden sm:block w-px h-5 bg-stroke mx-1" />

        {/* 3. Nav Links */}
        <div className="flex items-center gap-1">
          {[
            { name: 'Home', id: 'hero' },
            { name: 'Projects', id: 'works' },
            { name: 'Experience', id: 'experience' },
            { name: 'Skills', id: 'skills' },
            { name: 'Contact', id: 'contact' },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.id)}
                className={`text-xs sm:text-sm rounded-full px-2.5 sm:px-3.5 py-1.5 transition-all duration-200 font-medium ${
                  isActive
                    ? 'text-text-primary bg-stroke/50'
                    : 'text-muted hover:text-text-primary hover:bg-stroke/50'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>

        {/* 4. Divider */}
        <div className="w-px h-5 bg-stroke mx-1" />

        {/* 5. Theme Changer Button */}
        <button
          onClick={onCycleTheme}
          className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 sm:px-3 py-1.5 rounded-full bg-bg/80 border border-stroke text-accent hover:border-white/30 transition-all duration-200 shrink-0 cursor-pointer"
          title="Click to switch theme (Classic, Cyberpunk, Nord, Midnight, Solarized)"
        >
          <span className="w-2 h-2 rounded-full accent-gradient animate-pulse" />
          <span className="hidden md:inline text-muted">THEME:</span>
          <span className="font-bold">{theme.toUpperCase()}</span>
        </button>
      </nav>
    </header>
  );
};
