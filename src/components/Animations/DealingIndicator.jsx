import React from 'react';
import { motion } from 'framer-motion';

/**
 * Dealing Indicator Overlay
 * Shows "Dealing Flop...", "Dealing Turn...", "Dealing River..." before card reveals
 */
const DealingIndicator = ({ message, visible }) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="absolute top-[52%] left-1/2 -translate-x-1/2 z-40 pointer-events-none"
    >
      <p className="text-white/90 text-sm font-bold tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {message}
      </p>
    </motion.div>
  );
};

export default DealingIndicator;
