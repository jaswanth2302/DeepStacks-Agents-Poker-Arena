import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Eye } from 'lucide-react';

// This component receives the same match data as the main Lobby view
// and filters it based on the selected filter

const TablesView = ({ sessions, agentsMap, agentLastActions, onJoinMatch }) => {
    const [activeFilter, setActiveFilter] = useState('ALL');

    const ACCENT_COLORS = ['#f8312f', '#10b981', '#facc15', '#a78bfa', '#f97316', '#06b6d4'];
    const MATCH_TYPE_MAX = { heads_up: 2, '3max': 3, '6max': 6 };

    // Map sessions to match format
    const mapSession = (session, idx) => {
        const isLive = ['playing', 'waiting_for_action'].includes(session.status);
        const maxPlayers = MATCH_TYPE_MAX[session.match_type] || 6;

        const playerIds = session.player_ids && session.player_ids.length > 0
            ? session.player_ids
            : [];
        const sessionAgents = playerIds
            .map(id => agentsMap[id])
            .filter(Boolean)
            .slice(0, maxPlayers);

        return {
            id: session.id,
            name: 'Live Arena',
            stakes: '1/2 BB',
            playerCount: sessionAgents.length,
            maxPlayers,
            type: "No Limit Hold'em",
            status: isLive ? 'LIVE' : 'WAITING',
            spectators: 0,
            pot: `$${(session.pot_amount || 0).toLocaleString()}`,
            accentColor: ACCENT_COLORS[idx % ACCENT_COLORS.length],
            rawStatus: session.status,
        };
    };

    const matches = sessions.map((s, i) => mapSession(s, i));

    // Filter logic
    const getFilteredMatches = () => {
        if (activeFilter === 'ALL') return matches;
        if (activeFilter === 'LOBBY') return matches.filter(m => m.rawStatus === 'queued');
        if (activeFilter === 'LIVE') return matches.filter(m => ['playing', 'waiting_for_action'].includes(m.rawStatus));
        if (activeFilter === 'WAITING') return matches.filter(m => m.rawStatus === 'waiting');
        if (activeFilter === 'ENDED') return matches.filter(m => m.rawStatus === 'showdown' || m.rawStatus === 'ended');
        return matches;
    };

    const filteredMatches = getFilteredMatches();

    // Filter tabs
    const filters = ['ALL', 'LOBBY', 'LIVE', 'WAITING', 'ENDED'];

    return (
        <div className="w-full space-y-6">
            {/* Filters */}
            <div className="flex items-center justify-end">
                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-black/20 border border-white/5 rounded-full p-1">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase transition-all ${
                                activeFilter === filter
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'text-gray-600 hover:text-gray-400'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Match Count */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                <div className={`w-1.5 h-1.5 rounded-full ${filteredMatches.length > 0 ? 'bg-[#10b981]' : 'bg-gray-600'} animate-pulse`} />
                {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'}
            </div>

            {/* Matches Grid */}
            {filteredMatches.length === 0 ? (
                <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                        <p className="text-white font-bold mb-1">No matches found</p>
                        <p className="text-gray-600 text-sm">
                            {activeFilter === 'ENDED'
                                ? 'No recently completed matches.'
                                : `No matches in ${activeFilter.toLowerCase()} status.`}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMatches.map((match, idx) => (
                        <MatchCard key={match.id} match={match} idx={idx} onJoin={onJoinMatch} />
                    ))}
                </div>
            )}
        </div>
    );
};

// Match Card Component (simplified version from Lobby.jsx)
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

export default TablesView;
