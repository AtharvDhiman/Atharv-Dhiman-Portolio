import React, { useEffect, useState } from 'react';

interface NavbarProps {
  activeSection?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeSection = 'home' }) => {
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
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4">
      <nav
        className={`inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface px-2 py-2 transition-shadow duration-300 ${
          isScrolled ? 'shadow-md shadow-black/40' : ''
        }`}
      >
        {/* 1. Logo Circle */}
        <button
          onClick={() => scrollToSection('hero')}
          className="group relative flex items-center justify-center w-9 h-9 rounded-full p-[1px] transition-transform duration-300 hover:scale-110"
        >
          {/* Accent gradient border (reverses on hover) */}
          <div className="absolute inset-0 rounded-full accent-gradient transition-transform duration-500 group-hover:rotate-180" />
          <div className="relative z-10 w-full h-full bg-bg rounded-full flex items-center justify-center">
            <span className="font-display italic text-[13px] text-text-primary font-bold tracking-tighter">
              AD
            </span>
          </div>
        </button>

        {/* 2. Divider (hidden on mobile) */}
        <div className="hidden sm:block w-px h-5 bg-stroke mx-1.5" />

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
                className={`text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 transition-all duration-200 font-medium ${
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
        <div className="w-px h-5 bg-stroke mx-1.5" />

        {/* 5. Say hi button */}
        <a
          href="mailto:ayushdhiman.9997@gmail.com"
          className="group relative inline-flex items-center justify-center text-xs sm:text-sm rounded-full p-[2px] overflow-hidden"
        >
          {/* Gradient border on hover */}
          <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <span className="relative z-10 inline-flex items-center gap-1 bg-surface px-3 sm:px-4 py-1.5 sm:py-2 rounded-full backdrop-blur-md text-text-primary group-hover:bg-bg transition-colors duration-200">
            Contact <span className="text-xs transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
          </span>
        </a>
      </nav>
    </header>
  );
};
