import axios from 'axios';

const API_BASE = 'http://localhost:3001';

// 6 different agent personalities with distinct playing styles
const agents = [
  {
    name: 'TightAggressive',
    personality: 'TAG - plays premium hands, bets aggressively',
    handRequirement: 0.75, // Only plays top 25% of hands
    aggression: 0.8, // Very aggressive when playing
    bluffFrequency: 0.15,
    thinkTime: { min: 2000, max: 5000 }
  },
  {
    name: 'LooseAggressive',
    personality: 'LAG - plays many hands, very aggressive',
    handRequirement: 0.45, // Plays 55% of hands
    aggression: 0.85,
    bluffFrequency: 0.35,
    thinkTime: { min: 1000, max: 3000 }
  },
  {
    name: 'TightPassive',
    personality: 'Rock - only plays strong hands, calls mostly',
    handRequirement: 0.85, // Only plays top 15% of hands
    aggression: 0.25,
    bluffFrequency: 0.05,
    thinkTime: { min: 3000, max: 6000 }
  },
  {
    name: 'CallingStation',
    personality: 'Fish - calls everything, rarely folds',
    handRequirement: 0.2, // Plays 80% of hands
    aggression: 0.15,
    bluffFrequency: 0.1,
    thinkTime: { min: 500, max: 2000 }
  },
  {
    name: 'Maniac',
    personality: 'Crazy - raises constantly, unpredictable',
    handRequirement: 0.3, // Plays 70% of hands
    aggression: 0.95,
    bluffFrequency: 0.6,
    thinkTime: { min: 800, max: 2500 }
  },
  {
    name: 'Professional',
    personality: 'Pro - balanced, reads opponents, adapts',
    handRequirement: 0.6, // Plays 40% of hands
    aggression: 0.6,
    bluffFrequency: 0.25,
    thinkTime: { min: 2000, max: 7000 }
  }
];

// Helper: Random delay for realistic timing
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Random number between min and max
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: Weighted random decision
function shouldAct(probability) {
  return Math.random() < probability;
}

// Register all agents
async function registerAgents() {
  console.log('\n=== Registering 6 agents with different personalities ===\n');
  const registered = [];

  for (const agent of agents) {
    try {
      const { data } = await axios.post(`${API_BASE}/register`, {
        agent_name: agent.name
      });
      console.log(`✓ ${agent.name} registered (${agent.personality})`);
      registered.push({ ...agent, id: data.agent_id });
      await sleep(500); // Stagger registrations
    } catch (err) {
      console.error(`✗ Failed to register ${agent.name}:`, err.message);
    }
  }

  return registered;
}

// Join queue for all agents
async function joinQueue(agents) {
  console.log('\n=== Joining 6-max game queue ===\n');

  for (const agent of agents) {
    try {
      await axios.post(`${API_BASE}/queue/join`, { agentId: agent.id });
      console.log(`✓ ${agent.name} joined queue`);
      await sleep(300);
    } catch (err) {
      console.error(`✗ ${agent.name} failed to join:`, err.message);
    }
  }

  console.log('\nWaiting for matchmaking (up to 60s)...\n');
  await sleep(10000); // Wait for game to start
}

// Evaluate hand strength (simplified)
function evaluateHandStrength(holeCards, board) {
  // Simple heuristic: high cards, pairs, potential
  if (!holeCards || holeCards.length !== 2) return 0.3;

  const ranks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  const card1 = holeCards[0];
  const card2 = holeCards[1];

  const rank1 = ranks.indexOf(card1.rank);
  const rank2 = ranks.indexOf(card2.rank);
  const highCard = Math.max(rank1, rank2);
  const lowCard = Math.min(rank1, rank2);

  let strength = 0;

  // Pocket pair
  if (rank1 === rank2) {
    strength = 0.7 + (highCard / 13) * 0.3; // 0.7-1.0 for pairs
  }
  // High cards
  else if (highCard >= 10) { // J or better
    strength = 0.5 + (highCard / 26) + (lowCard / 52);
  }
  // Suited connectors/one-gappers
  else if (card1.suit === card2.suit && Math.abs(rank1 - rank2) <= 2) {
    strength = 0.4 + (highCard / 26);
  }
  // Medium cards
  else {
    strength = 0.2 + ((highCard + lowCard) / 52);
  }

  return Math.min(strength, 1.0);
}

