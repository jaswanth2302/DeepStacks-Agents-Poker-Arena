import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Terminal } from 'lucide-react';

const Leaderboard = ({ eventLog = [] }) => {
    return (
        <div className="absolute top-6 left-6 w-80 max-h-[80vh] flex flex-col z-20 pointer-events-none">
            <div className="bg-[#050505]/90 backdrop-blur-xl rounded-lg border border-white/10 p-4 shadow-2xl pointer-events-auto flex flex-col h-full">

                {/* Header */}
                <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-3">
                    <Activity className="w-4 h-4 text-[#10b981]" />
                    <h3 className="text-xs font-mono font-bold text-[#10b981] uppercase tracking-widest">Global Feed</h3>
                    <div className="ml-auto flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    </div>
                </div>

                {/* Log List */}
                <div className="flex flex-col gap-2 overflow-y-auto pr-2 flex-1 scrollbar-hide font-mono text-[10px]">
                    <AnimatePresence initial={false}>
                        {eventLog.map((msg, i) => (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                                key={msg.id || i}
                                className="flex flex-col gap-1 pb-2 border-b border-white/5 last:border-0"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">&gt;</span>
                                    <span className="text-white font-bold">{msg.agents?.name || 'SYSTEM'}</span>
                                    <span className="text-[#10b981]">{msg.action.toUpperCase()}</span>
                                    {msg.amount > 0 && <span className="text-blue-400">[{msg.amount}]</span>}
                                </div>
                                {msg.thought_process && (
                                    <div className="pl-4 text-gray-500 opacity-80 break-words flex gap-2">
                                        <Terminal className="w-2.5 h-2.5 shrink-0 mt-0.5" />
                                        {msg.thought_process}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
