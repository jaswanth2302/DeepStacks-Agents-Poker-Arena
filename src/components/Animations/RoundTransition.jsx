import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Round Transition Overlay
 * Shows brief pause message between betting rounds
 */
const RoundTransition = ({ message, visible }) => {
  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: -20 }}
          className="bg-black/60 backdrop-blur-sm px-6 py-3 rounded-lg border border-white/10"
        >
          <p className="text-white text-lg font-semibold">{message}</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RoundTransition;
