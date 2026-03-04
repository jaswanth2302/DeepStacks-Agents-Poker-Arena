import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import pokersolver from 'pokersolver';
const Hand = pokersolver.Hand;

// ── Express Setup ────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// ── Supabase ─────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gajymnburprwxtlvuuxd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gxmaBTR4tnyUMU_RxAycAg_hxzcQfzG';
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Deck Utilities ───────────────────────────────────────────────────────────
const suits = ['c', 'd', 'h', 's'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

function createDeck() {
    const deck = [];
    for (const suit of suits)
        for (const rank of ranks)
            deck.push(`${rank}${suit}`);
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Minimum ms between consecutive actions within a betting round.
// Gives spectators time to see each action before the next fires.
const SPECTATOR_PACE_MS = 3000;

// ── Table Registry ───────────────────────────────────────────────────────────
// Maps sessionId → GameInstance for all currently running tables
const tableRegistry = new Map();

// agentId → Date.now() of their last /my-game or /action poll
const agentLastPoll = new Map();

// ── GameInstance ─────────────────────────────────────────────────────────────
class GameInstance {
    constructor(sessionId, players, matchType = '6max') {
        this.sessionId = sessionId;
        this.matchType = matchType;

        // Initialize 6 seats (fixed positions)
        this.seats = Array(6).fill(null).map((_, index) => ({
            position: index,
            state: 'empty', // 'empty', 'occupied', 'waiting'
            agent: null
        }));

        // Place initial players in seats
        players.forEach((player, index) => {
            if (index < 6) {
                this.seats[index] = {
                    position: index,
                    state: 'occupied',
                    agent: player
                };
            }
        });

        this.state = {
            status: 'waiting_for_players', // Start in waiting state
            pot: 0,
            boardCards: [],
            deck: [],
            players: players.filter((_, i) => i < 6), // Only active players in current hand
            currentTurnIndex: 0,
            currentBetMax: 0,
        };

        this.waitingPlayers = []; // Players who joined mid-hand
        this.waitingForAction = false;
        this.actionTimeoutObj = null;
        this.tableTimeoutObj = null; // For destroying empty tables
        this.lastActivityTime = Date.now();
        this.channel = null;

        // ── Agent-facing game context ───────────────────────────────
        this.handNumber = 0;             // incremented each hand
        this.actionHistory = [];         // [{ player, action, amount, round }]
        this.lastHandResult = null;      // populated at showdown, cleared on new hand
        this.blinds = { small: 50, big: 100 };

        // Start table timeout if only 1 player
        if (this.getOccupiedSeats().length === 1) {
            this.startTableTimeout();
        }
    }

    tag() { return this.sessionId.slice(0, 8); }

    /** Get all occupied seats (occupied or waiting) */
    getOccupiedSeats() {
        return this.seats.filter(s => s.state !== 'empty');
    }

    /** Get count of empty seats */
    getEmptySeatsCount() {
        return this.seats.filter(s => s.state === 'empty').length;
    }

    /** Find first empty seat index */
    findEmptySeat() {
        const emptySeat = this.seats.find(s => s.state === 'empty');
        return emptySeat ? emptySeat.position : -1;
    }

    /** Add player to specific seat */
    addPlayerToSeat(agent, seatIndex) {
        if (this.seats[seatIndex].state !== 'empty') return false;

        this.seats[seatIndex] = {
            position: seatIndex,
            state: this.state.status === 'playing' ? 'waiting' : 'occupied',
            agent: agent
        };

        // If hand is in progress, add to waiting list
        if (this.state.status === 'playing') {
            this.waitingPlayers.push(agent);
            console.log(`[${this.tag()}] ${agent.name} joined seat ${seatIndex} (waiting for next hand)`);
        } else {
            // Add to active players if not in hand
            this.state.players.push(agent);
            console.log(`[${this.tag()}] ${agent.name} joined seat ${seatIndex}`);
        }

        // Cancel table timeout if we now have 2+ players
        if (this.getOccupiedSeats().length >= 2 && this.tableTimeoutObj) {
            clearTimeout(this.tableTimeoutObj);
            this.tableTimeoutObj = null;
            console.log(`[${this.tag()}] Table timeout cancelled - ${this.getOccupiedSeats().length} players at table`);
        }

        this.lastActivityTime = Date.now();
        return true;
    }

    /** Start timeout to destroy table if only 1 player */
    startTableTimeout() {
        if (this.tableTimeoutObj) clearTimeout(this.tableTimeoutObj);

        const timeoutMs = 60000; // 60 seconds
        console.log(`[${this.tag()}] Starting 60s timeout - waiting for more players`);

        this.tableTimeoutObj = setTimeout(async () => {
            if (this.getOccupiedSeats().length <= 1) {
                console.log(`[${this.tag()}] Table timeout - destroying table with ${this.getOccupiedSeats().length} player(s)`);

                // Remove remaining player
                const occupiedSeat = this.seats.find(s => s.state !== 'empty');
                if (occupiedSeat && occupiedSeat.agent) {
                    await this.removePlayerFromSeat(occupiedSeat.agent.id, true);
                }

                // Destroy table
                await this.destroy();
            }
        }, timeoutMs);
    }

    /** Remove player and update seat to empty */
    async removePlayerFromSeat(agentId, isTimeout = false) {
        const seatIndex = this.seats.findIndex(s => s.agent?.id === agentId);
        if (seatIndex === -1) return false;

        const seat = this.seats[seatIndex];
        const agent = seat.agent;

        // Clear the seat
        this.seats[seatIndex] = {
            position: seatIndex,
            state: 'empty',
            agent: null
        };

        // Remove from active players
        this.state.players = this.state.players.filter(p => p.id !== agentId);

        // Remove from waiting players
        this.waitingPlayers = this.waitingPlayers.filter(p => p.id !== agentId);

        console.log(`[${this.tag()}] ${agent.name} removed from seat ${seatIndex} (${isTimeout ? 'timeout' : 'left'})`);

        // Check if we need to start table timeout
        const occupied = this.getOccupiedSeats().length;
        if (occupied === 1) {
            this.startTableTimeout();
        } else if (occupied === 0) {
            // Destroy empty table immediately
            await this.destroy();
        }

        this.lastActivityTime = Date.now();
        return true;
    }

    /** Transition waiting players to active at hand end */
    transitionWaitingPlayers() {
        for (const seat of this.seats) {
            if (seat.state === 'waiting') {
                seat.state = 'occupied';
                this.state.players.push(seat.agent);
                console.log(`[${this.tag()}] ${seat.agent.name} transitioned from waiting to playing`);
            }
        }
        this.waitingPlayers = [];
    }

    /** Current betting round name derived from board cards dealt */
    getCurrentRound() {
        const len = this.state.boardCards.length;
        if (len === 0) return 'preflop';
        if (len === 3) return 'flop';
        if (len === 4) return 'turn';
        return 'river';
    }

    async setupChannel() {
        // Realtime channel kept for spectator feeds only.
        // Action processing is handled directly by the /action HTTP endpoint.
        this.channel = supabase
            .channel(`game_events_${this.sessionId}`)
            .subscribe((status) => {
                console.log(`[${this.tag()}] Realtime: ${status}`);
            });
    }

    async updateDbSession() {
        // Build seat data for UI display
        const seatData = this.seats.map(seat => ({
            position: seat.position,
            state: seat.state,
            agent: seat.agent ? {
                id: seat.agent.id,
                name: seat.agent.name,
                stack: seat.agent.stack,
                currentBet: seat.agent.currentBet,
                status: seat.agent.status,
                // Include hole cards during showdown for spectators to see
                holeCards: this.state.status === 'showdown' ? seat.agent.holeCards : undefined,
            } : null
        }));

        await supabase
            .from('game_sessions')
            .update({
                pot_amount: this.state.pot,
                board_cards: this.state.boardCards,
                current_turn_agent_id: this.state.players[this.state.currentTurnIndex]?.id || null,
                status: this.state.status,
                player_data: seatData, // Now includes all 6 seats with their states
            })
            .eq('id', this.sessionId);
    }

    async writeActionLog(agentId, action, amount, thoughtProcess, confidenceScore) {
        await supabase.from('game_logs').insert([{
            game_id: this.sessionId,
            agent_id: agentId,
            action,
            amount,
            thought_process: thoughtProcess,
            confidence_score: confidenceScore,
        }]);
    }

    async startNewHand() {
        // First transition any waiting players to active
        this.transitionWaitingPlayers();

        // Check if we have minimum 2 players
        if (this.state.players.length < 2) {
            console.log(`[${this.tag()}] Not enough players to start hand (${this.state.players.length}/2 minimum)`);
            this.state.status = 'waiting_for_players';
            await this.updateDbSession();

            // Start timeout if only 1 player
            if (this.state.players.length === 1) {
                this.startTableTimeout();
            }
            return;
        }

        // If we have exactly 2 players, wait 15 seconds for more to join
        if (this.state.players.length === 2 && !this.handNumber) {
            console.log(`[${this.tag()}] 2 players ready - waiting 15s for more to join`);
            this.state.status = 'waiting_for_players';
            await this.updateDbSession();

            setTimeout(() => {
                // Check again after wait period
                if (this.state.players.length >= 2) {
                    this.startNewHand();
                }
            }, 15000);
            return;
        }

        this.handNumber++;
        this.actionHistory = [];
        this.lastHandResult = null;

        console.log(`[${this.tag()}] === STARTING HAND #${this.handNumber} ===`);
        this.state.deck = createDeck();
        this.state.pot = 0;
        this.state.boardCards = [];
        this.state.currentBetMax = 0;
        this.state.status = 'playing';

        for (const p of this.state.players) {
            p.currentBet = 0;
            p.status = 'active';
            p.holeCards = [this.state.deck.pop(), this.state.deck.pop()];
        }

        // Private hole-card logs (hidden from spectators by convention)
        for (const player of this.state.players) {
            await this.writeActionLog(player.id, 'deal', 0, JSON.stringify(player.holeCards), 1.0);
        }

        // Post blinds
        const sb = this.state.players[0];
        const bb = this.state.players[1];
        sb.stack -= this.blinds.small;  sb.currentBet = this.blinds.small;
        bb.stack -= this.blinds.big;    bb.currentBet = this.blinds.big;
        this.state.pot += this.blinds.small + this.blinds.big;
        this.state.currentBetMax = this.blinds.big;

        await this.writeActionLog(sb.id, 'small_blind', this.blinds.small, '[SYSTEM] Forced small blind', 1.0);
        await this.writeActionLog(bb.id, 'big_blind', this.blinds.big, '[SYSTEM] Forced big blind', 1.0);

        // Record blinds in action history for agents
        this.actionHistory.push({ player: sb.name, action: 'small_blind', amount: this.blinds.small, round: 'preflop' });
        this.actionHistory.push({ player: bb.name, action: 'big_blind', amount: this.blinds.big, round: 'preflop' });

        this.state.currentTurnIndex = this.state.players.length > 2 ? 2 : 0;

        // Track who still needs to act this street. Folded/inactive = already done.
        this.state.hasActed = {};
        for (const p of this.state.players) {
            this.state.hasActed[p.id] = p.status !== 'active';
        }

        await this.updateDbSession();

        console.log(`[${this.tag()}] Dealt to ${this.state.players.length} players. SB:50 BB:100`);
        this.triggerNextActionRequest();
    }

    triggerNextActionRequest() {
        const activePlayers = this.state.players.filter(p => p.status === 'active');

        if (activePlayers.length === 1) {
            this.handleShowdown(true);
            return;
        }

        // Street ends only when every active player has acted AND all bets are equal.
        // This prevents the 0===0 false-positive that skips post-flop betting.
        const allCalled = activePlayers.every(p =>
            this.state.hasActed[p.id] && p.currentBet === this.state.currentBetMax
        );
        if (allCalled) {
            this.advanceBettingRound();
            return;
        }

        const player = this.state.players[this.state.currentTurnIndex];
        // Skip folded players or those who already matched the current bet
        if (player.status !== 'active' ||
            (this.state.hasActed[player.id] && player.currentBet === this.state.currentBetMax)) {
            this.advanceTurnIndex();
            return;
        }

        console.log(`[${this.tag()}] Waiting for: ${player.name}`);
        this.state.status = 'waiting_for_action';
        this.updateDbSession();
        this.waitingForAction = true;

        // All players are external agents — they respond via POST /action.
        const timeoutMs = 30_000;
        if (this.actionTimeoutObj) clearTimeout(this.actionTimeoutObj);
        this.actionTimeoutObj = setTimeout(async () => {
            if (this.waitingForAction) {
                this.waitingForAction = false;
                console.log(`[${this.tag()}] [TIMEOUT] Removing ${player.name} from table after ${timeoutMs / 1000}s`);
                await this.writeActionLog(player.id, 'timeout', 0, '[SYSTEM] Removed due to timeout', 1.0);
                await this.removePlayer(player.id, true);
                this.triggerNextActionRequest(); // Continue game with remaining players
            }
        }, timeoutMs);
    }

    async processPlayerAction(action, amount) {
        this.waitingForAction = false;
        if (this.actionTimeoutObj) clearTimeout(this.actionTimeoutObj);

        this.state.status = 'playing';
        const player = this.state.players[this.state.currentTurnIndex];
        const toCall = this.state.currentBetMax - player.currentBet;
        const prevBetMax = this.state.currentBetMax;

        if (action === 'fold') {
            player.status = 'folded';
            this.state.hasActed[player.id] = true;
        } else {
            let actualBet;
            if (action === 'raise') {
                // amount is a TOTAL bet level (e.g., "raise to $400")
                const targetTotal = Math.min(amount || (this.state.currentBetMax > 0 ? this.state.currentBetMax * 2 : this.blinds.big), player.stack + player.currentBet);
                actualBet = Math.max(0, targetTotal - player.currentBet);
                actualBet = Math.min(actualBet, player.stack);
            } else {
                // call/check: amount is chips to add
                actualBet = Math.min(amount || toCall, player.stack);
                if (action === 'call' && actualBet < toCall) actualBet = player.stack; // all-in call
            }

            player.stack -= actualBet;
            player.currentBet += actualBet;
            this.state.pot += actualBet;

            if (player.currentBet > this.state.currentBetMax) {
                this.state.currentBetMax = player.currentBet;
            }

            this.state.hasActed[player.id] = true;

            // Raise: everyone else must act again
            if (this.state.currentBetMax > prevBetMax) {
                for (const p of this.state.players) {
                    if (p.status === 'active' && p.id !== player.id) {
                        this.state.hasActed[p.id] = false;
                    }
                }
            }
        }

        // Record in action history so agents can see full table narrative
        this.actionHistory.push({
            player: player.name,
            action,
            amount: action === 'fold' || action === 'check' ? 0
                : action === 'call' ? Math.min(toCall, player.stack)
                : player.currentBet,  // raise: total bet amount
            round: this.getCurrentRound(),
        });

        console.log(`[${this.tag()}] ${player.name}: ${action} $${amount}`);
        // Pace for spectators: action is already in DB, delay before advancing
        if (SPECTATOR_PACE_MS > 0) await sleep(SPECTATOR_PACE_MS);
        await this.advanceTurnIndex();
    }

    async advanceTurnIndex() {
        this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % this.state.players.length;
        await this.updateDbSession();
        this.triggerNextActionRequest();
    }

    async advanceBettingRound() {
        console.log(`[${this.tag()}] --- Advancing Betting Round ---`);

        for (const p of this.state.players) p.currentBet = 0;
        this.state.currentBetMax = 0;
        this.state.currentTurnIndex = this.state.players.findIndex(p => p.status === 'active');

        // Reset hasActed: all active players must act on this new street
        this.state.hasActed = {};
        for (const p of this.state.players) {
            this.state.hasActed[p.id] = p.status !== 'active';
        }

        if (this.state.boardCards.length === 0) {
            this.state.deck.pop(); // burn
            this.state.boardCards.push(this.state.deck.pop(), this.state.deck.pop(), this.state.deck.pop());
        } else if (this.state.boardCards.length === 3) {
            this.state.deck.pop();
            this.state.boardCards.push(this.state.deck.pop());
        } else if (this.state.boardCards.length === 4) {
            this.state.deck.pop();
            this.state.boardCards.push(this.state.deck.pop());
        } else {
            await this.handleShowdown(false);
            return;
        }

        await this.updateDbSession();
        await sleep(2000);
        this.triggerNextActionRequest();
    }

    async handleShowdown(earlyWin) {
        console.log(`[${this.tag()}] === SHOWDOWN ===`);
        this.state.status = 'showdown';
        this.state.currentTurnIndex = -1; // Clear turn so frontend timer stops

        // DEBUG: Log hole cards being sent
        console.log(`[${this.tag()}] SHOWDOWN - Sending hole cards:`, this.state.players.map(p => ({
            name: p.name,
            holeCards: p.holeCards
        })));

        await this.updateDbSession();

        const activePlayers = this.state.players.filter(p => p.status === 'active');

        // Build winner list — supports split pots (ties)
        let winnerList = [{ id: activePlayers[0]?.id, handName: 'Last man standing' }];
        let solvedHands = [];   // for showdown reveal

        if (!earlyWin && activePlayers.length > 1) {
            const hands = activePlayers.map(p => {
                const solved = Hand.solve([...p.holeCards, ...this.state.boardCards]);
                solved.agentId = p.id;
                solved.agentName = p.name;
                solved.holeCards = p.holeCards;
                return solved;
            });
            const winners = Hand.winners(hands); // array — length > 1 on a tie
            winnerList = winners.map(w => ({ id: w.agentId, handName: w.name }));
            solvedHands = hands.map(h => ({ name: h.agentName, cards: h.holeCards, hand: h.name }));
        }

        // Distribute pot evenly; give any chip remainder to first winner
        const potPerWinner = Math.floor(this.state.pot / winnerList.length);
        const remainder    = this.state.pot - potPerWinner * winnerList.length;
        const winnerResults = [];

        for (let i = 0; i < winnerList.length; i++) {
            const { id: wId, handName } = winnerList[i];
            const award = potPerWinner + (i === 0 ? remainder : 0);
            const wPlayer = this.state.players.find(p => p.id === wId);
            if (wPlayer) wPlayer.stack += award;
            winnerResults.push({ name: wPlayer?.name, hand: handName, amount_won: award });
            console.log(`[${this.tag()}] Winner: ${wPlayer?.name} $${award} — ${handName}`);
            // Include hand name and hole cards in thought process for frontend parsing
            const thoughtWithHand = `${handName}|||${JSON.stringify(wPlayer?.holeCards || [])}`;
            await this.writeActionLog(wId, 'win', award, thoughtWithHand, 1.0);
        }

        // Store result so agents can poll it during the showdown window
        this.lastHandResult = {
            winners: winnerResults,
            showdown_hands: solvedHands,
        };

        // Persist updated balances
        await Promise.all(
            this.state.players.map(p =>
                supabase.from('agents').update({ balance: p.stack }).eq('id', p.id)
            )
        );

        await sleep(6500); // Let spectators see the full animation (5.5s animation + 1s buffer)
        queueManager.onTableDone(this.sessionId);
    }

    /** Remove a player mid-session (voluntary leave or timeout). */
    async removePlayer(agentId, isTimeout = false) {
        const player = this.state.players.find(p => p.id === agentId);
        if (!player) return false;

        // Save their remaining stack to DB before removal
        await supabase.from('agents').update({ balance: player.stack }).eq('id', agentId);

        // If it's currently their turn, auto-fold first
        const isTheirTurn = this.waitingForAction &&
            this.state.players[this.state.currentTurnIndex]?.id === agentId;

        if (isTheirTurn) {
            await this.writeActionLog(agentId, 'fold', 0, `[SYSTEM] Player ${isTimeout ? 'timed out' : 'left the table'}`, 1.0);
            await this.processPlayerAction('fold', 0);
        }

        // Remove from seat and mark as empty
        await this.removePlayerFromSeat(agentId, isTimeout);

        console.log(`[${this.tag()}] ${player.name} removed from table (${isTimeout ? 'timeout' : 'left'}, stack: $${player.stack})`);
        await this.writeActionLog(agentId, 'leave', 0, `[SYSTEM] Player ${isTimeout ? 'removed due to timeout' : 'left voluntarily'}`, 1.0);

        // Update database to reflect seat change
        await this.updateDbSession();

        // If only 1 active player remains in hand, trigger showdown
        const activePlayers = this.state.players.filter(p => p.status === 'active');
        if (activePlayers.length <= 1 && !isTheirTurn) {
            this.handleShowdown(true);
        }

        return true;
    }

    async destroy() {
        if (this.actionTimeoutObj) clearTimeout(this.actionTimeoutObj);
        if (this.tableTimeoutObj) clearTimeout(this.tableTimeoutObj);
        if (this.channel) supabase.removeChannel(this.channel);
        tableRegistry.delete(this.sessionId);
        console.log(`[${this.tag()}] Table destroyed`);
    }
}

// ── Queue Manager ─────────────────────────────────────────────────────────────

const queueManager = {
    queue: [],         // [{ agentId, agentRecord, queuedAt }]
    tickInterval: null,
    ticking: false,    // prevents overlapping async ticks

    start() {
        this.tickInterval = setInterval(() => this.tick(), 5000);
        console.log('[Queue] Manager started (5s tick)');
    },

    /** Find table with empty seats for agent to join */
    findTableWithEmptySeats() {
        for (const [sessionId, instance] of tableRegistry) {
            const emptyCount = instance.getEmptySeatsCount();
            if (emptyCount > 0) {
                return instance;
            }
        }
        return null;
    },

    async tick() {
        if (this.ticking) return;       // guard against overlapping ticks
        this.ticking = true;
        try {
            const now = Date.now();

            // Detect disconnected agents at tables (no poll for 60s)
            const DISCONNECT_MS = 60_000;
            for (const [, instance] of tableRegistry) {
                for (const p of [...instance.state.players]) {
                    if (p.status !== 'active') continue;
                    const lastPoll = agentLastPoll.get(p.id);
                    if (lastPoll && (now - lastPoll) > DISCONNECT_MS) {
                        console.log(`[Queue] ${p.name} disconnected (no poll for ${((now - lastPoll) / 1000).toFixed(0)}s) — removing`);
                        await instance.removePlayer(p.id, true);
                        agentLastPoll.delete(p.id);
                    }
                }
            }

            if (this.queue.length === 0) return;

            // Purge stale entries — agents waiting longer than 5 minutes
            const STALE_MS = 5 * 60 * 1000;
            const stale = this.queue.filter(e => now - e.queuedAt > STALE_MS);
            for (const s of stale) {
                console.log(`[Queue] Removing stale entry: ${s.agentRecord.name} (waited ${((now - s.queuedAt) / 1000).toFixed(0)}s)`);
                this.queue = this.queue.filter(e => e.agentId !== s.agentId);
            }
            if (this.queue.length === 0) return;

            // Process queue: Try to place agents in existing tables with empty seats
            while (this.queue.length > 0) {
                const agent = this.queue[0];
                const table = this.findTableWithEmptySeats();

                if (table) {
                    // Join existing table
                    const seatIndex = table.findEmptySeat();
                    if (seatIndex !== -1) {
                        const agentData = {
                            id: agent.agentRecord.id,
                            name: agent.agentRecord.name,
                            personality_type: agent.agentRecord.personality_type || 'default',
                            stack: agent.agentRecord.balance || 10000,
                            currentBet: 0,
                            status: 'active',
                            holeCards: [],
                        };

                        if (table.addPlayerToSeat(agentData, seatIndex)) {
                            this.queue.shift(); // Remove from queue
                            await table.updateDbSession();
                            console.log(`[Queue] ${agentData.name} joined existing table ${table.tag()} at seat ${seatIndex}`);

                            // If table was waiting and now has 2+ players, start the game
                            if (table.state.status === 'waiting_for_players' && table.state.players.length >= 2) {
                                await table.startNewHand();
                            }
                        } else {
                            break; // Failed to add, stop processing
                        }
                    } else {
                        break; // No empty seats found
                    }
                } else {
                    // No tables with empty seats - create new table if we have at least 1 agent
                    await this.launchTable(1);
                    break;
                }
            }
        } finally {
            this.ticking = false;
        }
    },

    async launchTable(minPlayers) {
        if (this.queue.length < minPlayers) return;

        const seatCount = Math.min(this.queue.length, minPlayers);
        const seated = this.queue.splice(0, seatCount);

        const allPlayers = seated.map(s => ({
            id: s.agentRecord.id,
            name: s.agentRecord.name,
            personality_type: s.agentRecord.personality_type || 'default',
            stack: s.agentRecord.balance || 10000,
            currentBet: 0,
            status: 'active',
            holeCards: [],
        }));

        const playerIds = allPlayers.map(p => p.id);
        const matchType = '6max'; // Always 6-max tables now

        const { data: sessData, error } = await supabase
            .from('game_sessions')
            .insert([{
                status: 'waiting_for_players',
                pot_amount: 0,
                board_cards: [],
                match_type: matchType,
                player_ids: playerIds
            }])
            .select()
            .single();

        if (error || !sessData) {
            console.error('[Queue] Failed to create session:', error);
            this.queue.unshift(...seated);
            return;
        }

        const instance = new GameInstance(sessData.id, allPlayers, matchType);
        tableRegistry.set(sessData.id, instance);
        await instance.setupChannel();
        await instance.updateDbSession(); // Update to show seats

        console.log(`[Queue] Launched 6-max table ${sessData.id.slice(0,8)} with ${allPlayers.length} player(s)`);

        // Start the hand if we have 2+ players, otherwise wait
        if (allPlayers.length >= 2) {
            await instance.startNewHand();
        }
    },

    async onTableDone(sessionId) {
        const instance = tableRegistry.get(sessionId);
        if (!instance) return;

        const players = instance.state.players;

        // Remove busted players (stack <= 0) from seats
        const alive = [];
        const busted = [];

        for (const p of players) {
            if (p.stack <= 0) {
                busted.push(p);
                // Remove from seat
                await instance.removePlayerFromSeat(p.id, false);
                console.log(`[Queue] ${p.name} busted out (stack: ${p.stack}) - seat now empty`);
            } else {
                alive.push(p);
            }
        }

        // Update agent balances for busted players
        for (const p of busted) {
            await supabase
                .from('agents')
                .update({ balance: 0 }) // Busted = 0 balance
                .eq('id', p.id);
        }

        // Check if we still have enough players to continue
        const occupiedSeats = instance.getOccupiedSeats();
        if (occupiedSeats.length >= 2) {
            // Rotate dealer button — move first player to end
            instance.state.players.push(instance.state.players.shift());
            console.log(`[Queue] Table ${sessionId.slice(0, 8)} continuing — ${occupiedSeats.length}/6 seats occupied, new hand`);
            await instance.startNewHand();
            return;
        }

        // Not enough players — handle remaining player
        if (occupiedSeats.length === 1) {
            console.log(`[Queue] Table ${sessionId.slice(0, 8)} has only 1 player left - starting timeout`);
            // Table will handle timeout and destruction
            return;
        }

        // No players left - destroy table
        console.log(`[Queue] Table ${sessionId.slice(0, 8)} is empty - destroying`);

        await supabase.from('game_sessions').update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            total_hands: instance.handNumber,
            winner_id: alive.length === 1 ? alive[0].id : null
        }).eq('id', sessionId);

        await instance.destroy();
    },

    enqueue(agentRecord) {
        const alreadyQueued = this.queue.some(e => e.agentId === agentRecord.id);

        // Check if agent is already at any table (in any seat)
        const alreadyPlaying = [...tableRegistry.values()].some(t =>
            t.seats.some(seat => seat.agent?.id === agentRecord.id)
        );

        if (alreadyQueued || alreadyPlaying) return false;

        this.queue.push({ agentId: agentRecord.id, agentRecord, queuedAt: Date.now() });
        console.log(`[Queue] Enqueued ${agentRecord.name} (queue: ${this.queue.length})`);

        // Immediately try to place in a table if one is available
        this.tick();

        return true;
    },
};

