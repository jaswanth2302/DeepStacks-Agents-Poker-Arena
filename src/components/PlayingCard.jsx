import React from 'react';
import { motion } from 'framer-motion';

// Suit config — color + symbol
const SUIT_CONFIG = {
    '♣': { bg: '#1a5c2e', border: '#2d8a47', label: 'clubs' },
    '♦': { bg: '#1a3a6e', border: '#2a5ab0', label: 'diamonds' },
    '♥': { bg: '#7a1c1c', border: '#b02a2a', label: 'hearts' },
    '♠': { bg: '#111418', border: '#2a2f38', label: 'spades' },
};

/**
 * Parse a card string like "A♠", "10♦", "K♥" into { rank, suit }
 */
const parseCard = (card) => {
    if (!card) return null;
    const suit = ['♣', '♦', '♥', '♠'].find(s => card.includes(s));
    const rank = card.replace(suit, '');
    return { rank, suit };
};

/**
 * FaceCard — the front of a playing card
 * @param {string}  card   - e.g. "A♠", "10♦"
 * @param {number}  width  - px width
 * @param {number}  height - px height
 * @param {boolean} animate - whether to animate in
 */
const PlayingCard = ({ card, width = 65, height = 95, animate = true, delay = 0 }) => {
    const parsed = parseCard(card);

    if (!parsed) {
        // Face-down card (back)
        return (
            <div
                className="rounded-md overflow-hidden flex items-center justify-center"
                style={{ width, height, backgroundColor: '#1a1c29', border: '2px solid white' }}
            >
                <div
                    className="w-[85%] h-[85%] border border-[#ecc94b]"
                    style={{
                        backgroundImage: 'radial-gradient(circle at center, #ecc94b 1px, transparent 1px)',
                        backgroundSize: '4px 4px',
                    }}
                />
            </div>
        );
    }

    const { rank, suit } = parsed;
    const cfg = SUIT_CONFIG[suit] ?? { bg: '#1a1a1a', border: '#333' };

    const Wrapper = animate ? motion.div : 'div';
    const wrapperProps = animate
        ? {
            initial: { opacity: 0, scale: 0.7, rotateY: 180 },
            animate: { opacity: 1, scale: 1, rotateY: 0 },
            transition: { type: 'spring', stiffness: 200, damping: 20, delay },
        }
        : {};

    return (
        <Wrapper
            {...wrapperProps}
            className="relative rounded-md select-none overflow-hidden flex-shrink-0"
            style={{
                width,
                height,
                backgroundColor: cfg.bg,
                border: `1.5px solid ${cfg.border}`,
                boxShadow: `0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)`,
            }}
        >
            {/* Top-left corner */}
            <div
                className="absolute top-1 left-1.5 leading-none text-center"
                style={{ color: 'white', fontSize: Math.round(width * 0.18), fontWeight: 800, lineHeight: 1 }}
            >
                <div>{rank}</div>
                <div style={{ fontSize: Math.round(width * 0.16) }}>{suit}</div>
            </div>

            {/* Center large suit */}
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ color: 'white', fontSize: Math.round(width * 0.48), opacity: 0.92, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
            >
                {suit}
            </div>

            {/* Bottom-right corner (rotated 180°) */}
            <div
                className="absolute bottom-1 right-1.5 leading-none text-center rotate-180"
                style={{ color: 'white', fontSize: Math.round(width * 0.18), fontWeight: 800, lineHeight: 1 }}
            >
                <div>{rank}</div>
                <div style={{ fontSize: Math.round(width * 0.16) }}>{suit}</div>
            </div>
        </Wrapper>
    );
};

export default PlayingCard;
