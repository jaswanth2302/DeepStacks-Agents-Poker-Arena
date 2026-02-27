import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Cpu, Eye, Terminal, ChevronRight, Radio, Zap, ArrowLeft } from 'lucide-react';

// ── DATA ──────────────────────────────────────────────────────────────────────
const FEATURE_MATCH = {
    id: 'match-feature',
    name: "High Stakes Alpha",
    subtitle: "FEATURED BROADCAST",
    stakes: "5/10 BB",
    playerCount: 6,
    maxPlayers: 6,
    type: "No Limit Hold'em",
    status: "LIVE",
    spectators: 1240,
    pot: "$42,500",
    accentColor: "#f8312f",
    agents: [
        { name: "AlphaBot-7", stack: "$12,400", action: "RAISE" },
        { name: "NeuralBluff", stack: "$8,200", action: "FOLD" },
        { name: "GTO-X3", stack: "$15,100", action: "CALL" },
        { name: "Exploit-V2", stack: "$6,800", action: "CHECK" },
        { name: "DeepStack-v3", stack: "$21,000", action: "BET" },
        { name: "RandBot-9", stack: "$4,000", action: "FOLD" },
    ],
};

const REGULAR_MATCHES = [
    {
        id: 'match-2',
        name: "GTO Sandbox",
        stakes: "1/2 BB",
        playerCount: 4,
        maxPlayers: 6,
        type: "No Limit Hold'em",
        status: "LIVE",
        spectators: 432,
        pot: "$8,200",
        accentColor: "#10b981",
    },
    {
        id: 'match-3',
        name: "Exploitative Testing",
        stakes: "10/20 BB",
        playerCount: 6,
        maxPlayers: 6,
        type: "Pot Limit Omaha",
        status: "STARTING",
        spectators: 89,
        pot: "$112,000",
        accentColor: "#facc15",
    },
    {
        id: 'match-4',
        name: "Heads Up Showdown",
        stakes: "50/100 BB",
        playerCount: 2,
        maxPlayers: 2,
        type: "No Limit Hold'em",
        status: "LIVE",
        spectators: 788,
        pot: "$287,400",
        accentColor: "#a78bfa",
    },
    {
        id: 'match-5',
        name: "Low Variance Lab",
        stakes: "0.5/1 BB",
        playerCount: 3,
        maxPlayers: 6,
        type: "No Limit Hold'em",
        status: "LIVE",
        spectators: 58,
        pot: "$1,800",
        accentColor: "#10b981",
    },
    {
        id: 'match-6',
        name: "Neural Bluff Trials",
        stakes: "25/50 BB",
        playerCount: 5,
        maxPlayers: 6,
        type: "No Limit Hold'em",
        status: "LIVE",
        spectators: 309,
        pot: "$68,900",
        accentColor: "#f8312f",
    },
];

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────────

/** Animated mini poker table (pure CSS/SVG) */
const MiniPokerTable = ({ agents, accentColor }) => (
    <div className="relative w-full h-full flex items-center justify-center">
        {/* Felt table */}
        <div
            className="absolute w-[280px] h-[140px] rounded-full border-4 opacity-90"
            style={{ backgroundColor: '#0f4c2a', borderColor: '#2d6e45', boxShadow: `0 0 40px ${accentColor}30` }}
        />
        {/* Community cards area */}
        <div className="absolute flex gap-1.5 z-10">
            {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="w-7 h-10 rounded bg-white/90 shadow-md border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700">
                    {['A♠', 'K♥', 'Q♦', 'J♣', '10♠'][i]}
                </div>
            ))}
        </div>
        {/* Agent seat dots arranged in an oval */}
        {agents.map((agent, i) => {
            const angle = (i / agents.length) * 2 * Math.PI - Math.PI / 2;
            const rx = 160, ry = 80;
            const x = 50 + (rx / 3.2) * Math.cos(angle);
            const y = 50 + (ry / 1.8) * Math.sin(angle);
            const isActive = ['RAISE', 'BET', 'CALL'].includes(agent.action);
            return (
                <div
                    key={i}
                    className="absolute flex flex-col items-center gap-0.5"
                    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
                >
                    <div
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[8px] font-bold text-white shadow-lg"
                        style={{
                            backgroundColor: isActive ? accentColor : '#1a1a2e',
                            borderColor: isActive ? accentColor : '#333',
                            boxShadow: isActive ? `0 0 12px ${accentColor}80` : 'none'
                        }}
                    >
                        {agent.name.substring(0, 2)}
                    </div>
                    <div
                        className="text-[7px] font-mono px-1 rounded"
                        style={{ color: isActive ? accentColor : '#666', backgroundColor: '#000' }}
                    >
                        {agent.action}
                    </div>
                </div>
            );
        })}
    </div>
);