// ── API Helpers ──────────────────────────────────────────────────────────────

async function authenticateAgent(req) {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return null;
    const { data } = await supabase.from('agents').select('*').eq('api_token', token).maybeSingle();
    return data;
}

function findTableForAgent(agentId) {
    for (const [, instance] of tableRegistry) {
        const player = instance.state.players.find(p => p.id === agentId);
        if (player) return { instance, player };
    }
    return null;
}

// ── API Endpoints (before SPA fallback) ──────────────────────────────────────

// Register a new agent — returns api_token for all future requests
app.post('/register', async (req, res) => {
    const { agent_name } = req.body;

    // Enhanced validation with helpful error messages for AI agents
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
            error: 'Empty request body',
            message: 'No JSON data received. Did you forget to include the request body?',
            expected_format: '{"agent_name":"YourBotName"}',
            example_curl: `curl -X POST ${req.protocol}://${req.get('host')}/register -H "Content-Type: application/json" -d '{"agent_name":"MyBot"}'`
        });
    }

    if (!agent_name) {
        return res.status(400).json({
            error: 'Missing agent_name field',
            message: 'The "agent_name" field is required in the JSON body',
            received_fields: Object.keys(req.body),
            expected_format: '{"agent_name":"YourBotName"}',
            tip: 'Make sure you\'re using "agent_name" (not "name" or "agentName")'
        });
    }

    if (typeof agent_name !== 'string') {
        return res.status(400).json({
            error: 'Invalid agent_name type',
            message: `agent_name must be a string, received ${typeof agent_name}`,
            expected_format: '{"agent_name":"YourBotName"}'
        });
    }

    if (agent_name.trim().length === 0) {
        return res.status(400).json({
            error: 'Empty agent_name',
            message: 'agent_name cannot be empty or whitespace only',
            expected_format: '{"agent_name":"YourBotName"}'
        });
    }

    const trimmedName = agent_name.trim();

    // Check if agent with this name already exists
    const { data: existingAgent } = await supabase
        .from('agents')
        .select('*')
        .eq('name', trimmedName)
        .maybeSingle();

    if (existingAgent) {
        // Agent exists - return existing credentials
        console.log(`[Register] Agent "${trimmedName}" already exists, returning existing token`);
        return res.json({
            agent_id: existingAgent.id,
            api_token: existingAgent.api_token,
            name: existingAgent.name,
            balance: existingAgent.balance,
            message: 'Agent already registered, returning existing credentials'
        });
    }

    // Create new agent
    const api_token = crypto.randomUUID();
    const { data, error } = await supabase
        .from('agents')
        .insert([{ name: trimmedName, api_token, balance: 10000, personality_type: 'default' }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    console.log(`[Register] New agent registered: ${data.name} (${data.id.slice(0, 8)})`);
    res.json({ agent_id: data.id, api_token: data.api_token, name: data.name, balance: data.balance });
});

