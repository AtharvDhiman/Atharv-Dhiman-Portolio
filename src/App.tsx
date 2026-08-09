import React, { useState } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SelectedWorksSection } from './components/SelectedWorksSection';
import { JournalSection } from './components/JournalSection';
import { ExplorationsSection } from './components/ExplorationsSection';
import { StatsSection } from './components/StatsSection';
import { ContactFooterSection } from './components/ContactFooterSection';

export function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  return (
    <div className="bg-bg min-h-screen text-text-primary selection:bg-white/20 selection:text-white">
      {isLoading && (
        <LoadingScreen onComplete={() => setIsLoading(false)} />
      )}

      <Navbar />

      <main>
        <HeroSection />
        <SelectedWorksSection />
        <JournalSection />
        <ExplorationsSection />
        <StatsSection />
      </main>

      <ContactFooterSection />
    </div>
  );
}

export default App;
