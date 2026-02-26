import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Zap, Trophy, ChevronUp, ChevronDown, DollarSign } from 'lucide-react';

const CHIP_AMOUNTS = [100, 500, 1000, 5000];

/**
 * Compute display odds from win confidence (0–1)
 * Higher confidence  → lower multiplier (favourite)
 * Lower confidence   → higher multiplier (underdog)
 */
const computeOdds = (confidence = 0.5) => {
    const raw = Math.max(0.05, Math.min(0.95, confidence));
    return Math.max(1.05, (1 / raw) * 0.92); // house edge 8%
};

const formatOdds = (val) => `${val.toFixed(2)}×`;

const OddsArrow = ({ delta }) =>
    delta > 0 ? (
        <span className="text-emerald-400 flex items-center gap-0.5 text-[9px] font-bold">
            <ChevronUp className="w-2.5 h-2.5" /> {delta.toFixed(1)}%
        </span>
    ) : delta < 0 ? (
        <span className="text-red-400 flex items-center gap-0.5 text-[9px] font-bold">
            <ChevronDown className="w-2.5 h-2.5" /> {Math.abs(delta).toFixed(1)}%
        </span>
    ) : null;

const SpectatorBetting = ({ players = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [betAmount, setBetAmount] = useState(500);
    const [customAmount, setCustomAmount] = useState('');
    const [betPlaced, setBetPlaced] = useState(false);
    const [balance, setBalance] = useState(10_000);
    const [toast, setToast] = useState(null); // { msg, type }

    // Fake live odds drift — tiny random fluctuation every 3s
    const [oddsDrift, setOddsDrift] = useState({});
    useEffect(() => {
        const interval = setInterval(() => {
            setOddsDrift(prev => {
                const next = { ...prev };
                players.forEach(p => {
                    next[p.id] = (Math.random() - 0.5) * 2.4; // ±1.2%
                });
                return next;
            });
        }, 2800);
        return () => clearInterval(interval);
    }, [players]);

    const finalBet = customAmount ? parseInt(customAmount) || 0 : betAmount;

    const handlePlaceBet = () => {
        if (!selectedAgent || finalBet <= 0 || finalBet > balance) return;
        const odds = computeOdds(selectedAgent.confidence);
        const payout = Math.round(finalBet * odds);
        setBalance(b => b - finalBet);
        setBetPlaced(true);
        setToast({ msg: `🎯 Bet locked! Potential return: ${payout.toLocaleString()} chips`, type: 'success' });
        setTimeout(() => setToast(null), 3500);
    };

    const handleReset = () => {
        setBetPlaced(false);
        setSelectedAgent(null);
        setCustomAmount('');
        setBetAmount(500);
    };

    return (
        <>
            {/* Floating Bet Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsOpen(v => !v)}
                className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm pointer-events-auto"
                style={{
                    background: isOpen
                        ? 'linear-gradient(135deg,#7c3aed,#4f46e5)'
                        : 'linear-gradient(135deg,#f59e0b,#d97706)',
                    boxShadow: isOpen
                        ? '0 0 20px rgba(124,58,237,0.5)'
                        : '0 0 20px rgba(245,158,11,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'white',
                }}
            >
                <DollarSign className="w-4 h-4" />
                {isOpen ? 'Close' : 'Place Bet'}
            </motion.button>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="bet-panel"
                        initial={{ x: 340, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 340, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                        className="absolute top-16 right-6 z-50 w-[300px] pointer-events-auto flex flex-col"
                        style={{
                            background: 'linear-gradient(160deg, rgba(10,8,25,0.97) 0%, rgba(15,12,35,0.97) 100%)',
                            border: '1px solid rgba(124,58,237,0.35)',
                            borderRadius: '16px',
                            boxShadow: '0 8px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-6 h-6 rounded-md flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
                                >
                                    <Trophy className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                    <div className="text-white font-bold text-sm leading-none">Spectator Bets</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">Bet on the winner</div>
                                </div>
                            </div>
                            {/* Balance badge */}
                            <div
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}
                            >
                                <Zap className="w-2.5 h-2.5" />
                                {balance.toLocaleString()}
                            </div>
                        </div>

                        {/* Agent list */}
                        <div className="px-3 py-2 space-y-1.5 max-h-[280px] overflow-y-auto">
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-1 mb-2">Pick an agent</div>
                            {players.map(agent => {
                                const odds = computeOdds(agent.confidence);
                                const drift = oddsDrift[agent.id] ?? 0;
                                const isSelected = selectedAgent?.id === agent.id;

                                return (
                                    <motion.button
                                        key={agent.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={betPlaced}
                                        onClick={() => setSelectedAgent(isSelected ? null : agent)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                                        style={{
                                            background: isSelected
                                                ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.15))'
                                                : 'rgba(255,255,255,0.03)',
                                            border: isSelected
                                                ? '1px solid rgba(124,58,237,0.6)'
                                                : '1px solid rgba(255,255,255,0.06)',
                                            boxShadow: isSelected ? '0 0 12px rgba(124,58,237,0.2)' : 'none',
                                            cursor: betPlaced ? 'not-allowed' : 'pointer',
                                            opacity: betPlaced && !isSelected ? 0.45 : 1,
                                        }}
                                    >
                                        {/* Avatar */}
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0"
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            {agent.avatarUrl || '🤖'}
                                        </div>

                                        {/* Name + drift */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white text-xs font-bold truncate">{agent.name}</div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <div
                                                    className="h-1 rounded-full flex-1 max-w-[60px] overflow-hidden"
                                                    style={{ background: 'rgba(255,255,255,0.08)' }}
                                                >
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${(agent.confidence || 0.5) * 100}%`,
                                                            background: (agent.confidence || 0.5) > 0.6
                                                                ? '#10b981'
                                                                : (agent.confidence || 0.5) > 0.35
                                                                    ? '#f59e0b'
                                                                    : '#f87171',
                                                        }}
                                                    />
                                                </div>
                                                <OddsArrow delta={drift} />
                                            </div>
                                        </div>

                                        {/* Odds */}
                                        <div className="text-right shrink-0">
                                            <div
                                                className="text-sm font-black"
                                                style={{ color: isSelected ? '#a78bfa' : '#e2e8f0' }}
                                            >
                                                {formatOdds(odds)}
                                            </div>
                                            <div className="text-[9px] text-gray-500">payout</div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Bet amount selector */}
                        <AnimatePresence>
                            {selectedAgent && !betPlaced && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-3 pb-3 overflow-hidden"
                                >
                                    <div className="border-t border-white/6 pt-3">
                                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Bet amount</div>

                                        {/* Quick chips */}
                                        <div className="flex gap-1.5 mb-2">
                                            {CHIP_AMOUNTS.map(amt => (
                                                <button
                                                    key={amt}
                                                    onClick={() => { setBetAmount(amt); setCustomAmount(''); }}
                                                    className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                                    style={{
                                                        background: betAmount === amt && !customAmount
                                                            ? 'linear-gradient(135deg,#7c3aed,#4f46e5)'
                                                            : 'rgba(255,255,255,0.05)',
                                                        border: betAmount === amt && !customAmount
                                                            ? '1px solid rgba(124,58,237,0.6)'
                                                            : '1px solid rgba(255,255,255,0.08)',
                                                        color: betAmount === amt && !customAmount ? 'white' : '#9ca3af',
                                                    }}
                                                >
                                                    {amt >= 1000 ? `${amt / 1000}k` : amt}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Custom input */}
                                        <input
                                            type="number"
                                            placeholder="Custom amount…"
                                            value={customAmount}
                                            onChange={e => { setCustomAmount(e.target.value); setBetAmount(0); }}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-purple-500/60 placeholder:text-gray-600 mb-3 transition-colors"
                                        />

                                        {/* Payout preview */}
                                        <div
                                            className="flex justify-between items-center px-3 py-2 rounded-lg mb-3"
                                            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
                                        >
                                            <span className="text-gray-400 text-[10px]">Potential return</span>
                                            <span className="text-emerald-400 font-black text-sm">
                                                {Math.round(finalBet * computeOdds(selectedAgent.confidence)).toLocaleString()} chips
                                            </span>
                                        </div>

                                        {/* Confirm button */}
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handlePlaceBet}
                                            disabled={finalBet <= 0 || finalBet > balance}
                                            className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all"
                                            style={{
                                                background: finalBet > 0 && finalBet <= balance
                                                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                                    : 'rgba(255,255,255,0.07)',
                                                boxShadow: finalBet > 0 && finalBet <= balance
                                                    ? '0 4px 20px rgba(245,158,11,0.35)'
                                                    : 'none',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                cursor: finalBet <= 0 || finalBet > balance ? 'not-allowed' : 'pointer',
                                                opacity: finalBet <= 0 || finalBet > balance ? 0.5 : 1,
                                            }}
                                        >
                                            🎰 Lock In Bet — {finalBet.toLocaleString()} chips
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Bet placed state */}
                        <AnimatePresence>
                            {betPlaced && selectedAgent && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="px-4 pb-4 pt-1"
                                >
                                    <div
                                        className="rounded-xl p-3 flex flex-col items-center gap-2 text-center"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(16,185,129,0.08))',
                                            border: '1px solid rgba(124,58,237,0.4)',
                                        }}
                                    >
                                        <div className="text-2xl">{selectedAgent.avatarUrl || '🤖'}</div>
                                        <div>
                                            <div className="text-white font-black text-sm">{selectedAgent.name}</div>
                                            <div className="text-emerald-400 text-[10px] font-bold mt-0.5">
                                                ✓ Bet locked — {finalBet.toLocaleString()} chips
                                            </div>
                                            <div className="text-gray-400 text-[10px] mt-1">
                                                Return if wins: <span className="text-amber-400 font-bold">{Math.round(finalBet * computeOdds(selectedAgent.confidence)).toLocaleString()}</span> chips
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleReset}
                                            className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors underline"
                                        >
                                            Cancel bet
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key="toast"
                        initial={{ y: -60, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -60, opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-bold text-white pointer-events-none shadow-2xl"
                        style={{
                            background: toast.type === 'success'
                                ? 'linear-gradient(135deg,rgba(16,185,129,0.95),rgba(5,150,105,0.95))'
                                : 'linear-gradient(135deg,rgba(239,68,68,0.95),rgba(185,28,28,0.95))',
                            border: '1px solid rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SpectatorBetting;
