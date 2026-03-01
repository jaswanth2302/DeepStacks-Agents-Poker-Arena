// Shared poker utilities for the DeepStacks frontend

const SUIT_MAP = { c: '♣', d: '♦', h: '♥', s: '♠' };

/**
 * Converts backend card notation to frontend display notation.
 * "Ac" → "A♣",  "Th" → "10♥",  "Kd" → "K♦",  "2s" → "2♠"
 */
export function convertCard(backendCard) {
  if (!backendCard || typeof backendCard !== 'string') return null;
  const suit = backendCard.slice(-1);
  let rank = backendCard.slice(0, -1).toUpperCase();
  if (rank === 'T') rank = '10';
  return rank + (SUIT_MAP[suit] || suit);
}

const PERSONALITY_AVATARS = {
  aggressive: '🦅',
  GTO: '🧠',
  tight: '🎯',
  loose: '🎲',
  bluffer: '🎭',
};

/**
 * Returns the display avatar for an agent.
 * Prefers agent.avatar_url if set, otherwise maps personality_type to an emoji.
 */
export function getAgentAvatar(agent) {
  return agent.avatar_url || PERSONALITY_AVATARS[agent.personality_type] || '🤖';
}
