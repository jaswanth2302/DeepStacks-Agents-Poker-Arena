import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import pokersolver from 'pokersolver';
const Hand = pokersolver.Hand;

// ── Serve the built React frontend ──────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, '../dist')));
// SPA fallback — every unknown route returns index.html
app.use((_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});
app.listen(PORT, () => console.log(`🎰 DeepStacks server running on port ${PORT}`));
// ────────────────────────────────────────────────────────────────────────────



// For this prototype, we're using the anon key (bypassing RLS or relying on it being open).
// In production, use the SERVICE_ROLE key for backend scripts.
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gajymnburprwxtlvuuxd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gxmaBTR4tnyUMU_RxAycAg_hxzcQfzG';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Game Engine Variables ---
let gameState = {
    sessionId: null,
    status: 'lobby', // lobby -> playing -> showdown -> lobby
    pot: 0,
    boardCards: [],
    deck: [],
    players: [], // { id, name, stack, currentBet, holeCards, status (active/folded) }
    currentTurnIndex: 0,
    currentBetMax: 0,
};

// Standard 52 card deck setup
const suits = ['c', 'd', 'h', 's'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

function createDeck() {
    let deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(`${rank}${suit}`);
        }
    }
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// --- Supabase Helpers ---

async function fetchAgents() {
    // We fetch a few non-human agents to play
    const { data, error } = await supabase
        .from('agents')
        .select('*')
        .limit(6);

    if (error) {
        console.error("Error fetching agents:", error);
        return [];
    }
    return data;
}

async function initializeGameSession(playersCount) {
    if (playersCount < 2) return null;

    // Create a new session in DB
    const { data, error } = await supabase
        .from('game_sessions')
        .insert([{ status: 'playing', pot_amount: 0, board_cards: [] }])
        .select()
        .single();

    if (error) {
        console.error("Error creating session:", error);
        return null;
    }
    return data.id;
}

async function updateDbSession() {
    if (!gameState.sessionId) return;

    // Only write public info to the DB
    await supabase
        .from('game_sessions')
        .update({
            pot_amount: gameState.pot,
            board_cards: gameState.boardCards,
            current_turn_agent_id: gameState.players[gameState.currentTurnIndex]?.id || null,
            status: gameState.status
        })
        .eq('id', gameState.sessionId);
}

async function writeActionLog(agentId, action, amount, thoughtProcess, confidenceScore) {
    if (!gameState.sessionId) return;
    await supabase
        .from('game_logs')
        .insert([{
            game_id: gameState.sessionId,
            agent_id: agentId,
            action: action,
            amount: amount,
            thought_process: thoughtProcess,
            confidence_score: confidenceScore
        }]);
}

// --- Engine Loop Functions ---

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startNewHand() {
    console.log("=== STARTING NEW HAND ===");
    const agents = await fetchAgents();
    if (agents.length < 2) {
        console.log("Not enough agents in DB. Waiting...");
        await sleep(5000);
        return startNewHand();
    }

    gameState.sessionId = await initializeGameSession(agents.length);
    gameState.status = 'playing';
    gameState.deck = createDeck();
    gameState.pot = 0;
    gameState.boardCards = [];
    gameState.currentBetMax = 0;

    // Seat players
    gameState.players = agents.map(a => ({
        id: a.id,
        name: a.name,
        stack: a.balance || 10000,
        currentBet: 0,
        status: 'active',
        holeCards: [gameState.deck.pop(), gameState.deck.pop()]
    }));

    // Post small blind & big blind (simplified for prototype)
    const sb = gameState.players[0];
    const bb = gameState.players[1];

    sb.stack -= 50;
    sb.currentBet = 50;
    bb.stack -= 100;
    bb.currentBet = 100;
    gameState.pot += 150;
    gameState.currentBetMax = 100;

    await writeActionLog(sb.id, 'small_blind', 50, '[SYSTEM] Forced small blind', 1.0);
    await writeActionLog(bb.id, 'big_blind', 100, '[SYSTEM] Forced big blind', 1.0);

    gameState.currentTurnIndex = (gameState.players.length > 2) ? 2 : 0;
    await updateDbSession();

    console.log(`Dealt cards to ${gameState.players.length} agents. SB: 50, BB: 100.`);
}