// Join the matchmaking queue
app.post('/join-queue', async (req, res) => {
    const agent = await authenticateAgent(req);
    if (!agent) {
        return res.status(401).json({
            error: 'Authentication failed',
            message: 'Missing or invalid API token',
            how_to_fix: [
                '1. Make sure you called POST /register first to get an api_token',
                '2. Include the token in the Authorization header',
                '3. Format: "Authorization: Bearer YOUR_API_TOKEN"',
                '4. Example: curl -H "Authorization: Bearer abc-123-xyz" ...'
            ],
            tip: 'Did you save the api_token from the /register response?'
        });
    }

    // Auto-rebuy: if agent is broke, reset balance to starting stack
    const STARTING_STACK = 10000;
    if (agent.balance <= 0) {
        await supabase.from('agents').update({ balance: STARTING_STACK }).eq('id', agent.id);
        agent.balance = STARTING_STACK;
        console.log(`[Queue] Auto-rebuy: ${agent.name} reset to $${STARTING_STACK}`);
    }

    const ok = queueManager.enqueue(agent);
    if (!ok) return res.status(409).json({ error: 'Agent already queued or playing' });

    res.json({ message: 'Queued successfully', queue_position: queueManager.queue.length, balance: agent.balance });
});

// Get current game state for the authenticated agent
app.get('/my-game', async (req, res) => {
    const agent = await authenticateAgent(req);
    if (!agent) return res.status(401).json({ error: 'Missing or invalid Bearer token' });
    agentLastPoll.set(agent.id, Date.now());

    // Check if in queue
    const queueEntry = queueManager.queue.find(e => e.agentId === agent.id);
    if (queueEntry) {
        const pos = queueManager.queue.indexOf(queueEntry) + 1;
        return res.json({ status: 'queued', queue_position: pos });
    }

    // Check if at a table
    const found = findTableForAgent(agent.id);
    if (!found) return res.json({ status: 'idle' });

    const { instance, player } = found;
    const s = instance.state;
    const isMyTurn = instance.waitingForAction &&
        s.players[s.currentTurnIndex]?.id === agent.id;
    const toCall = Math.max(0, s.currentBetMax - player.currentBet);

    // Compute valid actions and raise bounds
    const validActions = [];
    // Min raise = 2x current bet (or big blind if opening)
    const minRaise = s.currentBetMax > 0 ? s.currentBetMax * 2 : instance.blinds.big;
    const maxRaise = player.stack + player.currentBet; // all-in total

    if (isMyTurn) {
        validActions.push('fold');
        if (toCall === 0) {
            validActions.push('check');
            if (player.stack > 0) validActions.push('raise');
        } else {
            validActions.push('call');
            if (player.stack > toCall) validActions.push('raise');
        }
    }

    res.json({
        status: s.status,
        game_id: instance.sessionId,
        your_turn: isMyTurn,
        round: instance.getCurrentRound(),
        hand_number: instance.handNumber,

        // Your private info
        hole_cards: player.holeCards,
        your_stack: player.stack,
        your_current_bet: player.currentBet,

        // Table state
        board_cards: s.boardCards,
        pot: s.pot,
        current_bet_to_match: s.currentBetMax,
        to_call: toCall,
        blinds: { small_blind: instance.blinds.small, big_blind: instance.blinds.big },
        dealer_position: 0,              // SB=0, BB=1 in our rotation
        small_blind_seat: 0,
        big_blind_seat: 1,

        // Bet constraints — so agent knows exact legal range
        min_raise: Math.min(minRaise, player.stack + player.currentBet),
        max_raise: maxRaise,

        // All 6 seats with their states
        seats: instance.seats.map(seat => ({
            position: seat.position,
            state: seat.state, // 'empty', 'occupied', 'waiting'
            agent: seat.agent ? {
                name: seat.agent.name,
                stack: seat.agent.stack,
                status: seat.agent.status,
                current_bet: seat.agent.currentBet,
                is_current_turn: seat.agent.id === s.players[s.currentTurnIndex]?.id,
            } : null
        })),

        // Active players in current hand
        players: s.players.map((p, i) => ({
            name: p.name,
            stack: p.stack,
            status: p.status,
            current_bet: p.currentBet,
            position: i,
            is_current_turn: i === s.currentTurnIndex,
        })),

        // What actions are legal right now
        valid_actions: validActions,

        // Full action log this hand — lets the agent read the table narrative
        action_history: instance.actionHistory,

        // Populated after showdown — null during active play
        hand_result: instance.lastHandResult,
    });
});

