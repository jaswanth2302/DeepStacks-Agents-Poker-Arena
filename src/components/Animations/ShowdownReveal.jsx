import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlayingCard from '../PlayingCard';

/**
 * Showdown Reveal Component - Minimal & Sharp Design
 *
 * Flow (5.5 seconds total):
 * 0.0s: All players' hole cards flip face-up simultaneously (handled by AgentCard)
 * 0.1s: Winner's 5 best cards start flying to center (1.0s smooth animation)
 * 1.5s: Cards settled in center, win text appears
 * 1.5s - 5.5s: HOLD final display (4 full seconds for everyone to read)
 * 5.5s: Fade out, new round starts (AI agents can proceed)
 */
const ShowdownReveal = ({
  players = [],
  winner,
  winningHandName,
  winningCards = [],
  communityCards = [],
  potAmount,
  onComplete,
  playerPositions = {}
}) => {
  const [phase, setPhase] = useState('flip'); // flip → highlight → fly → display → complete
  const [flyingCards, setFlyingCards] = useState([]);
  const currentWinnerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const winningCardsRef = useRef(winningCards);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    winningCardsRef.current = winningCards;
  });

  // Calculate which cards to fly (winner's best 5)
  useEffect(() => {
    if (!winner) {
      console.log('[ShowdownReveal] No winner, resetting');
      setPhase('flip');
      setFlyingCards([]);
      currentWinnerRef.current = null;
      return;
    }

    // If winner changed, reset and start fresh
    if (currentWinnerRef.current !== winner) {
      console.log('[ShowdownReveal] New winner detected, resetting:', winner);
      currentWinnerRef.current = winner;
      setPhase('flip');
      setFlyingCards([]);

      console.log('[ShowdownReveal] Starting showdown for', winner);

      // Phase timing:
      // 0.0s - 1.5s: Animation (cards fly and arrange)
      // 1.5s - 5.5s: Display final result (HOLD for 4 seconds)
      // 5.5s+: Fade out and trigger new round
      const timers = [
        // Phase 1: Cards start flying immediately
        setTimeout(() => {
          console.log('[ShowdownReveal] Phase: fly (cards flying to center)');
          setPhase('fly');

          // Prepare flying cards with their start positions
          const cardsToFly = winningCardsRef.current.slice(0, 5).map((card, index) => ({
            card,
            id: `${card.rank}-${card.suit}-${index}`,
            index
          }));

          setFlyingCards(cardsToFly);
          console.log('[ShowdownReveal] Flying cards:', cardsToFly);
        }, 100), // Start almost immediately

        // Phase 2: Show win message (after cards have settled)
        setTimeout(() => {
          console.log('[ShowdownReveal] Phase: display (HOLDING for 4 seconds)');
          setPhase('display');
        }, 1500), // Cards settled by 1.5s

        // Phase 3: Complete and cleanup (after 4-second hold)
        setTimeout(() => {
          console.log('[ShowdownReveal] Phase: complete (starting new round)');
          setPhase('complete');
          if (onCompleteRef.current) {
            setTimeout(onCompleteRef.current, 500); // Small fade-out buffer
          }
        }, 5500) // 1.5s animation + 4s hold = 5.5s total
      ];

      return () => {
        console.log('[ShowdownReveal] Cleaning up timers');
        timers.forEach(clearTimeout);
      };
    }
  }, [winner]); // ONLY winner as dependency!

  if (!winner) return null;

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <>
          {/* Subtle dark overlay - solid background for sharp cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-black/80 pointer-events-none"
          />

          {/* Flying Cards Animation */}
          {(phase === 'fly' || phase === 'display') && (
            <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none">
              <div className="flex gap-3">
                <AnimatePresence>
                  {flyingCards.map((cardData, idx) => {
                    // Calculate center position for card arrangement
                    const totalWidth = flyingCards.length * 65 + (flyingCards.length - 1) * 12;
                    const startX = Math.round(-totalWidth / 2 + idx * (65 + 12) + 32.5); // Round to whole pixels

                    return (
                      <motion.div
                        key={cardData.id}
                        initial={{
                          x: 0,
                          y: -200, // Start from above (simulating from players/community)
                          opacity: 0,
                          scale: 0.6,
                          rotateY: 0
                        }}
                        animate={{
                          x: startX,
                          y: 0,
                          opacity: 1,
                          scale: 1,
                          rotateY: 0
                        }}
                        exit={{
                          y: 100,
                          opacity: 0,
                          scale: 0.8
                        }}
                        transition={{
                          duration: 1.0, // Slow smooth flight
                          delay: idx * 0.08, // Slight stagger
                          ease: [0.25, 0.46, 0.45, 0.94], // Smooth consistent bezier curve for all properties
                        }}
                        className="absolute shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                        style={{
                          willChange: 'transform, opacity', // Optimize rendering
                          backfaceVisibility: 'hidden', // Smoother animation
                        }}
                      >
                        <PlayingCard
                          card={cardData.card}
                          width={65}
                          height={95}
                          animate={false}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Win Message - appears after cards settle */}
              <AnimatePresence>
                {phase === 'display' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: -140 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="absolute text-center pointer-events-none"
                  >
                    <div
                      className="text-white text-lg font-bold tracking-wide"
                      style={{
                        textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)'
                      }}
                    >
                      {winner} wins ${potAmount?.toLocaleString()} with {winningHandName?.toUpperCase()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default ShowdownReveal;