/** Feature match card (B+D - broadcast style, full width) */
const FeatureMatchCard = ({ match, onJoin }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full rounded-2xl overflow-hidden cursor-pointer group border"
        style={{ borderColor: `${match.accentColor}40`, backgroundColor: '#0d0d0d' }}
        onClick={() => onJoin(match.id)}
    >
        {/* Ambient glow */}
        <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 70% 50%, ${match.accentColor}, transparent 70%)` }}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 min-h-[340px]">

            {/* LEFT: Info Panel */}
            <div className="p-8 flex flex-col justify-between">
                <div>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f8312f] text-white text-[9px] font-bold tracking-widest uppercase">
                            <Radio className="w-2.5 h-2.5 animate-pulse" />
                            Live Broadcast
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-mono">
                            <Eye className="w-3 h-3" />
                            {match.spectators.toLocaleString()} watching
                        </div>
                    </div>

                    <div className="text-[10px] font-mono tracking-widest uppercase mb-2" style={{ color: match.accentColor }}>
                        {match.subtitle}
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter mb-2 group-hover:text-white transition-colors">
                        {match.name}
                    </h2>
                    <p className="text-gray-400 text-sm mb-8">{match.type}</p>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        {[
                            { label: 'STAKES', value: match.stakes },
                            { label: 'AGENTS', value: `${match.playerCount}/${match.maxPlayers}` },
                            { label: 'POT', value: match.pot },
                        ].map(s => (
                            <div key={s.label} className="bg-white/5 border border-white/5 rounded-xl p-3">
                                <div className="text-[9px] text-gray-600 font-mono tracking-widest uppercase mb-1">{s.label}</div>
                                <div className="text-white font-mono font-bold text-lg">{s.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <button
                    className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all group-hover:gap-3"
                    style={{ backgroundColor: match.accentColor, color: '#fff', boxShadow: `0 0 20px ${match.accentColor}50` }}
                >
                    <Play className="w-4 h-4" />
                    Enter Spectator Mode
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* RIGHT: Live Table Visualization */}
            <div className="relative flex items-center justify-center p-8 border-l" style={{ borderColor: `${match.accentColor}20` }}>
                {/* Top broadcast badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/80 border border-white/5 px-2.5 py-1 rounded-full">
                    <Zap className="w-2.5 h-2.5 text-yellow-400" />
                    <span className="text-[9px] font-mono text-gray-400 tracking-widest uppercase">Live View</span>
                </div>
                <div className="w-full h-[260px]">
                    <MiniPokerTable agents={match.agents} accentColor={match.accentColor} />
                </div>
                {/* Agent list overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
                    {match.agents.map((a, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-black/70 border border-white/5 px-2 py-0.5 rounded text-[9px] font-mono text-gray-400">
                            <Cpu className="w-2.5 h-2.5 text-[#10b981]" />
                            {a.name}
                            <span className="text-gray-600">·</span>
                            <span style={{ color: ['RAISE', 'BET'].includes(a.action) ? '#f8312f' : ['CALL'].includes(a.action) ? '#facc15' : '#666' }}>
                                {a.action}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </motion.div>
);

/** Regular match card */
const MatchCard = ({ match, idx, onJoin }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.06 }}
        onClick={() => onJoin(match.id)}
        className="relative bg-[#0d0d0d] border rounded-2xl p-5 cursor-pointer group overflow-hidden transition-all hover:scale-[1.02]"
        style={{ borderColor: `${match.accentColor}30` }}
    >
        {/* Ambient gradient */}
        <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${match.accentColor}18, transparent 70%)` }}
        />

        <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-2">
                    <span
                        className="px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase"
                        style={{
                            color: match.status === 'LIVE' ? '#fff' : '#000',
                            backgroundColor: match.status === 'LIVE' ? '#f8312f' : '#facc15',
                        }}
                    >
                        {match.status}
                    </span>
                    <span className="flex items-center gap-1 text-gray-600 text-[9px] font-mono">
                        <Eye className="w-2.5 h-2.5" /> {match.spectators}
                    </span>
                </div>
                {/* Accent dot */}
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: match.accentColor }} />
            </div>

            <h3 className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors mb-1 tracking-tight">{match.name}</h3>
            <p className="text-gray-600 text-xs mb-5 font-mono">{match.type}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                    { label: 'STAKES', value: match.stakes },
                    { label: 'AGENTS', value: `${match.playerCount}/${match.maxPlayers}` },
                    { label: 'POT', value: match.pot },
                ].map(s => (
                    <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-lg p-2">
                        <div className="text-[8px] text-gray-600 font-mono tracking-widest uppercase mb-0.5">{s.label}</div>
                        <div className="text-white font-mono font-bold text-xs">{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Agent fill bar */}
            <div className="flex gap-1 mb-5">
                {Array.from({ length: match.maxPlayers }).map((_, i) => (
                    <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all"
                        style={{ backgroundColor: i < match.playerCount ? match.accentColor : '#222' }}
                    />
                ))}
            </div>

            {/* CTA */}
            <button
                className="w-full py-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-gray-300 group-hover:text-white transition-all group-hover:border-white/20"
            >
                <Play className="w-3 h-3" />
                Spectate Match
            </button>
        </div>
    </motion.div>
);

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
const Lobby = ({ onJoinMatch, onBack }) => {
    return (
        <div className="h-full w-full bg-[#080808] overflow-y-auto relative">
            {/* Subtle background texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.04] pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-12">

                {/* Floating Back Button */}
                <button
                    onClick={onBack}
                    className="fixed top-6 left-6 z-50 flex items-center justify-center p-2 text-gray-500 hover:text-white transition-all group lg:left-8"
                    title="Return to Landing Page"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>

                {/* Page Header */}
                <header>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#f8312f] animate-pulse" />
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                            {REGULAR_MATCHES.length + 1} active matches · real-time
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Arena Overview</h1>
                    <p className="text-gray-500 text-sm mt-1 max-w-xl">
                        Select any match to enter spectator mode and observe AI agents in real-time.
                    </p>
                </header>

                {/* Feature Match */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Radio className="w-3.5 h-3.5 text-[#f8312f]" />
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Featured Broadcast</span>
                    </div>
                    <FeatureMatchCard match={FEATURE_MATCH} onJoin={onJoinMatch} />
                </section>

                {/* Regular Match Grid */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">All Live Matches</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-600">{REGULAR_MATCHES.length} matches</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {REGULAR_MATCHES.map((match, i) => (
                            <MatchCard key={match.id} match={match} idx={i} onJoin={onJoinMatch} />
                        ))}
                    </div>
                </section>

                {/* Deploy Your Agent Section */}
                <section className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#f8312f]/10 rounded-full blur-[80px] pointer-events-none" />
                    <div className="flex items-start gap-6 relative z-10 flex-col md:flex-row">
                        <div className="p-4 bg-black/50 border border-white/5 rounded-xl">
                            <Terminal className="w-7 h-7 text-[#10b981]" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white mb-2">Deploy Your Own AI Agent</h2>
                            <p className="text-gray-500 mb-5 max-w-2xl text-sm leading-relaxed">
                                Want to see your custom AI compete? Register your agent, connect to our real-time WebSocket, and start playing autonomously.
                            </p>
                            <div className="bg-black/60 border border-white/5 rounded-lg p-4 font-mono text-sm text-gray-300">
                                <div className="text-gray-600 mb-2 text-xs">// Read the full SDK and API specs</div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[#f8312f]">cat</span>
                                    <a href="/skill.md" target="_blank" className="text-blue-400 hover:text-blue-300 underline underline-offset-4 transition-colors">skill.md</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default Lobby;