// Submit a poker action
app.post('/action', async (req, res) => {
    const agent = await authenticateAgent(req);
    if (!agent) return res.status(401).json({ error: 'Missing or invalid Bearer token' });
    agentLastPoll.set(agent.id, Date.now());

    const found = findTableForAgent(agent.id);
    if (!found) return res.status(404).json({ error: 'You are not at a table' });

    const { instance, player } = found;
    const s = instance.state;
    const expectedId = s.players[s.currentTurnIndex]?.id;

    if (!instance.waitingForAction || expectedId !== agent.id) {
        return res.status(400).json({ error: 'Not your turn' });
    }

    const { action, amount, thought_process } = req.body;

    // Enhanced validation for AI agents
    if (!action) {
        return res.status(400).json({
            error: 'Missing action field',
            message: 'The "action" field is required in the JSON body',
            valid_actions: ['fold', 'check', 'call', 'raise'],
            expected_format: '{"action":"call","amount":200,"thought_process":"optional"}',
            tip: 'Use "fold" to fold, "check" when no bet, "call" to match bet, "raise" with amount to raise'
        });
    }

    const validActions = ['fold', 'call', 'raise', 'check'];
    if (!validActions.includes(action)) {
        return res.status(400).json({
            error: 'Invalid action',
            message: `"${action}" is not a valid action`,
            valid_actions: validActions,
            received: action,
            tip: 'Action must be lowercase: "fold", "check", "call", or "raise"'
        });
    }

    // Validate action legality
    const toCall = s.currentBetMax - player.currentBet;
    if (action === 'check' && toCall > 0) {
        return res.status(400).json({ error: 'Cannot check — there is a bet to you. Call, raise, or fold.' });
    }
    if (action === 'call' && toCall === 0) {
        return res.status(400).json({ error: 'Nothing to call. Use check or raise.' });
    }
    if (action === 'raise' && player.stack <= 0) {
        return res.status(400).json({ error: 'You have no chips to raise with.' });
    }

    // Determine actual amount with proper min-raise enforcement
    // All raise amounts use TOTAL BET semantics (e.g., "raise to $400")
    const minRaise = s.currentBetMax > 0 ? s.currentBetMax * 2 : instance.blinds.big;
    const maxTotal = player.stack + player.currentBet; // all-in total bet
    let finalAmount = 0;

    if (action === 'call') {
        finalAmount = Math.min(toCall, player.stack);
    } else if (action === 'raise') {
        const requested = amount || minRaise;
        // If the agent can't meet min raise, it's all-in (legal in NLHE)
        if (requested < minRaise && requested < maxTotal) {
            finalAmount = Math.min(minRaise, maxTotal);
        } else {
            finalAmount = Math.min(requested, maxTotal);
        }
    }

    const confidence = 0.50 + Math.random() * 0.45;
    const thoughts = thought_process || `External agent: ${action}`;

    // Immediately lock out further actions to prevent duplicates
    instance.waitingForAction = false;

    // Write to game_logs for the spectator feed
    await instance.writeActionLog(agent.id, action, finalAmount, thoughts, confidence);

    // Process the action directly — no Realtime dependency
    await instance.processPlayerAction(action, finalAmount);

    res.json({ success: true, action, amount: finalAmount });
});

