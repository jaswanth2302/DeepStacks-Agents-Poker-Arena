import { useMemo } from 'react';

/**
 * Calculate screen positions for players around the table
 * Returns absolute pixel positions for animations
 */
export const usePlayerPositions = (players, spectatedAgentId) => {
  return useMemo(() => {
    if (!players || players.length === 0) return {};

    const spectatedIndex = players.findIndex(p => p.id === spectatedAgentId);
    const offset = spectatedIndex !== -1 ? (3 - spectatedIndex + players.length) % players.length : 0;

    // Oval positions around the table (same as AgentCard positioning)
    const ovalPositions = [
      { x: 0, y: -200 },      // 0 top (moved down to avoid cutoff)
      { x: 360, y: -120 },    // 1 top-right
      { x: 360, y: 120 },     // 2 bottom-right
      { x: 0, y: 240 },       // 3 bottom center (hero)
      { x: -360, y: 120 },    // 4 bottom-left
      { x: -360, y: -120 },   // 5 top-left
    ];

    // Calculate absolute screen positions
    // Table center is roughly at 50% width, 50% height
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 800;
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;

    const positions = {};

    players.forEach((player, index) => {
      const targetPositionIndex = (index + offset) % ovalPositions.length;
      const pos = ovalPositions[targetPositionIndex];

      positions[player.id] = {
        x: centerX + pos.x,
        y: centerY + pos.y,
        seatIndex: targetPositionIndex,
      };
    });

    return positions;
  }, [players, spectatedAgentId]);
};

/**
 * Get center pot position (absolute screen coordinates)
 */
export const getPotPosition = () => {
  const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 800;
  const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;

  return { x: centerX, y: centerY + 50 }; // Slightly below center
};
