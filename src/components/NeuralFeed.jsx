import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, Target } from 'lucide-react';

const NeuralFeed = ({ players = [], currentTurn }) => {

    // Find the active player
    const activePlayer = players.find(p => p.id === currentTurn);

    return (
        <div className="absolute right-6 top-6 w-72 flex flex-col z-20 pointer-events-none">
            <div className="bg-[#050505]/90 backdrop-blur-xl rounded-lg border border-white/10 p-5 shadow-2xl pointer-events-auto">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-blue-400" />
                        <h3 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">Telemetry</h3>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                </div>

                <AnimatePresence mode="wait">
                    {activePlayer ? (
                        <motion.div
                            key={activePlayer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col gap-6"
                        >
                            <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 rounded bg-[#f8312f]/10 border border-[#f8312f]/30 flex items-center justify-center font-bold text-[#f8312f] uppercase text-xs">
                                    {activePlayer.name.substring(0, 2)}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white uppercase tracking-wider">{activePlayer.name}</div>
                                    <div className="text-[10px] font-mono text-gray-500 bg-gray-900 rounded px-1.5 py-0.5 mt-1 border border-white/5 inline-block">
                                        ID: {activePlayer.id.substring(0, 8)}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">

                                {/* Win Probability (using confidence or fake) */}
                                <div>
                                    <div className="flex justify-between text-xs font-mono mb-1">
                                        <span className="text-gray-400 flex items-center gap-1"><Target className="w-3 h-3" /> Win Probability</span>
                                        <span className="text-white font-bold">{Math.floor((activePlayer.confidence || 0.45) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(activePlayer.confidence || 0.45) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Compute Load — reflects whether agent is actively deciding */}
                                {(() => {
                                    const isThinking = activePlayer.id === currentTurn;
                                    const loadLabel = isThinking ? 'ACTIVE' : 'IDLE';
                                    const loadColor = isThinking ? '#f59e0b' : '#6b7280';
                                    const barsFilled = isThinking ? 14 : 4;
                                    return (
                                        <div>
                                            <div className="flex justify-between text-xs font-mono mb-1">
                                                <span className="text-gray-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Compute Load</span>
                                                <span style={{ color: loadColor }} className="font-bold">{loadLabel}</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden flex gap-0.5">
                                                {[...Array(20)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        className="flex-1 rounded-sm"
                                                        style={{ backgroundColor: i < barsFilled ? loadColor : '#1f2937' }}
                                                        animate={isThinking ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
                                                        transition={isThinking ? { duration: 1 + (i % 3) * 0.4, repeat: Infinity } : {}}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                        </motion.div>
                    ) : (
                        <div className="text-center text-xs text-gray-500 font-mono py-8">
                            AWAITING_AGENT_CONNECTION...
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default NeuralFeed;