// Decide action based on personality and game state
function decideAction(agent, gameState) {
  const { holeCards, board, pot, toCall, currentBet, stack } = gameState;
  const handStrength = evaluateHandStrength(holeCards, board);

  // Check if hand meets agent's requirements
  const shouldPlay = handStrength >= agent.handRequirement;

  // Preflop: be more selective
  if (!board || board.length === 0) {
    if (!shouldPlay && !shouldAct(agent.bluffFrequency)) {
      return toCall > 0 ? 'fold' : 'check';
    }
  }

  // Can check for free
  if (toCall === 0) {
    // Aggressive players bet more
    if (shouldAct(agent.aggression * 0.6)) {
      const betSize = randomBetween(Math.floor(pot * 0.5), Math.floor(pot * 1.2));
      return { action: 'raise', amount: Math.min(betSize, stack) };
    }
    return 'check';
  }

  // Facing a bet
  const potOdds = toCall / (pot + toCall);

  // Strong hand or bluff
  if (handStrength > 0.7 || shouldAct(agent.bluffFrequency)) {
    if (shouldAct(agent.aggression)) {
      // Raise
      const raiseSize = toCall + randomBetween(Math.floor(pot * 0.5), Math.floor(pot * 1.5));
      return { action: 'raise', amount: Math.min(raiseSize, stack) };
    }
    // Call
    return { action: 'call', amount: toCall };
  }

  // Medium strength
  if (handStrength > agent.handRequirement * 0.8) {
    // Call if pot odds are good or agent is passive
    if (potOdds < 0.4 || agent.aggression < 0.4) {
      return { action: 'call', amount: toCall };
    }
  }

  // Weak hand or bad odds
  return 'fold';
}

// Parse card string "Ah" -> {rank: 'A', suit: 'h'}
function parseCard(cardStr) {
  if (!cardStr || cardStr.length < 2) return null;
  return {
    rank: cardStr[0],
    suit: cardStr[1]
  };
}

// Agent game loop - realistic decision making
async function agentGameLoop(agent) {
  console.log(`[${agent.name}] Starting game loop...`);

  let handCount = 0;
  let gameRunning = true;

  while (gameRunning) {
    try {
      // Poll for game state
      const { data: state } = await axios.get(`${API_BASE}/poll`, {
        params: { agentId: agent.id }
      });

      if (!state || state.status === 'ended') {
        console.log(`[${agent.name}] Game ended`);
        gameRunning = false;
        break;
      }

      // New hand detected
      if (state.hand_number && state.hand_number > handCount) {
        handCount = state.hand_number;
        console.log(`[${agent.name}] Hand #${handCount} started`);
      }

      // Check if it's our turn
      if (state.current_turn === agent.id && state.status === 'waiting_for_action') {
        const holeCards = state.hole_cards ? state.hole_cards.map(parseCard) : [];
        const board = state.board_cards ? state.board_cards.map(parseCard) : [];

        const gameState = {
          holeCards,
          board,
          pot: state.pot_amount || 0,
          toCall: state.to_call || 0,
          currentBet: state.current_bet || 0,
          stack: state.stack || 10000
        };

        // Realistic thinking time
        const thinkTime = randomBetween(agent.thinkTime.min, agent.thinkTime.max);
        await sleep(thinkTime);

        // Decide action
        const decision = decideAction(agent, gameState);

        let action, amount;
        if (typeof decision === 'string') {
          action = decision;
          amount = 0;
        } else {
          action = decision.action;
          amount = decision.amount;
        }

        // Log action
        const street = board.length === 0 ? 'preflop' :
                      board.length === 3 ? 'flop' :
                      board.length === 4 ? 'turn' : 'river';
        const cardsStr = holeCards.map(c => c ? `${c.rank}${c.suit}` : '??').join(' ');
        const boardStr = board.map(c => c ? `${c.rank}${c.suit}` : '??').join(' ') || '-';

        console.log(`[${agent.name}] Hand #${handCount} ${street}: ${action}${amount > 0 ? ' $' + amount : ''} | Cards: ${cardsStr} | Board: ${boardStr}`);

        // Submit action
        await axios.post(`${API_BASE}/action`, {
          agentId: agent.id,
          action,
          amount,
          thought_process: `${agent.personality} - evaluating hand`,
          confidence_score: 0.75
        });

        // Small delay after action
        await sleep(500);
      } else {
        // Not our turn, wait
        await sleep(1000);
      }

      // Check for showdown result
      if (state.last_result) {
        const result = state.last_result;
        if (result.winners) {
          result.winners.forEach(w => {
            if (w.agent_id === agent.id) {
              console.log(`[${agent.name}] Hand #${handCount} result: ${agent.name} ($${w.amount_won})`);
            }
          });
        }
      }

    } catch (err) {
      if (err.response?.status === 404 || err.code === 'ECONNREFUSED') {
        console.log(`[${agent.name}] Disconnected from server`);
        gameRunning = false;
        break;
      }
      // Ignore other errors, continue polling
      await sleep(2000);
    }
  }

  console.log(`[${agent.name}] Exiting game loop`);
}

// Main execution
async function main() {
  console.log('=================================================');
  console.log('    DeepStack 6-Player Realistic Game Test');
  console.log('=================================================\n');

  // Register agents
  const registeredAgents = await registerAgents();

  if (registeredAgents.length < 6) {
    console.error('\n✗ Failed to register all 6 agents. Exiting.');
    process.exit(1);
  }

  // Join queue
  await joinQueue(registeredAgents);

  // Start all agent game loops concurrently
  console.log('=== Starting game loops for all 6 agents ===\n');
  const gameLoops = registeredAgents.map(agent => agentGameLoop(agent));

  // Wait for all to finish (or timeout after 5 minutes)
  await Promise.race([
    Promise.all(gameLoops),
    sleep(300000) // 5 minute timeout
  ]);

  console.log('\n=== Game completed ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
