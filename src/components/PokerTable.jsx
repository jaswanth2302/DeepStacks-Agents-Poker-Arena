import { useState, useEffect, useRef } from 'react';
import AgentCard from './AgentCard';
import PlayingCard from './PlayingCard';
import SpectatorBetting from './SpectatorBetting';
import PotCounter from './Animations/PotCounter';
import BettingAnimation from './Animations/BettingAnimation';
import CommunityCardReveal from './Animations/CommunityCardReveal';
// ShowdownReveal removed - using simple card flip instead
import RoundTransition from './Animations/RoundTransition';
import DynamicPotChips from './Animations/DynamicPotChips';
import { usePlayerPositions, getPotPosition } from '../hooks/usePlayerPositions';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageSquare, Send, Activity, Cpu, Zap } from 'lucide-react';



const ACTION_COLORS = {
    fold: 'text-red-400',
    call: 'text-blue-400',
    raise: 'text-yellow-400',
    check: 'text-green-400',
    win: 'text-emerald-400',
    small_blind: 'text-gray-400',
    big_blind: 'text-gray-400',
};

function formatLogEntry(entry) {
    const name = entry.agents?.name || 'System';
    const action = entry.action?.toLowerCase() || '';
    const amt = entry.amount > 0 ? ` $${entry.amount.toLocaleString()}` : '';
    return { name, action, amt };
}

