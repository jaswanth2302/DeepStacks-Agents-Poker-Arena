import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Mock data for demonstration - will be replaced with real Supabase data later
const mockMatches_OLD = [
    {
        id: 1,
        name: 'High Stakes Alpha',
        status: 'LIVE',
        players: '6/6',
        pot: 42500,
        handsPlayed: 47,
        duration: '18m 42s',
        avgPot: 8240,
        agents: [
            { name: 'AlphaBot-7', stack: 15200, profitLoss: 5200, vpip: 32, pfr: 28, handsWon: 12, handsPlayed: 47 },
            { name: 'NeuralBluff', stack: 8900, profitLoss: -1100, vpip: 45, pfr: 12, handsWon: 8, handsPlayed: 47 },
            { name: 'DeepStack_v2', stack: 12400, profitLoss: 2400, vpip: 28, pfr: 24, handsWon: 11, handsPlayed: 47 },
            { name: 'GTO_Master', stack: 6800, profitLoss: -3200, vpip: 18, pfr: 15, handsWon: 5, handsPlayed: 47 },
            { name: 'Exploiter_3', stack: 11200, profitLoss: 1200, vpip: 38, pfr: 22, handsWon: 9, handsPlayed: 47 },
            { name: 'TightBot', stack: 5500, profitLoss: -4500, vpip: 12, pfr: 10, handsWon: 2, handsPlayed: 47 },
        ],
        recentHands: [
            { handNum: 47, pot: 12500, winner: 'AlphaBot-7', hand: 'Flush' },
            { handNum: 46, pot: 8200, winner: 'DeepStack_v2', hand: 'Two Pair' },
            { handNum: 45, pot: 4100, winner: 'Split: AlphaBot-7, GTO_Master', hand: 'Pair' },
            { handNum: 44, pot: 6800, winner: 'Exploiter_3', hand: 'Three of a Kind' },
            { handNum: 43, pot: 3200, winner: 'NeuralBluff', hand: 'Pair' },
        ]
    },
    {
        id: 2,
        name: 'GTO Sandbox',
        status: 'ENDED',
        players: '4/6',
        pot: 18200,
        handsPlayed: 125,
        duration: '42m 18s',
        avgPot: 5640,
        agents: [
            { name: 'GTO_Master', stack: 18200, profitLoss: 8200, vpip: 22, pfr: 18, handsWon: 32, handsPlayed: 125 },
            { name: 'RangeBot_v4', stack: 12400, profitLoss: 2400, vpip: 28, pfr: 22, handsWon: 28, handsPlayed: 125 },
            { name: 'TightBot', stack: 6800, profitLoss: -3200, vpip: 15, pfr: 12, handsWon: 18, handsPlayed: 125 },
            { name: 'AggroFish', stack: 2600, profitLoss: -7400, vpip: 52, pfr: 8, handsWon: 12, handsPlayed: 125 },
        ],
        recentHands: [
            { handNum: 125, pot: 15200, winner: 'GTO_Master', hand: 'Full House' },
            { handNum: 124, pot: 8900, winner: 'RangeBot_v4', hand: 'Straight' },
            { handNum: 123, pot: 4200, winner: 'TightBot', hand: 'Two Pair' },
        ]
    },
    {
        id: 3,
        name: 'Exploitative Testing',
        status: 'LIVE',
        players: '6/6',
        pot: 112000,
        handsPlayed: 89,
        duration: '32m 05s',
        avgPot: 12450,
        agents: [
            { name: 'Exploiter_3', stack: 28400, profitLoss: 18400, vpip: 42, pfr: 35, handsWon: 24, handsPlayed: 89 },
            { name: 'AlphaBot-7', stack: 22100, profitLoss: 12100, vpip: 35, pfr: 28, handsWon: 21, handsPlayed: 89 },
            { name: 'DeepStack_v2', stack: 15800, profitLoss: 5800, vpip: 32, pfr: 26, handsWon: 18, handsPlayed: 89 },
            { name: 'NeuralBluff', stack: 9200, profitLoss: -800, vpip: 48, pfr: 15, handsWon: 12, handsPlayed: 89 },
            { name: 'GTO_Master', stack: 7600, profitLoss: -2400, vpip: 24, pfr: 20, handsWon: 10, handsPlayed: 89 },
            { name: 'TightBot', stack: 4900, profitLoss: -5100, vpip: 14, pfr: 11, handsWon: 4, handsPlayed: 89 },
        ],
        recentHands: [
            { handNum: 89, pot: 24500, winner: 'Exploiter_3', hand: 'Straight Flush' },
            { handNum: 88, pot: 18200, winner: 'AlphaBot-7', hand: 'Full House' },
            { handNum: 87, pot: 9800, winner: 'DeepStack_v2', hand: 'Flush' },
        ]
    },
    {
        id: 4,
        name: 'Heads Up Showdown',
        status: 'ENDED',
        players: '2/2',
        pot: 287400,
        handsPlayed: 234,
        duration: '68m 24s',
        avgPot: 6180,
        agents: [
            { name: 'AlphaBot-7', stack: 15200, profitLoss: 5200, vpip: 68, pfr: 42, handsWon: 124, handsPlayed: 234 },
            { name: 'NeuralBluff', stack: 4800, profitLoss: -5200, vpip: 72, pfr: 38, handsWon: 110, handsPlayed: 234 },
        ],
        recentHands: [
            { handNum: 234, pot: 9600, winner: 'AlphaBot-7', hand: 'Ace High' },
            { handNum: 233, pot: 4200, winner: 'NeuralBluff', hand: 'Pair' },
            { handNum: 232, pot: 8400, winner: 'AlphaBot-7', hand: 'Two Pair' },
        ]
    },
];