// Leave a table voluntarily
app.post('/leave', async (req, res) => {
    const agent = await authenticateAgent(req);
    if (!agent) return res.status(401).json({ error: 'Missing or invalid Bearer token' });

    // Check if in queue — just remove from queue
    const qIdx = queueManager.queue.findIndex(e => e.agentId === agent.id);
    if (qIdx !== -1) {
        queueManager.queue.splice(qIdx, 1);
        console.log(`[Queue] ${agent.name} left the queue`);
        return res.json({ success: true, message: 'Removed from queue' });
    }

    // Check if at a table
    const found = findTableForAgent(agent.id);
    if (!found) return res.status(404).json({ error: 'You are not at a table or in queue' });

    const { instance } = found;
    await instance.removePlayer(agent.id);

    res.json({ success: true, message: 'Left the table', balance: agent.balance });
});

app.get('/queue-status', (_req, res) => {
    // Filter out agents that are already at a table (race condition defense)
    const playingIds = new Set();
    for (const inst of tableRegistry.values()) {
        for (const seat of inst.seats) {
            if (seat.agent) playingIds.add(seat.agent.id);
        }
    }
    const filtered = queueManager.queue.filter(e => !playingIds.has(e.agentId));

    // Get table occupancy info
    const tables = [];
    for (const [sessionId, inst] of tableRegistry) {
        const occupied = inst.getOccupiedSeats().length;
        tables.push({
            id: sessionId.slice(0, 8),
            occupancy: `${occupied}/6`,
            status: inst.state.status,
            waiting_players: inst.waitingPlayers.length
        });
    }

    res.json({
        queue_length: filtered.length,
        active_tables: tableRegistry.size,
        tables: tables,
        queued_agents: filtered.map(e => ({
            id: e.agentId,
            name: e.agentRecord.name,
            waited_ms: Date.now() - e.queuedAt,
        })),
    });
});

// Serve raw skill.md for AI agents to fetch
app.get('/skill.md', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/skill.md'));
});

// SPA fallback — must be last
app.use((_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => console.log(`🎰 DeepStacks server running on port ${PORT}`));

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
    console.log('DeepStacks Autonomous Game Engine Booting...');

    // Clean up ALL orphaned sessions from previous engine runs (loop to bypass row limits)
    let totalCleaned = 0;
    while (true) {
        const { data: batch } = await supabase
            .from('game_sessions')
            .update({ status: 'completed', pot_amount: 0, board_cards: [], player_data: [] })
            .in('status', ['playing', 'waiting_for_action', 'showdown'])
            .select('id');
        if (!batch || batch.length === 0) break;
        totalCleaned += batch.length;
    }
    if (totalCleaned > 0) {
        console.log(`[Boot] Cleaned up ${totalCleaned} orphaned session(s)`);
    }

    queueManager.start();
    console.log('Arena ready — waiting for agents to register and join.');
}

boot().catch(console.error);
