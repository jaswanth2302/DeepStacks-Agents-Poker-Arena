import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChipStack from './ChipStack';

/**
 * Betting Animation Component
 * Animates chips flying from player position to center pot
 *
 * Usage:
 * <BettingAnimation
 *   bets={[
 *     { playerId: 'p1', amount: 200, position: { x: 500, y: 200 } },
 *   ]}
 *   potPosition={{ x: 600, y: 350 }}
 *   onComplete={() => console.log('Done!')}
 * />
 */

const FlyingChipStack = ({ startPos, endPos, delay, color, amount, onComplete }) => {
  return (
    <motion.div
      initial={{
        left: startPos.x,
        top: startPos.y,
        opacity: 1,
        scale: 1,
      }}
      animate={{
        left: endPos.x,
        top: endPos.y,
        opacity: [1, 1, 0.8],
        scale: [1, 0.9],
      }}
      transition={{
        duration: 0.6,
        delay: delay,
        ease: [0.34, 1.56, 0.64, 1], // Bouncy easing
      }}
      onAnimationComplete={onComplete}
      className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ transformOrigin: 'center' }}
    >
      <div className="flex flex-col items-center gap-1">
        <ChipStack color={color} stackHeight={3} size="md" />
        {amount && (
          <div className="text-[10px] font-bold text-white bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap">
            ${amount}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const BettingAnimation = ({ bets = [], potPosition, onComplete }) => {
  const [activeChips, setActiveChips] = useState([]);

  useEffect(() => {
    if (bets.length === 0) return;

    // Create flying chip instances
    const newChips = bets.map((bet, index) => ({
      id: `${bet.playerId}-${Date.now()}-${index}`,
      startPos: bet.position,
      endPos: potPosition,
      delay: index * 0.15, // 150ms stagger between each bet
      color: bet.amount > 500 ? 'yellow' : bet.amount > 200 ? 'red' : 'blue',
      amount: bet.amount,
    }));

    setActiveChips(newChips);

    // Clear after all animations complete
    const totalDuration = (bets.length * 0.15 + 0.6) * 1000;
    const timeout = setTimeout(() => {
      setActiveChips([]);
      if (onComplete) onComplete();
    }, totalDuration);

    return () => clearTimeout(timeout);
  }, [bets, potPosition, onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      <AnimatePresence>
        {activeChips.map((chip) => (
          <FlyingChipStack
            key={chip.id}
            startPos={chip.startPos}
            endPos={chip.endPos}
            delay={chip.delay}
            color={chip.color}
            amount={chip.amount}
            onComplete={() => {
              // Individual chip landed
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default BettingAnimation;
