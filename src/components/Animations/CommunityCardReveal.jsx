import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import DealingIndicator from './DealingIndicator';

/**
 * Community Card Reveal System
 * Handles the pacing and "Dealing..." indicators before revealing cards
 *
 * Flow:
 * - Flop: Show "Dealing Flop..." (0.8s) → Reveal cards one-by-one
 * - Turn: Show "Dealing Turn..." (0.6s) → Reveal card
 * - River: Show "Dealing River..." (0.6s) → Reveal card
 *
 * IMPORTANT: Only shows indicators during VALID card reveals, not on count resets
 */
const CommunityCardReveal = ({ previousCount, currentCount, onRevealComplete }) => {
  const [showIndicator, setShowIndicator] = useState(false); // Always false - indicator disabled
  const [indicatorMessage, setIndicatorMessage] = useState('');
  const lastProcessedCount = useRef(previousCount);
  const componentMountTime = useRef(Date.now());

  useEffect(() => {
    // CRITICAL: On initial mount, if previousCount=0 and currentCount>0, cards were already dealt
    // Don't show indicator for pre-existing cards (user joined mid-game or returned from lobby)
    const timeSinceMount = Date.now() - componentMountTime.current;
    if (timeSinceMount < 100 && previousCount === 0 && currentCount > 0) {
      console.log(`[CardReveal] Component just mounted with ${currentCount} existing cards - skipping indicator`);
      lastProcessedCount.current = currentCount;
      if (onRevealComplete) {
        onRevealComplete();
      }
      return;
    }

    // IMPORTANT: If previousCount and currentCount are EQUAL and both > 0, cards are already visible
    // This means the indicator should be hidden (cards were dealt instantly or we're mid-game)
    if (previousCount === currentCount && currentCount > 0 && showIndicator) {
      console.log(`[CardReveal] Cards already visible (${currentCount}), hiding indicator`);
      setShowIndicator(false);
      lastProcessedCount.current = currentCount;
      return;
    }

    // Only process if currentCount increased AND we haven't processed this count yet
    const isValidIncrease = currentCount > previousCount && currentCount > lastProcessedCount.current;

    // Also check that we're in a valid progression (0→3, 3→4, 4→5)
    const isValidProgression =
      (previousCount === 0 && currentCount === 3) ||  // Flop
      (previousCount === 3 && currentCount === 4) ||  // Turn
      (previousCount === 4 && currentCount === 5);    // River

    if (isValidIncrease && isValidProgression) {
      const newCardCount = currentCount - previousCount;

      // Determine which round we're in
      let message = '';
      let delay = 0;

      if (previousCount === 0 && newCardCount === 3) {
        // Flop (3 cards)
        message = 'Dealing Flop...';
        delay = 800; // 0.8 second - disappear quickly once cards show
      } else if (previousCount === 3 && newCardCount === 1) {
        // Turn (1 card)
        message = 'Dealing Turn...';
        delay = 600; // 0.6 second
      } else if (previousCount === 4 && newCardCount === 1) {
        // River (1 card)
        message = 'Dealing River...';
        delay = 600; // 0.6 second
      }

      if (message) {
        console.log(`[CardReveal] Showing "${message}" (prev: ${previousCount}, current: ${currentCount})`);
        lastProcessedCount.current = currentCount;
        setIndicatorMessage(message);
        // setShowIndicator(true); // DISABLED - no dealing indicators

        // Hide indicator after delay, then trigger card reveal
        const timeout = setTimeout(() => {
          console.log(`[CardReveal] Hiding "${message}"`);
          setShowIndicator(false);
          if (onRevealComplete) {
            setTimeout(onRevealComplete, 300); // Small buffer after indicator fades
          }
        }, delay);

        return () => clearTimeout(timeout);
      }
    } else if (isValidIncrease && !isValidProgression) {
      // Invalid progression (e.g., 0→5 or 3→5) - cards dealt all at once
      // Just hide any indicator and update tracking without showing anything
      console.log(`[CardReveal] Invalid progression detected (${previousCount}→${currentCount}), hiding indicator`);
      setShowIndicator(false);
      lastProcessedCount.current = currentCount;
      if (onRevealComplete) {
        onRevealComplete();
      }
    }

    // If currentCount decreased (new hand started), reset our tracking
    if (currentCount < lastProcessedCount.current) {
      console.log(`[CardReveal] Count decreased, resetting (was ${lastProcessedCount.current}, now ${currentCount})`);
      lastProcessedCount.current = currentCount;
      setShowIndicator(false);
    }
  }, [previousCount, currentCount, onRevealComplete, showIndicator]);

  return (
    <AnimatePresence>
      {showIndicator && (
        <DealingIndicator key="dealing-indicator" message={indicatorMessage} visible={showIndicator} />
      )}
    </AnimatePresence>
  );
};

export default CommunityCardReveal;
