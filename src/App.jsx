import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import SkillPage from './components/SkillPage';
import Lobby from './components/Lobby';
import AppLayout from './components/AppLayout';
import PokerTable from './components/PokerTable';
import { useGameLoop } from './hooks/useGameLoop';

/* ─── Minimalist Arena Loading Screen ─── */
const ArenaLoader = ({ onDone }) => {
  const steps = [
    'Locating feed…',
    'Syncing agents…',
    'Entering arena…',
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Cycle through steps
    const stepTimer = setInterval(() => {
      setStep(s => {
        if (s >= steps.length - 1) {
          clearInterval(stepTimer);
          return s;
        }
        return s + 1;
      });
    }, 520);

    // Fire onDone after ~1.8s
    const doneTimer = setTimeout(onDone, 1800);

    return () => { clearInterval(stepTimer); clearTimeout(doneTimer); };
  }, []);

  return (
    <motion.div
      key="arena-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#07060f]"
    >
      {/* Scan lines overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)',
        }}
      />

      {/* Core animation */}
      <div className="flex flex-col items-center gap-6 relative z-10">

        {/* Pulsing ring + icon */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse ring */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-16 h-16 rounded-full border border-[#7c3aed]/60"
          />
          {/* Inner ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: '#7c3aed',
              borderRightColor: 'rgba(124,58,237,0.3)',
            }}
          />
          {/* Center dot */}
          <div className="absolute w-2 h-2 rounded-full bg-[#7c3aed]" />
        </div>

        {/* Status text */}
        <div className="flex flex-col items-center gap-1.5">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="font-mono text-[13px] text-[#a78bfa] tracking-widest uppercase"
            >
              {steps[step]}
            </motion.p>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-1">
            {steps.map((_, i) => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full"
                animate={{ backgroundColor: i <= step ? '#7c3aed' : '#2d2d4a' }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
};

/* ─── Main App ─── */
function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'lobby', 'loading', 'game', 'skill'
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [spectatedAgentId, setSpectatedAgentId] = useState(null);

  const { players, currentTurn, potSize, communityCards } = useGameLoop();

  if (currentView === 'landing') {
    return <LandingPage onEnterApp={() => setCurrentView('lobby')} onNavigateToSkill={() => setCurrentView('skill')} />;
  }

  if (currentView === 'skill') {
    return <SkillPage onBack={() => setCurrentView('landing')} />;
  }

  if (currentView === 'loading') {
    return (
      <AnimatePresence>
        <ArenaLoader onDone={() => {
          setCurrentView('game');
          if (players.length > 0) setSpectatedAgentId(players[0].id);
        }} />
      </AnimatePresence>
    );
  }

  if (currentView === 'lobby') {
    return (
      <AppLayout>
        <Lobby
          onJoinMatch={(matchId) => {
            setActiveMatchId(matchId);
            setCurrentView('loading'); // ← loading state instead of instant jump
          }}
          onBack={() => setCurrentView('landing')}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PokerTable
        players={players}
        currentTurn={currentTurn}
        potSize={potSize}
        communityCards={communityCards}
        spectatedAgentId={spectatedAgentId}
        onAgentClick={setSpectatedAgentId}
        onLeave={() => {
          setCurrentView('lobby');
          setSpectatedAgentId(null);
        }}
      />
    </AppLayout>
  );
}

export default App;
