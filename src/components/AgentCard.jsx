import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity } from 'lucide-react';
import PlayingCard from './PlayingCard';

// Agent personality database (maps agent names to their playing style)
const AGENT_PERSONALITIES = {
    'TightAggro': { icon: '🎯', label: 'TAG', desc: 'Premium hands only', color: '#ef4444', style: 'tight-aggressive' },
    'LooseAggro': { icon: '⚡', label: 'LAG', desc: 'Many hands, very aggressive', color: '#f59e0b', style: 'loose-aggressive' },
    'TightPassive': { icon: '🛡️', label: 'ROCK', desc: 'Strong hands only', color: '#3b82f6', style: 'tight-passive' },
    'CallingStation': { icon: '🐟', label: 'FISH', desc: 'Calls everything', color: '#10b981', style: 'calling-station' },
    'Maniac': { icon: '🎰', label: 'WILD', desc: 'Raises constantly', color: '#a855f7', style: 'maniac' },
    'Professional': { icon: '👑', label: 'PRO', desc: 'Balanced & adaptive', color: '#fbbf24', style: 'professional' },
    'ClawBot': { icon: '🤖', label: 'CLAW', desc: 'External API bot', color: '#8b5cf6', style: 'external' }
};

// Helper function to get personality based on agent name
const getPersonality = (agentName) => {
    // Special case for OpenClawBot - always show CLAW
    if (agentName && agentName.toLowerCase().includes('openclaw')) {
        return { icon: '🤖', label: 'CLAW', desc: 'External API bot', color: '#8b5cf6', style: 'external' };
    }

    // Try exact match first
    if (AGENT_PERSONALITIES[agentName]) {
        return AGENT_PERSONALITIES[agentName];
    }
    // Try case-insensitive partial match
    const lowerName = agentName.toLowerCase();
    for (const [key, personality] of Object.entries(AGENT_PERSONALITIES)) {
        if (lowerName.includes(key.toLowerCase())) {
            return personality;
        }
    }
    // Default personality for unknown agents - show AGENT label (not BOT)
    // Updated for demo - all test agents show as "AGENT"
    return { icon: '🤖', label: 'AGENT', desc: 'AI Agent', color: '#6b7280', style: 'unknown' };
};