const MatchStatsView = () => {
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMatches();

        // Subscribe to real-time updates
        const channel = supabase
            .channel('match_stats_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () => {
                fetchMatches();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const fetchMatches = async () => {
        // Fetch all game sessions
        const { data: sessions, error } = await supabase
            .from('game_sessions')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching matches:', error);
            setLoading(false);
            return;
        }

        // Fetch all unique agent IDs from all sessions (including winner_ids)
        const playerAgentIds = [...new Set(sessions.flatMap(s => s.player_ids || []))];
        const winnerAgentIds = sessions.map(s => s.winner_id).filter(Boolean);
        const allAgentIds = [...new Set([...playerAgentIds, ...winnerAgentIds])];

        const { data: agents } = await supabase
            .from('agents')
            .select('id, name')
            .in('id', allAgentIds);

        const agentsMap = {};
        (agents || []).forEach(a => agentsMap[a.id] = a);

        // Transform to UI format
        const formatted = sessions.map((session, idx) => {
            const isLive = ['playing', 'waiting_for_action', 'showdown'].includes(session.status);
            const playerData = session.player_data || [];
            const maxPlayers = session.match_type === 'heads_up' ? 2 : session.match_type === '3max' ? 3 : 6;

            // Calculate duration
            let duration = 'N/A';
            if (session.started_at) {
                const start = new Date(session.started_at);
                const end = session.ended_at ? new Date(session.ended_at) : new Date();
                const diffMs = end - start;
                const minutes = Math.floor(diffMs / 60000);
                const seconds = Math.floor((diffMs % 60000) / 1000);
                duration = `${minutes}m ${seconds}s`;
            }

            // Calculate average pot
            const avgPot = session.total_hands > 0 ? Math.floor(session.pot_amount / session.total_hands) : 0;

            // Get agent info from player_data
            const sessionAgents = playerData.map(pd => {
                const agent = agentsMap[pd.id];
                return {
                    name: agent ? agent.name : `Agent ${pd.id.slice(0, 6)}`,
                    stack: pd.stack || 0,
                    profitLoss: (pd.stack || 0) - 10000, // Starting stack is 10000
                    vpip: 0, // N/A for now
                    pfr: 0, // N/A for now
                    handsWon: 0, // N/A for now
                    handsPlayed: session.total_hands || 0
                };
            });

            // Get winner info for ended matches
            let winnerInfo = null;
            if (!isLive && session.winner_id) {
                const winnerAgent = agentsMap[session.winner_id];
                const winnerData = playerData.find(pd => pd.id === session.winner_id);
                if (winnerAgent && winnerData) {
                    winnerInfo = {
                        name: winnerAgent.name,
                        profit: winnerData.stack - 10000
                    };
                }
            }

            return {
                id: session.id,
                name: `Match ${session.match_type} #${session.id.slice(0, 6)}`,
                status: isLive ? 'LIVE' : 'ENDED',
                players: `${playerData.length}/${maxPlayers}`,
                pot: session.pot_amount || 0,
                handsPlayed: session.total_hands || 0,
                duration,
                avgPot,
                agents: sessionAgents,
                winnerInfo,
                recentHands: [] // Will be populated later
            };
        });

        setMatches(formatted);
        setLoading(false);
    };

    const formatCurrency = (amount) => {
        return `$${amount.toLocaleString()}`;
    };

    const formatProfitLoss = (amount) => {
        const sign = amount >= 0 ? '+' : '';
        return `${sign}${formatCurrency(amount)}`;
    };

    if (selectedMatch) {
        return <MatchDetailsView match={selectedMatch} onBack={() => setSelectedMatch(null)} />;
    }

    return (
        <div className="w-full space-y-6">
            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!loading && matches.length === 0 && (
                <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
                    <p className="text-white font-bold">No matches found</p>
                    <p className="text-gray-600 text-sm">Start some matches to see statistics here</p>
                </div>
            )}

            {/* Match Count */}
            {!loading && matches.length > 0 && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                    {matches.length} total matches
                </div>
            )}

            {/* Matches Table */}
            {!loading && matches.length > 0 && (
                <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl overflow-hidden">
                    {/* Table Header */}
                    <div className="border-b border-white/5 px-6 py-3 grid grid-cols-12 gap-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        <div className="col-span-1">#</div>
                        <div className="col-span-3">Match Name</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Players</div>
                        <div className="col-span-2">Pot</div>
                        <div className="col-span-2">Hands</div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-white/5">
                        {matches.map((match, idx) => (
                        <motion.div
                            key={match.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setSelectedMatch(match)}
                            className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-white/[0.02] transition-colors cursor-pointer group"
                        >
                            {/* # */}
                            <div className="col-span-1 text-gray-600 font-mono text-xs">
                                {String(match.id).padStart(2, '0')}
                            </div>

                            {/* Match Name */}
                            <div className="col-span-3">
                                <span className="font-semibold text-sm text-gray-300 group-hover:text-white transition-colors tracking-tight">
                                    {match.name}
                                </span>
                            </div>

                            {/* Status */}
                            <div className="col-span-2">
                                <span
                                    className="text-[9px] font-mono font-bold px-2 py-0.5 rounded tracking-widest uppercase"
                                    style={{
                                        color: match.status === 'LIVE' ? '#fff' : '#10b981',
                                        backgroundColor: match.status === 'LIVE' ? '#f8312f' : '#10b98120',
                                        border: `1px solid ${match.status === 'LIVE' ? '#f8312f' : '#10b981'}33`
                                    }}
                                >
                                    {match.status}
                                </span>
                            </div>

                            {/* Players */}
                            <div className="col-span-2 font-mono text-xs text-gray-500">
                                {match.players}
                            </div>

                            {/* Pot */}
                            <div className="col-span-2 font-mono text-sm font-bold text-gray-200 group-hover:text-white transition-colors">
                                {formatCurrency(match.pot)}
                            </div>

                            {/* Hands */}
                            <div className="col-span-2 font-mono text-xs text-gray-500">
                                {match.handsPlayed}
                            </div>
                        </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Detailed Match View Component
const MatchDetailsView = ({ match, onBack }) => {
    const formatCurrency = (amount) => {
        return `$${amount.toLocaleString()}`;
    };

    const formatProfitLoss = (amount) => {
        const sign = amount >= 0 ? '+' : '';
        return `${sign}${formatCurrency(amount)}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full space-y-6"
        >
            {/* Back Button */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-medium group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to All Matches
            </button>

            {/* Match Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        Match #{match.id} - {match.name}
                    </h2>
                    <span
                        className="text-[9px] font-mono font-bold px-2 py-0.5 rounded tracking-widest uppercase"
                        style={{
                            color: match.status === 'LIVE' ? '#fff' : '#10b981',
                            backgroundColor: match.status === 'LIVE' ? '#f8312f' : '#10b98120',
                            border: `1px solid ${match.status === 'LIVE' ? '#f8312f' : '#10b981'}33`
                        }}
                    >
                        {match.status}
                    </span>
                </div>
                <p className="text-gray-500 text-sm font-mono">
                    {match.players} • {match.handsPlayed} Hands Played
                </p>
            </div>

            {/* Match Overview Cards */}
            <div className="grid grid-cols-3 gap-4">
                {/* For ENDED matches: show winner info instead of current pot */}
                {match.status === 'ENDED' ? (
                    <>
                        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-4">
                            <div className="text-[9px] text-gray-600 font-mono tracking-widest uppercase mb-1.5">
                                Winner
                            </div>
                            <div className="text-lg font-bold" style={{ color: '#10b981' }}>
                                {match.winnerInfo ? match.winnerInfo.name : 'No Winner'}
                            </div>
                        </div>
                        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-4">
                            <div className="text-[9px] text-gray-600 font-mono tracking-widest uppercase mb-1.5">
                                Winner Profit
                            </div>
                            <div
                                className="text-xl font-bold font-mono"
                                style={{ color: match.winnerInfo && match.winnerInfo.profit >= 0 ? '#10b981' : '#f8312f' }}
                            >
                                {match.winnerInfo ? formatProfitLoss(match.winnerInfo.profit) : 'N/A'}
                            </div>
                        </div>
                        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-4">
                            <div className="text-[9px] text-gray-600 font-mono tracking-widest uppercase mb-1.5">
                                Duration
                            </div>
                            <div className="text-xl font-bold font-mono" style={{ color: '#06b6d4' }}>
                                {match.duration}
                            </div>
                        </div>
                    </>
                ) : (
                    // For LIVE matches: show current pot, duration, avg pot
                    [
                        { label: 'Current Pot', value: formatCurrency(match.pot), color: '#facc15' },
                        { label: 'Duration', value: match.duration, color: '#06b6d4' },
                        { label: 'Avg Pot', value: formatCurrency(match.avgPot), color: '#a78bfa' },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-[#0d0d0d] border border-white/5 rounded-xl p-4"
                        >
                            <div className="text-[9px] text-gray-600 font-mono tracking-widest uppercase mb-1.5">
                                {stat.label}
                            </div>
                            <div
                                className="text-xl font-bold font-mono"
                                style={{ color: stat.color }}
                            >
                                {stat.value}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Agent Performance Table */}
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white">
                        {match.status === 'ENDED' ? 'Final Agent Standings' : 'Agent Performance in This Match'}
                    </h3>
                </div>

                {/* Empty State - No Agent Data */}
                {match.agents.length === 0 ? (
                    <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
                        <p className="text-white font-semibold">Agent data unavailable</p>
                        <p className="text-gray-600 text-sm">
                            Match data was cleaned up or not recorded properly
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Table Header */}
                        <div className="border-b border-white/5 px-6 py-3 grid grid-cols-12 gap-3 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                            <div className="col-span-3">Agent</div>
                            <div className="col-span-2">Stack</div>
                            <div className="col-span-2">+/- Match</div>
                            <div className="col-span-1">VPIP</div>
                            <div className="col-span-1">PFR</div>
                            <div className="col-span-3">Hands Won</div>
                        </div>

                        {/* Agent Rows */}
                        <div className="divide-y divide-white/5">
                            {match.agents.map((agent, idx) => {
                                const profitColor = agent.profitLoss >= 0 ? '#10b981' : '#f8312f';
                                const winRate = agent.handsPlayed > 0 && agent.handsWon > 0
                                    ? ((agent.handsWon / agent.handsPlayed) * 100).toFixed(0)
                                    : 0;

                                return (
                                    <motion.div
                                        key={agent.name}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="px-6 py-4 grid grid-cols-12 gap-3 items-center hover:bg-white/[0.02] transition-colors"
                                    >
                                        {/* Agent Name */}
                                        <div className="col-span-3 flex items-center gap-2">
                                            {agent.profitLoss > 0 && (
                                                <TrendingUp className="w-3 h-3 text-[#10b981]" />
                                            )}
                                            {agent.profitLoss < 0 && (
                                                <TrendingDown className="w-3 h-3 text-[#f8312f]" />
                                            )}
                                            <span className="font-semibold text-sm text-gray-300">
                                                {agent.name}
                                            </span>
                                        </div>

                                        {/* Stack */}
                                        <div className="col-span-2 font-mono text-sm text-gray-400">
                                            {formatCurrency(agent.stack)}
                                        </div>

                                        {/* Profit/Loss */}
                                        <div className="col-span-2">
                                            <span
                                                className="font-mono font-bold text-sm"
                                                style={{ color: profitColor }}
                                            >
                                                {formatProfitLoss(agent.profitLoss)}
                                            </span>
                                        </div>

                                        {/* VPIP */}
                                        <div className="col-span-1 font-mono text-xs text-gray-600">
                                            {agent.vpip > 0 ? `${agent.vpip}%` : 'N/A'}
                                        </div>

                                        {/* PFR */}
                                        <div className="col-span-1 font-mono text-xs text-gray-600">
                                            {agent.pfr > 0 ? `${agent.pfr}%` : 'N/A'}
                                        </div>

                                        {/* Hands Won */}
                                        <div className="col-span-3 flex items-center gap-2">
                                            <span className="font-mono text-xs text-gray-400">
                                                {agent.handsWon > 0 ? `${agent.handsWon}/${agent.handsPlayed}` : 'N/A'}
                                            </span>
                                            {agent.handsWon > 0 && winRate > 0 && (
                                                <span className="text-[10px] font-mono text-gray-600">
                                                    ({winRate}%)
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Recent Hands */}
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white">Recent Hands</h3>
                </div>

                {/* Empty State - Coming Soon */}
                {match.recentHands.length === 0 ? (
                    <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
                        <p className="text-white font-semibold">Hand history coming soon</p>
                        <p className="text-gray-600 text-sm">
                            We'll parse game logs to show recent hands with pot sizes and winners
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {match.recentHands.map((hand, idx) => (
                            <div
                                key={hand.handNum}
                                className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-gray-600 font-mono text-xs">
                                        #{hand.handNum}
                                    </span>
                                    <span className="font-mono text-sm font-bold text-[#facc15]">
                                        Pot: {formatCurrency(hand.pot)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-400">
                                        Winner: <span className="text-white font-semibold">{hand.winner}</span>
                                    </span>
                                    <span className="text-xs text-gray-600 font-mono">
                                        ({hand.hand})
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default MatchStatsView;
