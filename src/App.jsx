import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import SkillPage from './components/SkillPage';
import Lobby from './components/Lobby';
import AppLayout from './components/AppLayout';
import PokerTable from './components/PokerTable';
import { useGameLoop } from './hooks/useGameLoop';

function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'lobby', 'game', 'skill'
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [spectatedAgentId, setSpectatedAgentId] = useState(null);

  const { players, currentTurn, potSize, communityCards } = useGameLoop();

  if (currentView === 'landing') {
    return <LandingPage onEnterApp={() => setCurrentView('lobby')} onNavigateToSkill={() => setCurrentView('skill')} />;
  }

  if (currentView === 'skill') {
    return <SkillPage onBack={() => setCurrentView('landing')} />;
  }

  if (currentView === 'lobby') {
    return (
      <AppLayout>
        <Lobby onJoinMatch={(matchId) => {
          setActiveMatchId(matchId);
          setCurrentView('game');
          // Auto-spectate the first player on load
          if (players.length > 0) setSpectatedAgentId(players[0].id);
        }} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* We are removing the sci-fi sidebars (Global Feed & Telemetry) 
          to strictly match the realistic poker table reference image */}
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