const AgentCard = ({ agent, active, positionIndex, isFocused, timeLeft, timeLimit = 30, showdown = false, isWinner = false, seatState }) => {
    // Handle empty seats
    if (seatState === 'empty') {
        return (
            <div className="relative flex flex-col items-center justify-center w-36 opacity-30">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-600 bg-black/20 flex items-center justify-center">
                    <span className="text-gray-500 text-xs font-mono">Empty</span>
                </div>
                <div className="mt-2 text-gray-500 text-xs">Seat {positionIndex + 1}</div>
            </div>
        );
    }

    const personality = getPersonality(agent.name);

    // Scale up the bottom-center seat for visual focus.
    // Only show face-up cards if we actually have hole card data (never in spectator mode).
    const isBottomSeat = positionIndex === 3;
    const isHero = isBottomSeat && agent.holeCards?.length >= 2;

    // During showdown, show all players' cards face-up
    const shouldShowCards = isHero || (showdown && agent.holeCards?.length >= 2);

    // DEBUG: Log showdown state for all agents
    if (showdown) {
        console.log(`[AgentCard] SHOWDOWN - ${agent.name} (pos ${positionIndex}):`, {
            holeCards: agent.holeCards,
            shouldShowCards,
            isHero,
            hasCards: agent.holeCards?.length >= 2
        });
    }

    // Calculate thinking indicator properties
    const isThinking = active && timeLeft != null;
    const percentage = isThinking ? (timeLeft / timeLimit) * 100 : 100;
    const isUrgent = timeLeft <= 5;
    const isWarning = timeLeft <= 15 && timeLeft > 5;

    return (
        <div className={`relative flex flex-col items-center justify-center w-36 ${isBottomSeat ? 'scale-[1.15]' : ''}`}>

            {/* Fanned Cards (Behind avatar) */}
            <div className="absolute top-[-30px] w-full flex justify-center items-end z-0">
                {shouldShowCards ? (
                    // Face-up Cards (Hero OR Showdown) — uses agent.holeCards if available
                    <div className="relative w-full flex justify-center">
                        <motion.div
                            initial={{ rotateZ: -10, x: 5, y: 10, rotateY: showdown && !isHero ? 180 : 0 }}
                            animate={{
                                rotateZ: -12,
                                x: 8,
                                y: 5,
                                rotateY: 0
                            }}
                            transition={{
                                rotateY: { duration: 0.4, ease: 'easeInOut' },
                                default: { duration: 0.3 }
                            }}
                            className="absolute -left-1"
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            <PlayingCard card={agent.holeCards[0]} width={45} height={65} animate={false} />
                        </motion.div>
                        <motion.div
                            initial={{ rotateZ: 10, x: -5, y: 10, rotateY: showdown && !isHero ? 180 : 0 }}
                            animate={{
                                rotateZ: 12,
                                x: -8,
                                y: 5,
                                rotateY: 0
                            }}
                            transition={{
                                rotateY: { duration: 0.4, ease: 'easeInOut', delay: 0.05 },
                                default: { duration: 0.3 }
                            }}
                            className="absolute -right-1"
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            <PlayingCard card={agent.holeCards[1]} width={45} height={65} animate={false} />
                        </motion.div>
                    </div>
                ) : (
                    // Opponent Cards (Face down)
                    <div className="relative w-full flex justify-center perspective-1000">
                        <div className="w-[45px] h-[65px] bg-[#1a1c29] rounded shadow-lg border-2 border-white absolute -left-2 transform -rotate-12 translate-y-2 overflow-hidden flex items-center justify-center">
                            {/* Card back pattern */}
                            <div className="w-[85%] h-[85%] border border-[#ecc94b] bg-[radial-gradient(circle_at_center,_#ecc94b_1px,_transparent_1px)] bg-[length:4px_4px]" />
                        </div>
                        <div className="w-[45px] h-[65px] bg-[#1a1c29] rounded shadow-lg border-2 border-white absolute -right-2 transform rotate-12 translate-y-2 overflow-hidden flex items-center justify-center">
                            <div className="w-[85%] h-[85%] border border-[#ecc94b] bg-[radial-gradient(circle_at_center,_#ecc94b_1px,_transparent_1px)] bg-[length:4px_4px]" />
                        </div>
                    </div>
                )}
            </div>

            {/* Thinking Indicator Badge (Above Avatar) */}
            <AnimatePresence>
                {isThinking && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-[-50px] left-1/2 -translate-x-1/2 z-30"
                    >
                        <div
                            className="backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 flex items-center gap-2 shadow-xl"
                            style={{ backgroundColor: `${personality.color}15` }}
                        >
                            {/* Circular countdown */}
                            <div className="relative w-5 h-5">
                                <svg className="w-full h-full -rotate-90">
                                    <circle
                                        cx="10"
                                        cy="10"
                                        r="8"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="2"
                                    />
                                    <circle
                                        cx="10"
                                        cy="10"
                                        r="8"
                                        fill="none"
                                        stroke={isUrgent ? '#ef4444' : isWarning ? '#facc15' : personality.color}
                                        strokeWidth="2"
                                        strokeDasharray={`${2 * Math.PI * 8}`}
                                        strokeDashoffset={`${2 * Math.PI * 8 * (1 - percentage / 100)}`}
                                        className="transition-all duration-1000 linear"
                                    />
                                </svg>
                                <div
                                    className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${
                                        isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-white'
                                    }`}
                                >
                                    {timeLeft}
                                </div>
                            </div>
                            {/* Personality icon + Thinking text */}
                            <div className="flex items-center gap-1">
                                <span className="text-[11px]">{personality.icon}</span>
                                <span className="text-[10px] text-white font-semibold whitespace-nowrap">
                                    {personality.label}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Waiting Badge */}
            {seatState === 'waiting' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 z-40 bg-yellow-500/90 px-3 py-1 rounded-full shadow-lg"
                >
                    <span className="text-black text-xs font-bold">WAITING</span>
                </motion.div>
            )}

            {/* Avatar Circle */}
            <div className={`relative z-10 w-[72px] h-[72px] rounded-full border-2 border-[#111] shadow-[0_5px_15px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#253238] to-[#102027] flex items-center justify-center text-4xl mb-6 ${seatState === 'waiting' ? 'opacity-60' : ''}`}>

                {/* Winner glow ring (golden) */}
                {isWinner && showdown && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-[-6px] rounded-full border-[4px] border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.6)] animate-pulse"
                    />
                )}

                {/* Thinking glow ring (pulsing) */}
                {isThinking && !showdown && (
                    <div
                        className={`absolute inset-[-6px] rounded-full border-[4px] animate-pulse shadow-[0_0_20px] ${
                            isUrgent
                                ? 'border-red-500 shadow-red-500'
                                : isWarning
                                ? 'border-yellow-400 shadow-yellow-400'
                                : 'border-emerald-400 shadow-emerald-400'
                        }`}
                    />
                )}

                {/* Active glow ring (when not thinking) */}
                {active && !isThinking && !showdown && (
                    <div className="absolute inset-[-4px] rounded-full border-[3px] border-[#4ade80] animate-pulse shadow-[0_0_15px_#4ade80]" />
                )}

                <span className="drop-shadow-md">{agent.avatarUrl}</span>

                {/* Chip badge showing real stack */}
                {isHero && agent.stack != null && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-md border border-gray-200">
                        <div className="w-3 h-3 rounded-full bg-red-600 border border-white shrink-0 relative flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full border border-white/50" />
                        </div>
                        <span className="text-[9px] font-bold text-black leading-none pt-[1px] pr-0.5">${agent.stack.toLocaleString()}</span>
                    </div>
                )}
            </div>

            {/* Nameplate & Stack Box */}
            <div className="absolute bottom-0 w-full flex flex-col items-center justify-end z-20 translate-y-4">

                {/* Nameplate row */}
                <div className="relative w-[85%] h-6 bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] rounded text-white flex items-center justify-center shadow-lg border-t border-white/20">

                    {/* Left: Personality Badge (replaces flag) */}
                    <div
                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-md border border-white/30 flex items-center justify-center text-[10px]"
                        style={{ backgroundColor: personality.color }}
                        title={`${personality.label}: ${personality.desc}`}
                    >
                        {personality.icon}
                    </div>

                    {/* Name */}
                    <span className="text-[11px] font-bold truncate px-6 capitalize">
                        {agent.name.length > 9 ? agent.name.substring(0, 8) + '..' : agent.name}
                    </span>

                    {/* Seat number */}
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#111] shadow-md border border-[#333] flex items-center justify-center">
                        <span className="text-[9px] font-bold text-gray-300">{positionIndex + 1}</span>
                    </div>
                </div>

                {/* Stack size row */}
                <div className="w-[60%] h-4 bg-gradient-to-b from-[#1e3a8a] to-[#172554] rounded-b shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] flex items-center justify-center relative -top-[1px]">
                    <span className="text-[10px] font-bold text-[#60a5fa] leading-none pt-[1px]">
                        {agent.bb.toFixed(1)} BB
                    </span>
                </div>
            </div>



            {/* Action Popup Badge */}
            <AnimatePresence>
                {agent.lastAction && (
                    <motion.div
                        initial={{ scale: 0, y: -10, opacity: 0 }}
                        animate={{ scale: 1, y: -20, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-0 right-[-30px] bg-black/80 backdrop-blur text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-xl z-50 border border-white/20 flex gap-1 items-center"
                    >
                        {agent.lastAction}
                        {agent.currentBet > 0 && <span className="text-[#4ade80]">+ {agent.currentBet}</span>}
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default AgentCard;
