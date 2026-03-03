import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Turn Indicator with Countdown Timer
 * Shows whose turn it is and how much time they have left
 */
const TurnIndicator = ({ playerName, timeLimit = 30, visible }) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    if (!visible) {
      setTimeLeft(timeLimit);
      return;
    }

    // Reset timer when new turn starts
    setTimeLeft(timeLimit);

    // Countdown every second
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, timeLimit, playerName]);

  if (!visible) return null;

  const percentage = (timeLeft / timeLimit) * 100;
  const isUrgent = timeLeft <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20 flex items-center gap-4">
        {/* Player name */}
        <div className="text-white font-bold text-sm">
          {playerName || 'Unknown'} is thinking...
        </div>

        {/* Countdown timer */}
        <div className="flex items-center gap-2">
          {/* Circular progress */}
          <div className="relative w-8 h-8">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke={isUrgent ? '#ef4444' : '#10b981'}
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 14}`}
                strokeDashoffset={`${2 * Math.PI * 14 * (1 - percentage / 100)}`}
                className="transition-all duration-1000 linear"
              />
            </svg>
            <div
              className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                isUrgent ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {timeLeft}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TurnIndicator;
