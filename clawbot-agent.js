/**
 * 🤖 CLAWBOT - External AI Poker Agent
 *
 * A simple but functional poker bot that demonstrates:
 * - API integration with DeepStack Arena
 * - Basic poker decision-making
 * - NOT always folding!
 *
 * Run: node clawbot-agent.js
 */

const BASE = process.env.ARENA_URL || 'https://deepstacks-agents-poker-arena-production.up.railway.app';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function api(method, path, token, body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(`${BASE}${path}`, opts);
        const data = await res.json();
        return data;
    } catch (err) {
        console.error(`❌ API Error (${path}):`, err.message);
        throw err;
    }
}

/**
 * ClawBot's decision-making algorithm
 * IMPROVED: No longer always folds!
 */
function makeDecision(state) {
    const { hole_cards, board_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions, round } = state;

    // Calculate hand strength
    const rankOrder = '23456789TJQKA';
    const card1 = hole_cards[0] || '2c';
    const card2 = hole_cards[1] || '3c';

    const r1 = rankOrder.indexOf(card1[0]);
    const r2 = rankOrder.indexOf(card2[0]);
    const isPair = card1[0] === card2[0];
    const suited = card1[1] === card2[1];

    // Calculate base hand strength (0-1)
    let strength = 0;

    if (isPair) {
        // Pairs are strong - 0.6 to 1.0
        strength = 0.6 + (Math.max(r1, r2) / 12) * 0.4;
    } else {
        // High cards - factor in both ranks
        const highCard = Math.max(r1, r2);
        const lowCard = Math.min(r1, r2);
        strength = (highCard + lowCard) / 24;

        // Bonus for suited
        if (suited) strength += 0.1;

        // Bonus for connected (like 78, 9T)
        if (Math.abs(r1 - r2) <= 2) strength += 0.05;
    }

    // Adjust strength based on round (be more cautious on later streets)
    const streetMultiplier = {
        'preflop': 1.0,
        'flop': 0.9,
        'turn': 0.8,
        'river': 0.7
    };
    strength *= (streetMultiplier[round] || 0.8);

    // Calculate pot odds
    const potOdds = to_call > 0 ? to_call / (pot + to_call) : 0;

    console.log(`🤖 [ClawBot] ${round}: Hand strength ${(strength * 100).toFixed(0)}%, Cards: ${hole_cards.join(' ')}, Board: ${board_cards.join(' ') || '-'}`);

    // DECISION LOGIC (NO MORE ALWAYS FOLDING!)

    // If we can check for free
    if (to_call === 0 && valid_actions.includes('check')) {
        // Strong hand? BET!
        if (strength > 0.65 && valid_actions.includes('raise')) {
            const raiseAmount = Math.min(
                Math.max(min_raise, Math.floor(pot * 0.75)),
                max_raise,
                your_stack
            );
            return {
                action: 'raise',
                amount: raiseAmount,
                thought_process: `Strong hand (${(strength*100).toFixed(0)}%), betting for value`
            };
        }
        // Otherwise check
        return {
            action: 'check',
            thought_process: `Weak/medium hand, checking to see more cards for free`
        };
    }

    // Facing a bet
    if (to_call > 0) {
        // Very strong hand? RAISE!
        if (strength > 0.75 && valid_actions.includes('raise')) {
            const raiseAmount = Math.min(
                to_call * 3,
                max_raise,
                your_stack
            );
            return {
                action: 'raise',
                amount: raiseAmount,
                thought_process: `Very strong hand (${(strength*100).toFixed(0)}%), raising for value!`
            };
        }

        // Strong hand or good pot odds? CALL!
        if (strength > 0.55 || potOdds < 0.3) {
            if (valid_actions.includes('call') && to_call <= your_stack) {
                return {
                    action: 'call',
                    amount: to_call,
                    thought_process: `Decent hand (${(strength*100).toFixed(0)}%) or good pot odds, calling`
                };
            }
        }

        // Medium hand and small bet? Sometimes call
        if (strength > 0.4 && to_call < pot * 0.5 && valid_actions.includes('call')) {
            return {
                action: 'call',
                amount: to_call,
                thought_process: `Medium hand, small bet - taking a shot`
            };
        }

        // Weak hand or bad odds? FOLD
        return {
            action: 'fold',
            thought_process: `Weak hand (${(strength*100).toFixed(0)}%) or bad pot odds, folding`
        };
    }

    // Default: check or fold
    if (valid_actions.includes('check')) {
        return { action: 'check', thought_process: 'Default check' };
    }
    return { action: 'fold', thought_process: 'Default fold' };
}

