import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChipStack from './ChipStack';

/**
 * Dynamic Pot Chips Component
 * Calculates and displays chip stacks based on pot amount
 * Uses realistic poker chip denominations
 */

// Chip denominations (highest to lowest for optimal distribution)
const CHIP_VALUES = [
  { value: 100, color: 'black', name: 'Black' },
  { value: 25, color: 'red', name: 'Red' },
  { value: 5, color: 'yellow', name: 'Yellow' },
  { value: 1, color: 'blue', name: 'Blue' },
];

const MAX_CHIPS_PER_STACK = 8; // Visual limit to prevent too-tall stacks

const DynamicPotChips = ({ potAmount = 0 }) => {
  // Calculate chip distribution based on pot amount
  const chipStacks = useMemo(() => {
    if (potAmount === 0) return [];

    let remaining = potAmount;
    const distribution = [];

    // Calculate optimal chip distribution (greedy algorithm)
    for (const chipType of CHIP_VALUES) {
      const count = Math.floor(remaining / chipType.value);
      if (count > 0) {
        distribution.push({
          color: chipType.color,
          count: count,
          value: chipType.value,
        });
        remaining -= count * chipType.value;
      }
    }

    // Break down into visual stacks (max 8 chips per stack)
    const visualStacks = [];
    distribution.forEach((chip) => {
      let remainingChips = chip.count;
      while (remainingChips > 0) {
        const stackSize = Math.min(remainingChips, MAX_CHIPS_PER_STACK);
        visualStacks.push({
          color: chip.color,
          height: stackSize,
          value: chip.value,
        });
        remainingChips -= stackSize;
      }
    });

    return visualStacks;
  }, [potAmount]);

  if (potAmount === 0) {
    return null;
  }

  return (
    <div className="flex gap-1.5 relative translate-y-2 items-end justify-center min-h-[32px]">
      <AnimatePresence mode="popLayout">
        {chipStacks.map((stack, index) => (
          <motion.div
            key={`${stack.color}-${index}`}
            initial={{ scale: 0, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0, y: 20, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: index * 0.03, // Stagger animation
            }}
            className="flex-shrink-0"
          >
            <ChipStack
              color={stack.color}
              stackHeight={stack.height}
              size="sm"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default DynamicPotChips;
