import React from 'react';

/**
 * Individual Chip Stack Component
 * Renders a stack of poker chips with proper colors
 */
const CHIP_COLORS = {
  black: {
    bg: 'bg-slate-800',
    border: 'border-slate-600',
    shadow: '#0f172a',
  },
  red: {
    bg: 'bg-red-600',
    border: 'border-red-500',
    shadow: '#7f1d1d',
  },
  yellow: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-400',
    shadow: '#92400e',
  },
  green: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-400',
    shadow: '#065f46',
  },
  blue: {
    bg: 'bg-blue-500',
    border: 'border-blue-400',
    shadow: '#1e40af',
  },
};

const ChipStack = ({
  color = 'red',
  stackHeight = 3,
  size = 'sm'
}) => {
  const chipColor = CHIP_COLORS[color] || CHIP_COLORS.red;
  const chipSize = size === 'lg' ? 'w-6 h-3' : size === 'md' ? 'w-5 h-2.5' : 'w-5 h-2';
  const spacing = size === 'lg' ? 4 : 3;

  const chipWidth = size === 'lg' ? 24 : size === 'md' ? 20 : 20; // w-6=24px, w-5=20px

  return (
    <div
      className="relative inline-block"
      style={{
        height: `${stackHeight * spacing + 8}px`,
        width: `${chipWidth}px` // Explicit width to prevent overlap
      }}
    >
      {[...Array(stackHeight)].map((_, i) => (
        <div
          key={i}
          className={`absolute ${chipSize} ${chipColor.bg} rounded-full border ${chipColor.border}`}
          style={{
            bottom: `${i * spacing}px`,
            left: 0,
            zIndex: i,
            boxShadow: `0 2px 0 ${chipColor.shadow}`,
          }}
        />
      ))}
    </div>
  );
};

export default ChipStack;
