import { useState, useEffect } from 'react';

const MOCK_AGENTS = [
    { id: '1', name: "AlphaBot", avatarUrl: "🤖", bb: 55.3, isYou: false, personality_type: 'aggressive' },
    { id: '2', name: "DeepStack", avatarUrl: "🧠", bb: 29.0, isYou: false, personality_type: 'GTO' },
    { id: '3', name: "Quantum", avatarUrl: "👾", bb: 105.1, isYou: false, personality_type: 'tight' },
    { id: '4', name: "You (Spectator)", avatarUrl: "👤", bb: 185.0, isYou: true, personality_type: 'human_spectator' },
    { id: '5', name: "RiverRat", avatarUrl: "🦦", bb: 12.5, isYou: false, personality_type: 'aggressive' },
    { id: '6', name: "NashEq", avatarUrl: "⚖️", bb: 40.2, isYou: false, personality_type: 'GTO' },
];

const MOCK_ACTIONS = ['Raise', 'Call', 'Fold', 'Check'];
const MOCK_THOUGHTS = [
    'Calculating pot odds: 3.2:1. +EV call.',
    'Opponent sizing indicates strength. Folding.',
    'Bluff frequency optimal here. Raising 3BB.',
    'Monte Carlo sim (10k hands) suggests 68% win rate.',
    'Nash equilibrium strategy dictates a check.',
    'Exploitative play against high fold-to-3bet stat.',
];

const FULL_DECK = ['A♦', 'K♠', '7♥', '2♣', '9♦', 'Q♥', 'J♣', '10♠', '5♦', '8♥'];

export function useGameLoop() {
    const [players, setPlayers] = useState(MOCK_AGENTS);
    const [communityCards, setCommunityCards] = useState([]);
    const [potSize, setPotSize] = useState(0);
    const [currentTurnId, setCurrentTurnId] = useState(MOCK_AGENTS[0].id);
    const [eventLog, setEventLog] = useState([]);

    useEffect(() => {
        let turnIndex = 0;
        let handStage = 0; // 0: preflop, 1: flop, 2: turn, 3: river, 4: showdown
        let isRunning = true;
        let timerId;

        setEventLog([{ id: Date.now(), action: 'NEW_HAND', amount: 0, thought_process: 'Initializing new hand...', agents: { name: 'SYSTEM' } }]);

        const runGameStep = () => {
            if (!isRunning) return;

            // Find next active player (skip folded)
            let activePlayer = MOCK_AGENTS[turnIndex];

            // Simulate action
            const action = MOCK_ACTIONS[Math.floor(Math.random() * MOCK_ACTIONS.length)];
            const amount = action === 'Raise' ? Math.floor(Math.random() * 50) + 10 : 0;
            const confidence = Math.random() * 0.5 + 0.4; // 0.4 to 0.9
            const thought = MOCK_THOUGHTS[Math.floor(Math.random() * MOCK_THOUGHTS.length)];

            // Log the event
            const newLog = {
                id: Date.now(),
                agent_id: activePlayer.id,
                action: action,
                amount: amount,
                thought_process: thought,
                confidence_score: confidence,
                agents: { name: activePlayer.name }
            };

            setEventLog(prev => [...prev.slice(-15), newLog]);

            if (action === 'Raise' || action === 'Call') {
                setPotSize(prev => prev + (amount || 10)); // Arbitrary amount
            }

            // Update player UI state
            setPlayers(prev => prev.map((p, i) => {
                if (i === turnIndex) {
                    return { ...p, lastAction: action, thoughtProcess: thought, confidence: confidence, currentBet: amount };
                }
                return { ...p, lastAction: null }; // Clear other's action badges
            }));

            setCurrentTurnId(activePlayer.id);

            // Advance turn
            turnIndex = (turnIndex + 1) % MOCK_AGENTS.length;

            // Arbitrarily advance hand stage occasionally
            if (Math.random() > 0.7) {
                handStage++;
                if (handStage === 1) setCommunityCards(FULL_DECK.slice(0, 3)); // Flop
                else if (handStage === 2) setCommunityCards(FULL_DECK.slice(0, 4)); // Turn
                else if (handStage === 3) setCommunityCards(FULL_DECK.slice(0, 5)); // River
                else if (handStage > 3) {
                    // Reset Hand
                    handStage = 0;
                    setCommunityCards([]);
                    setPotSize(0);
                    setEventLog(prev => [...prev.slice(-15), { id: Date.now(), action: 'SHOWDOWN', amount: 0, thought_process: 'Hand complete. Resetting board.', agents: { name: 'SYSTEM' } }]);

                    // Clear player stats for new hand
                    setPlayers(prev => prev.map(p => ({ ...p, status: 'waiting', lastAction: null, thoughtProcess: null, currentBet: 0 })));
                }
            }

            // Dynamic realistic delay between 3 and 8 seconds
            const nextDelay = Math.floor(Math.random() * 5000) + 3000; // Random between 3000ms and 8000ms
            timerId = setTimeout(runGameStep, nextDelay);
        };

        // Start loop
        timerId = setTimeout(runGameStep, 3000); // Initial delay

        return () => {
            isRunning = false;
            clearTimeout(timerId);
        };
    }, []);

    return {
        players,
        currentTurn: currentTurnId,
        potSize,
        communityCards,
        eventLog
    };
}
