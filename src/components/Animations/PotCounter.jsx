import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Animated Pot Counter
 * Smoothly animates the pot total when it changes
 */
const PotCounter = ({ amount, className = '' }) => {
  const [displayAmount, setDisplayAmount] = useState(amount);
  const animationRef = useRef(null);

  useEffect(() => {
    const startAmount = displayAmount;
    const endAmount = amount;
    const duration = 600; // 600ms animation
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startAmount + (endAmount - startAmount) * easeProgress;

      setDisplayAmount(Math.round(current));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (startAmount !== endAmount) {
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [amount]);

  return (
    <motion.div
      key={displayAmount}
      animate={{ scale: amount !== displayAmount ? [1, 1.1, 1] : 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <span className="font-mono text-[11px] text-white/60 uppercase tracking-widest">Pot </span>
      <span className="font-mono text-[11px] font-bold text-white">
        ${displayAmount.toLocaleString()}
      </span>
    </motion.div>
  );
};

export default PotCounter;
