import React from 'react';
import { motion } from 'framer-motion';

/**
 * Winner Animation - Floating "+$X" text
 * Shows winnings floating up from winner
 */
const WinnerAnimation = ({ amount, position, visible }) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.8 }}
      animate={{ opacity: [0, 1, 1, 0], y: -60, scale: [0.8, 1.2, 1.2, 1] }}
      transition={{ duration: 2, ease: 'easeOut' }}
      className="absolute z-40 pointer-events-none"
      style={{ left: position?.x, top: position?.y }}
    >
      <div className="text-emerald-400 text-4xl font-black drop-shadow-lg">
        +${amount?.toLocaleString()}
      </div>
    </motion.div>
  );
};

export default WinnerAnimation;