const PokerTable = ({ players, currentTurn, potSize, communityCards, eventLog = [], spectatedAgentId, onAgentClick, onLeave, sessionStatus }) => {
    // Find where the spectated agent is in the array
    const spectatedIndex = players.findIndex(p => p.id === spectatedAgentId);

    // We want the spectated agent to be at ovalPositions index 3 (bottom center)
    const offset = spectatedIndex !== -1 ? (3 - spectatedIndex + players.length) % players.length : 0;

    // Animation state
    const [bettingChips, setBettingChips] = useState([]);
    const [previousCardCount, setPreviousCardCount] = useState(0);
    const [showRoundTransition, setShowRoundTransition] = useState(false);
    const [transitionMessage, setTransitionMessage] = useState('');
    const [showdownWinner, setShowdownWinner] = useState(null);
    const [previousPotSize, setPreviousPotSize] = useState(0);
    const [turnTimeLeft, setTurnTimeLeft] = useState(30);

    // Player positions for animations
    const playerPositions = usePlayerPositions(players, spectatedAgentId);
    const potPosition = getPotPosition();

    // Track previous event log to detect new bets
    const prevEventLogRef = useRef([]);
    const prevSessionStatusRef = useRef(null);
    const prevWinEventIdRef = useRef(null);
    const hasInitializedCardCount = useRef(false);

    // Initialize previousCardCount on mount to avoid "DEALING..." showing for existing cards
    useEffect(() => {
        if (!hasInitializedCardCount.current && communityCards.length > 0) {
            console.log('[PokerTable] Initializing previousCardCount to', communityCards.length, '(cards already on table)');
            setPreviousCardCount(communityCards.length);
            hasInitializedCardCount.current = true;
        }
    }, [communityCards.length]);

    // Detect new betting actions and trigger chip animations
    useEffect(() => {
        if (eventLog.length === 0) return;

        const latestEvent = eventLog[eventLog.length - 1];
        const prevEvents = prevEventLogRef.current;

        // Check if this is a new event
        if (prevEvents.length > 0 && latestEvent.id === prevEvents[prevEvents.length - 1]?.id) {
            return;
        }

        // Trigger betting animation for raise/call/blind
        if (['raise', 'call', 'small_blind', 'big_blind'].includes(latestEvent.action)) {
            const playerPos = playerPositions[latestEvent.agent_id];
            if (playerPos && latestEvent.amount > 0) {
                setBettingChips([{
                    playerId: latestEvent.agent_id,
                    amount: latestEvent.amount,
                    position: playerPos,
                }]);
            }
        }

        prevEventLogRef.current = eventLog;
    }, [eventLog, playerPositions]);

    // Track community card changes for reveal animations
    // Don't auto-update previousCardCount here - let the animation component handle it
    // We just track the current count for comparison

    // Detect showdown and round transitions - SIMPLIFIED
    useEffect(() => {
        // Detect when a winner is announced (win action in event log)
        if (eventLog.length > 0) {
            const latestEvent = eventLog[eventLog.length - 1];

            // Check if latest event is a win and we haven't shown this specific win yet
            if (latestEvent.action === 'win' && latestEvent.id !== prevWinEventIdRef.current) {
                const winner = players.find(p => p.id === latestEvent.agent_id);

                // Determine if this is a SHOWDOWN win (river reached)
                const isShowdown = communityCards.length === 5;

                if (winner && isShowdown) {
                    // Mark this win event as shown
                    prevWinEventIdRef.current = latestEvent.id;

                    // Just set the winner ID so AgentCard can show the golden ring
                    setShowdownWinner({ id: winner.id, name: winner.name });
                }
            }
        }

        // Detect round transitions (pot reset means new hand starts)
        if (potSize === 0 && previousPotSize > 0) {
            // Clear showdown winner when new hand starts
            setShowdownWinner(null);
            setPreviousCardCount(0);
        }

        prevSessionStatusRef.current = sessionStatus;
        setPreviousPotSize(potSize);
    }, [eventLog, potSize, players, communityCards, sessionStatus, previousPotSize, showdownWinner]);

    // Get current turn player name for indicator
    const currentTurnPlayer = players.find(p => p.id === currentTurn);

    // Countdown timer for current turn
    useEffect(() => {
        if (!currentTurn) {
            setTurnTimeLeft(30);
            return;
        }

        // Reset timer when turn changes
        setTurnTimeLeft(30);

        const interval = setInterval(() => {
            setTurnTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [currentTurn]);

    // Build game state object
    const gameState = {
        pot: potSize,
        round: 'flop', // TODO: Get actual round from game state
        status: players.length > 0 ? 'playing' : 'waiting',
    };

    return (
        <main className="flex-1 absolute inset-0 flex items-center justify-center p-8 overflow-hidden z-0 bg-neutral-950 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">

            {/* Back to Lobby Button */}
            {onLeave && (
                <button
                    onClick={onLeave}
                    className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-black/50 hover:bg-black/80 text-white rounded-lg border border-white/10 hover:border-white/30 backdrop-blur-md transition-all font-semibold"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Lobby
                </button>
            )}

            {/* Spectator Betting Panel */}
            <SpectatorBetting players={players} />

            {/* ── Shared wrapper: translateY lifts BOTH table and agents when HUD is active ── */}
            <div
                className="relative flex items-center justify-center w-full h-full transition-transform duration-300"
                style={{ transform: spectatedAgentId ? 'translateY(-52px)' : 'translateY(0px)' }}
            >

                {/* The Outer Table Leather/Wood Rim */}
                <div className="relative w-full max-w-[1000px] aspect-[2.2/1] bg-gradient-to-b from-[#8B4513] to-[#5c2a04] rounded-[200px] shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_5px_15px_rgba(255,255,255,0.2)] p-6 ring-1 ring-black flex items-center justify-center">

                    {/* The Inner Black Leather Rim */}
                    <div className="w-full h-full bg-gradient-to-b from-[#2a2a2a] to-[#111111] rounded-[180px] shadow-[inset_0_10px_30px_rgba(0,0,0,0.9)] p-4 relative flex items-center justify-center border border-[#000]">

                        {/* The Purple Felt */}
                        <div className="w-full h-full bg-gradient-to-br from-[#714ebf] via-[#5b3da5] to-[#402685] rounded-[160px] shadow-[inset_0_0_80px_rgba(0,0,0,0.7)] relative flex items-center justify-center border border-white/10 overflow-hidden">

                            {/* Center Faded Logo */}
                            <div className="absolute opacity-[0.05] pointer-events-none scale-150">
                                <svg width="200" height="200" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="8" strokeDasharray="10,5" />
                                    <text x="50%" y="55%" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">♣♦♥♠</text>
                                </svg>
                            </div>

                            {/* Center Table Line */}
                            <div className="absolute inset-x-24 inset-y-12 rounded-[100px] border border-white/10" />

                            {/* Pot and Community Cards Area — only render when players exist */}
                            {players.length === 0 ? (
                                <div className="absolute flex flex-col items-center gap-3 z-20 top-1/2 -translate-y-1/2 text-center">
                                    <div className="text-2xl opacity-20">♠♥♦♣</div>
                                    <p className="text-white/30 text-xs font-mono uppercase tracking-widest">Waiting for agents…</p>
                                </div>
                            ) : (
                                <div className="absolute flex flex-col items-center gap-4 z-20 top-1/2 -translate-y-[60%]">

                                    {/* Community Cards */}
                                    <div className="flex gap-2">
                                        <AnimatePresence>
                                            {communityCards.map((card, i) => (
                                                <PlayingCard key={i} card={card} width={65} height={95} animate delay={i * 0.12} />
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    {/* Center Pot Chips stack + live pot amount */}
                                    <div className="flex flex-col items-center gap-2">
                                        {/* Dynamic chip stacks based on pot amount */}
                                        <DynamicPotChips potAmount={potSize || 0} />

                                        {/* Live pot amount - ANIMATED */}
                                        <div className="mt-3 px-3 py-0.5 bg-black/50 rounded-full border border-white/10">
                                            <PotCounter amount={potSize || 0} />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Agent Nodes — absolute, positioned relative to the center of the shared wrapper */}
                <div className="absolute top-1/2 left-1/2 w-[1px] h-[1px] pointer-events-none">
                    {players.map((agent, index) => {
                        const ovalPositions = [
                            { x: 0, y: -200 }, // 0 top (moved down from -240 to avoid cutoff)
                            { x: 360, y: -120 }, // 1 top-right
                            { x: 360, y: 120 }, // 2 bottom-right
                            { x: 0, y: 240 }, // 3 bottom center (hero)
                            { x: -360, y: 120 }, // 4 bottom-left
                            { x: -360, y: -120 }, // 5 top-left
                        ];

                        const targetPositionIndex = (index + offset) % ovalPositions.length;
                        const pos = ovalPositions[targetPositionIndex];
                        const active = currentTurn === agent.id;
                        const isFocused = spectatedAgentId === agent.id;

                        return (
                            <motion.div
                                key={agent.id}
                                initial={false}
                                animate={{ x: pos.x, y: pos.y }}
                                transition={{ type: "spring", stiffness: 45, damping: 15 }}
                                className="absolute top-0 left-0 flex items-center justify-center z-30 pointer-events-auto -mt-[36px] -ml-[36px] cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => onAgentClick(agent.id)}
                            >
                                <AgentCard
                                    agent={agent}
                                    active={active}
                                    isFocused={isFocused}
                                    positionIndex={targetPositionIndex}
                                    timeLeft={active ? turnTimeLeft : null}
                                    timeLimit={30}
                                    showdown={!!showdownWinner}
                                    isWinner={showdownWinner?.name === agent.name}
                                />
                            </motion.div>
                        );
                    })}
                </div>

            </div>{/* end shared translateY wrapper */}

            {/* Transparent Spectator Chat Box (Bottom Left) */}
            <div className={`absolute ${spectatedAgentId ? 'bottom-16' : 'bottom-6'} left-6 w-80 flex flex-col pointer-events-auto z-50 transition-all duration-300`}>
                {/* Chat Messages */}
                <div className="flex-1 bg-transparent border border-white/10 rounded-t-lg p-3 flex flex-col justify-end overflow-hidden space-y-2 h-48 relative shadow-lg">
                    {/* Top gradient for fading out chat content - DISABLED for transparency */}
                    {/* <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#0f0f0f]/90 to-transparent pointer-events-none z-10 rounded-t-lg" /> */}

                    <div className="relative z-0 space-y-2 pb-1">
                        {eventLog.length === 0 ? (
                            <div className="text-[11px] text-gray-500 italic">Waiting for game actions…</div>
                        ) : (
                            eventLog.slice(-6).map((entry) => {
                                const { name, action, amt } = formatLogEntry(entry);
                                const color = ACTION_COLORS[action] || 'text-gray-400';
                                return (
                                    <div key={entry.id} className="text-[11px] leading-snug">
                                        <span className="font-bold text-white/80">{name}</span>
                                        <span className={`ml-1 font-mono font-semibold ${color}`}>{action}{amt}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                {/* Chat Input */}
                <div className="bg-transparent border border-white/20 border-t-0 rounded-b-lg p-2 flex gap-2 items-center shadow-lg">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-500 ml-1" />
                    <input
                        type="text"
                        placeholder="Spectator chat..."
                        className="w-full bg-transparent text-white text-[11px] outline-none placeholder:text-gray-500"
                    />
                    <button className="text-gray-400 hover:text-white transition-colors p-1.5 bg-white/5 hover:bg-white/10 rounded cursor-pointer">
                        <Send className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Action Bar / Controls area at bottom right */}
            <div className={`absolute ${spectatedAgentId ? 'bottom-16' : 'bottom-6'} right-6 flex gap-2 pointer-events-auto shadow-xl bg-[#111] p-2 rounded-lg border border-white/10 transition-all duration-300`}>
                {['25%', '33%', '50%', '75%', '10%'].map(size => (
                    <button key={size} className="px-3 py-1.5 bg-[#222] hover:bg-[#333] text-gray-300 text-sm font-bold rounded border border-white/5 transition-colors">
                        {size}
                    </button>
                ))}
                <div className="w-12 h-8 bg-gradient-to-r from-red-600 to-red-800 rounded-full ml-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] flex items-center p-0.5 border border-black cursor-pointer">
                    <div className="w-7 h-7 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white to-gray-400 rounded-full shadow-md hover:scale-105 transition-transform relative flex items-center justify-center border border-white/50">
                        <div className="w-4 h-4 rounded-full border-2 border-dashed border-red-500/50 mix-blend-multiply" />
                    </div>
                </div>
            </div>

            {/* ─── Animation Overlays ─── */}
            {/* Betting Chips Animation */}
            <BettingAnimation
                bets={bettingChips}
                potPosition={potPosition}
                onComplete={() => setBettingChips([])}
            />

            {/* Community Card Reveal Indicator */}
            <CommunityCardReveal
                previousCount={previousCardCount}
                currentCount={communityCards.length}
                onRevealComplete={() => setPreviousCardCount(communityCards.length)}
            />


            {/* Showdown - cards flip on agents, winner gets golden ring */}

            {/* Round Transition Overlay */}
            <RoundTransition
                message={transitionMessage}
                visible={showRoundTransition}
            />

            {/* ─── Agent Focus HUD Strip ─── */}
            <AnimatePresence>
                {spectatedAgentId && (() => {
                    const agent = players.find(p => p.id === spectatedAgentId);
                    if (!agent) return null;

                    const confidence = agent.confidence != null ? (agent.confidence * 100).toFixed(0) : null;
                    const lastAct = agent.lastAction || '—';
                    const thought = agent.thoughtProcess || null;
                    const stackDisplay = agent.stack != null ? `$${agent.stack.toLocaleString()}` : '—';

                    return (
                        <motion.div
                            key="hud-strip"
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                            className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none"
                        >
                            <div className="bg-black/90 backdrop-blur-xl border-t border-[#10b981]/30 px-6 py-3 flex items-center gap-6 overflow-x-auto">

                                {/* Agent identity */}
                                <div className="flex items-center gap-2 shrink-0 border-r border-white/10 pr-6">
                                    <Cpu className="w-3.5 h-3.5 text-[#10b981]" />
                                    <span className="font-mono text-xs font-bold text-white tracking-tight">{agent.name}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                                </div>

                                {/* Stack */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Stack</span>
                                    <span className="font-mono text-xs font-bold text-white">{stackDisplay}</span>
                                </div>

                                {/* Confidence */}
                                {confidence != null && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Conf</span>
                                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${confidence}%`,
                                                    backgroundColor: parseFloat(confidence) > 70 ? '#10b981' : parseFloat(confidence) > 45 ? '#facc15' : '#f8312f',
                                                }}
                                            />
                                        </div>
                                        <span className="font-mono text-xs font-bold text-white">{confidence}%</span>
                                    </div>
                                )}

                                {/* Last Action */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Activity className="w-3 h-3 text-gray-500" />
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Action</span>
                                    <span className={`font-mono text-[10px] font-bold uppercase ${ACTION_COLORS[lastAct] || 'text-white'}`}>{lastAct}</span>
                                    {agent.currentBet > 0 && (
                                        <span className="font-mono text-[10px] text-[#4ade80]">${agent.currentBet}</span>
                                    )}
                                </div>

                                {/* Thought Process */}
                                {thought && (
                                    <div className="flex items-center gap-1.5 shrink-0 border-l border-white/10 pl-6 ml-auto max-w-[40%]">
                                        <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
                                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest shrink-0">Reasoning</span>
                                        <span className="font-mono text-[10px] text-gray-300 truncate">{thought}</span>
                                    </div>
                                )}

                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

        </main>
    );
};

export default PokerTable;