async function handleAITurn() {
    const activeRoundPlayers = gameState.players.filter(p => p.status === 'active');

    // If only 1 player left active, they win early
    if (activeRoundPlayers.length === 1) {
        await handleShowdown(true);
        return;
    }

    // Check if betting round is over (everyone has called or folded)
    const allCalled = activeRoundPlayers.every(p => p.currentBet === gameState.currentBetMax);
    if (allCalled) {
        await advanceBettingRound();
        return;
    }

    const player = gameState.players[gameState.currentTurnIndex];
    if (player.status !== 'active' || player.currentBet === gameState.currentBetMax) {
        // Skip players who folded or already called the max bet
        await advanceTurnIndex();
        return;
    }

    // --- The "Brain" ---
    // In a real product, an LLM or ML model is invoked. Here we use heuristics.
    console.log(`-> It is ${player.name}'s turn...`);
    await sleep(2000); // Artificial LLM thinking delay

    const toCall = gameState.currentBetMax - player.currentBet;
    let action = 'fold';
    let amount = 0;
    let thought = '';
    const confidence = Math.random().toFixed(2);

    const rand = Math.random();

    if (toCall === 0) {
        // Can check
        if (rand > 0.8) {
            action = 'raise';
            amount = 200;
            thought = `Board is looking decent. Pot odds dictate a value raise. Executing 200 compute credits.`;
        } else {
            action = 'check';
            thought = `No bet to call. Checking to see free cards. EV neutral.`;
        }
    } else {
        if (rand < 0.2) {
            action = 'fold';
            thought = `Opponent pressure too high relative to hand strength. Folding to preserve stack.`;
        } else if (rand < 0.8) {
            action = 'call';
            amount = Math.min(toCall, player.stack);
            thought = `Calling ${amount} credits to stick around. Pot odds are acceptable.`;
        } else {
            action = 'raise';
            amount = toCall + 300;
            thought = `Detecting weakness. Over-betting ${amount} to apply pressure and steal blinds.`;
        }
    }

    // Apply action
    if (action === 'fold') {
        player.status = 'folded';
    } else {
        const actualBet = Math.min(amount, player.stack);
        player.stack -= actualBet;
        player.currentBet += actualBet;
        gameState.pot += actualBet;
        if (player.currentBet > gameState.currentBetMax) {
            gameState.currentBetMax = player.currentBet;
        }
    }

    console.log(`Action: ${player.name} ${action} ${amount}`);
    await writeActionLog(player.id, action, amount, thought, confidence);
    await advanceTurnIndex();
}

async function advanceTurnIndex() {
    gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.players.length;
    await updateDbSession();
}

async function advanceBettingRound() {
    console.log("--- Advancing Betting Round ---");
    const activeCount = gameState.players.filter(p => p.status === 'active').length;

    // Reset individual round bets
    for (let p of gameState.players) p.currentBet = 0;
    gameState.currentBetMax = 0;
    gameState.currentTurnIndex = gameState.players.findIndex(p => p.status === 'active'); // First active player acts first

    if (gameState.boardCards.length === 0) {
        // Flop
        gameState.deck.pop(); // Burn
        gameState.boardCards.push(gameState.deck.pop(), gameState.deck.pop(), gameState.deck.pop());
    } else if (gameState.boardCards.length === 3) {
        // Turn
        gameState.deck.pop();
        gameState.boardCards.push(gameState.deck.pop());
    } else if (gameState.boardCards.length === 4) {
        // River
        gameState.deck.pop();
        gameState.boardCards.push(gameState.deck.pop());
    } else {
        // Showdown
        await handleShowdown(false);
        return;
    }

    await updateDbSession();
    await sleep(1500); // Deal transition delay
}

async function handleShowdown(earlyWin) {
    console.log("=== SHOWDOWN ===");
    gameState.status = 'showdown';
    await updateDbSession();

    const activePlayers = gameState.players.filter(p => p.status === 'active');

    let winnerId = activePlayers[0]?.id;
    let winningHandName = "Default Win";

    if (!earlyWin && activePlayers.length > 1) {
        // Use pokersolver
        let hands = activePlayers.map(p => {
            const handCards = [...p.holeCards, ...gameState.boardCards];
            const solved = Hand.solve(handCards);
            solved.agentId = p.id;
            solved.agentName = p.name;
            return solved;
        });

        const winners = Hand.winners(hands);
        winnerId = winners[0].agentId;
        winningHandName = winners[0].name;
    }

    // Award pot
    console.log(`Winner identified: ID ${winnerId} with ${winningHandName}`);
    await writeActionLog(winnerId, 'win', gameState.pot, `Won the pot of ${gameState.pot} with ${winningHandName}`, 1.0);

    await sleep(4000); // Let spectators read the conclusion

    // Start next loop
    await startNewHand();
}

async function engineLoop() {
    console.log("DeepStacks Autonomous Game Engine Booting...");

    // Inject at least two dummy agents if DB is totally empty, handling new empty databases.
    const agents = await fetchAgents();
    if (agents.length === 0) {
        console.log("No agents found in DB. Seeding defaults...");
        await supabase.from('agents').insert([
            { name: 'AlphaBot-7', personality_type: 'aggressive' },
            { name: 'DeepStack_v2', personality_type: 'GTO' },
            { name: 'NeuralBluff', personality_type: 'loose' },
            { name: 'GTO_Master', personality_type: 'tight' }
        ]);
        await sleep(2000);
    }

    await startNewHand();

    while (true) {
        if (gameState.status === 'playing') {
            await handleAITurn();
        } else {
            await sleep(1000); // Idle if in lobby/showdown
        }
    }
}

engineLoop().catch(console.error);
