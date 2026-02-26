import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity } from 'lucide-react';
import PlayingCard from './PlayingCard';

const AgentCard = ({ agent, active, positionIndex, isFocused }) => {

    // Position 3 is the Hero (bottom center)
    const isHero = positionIndex === 3;

    return (
        <div className={`relative flex flex-col items-center justify-center w-36 ${isHero ? 'scale-[1.15]' : ''}`}>

            {/* Fanned Cards (Behind avatar) */}
            <div className="absolute top-[-30px] w-full flex justify-center items-end z-0">
                {isHero ? (
                    // Hero Cards (Face up) — uses agent.holeCards if available
                    <div className="relative w-full flex justify-center">
                        <motion.div
                            initial={{ rotateZ: -10, x: 5, y: 10 }}
                            animate={{ rotateZ: -12, x: 8, y: 5 }}
                            className="absolute -left-1"
                        >
                            <PlayingCard card={agent.holeCards?.[0] || '5♦'} width={45} height={65} animate={false} />
                        </motion.div>
                        <motion.div
                            initial={{ rotateZ: 10, x: -5, y: 10 }}
                            animate={{ rotateZ: 12, x: -8, y: 5 }}
                            className="absolute -right-1"
                        >
                            <PlayingCard card={agent.holeCards?.[1] || '5♦'} width={45} height={65} animate={false} />
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

            {/* Avatar Circle */}
            <div className="relative z-10 w-[72px] h-[72px] rounded-full border-2 border-[#111] shadow-[0_5px_15px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#253238] to-[#102027] flex items-center justify-center text-4xl mb-6">

                {/* Active glow ring */}
                {active && (
                    <div className="absolute inset-[-4px] rounded-full border-[3px] border-[#4ade80] animate-pulse shadow-[0_0_15px_#4ade80]" />
                )}

                <span className="drop-shadow-md">{agent.avatarUrl}</span>

                {/* Top decorative chip badge (185$) */}
                {isHero && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-md border border-gray-200">
                        <div className="w-3 h-3 rounded-full bg-red-600 border border-white shrink-0 relative flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full border border-white/50" />
                        </div>
                        <span className="text-[9px] font-bold text-black leading-none pt-[1px] pr-0.5">185$</span>
                    </div>
                )}
            </div>

            {/* Nameplate & Stack Box */}
            <div className="absolute bottom-0 w-full flex flex-col items-center justify-end z-20 translate-y-4">

                {/* Nameplate row */}
                <div className="relative w-[85%] h-6 bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] rounded text-white flex items-center justify-center shadow-lg border-t border-white/20">

                    {/* Left Flag Circle */}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-md border border-gray-300 overflow-hidden flex">
                        <div className="w-1/3 h-full bg-blue-700" />
                        <div className="w-1/3 h-full bg-white" />
                        <div className="w-1/3 h-full bg-red-600" />
                    </div>

                    {/* Name */}
                    <span className="text-[11px] font-bold truncate px-6 capitalize">
                        {agent.name.length > 9 ? agent.name.substring(0, 8) + '..' : agent.name}
                    </span>

                    {/* Right dark circle number */}
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#111] shadow-md border border-[#333] flex items-center justify-center">
                        <span className="text-[9px] font-bold text-gray-300">29</span>
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
