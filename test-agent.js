import 'dotenv/config'; // Make sure you run this from the project root or have dotenv installed locally if run separately
import { createClient } from '@supabase/supabase-js';
import { fetch } from 'undici';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AGENT_NAME = `DeepStackBot_${Math.floor(Math.random() * 1000)}`;
let apiToken = null;
let agentId = null;

// State Memory
let myHoleCards = [];
let currentGameSession = null;

async function register() {
    console.log(`[AGENT] Attempting to register as ${AGENT_NAME}...`);
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/register-agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_name: AGENT_NAME, owner: 'Human Tester' })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(`[AGENT] Registration Error:`, result);
            process.exit(1);
        }

        apiToken = result.agent.api_token;
        agentId = result.agent.id;
        console.log(`[AGENT] Registered successfully! Token: ${apiToken} | ID: ${agentId}`);

        // Connect to Realtime after registering
        setupRealtime();
    } catch (e) {
        console.error(`[AGENT] Failed to connect:`, e);
    }
}

function evaluateHand(holeCards, boardCards) {
    if (!holeCards || holeCards.length < 2) return 0;

    // Very simple poker heuristic to simulate LLM thinking
    const ranks = "23456789TJQKA";
    let score = 0;

    try {
        const r1 = ranks.indexOf(holeCards[0][0]);
        const r2 = ranks.indexOf(holeCards[1][0]);

        // Value High cards
        score += (r1 + r2);

        // Pocket pair is very strong
        if (r1 === r2) score += 30;

        // Suited cards
        if (holeCards[0][1] === holeCards[1][1]) score += 10;

        // Did we pair the board?
        if (boardCards && boardCards.length > 0) {
            const boardRanks = boardCards.map(c => ranks.indexOf(c[0]));
            if (boardRanks.includes(r1) || boardRanks.includes(r2)) {
                score += 25; // pairing the board is nice
            }
        }
    } catch (e) { }

    return score;
}

async function act(session) {
    console.log(`\n==============================================`);
    console.log(`[AGENT] It's my turn in game: ${session.id}`);
    console.log(`[AGENT] Board: [${session.board_cards.join(', ')}] | Pot: $${session.pot_amount}`);
    console.log(`[AGENT] Hole Cards: [${myHoleCards.join(', ')}]`);
    console.log(`[AGENT] Synthesizing decision strategy...`);

    // Simulate AI token generation / thinking time
    await new Promise(resolve => setTimeout(resolve, 2500));

    let action = 'fold';
    let amount = 0;
    let thought = "I have terrible cards and the board is scary. Folding.";

    const handStrength = evaluateHand(myHoleCards, session.board_cards);
    console.log(`[AGENT-INTERNAL] Hand Heuristic Score: ${handStrength}/100`);

    if (handStrength >= 40) {
        action = 'raise';
        amount = 300;
        thought = `My hand strength is very high (${handStrength}). I either have a premium rank or hit the board. Raising to build the pot.`;
    } else if (handStrength >= 20) {
        action = 'call';
        amount = 0; // Server will automatically calculate the call amount when 0 is passed
        thought = `My hand is mediocre (${handStrength}). Might be a weak pair or high cards. Calling to see the next street.`;
    } else {
        if (session.board_cards.length >= 3) {
            action = 'fold';
            thought = `I completely missed the flop and have junk cards. Folding is the safe play.`;
        } else {
            action = 'call';
            thought = `Preflop with junk cards, but I will loosely call just to see the flop for testing purposes.`;
        }
    }

    console.log(`[AGENT] Decided to: ${action.toUpperCase()} | Reason: ${thought}`);
    console.log(`==============================================\n`);

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`
            },
            body: JSON.stringify({
                action,
                amount,
                thought_process: thought,
                game_id: session.id
            })
        });

        const result = await response.json();
        if (!result.success) {
            console.error(`[AGENT] Action rejected:`, result);
        }
    } catch (e) {
        console.error(`[AGENT] Failed to submit action:`, e);
    }
}

function setupRealtime() {
    console.log(`[AGENT] Listening for game state changes on WebSockets...`);

    supabase
        .channel('agent_listener')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
                // Route the events ourselves since chaining .on() fails on some supabase-js versions
                if (payload.table === 'game_sessions' && payload.eventType === 'UPDATE') {
                    const session = payload.new;
                    currentGameSession = session;

                    if (session.status === 'waiting_for_action' && session.current_turn_agent_id === agentId) {
                        act(session);
                    }
                }

                if (payload.table === 'game_logs' && payload.eventType === 'INSERT') {
                    const log = payload.new;

                    // Agents secretly receive their dealt cards here!
                    if (log.action === 'deal' && log.agent_id === agentId) {
                        try {
                            myHoleCards = JSON.parse(log.thought_process);
                            console.log(`[SECRET] I was just dealt hole cards: [${myHoleCards.join(', ')}]`);
                        } catch (e) { }
                    }
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log("[AGENT] Connected to WebSockets successfully. Awaiting table start...");
            }
        });
}

// Start
register();
