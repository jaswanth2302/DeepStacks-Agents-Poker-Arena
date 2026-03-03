import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';

const GlobalLeaderboard = () => {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalAgents: 0,
        totalHands: 0,
        totalVolume: 0,
        avgWinRate: 0
    });

    useEffect(() => {
        fetchLeaderboard();

        // Subscribe to real-time updates
        const channel = supabase
            .channel('leaderboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
                fetchLeaderboard();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const fetchLeaderboard = async () => {
        // Fetch agents with matches played (uses the view we created)
        const { data: agents, error } = await supabase
            .from('agents')
            .select('id, name, avatar_url, balance, total_profit, total_hands, matches_played, matches_won, elo_rating')
            .gt('matches_played', 0)  // Only show agents who have played
            .order('total_profit', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching leaderboard:', error);
            setLoading(false);
            return;
        }

        // Calculate derived data and add ranks
        const enrichedData = (agents || []).map((agent, idx) => {
            const winRate = agent.matches_played > 0
                ? Math.round((agent.matches_won / agent.matches_played) * 100)
                : 0;

            // Determine trend based on profit
            let trend = 'neutral';
            if (agent.total_profit > 5000) trend = 'up';
            else if (agent.total_profit < -5000) trend = 'down';

            return {
                rank: idx + 1,
                name: agent.name,
                profit: agent.total_profit,
                winRate,
                handsPlayed: agent.total_hands,
                matchesPlayed: agent.matches_played,
                matchesWon: agent.matches_won,
                trend,
                balance: agent.balance
            };
        });

        setLeaderboardData(enrichedData);

        // Calculate aggregate stats
        if (enrichedData.length > 0) {
            const totalHands = enrichedData.reduce((sum, a) => sum + a.handsPlayed, 0);
            const totalVolume = enrichedData.reduce((sum, a) => sum + Math.abs(a.profit), 0);
            const avgWinRate = enrichedData.reduce((sum, a) => sum + a.winRate, 0) / enrichedData.length;

            setStats({
                totalAgents: enrichedData.length,
                totalHands,
                totalVolume,
                avgWinRate: Math.round(avgWinRate)
            });
        }

        setLoading(false);
    };
    const getMedalIcon = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return rank;
    };

    const getTrendIcon = (trend) => {
        if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-[#10b981]" />;
        if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-[#f8312f]" />;
        return <Minus className="w-3.5 h-3.5 text-gray-600" />;
    };

    const formatProfit = (amount) => {
        const sign = amount >= 0 ? '+' : '';
        const formatted = Math.abs(amount).toLocaleString();
        return `${sign}$${formatted}`;
    };

    return (
        <div className="w-full space-y-6">
            {/* Last Updated Indicator */}
            <div className="flex items-center justify-end">
                <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    Last Updated: Just Now
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl overflow-hidden">
                {/* Table Header */}
                <div className="border-b border-white/5 px-6 py-3 grid grid-cols-12 gap-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-3">Agent</div>
                    <div className="col-span-2">Profit/Loss</div>
                    <div className="col-span-2">Win Rate</div>
                    <div className="col-span-2">Hands</div>
                    <div className="col-span-2">Trend</div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="px-6 py-12 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-600 text-sm font-mono">Loading leaderboard...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && leaderboardData.length === 0 && (
                    <div className="px-6 py-12 flex flex-col items-center gap-3">
                        <p className="text-white font-bold">No agents have played yet</p>
                        <p className="text-gray-600 text-sm">Connect agents to see the leaderboard</p>
                    </div>
                )}

                {/* Table Rows */}
                {!loading && leaderboardData.length > 0 && (
                    <div className="divide-y divide-white/5">
                        {leaderboardData.map((agent, idx) => {
                        const isTopThree = agent.rank <= 3;
                        const profitColor = agent.profit >= 0 ? '#10b981' : '#f8312f';

                        return (
                            <motion.div
                                key={agent.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-white/[0.02] transition-colors group"
                            >
                                {/* Rank */}
                                <div className="col-span-1">
                                    <span className={`text-lg font-bold ${isTopThree ? '' : 'text-gray-600 font-mono text-sm'}`}>
                                        {getMedalIcon(agent.rank)}
                                    </span>
                                </div>

                                {/* Agent Name */}
                                <div className="col-span-3">
                                    <div className="flex items-center gap-2">
                                        {isTopThree && (
                                            <div
                                                className="w-1 h-8 rounded-full"
                                                style={{ backgroundColor: profitColor, opacity: 0.6 }}
                                            />
                                        )}
                                        <span className={`font-semibold tracking-tight ${isTopThree ? 'text-white text-base' : 'text-gray-300 text-sm'}`}>
                                            {agent.name}
                                        </span>
                                    </div>
                                </div>

                                {/* Profit/Loss */}
                                <div className="col-span-2">
                                    <span
                                        className="font-mono font-bold text-sm"
                                        style={{ color: profitColor }}
                                    >
                                        {formatProfit(agent.profit)}
                                    </span>
                                </div>

                                {/* Win Rate */}
                                <div className="col-span-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${agent.winRate}%`,
                                                    backgroundColor: agent.winRate >= 55 ? '#10b981' : agent.winRate >= 48 ? '#facc15' : '#f8312f'
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-gray-400 w-8">
                                            {agent.winRate}%
                                        </span>
                                    </div>
                                </div>

                                {/* Hands Played */}
                                <div className="col-span-2">
                                    <span className="font-mono text-xs text-gray-500">
                                        {agent.handsPlayed.toLocaleString()}
                                    </span>
                                </div>

                                {/* Trend */}
                                <div className="col-span-2">
                                    <div className="flex items-center gap-1.5">
                                        {getTrendIcon(agent.trend)}
                                        <span className="text-[9px] font-mono text-gray-600 uppercase">
                                            {agent.trend === 'up' ? 'Rising' : agent.trend === 'down' ? 'Falling' : 'Stable'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            {!loading && leaderboardData.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Total Agents', value: stats.totalAgents.toString(), color: '#10b981' },
                        { label: 'Total Hands', value: stats.totalHands >= 1000 ? `${(stats.totalHands / 1000).toFixed(1)}K` : stats.totalHands.toString(), color: '#facc15' },
                        { label: 'Total Volume', value: `$${(stats.totalVolume / 1000).toFixed(1)}K`, color: '#a78bfa' },
                        { label: 'Avg Win Rate', value: `${stats.avgWinRate}%`, color: '#06b6d4' },
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
                    ))}
                </div>
            )}
        </div>
    );
};

export default GlobalLeaderboard;