/**
 * Main game loop for ClawBot
 */
async function runClawBot(name, token) {
    console.log(`🤖 [${name}] Starting game loop...`);
    let hands = 0;
    const maxHands = 20;

    while (hands < maxHands) {
        try {
            const state = await api('GET', '/my-game', token);

            if (!state || state.error) {
                console.log(`❌ [${name}] Error getting game state:`, state?.error || 'Unknown');
                await sleep(3000);
                continue;
            }

            // Check game status
            if (state.status === 'idle') {
                console.log(`🤖 [${name}] Idle - joining queue...`);
                await api('POST', '/join-queue', token);
                await sleep(3000);
                continue;
            }

            if (state.status === 'queued') {
                console.log(`🤖 [${name}] Queued - waiting for game...`);
                await sleep(2000);
                continue;
            }

            // Check for hand result
            if (state.status === 'showdown' && state.hand_result) {
                const winners = state.hand_result.winners.map(w => `${w.name} ($${w.amount_won})`).join(', ');
                console.log(`\n🏆 [${name}] Hand #${state.hand_number} RESULT: ${winners}\n`);
                hands++;
                await sleep(3000);
                continue;
            }

            // Our turn to act
            if (state.your_turn && state.status !== 'showdown') {
                console.log(`\n🎯 [${name}] MY TURN - Hand #${state.hand_number}`);

                const decision = makeDecision(state);

                console.log(`✅ [${name}] DECISION: ${decision.action.toUpperCase()}${decision.amount ? ' $' + decision.amount : ''}`);
                console.log(`💭 [${name}] Reasoning: ${decision.thought_process}`);

                const result = await api('POST', '/action', token, decision);

                if (result.error) {
                    console.log(`❌ [${name}] Action rejected: ${result.error}`);
                    await sleep(1000);
                    continue;
                }

                // Wait for turn to complete
                await sleep(2000);
            } else {
                // Not our turn
                await sleep(1000);
            }

        } catch (error) {
            console.error(`❌ [${name}] Error:`, error.message);
            await sleep(3000);
        }
    }

    console.log(`\n✅ [${name}] Completed ${hands} hands. Leaving game.\n`);
    await api('POST', '/leave', token);
}

/**
 * Main execution
 */
async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║           🤖 CLAWBOT - EXTERNAL AI AGENT 🤖          ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    console.log(`🌐 Connecting to: ${BASE}\n`);

    // Register ClawBot
    console.log('📝 Registering ClawBot...\n');
    const bot = await api('POST', '/register', null, { agent_name: 'ClawBot' });

    if (!bot || bot.error) {
        console.error('❌ Failed to register ClawBot:', bot?.error || 'Unknown error');
        process.exit(1);
    }

    console.log(`✅ ClawBot registered successfully!`);
    console.log(`   Agent ID: ${bot.agent_id}`);
    console.log(`   Balance: $${bot.balance}\n`);

    console.log('🎮 Joining game queue...\n');
    await api('POST', '/join-queue', bot.api_token);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🤖 ClawBot is now playing poker!\n');

    // Run game loop
    await runClawBot(bot.name, bot.api_token);

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║              🎉 CLAWBOT SESSION COMPLETE! 🎉         ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
}

// Run ClawBot
main().catch(err => {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
});
