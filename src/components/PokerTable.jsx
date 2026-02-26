import React from 'react';
import AgentCard from './AgentCard';
import PlayingCard from './PlayingCard';
import SpectatorBetting from './SpectatorBetting';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageSquare, Send, Activity, Cpu, TrendingUp, Zap } from 'lucide-react';



const PokerTable = ({ players, currentTurn, potSize, communityCards, spectatedAgentId, onAgentClick, onLeave }) => {
    // Find where the spectated agent is in the array
    const spectatedIndex = players.findIndex(p => p.id === spectatedAgentId);

    // We want the spectated agent to be at ovalPositions index 3 (bottom center)
    const offset = spectatedIndex !== -1 ? (3 - spectatedIndex + players.length) % players.length : 0;

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

                            {/* Pot and Community Cards Area */}
                            <div className="absolute flex flex-col items-center gap-4 z-20 top-1/2 -translate-y-[60%]">

                                {/* Community Cards */}
                                <div className="flex gap-2">
                                    <AnimatePresence>
                                        {communityCards.map((card, i) => (
                                            <PlayingCard key={i} card={card} width={65} height={95} animate delay={i * 0.12} />
                                        ))}
                                    </AnimatePresence>
                                </div>

                                {/* Center Pot Chips stack */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex gap-0.5 relative translate-y-2">
                                        <div className="relative w-5 h-8">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="absolute bottom-0 w-5 h-2 bg-slate-800 rounded-full border border-slate-600 shadow-[0_2px_0_#0f172a]" style={{ bottom: `${i * 3}px`, zIndex: i }}></div>
                                            ))}
                                        </div>
                                        <div className="relative w-5 h-6">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className="absolute bottom-0 w-5 h-2 bg-red-600 rounded-full border border-red-500 shadow-[0_2px_0_#7f1d1d]" style={{ bottom: `${i * 3}px`, zIndex: i }}></div>
                                            ))}
                                        </div>
                                        <div className="relative w-5 h-4">
                                            {[...Array(2)].map((_, i) => (
                                                <div key={i} className="absolute bottom-0 w-5 h-2 bg-yellow-500 rounded-full border border-yellow-400 shadow-[0_2px_0_#92400e]" style={{ bottom: `${i * 3}px`, zIndex: i }}></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Agent Nodes — absolute, positioned relative to the center of the shared wrapper */}
                <div className="absolute top-1/2 left-1/2 w-[1px] h-[1px] pointer-events-none">
                    {players.map((agent, index) => {
                        const ovalPositions = [
                            { x: 0, y: -240 }, // 0 top
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
                                />
                            </motion.div>
                        );
                    })}
                </div>

            </div>{/* end shared translateY wrapper */}

            {/* Transparent Spectator Chat Box (Bottom Left) */}
            <div className={`absolute ${spectatedAgentId ? 'bottom-16' : 'bottom-6'} left-6 w-80 flex flex-col pointer-events-auto z-50 transition-all duration-300`}>
                {/* Chat Messages */}
                <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-t-lg p-3 flex flex-col justify-end overflow-hidden space-y-2 h-48 relative shadow-lg">
                    {/* Top gradient for fading out chat content */}
                    <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#0f0f0f]/90 to-transparent pointer-events-none z-10 rounded-t-lg" />

                    <div className="relative z-0 space-y-2 pb-1">
                        <div className="text-[11px] leading-snug">
                            <span className="font-bold text-[#f8312f]">@system:</span> <span className="text-gray-400 italic">Match started. 1,240 spectators watching.</span>
                        </div>
                        <div className="text-[11px] leading-snug">
                            <span className="font-bold text-blue-400">@poker_pro:</span> <span className="text-gray-300">AlphaBot is playing too aggressive here</span>
                        </div>
                        <div className="text-[11px] leading-snug">
                            <span className="font-bold text-green-400">@spectator99:</span> <span className="text-gray-300">DeepStack has the nuts, watch 🍿</span>
                        </div>
                        <div className="text-[11px] leading-snug">
                            <span className="font-bold text-purple-400">@ai_dev:</span> <span className="text-gray-300">Let&apos;s see if the bluff gets called</span>
                        </div>
                    </div>
                </div>
                {/* Chat Input */}
                <div className="bg-black/60 backdrop-blur-md border border-white/20 border-t-0 rounded-b-lg p-2 flex gap-2 items-center shadow-lg">
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

            {/* ─── Agent Focus HUD Strip ─── */}
            <AnimatePresence>
                {spectatedAgentId && (() => {
                    const agent = players.find(p => p.id === spectatedAgentId);
                    if (!agent) return null;

                    const seed = agent.id?.charCodeAt(0) || 65;
                    const winPct = ((agent.confidence || 0.5) * 100).toFixed(1);
                    const ev = (((seed % 7) - 2) * 420 + 840).toFixed(0);
                    const evPos = parseFloat(ev) >= 0;
                    const bluffRate = (18 + (seed % 30));
                    const modes = ['GTO', 'EXPLOIT', 'TRAP', 'BLUFF', 'VALUE'];
                    const mode = modes[seed % modes.length];
                    const grades = ['A+', 'A', 'B+', 'B', 'C'];
                    const hand = grades[seed % grades.length];
                    const potOdds = (12 + (seed % 25)).toFixed(0);
                    const decMs = (80 + (seed % 420));
                    const lastAct = agent.lastAction || 'RAISE';

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

                                {/* Win Probability */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Win</span>
                                    <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${winPct}%`, backgroundColor: parseFloat(winPct) > 65 ? '#10b981' : parseFloat(winPct) > 40 ? '#facc15' : '#f8312f' }}
                                        />
                                    </div>
                                    <span className="font-mono text-xs font-bold text-white">{winPct}%</span>
                                </div>

                                {/* EV */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <TrendingUp className="w-3 h-3" style={{ color: evPos ? '#10b981' : '#f8312f' }} />
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">EV</span>
                                    <span className="font-mono text-xs font-bold" style={{ color: evPos ? '#10b981' : '#f8312f' }}>
                                        {evPos ? '+' : ''}{parseInt(ev).toLocaleString()} chips
                                    </span>
                                </div>

                                {/* Strategy Mode */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Mode</span>
                                    <span
                                        className="text-[9px] font-mono font-black px-2 py-0.5 rounded tracking-widest uppercase"
                                        style={{
                                            color: mode === 'GTO' ? '#a78bfa' : mode === 'EXPLOIT' ? '#f8312f' : mode === 'BLUFF' ? '#facc15' : '#10b981',
                                            backgroundColor: mode === 'GTO' ? '#a78bfa15' : mode === 'EXPLOIT' ? '#f8312f15' : mode === 'BLUFF' ? '#facc1515' : '#10b98115',
                                            border: `1px solid ${mode === 'GTO' ? '#a78bfa40' : mode === 'EXPLOIT' ? '#f8312f40' : mode === 'BLUFF' ? '#facc1540' : '#10b98140'}`,
                                        }}
                                    >
                                        {mode}
                                    </span>
                                </div>

                                {/* Hand Strength */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Hand</span>
                                    <span className="font-mono text-xs font-bold text-white">{hand}</span>
                                </div>

                                {/* Bluff Rate */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Zap className="w-3 h-3 text-yellow-400" />
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Bluff</span>
                                    <span className="font-mono text-xs text-gray-300">{bluffRate}%</span>
                                </div>

                                {/* Pot Odds */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Pot Odds</span>
                                    <span className="font-mono text-xs text-gray-300">{potOdds}%</span>
                                </div>

                                {/* Last Action */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Action</span>
                                    <span className="font-mono text-[10px] font-bold text-white">{lastAct}</span>
                                </div>

                                {/* Decision Time */}
                                <div className="flex items-center gap-1.5 shrink-0 border-l border-white/10 pl-6 ml-auto">
                                    <Activity className="w-3 h-3 text-gray-500" />
                                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Thought</span>
                                    <span className="font-mono text-xs text-gray-300">{decMs}ms</span>
                                </div>

                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

        </main>
    );
};

export default PokerTable;
