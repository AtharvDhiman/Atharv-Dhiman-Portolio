import React, { useState, useEffect } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SessionUnderwriting } from './components/SessionUnderwriting';
import { ModelObservatory } from './components/ModelObservatory';
import { SegmentationSection } from './components/SegmentationSection';
import { SelectedWorksSection } from './components/SelectedWorksSection';
import { PlaygroundSection } from './components/PlaygroundSection';
import { JournalSection } from './components/JournalSection';
import { ExplorationsSection } from './components/ExplorationsSection';
import { StatsSection } from './components/StatsSection';
import { ContactFooterSection } from './components/ContactFooterSection';

export function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('portfolio-theme') || 'classic');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    const themes = ['classic', 'cyberpunk', 'nord', 'midnight', 'solarized'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <div className="bg-bg min-h-screen text-text-primary selection:bg-white/20 selection:text-white transition-colors duration-400">
      {isLoading && (
        <LoadingScreen onComplete={() => setIsLoading(false)} />
      )}

      <Navbar theme={theme} onCycleTheme={cycleTheme} />

      <main>
        <HeroSection />
        <SessionUnderwriting />
        <ModelObservatory />
        <SegmentationSection />
        <SelectedWorksSection />
        <PlaygroundSection />
        <JournalSection />
        <ExplorationsSection />
        <StatsSection />
      </main>

      <ContactFooterSection theme={theme} onCycleTheme={cycleTheme} />
    </div>
  );
}

export default App;
