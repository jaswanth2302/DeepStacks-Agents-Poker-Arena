/**
 * OpenClawBot runner - Makes OpenClawBot play properly instead of just folding
 * Run: node run-openclaw.js
 */

const BASE = process.env.ARENA_URL || 'https://deepstacks-agents-poker-arena-production.up.railway.app';

let clawToken = null;

async function api(method, path, token, body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** OpenClawBot's aggressive strategy */
function decide(state) {
    const { hole_cards, board_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions } = state;

    // Safety check - no cards yet (joining mid-hand)
    if (!hole_cards || !hole_cards[0] || !hole_cards[1]) {
        if (valid_actions.includes('check')) {
            return { action: 'check', thought_process: '🤖 Waiting for cards' };
        }
        return { action: 'fold', thought_process: '🤖 No cards yet' };
    }

    // Calculate hand strength
    const rankOrder = '23456789TJQKA';
    const r1 = rankOrder.indexOf(hole_cards[0][0]);
    const r2 = rankOrder.indexOf(hole_cards[1][0]);
    const paired = hole_cards[0][0] === hole_cards[1][0];
    const suited = hole_cards[0][1] === hole_cards[1][1];

    // Fixed strength calculation - capped to prevent >100%
    let strength = paired ? 0.55 + (r1 / 12) * 0.25 : (r1 + r2) / 24;
    if (suited) strength += 0.08;  // Suited bonus

    // High cards bonus - but keep total under 1.0
    if (r1 >= 9 || r2 >= 9) strength += 0.10;
    strength = Math.min(strength, 0.95);  // Cap at 95%

    // Add some randomness for unpredictability (10% variance)
    const randomFactor = 0.9 + Math.random() * 0.2;
    strength *= randomFactor;

    // AGGRESSIVE PLAY - check for raises FIRST before checking

    // Strong hands - raise aggressively (lowered from 0.7 to 0.55)
    if (strength > 0.55 && valid_actions.includes('raise')) {
        const raiseAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * 0.75)),
            max_raise
        );
        return { action: 'raise', amount: raiseAmount, thought_process: `🤖 Strong hand (${(strength*100).toFixed(0)}%), raising aggressively!` };
    }

    // Occasional bluff raise with medium hands (20% of the time)
    if (strength > 0.40 && Math.random() < 0.20 && valid_actions.includes('raise')) {
        const bluffAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * 0.5)),
            max_raise
        );
        return { action: 'raise', amount: bluffAmount, thought_process: `🤖 Bluff raise! (${(strength*100).toFixed(0)}%)` };
    }

    // Free to play - sometimes raise even with medium hands
    if (to_call === 0) {
        // 30% chance to raise with 45%+ hands when free
        if (strength > 0.45 && Math.random() < 0.30 && valid_actions.includes('raise')) {
            const raiseAmount = Math.min(min_raise * 2, max_raise);
            return { action: 'raise', amount: raiseAmount, thought_process: `🤖 Free raise opportunity!` };
        }
        if (valid_actions.includes('check')) {
            return { action: 'check', thought_process: `🤖 Checking (${(strength*100).toFixed(0)}%)` };
        }
    }

    // Medium hands - call reasonable bets (lowered from 0.4 to 0.35)
    if (strength > 0.35) {
        if (to_call <= pot * 0.7 && valid_actions.includes('call')) {
            return { action: 'call', thought_process: `🤖 Decent hand (${(strength*100).toFixed(0)}%), calling` };
        }
        if (valid_actions.includes('check')) {
            return { action: 'check', thought_process: `🤖 Medium hand, checking` };
        }
    }

    // Cheap calls are worth it
    if (to_call > 0 && to_call <= your_stack * 0.08 && valid_actions.includes('call')) {
        return { action: 'call', thought_process: `🤖 Cheap call, worth seeing` };
    }

    // Only fold truly bad hands facing big bets
    if (strength < 0.25 && to_call > pot * 0.4) {
        return { action: 'fold', thought_process: `🤖 Weak hand (${(strength*100).toFixed(0)}%) vs big bet` };
    }

    // Call small bets even with weaker hands
    if (valid_actions.includes('call') && to_call < pot * 0.3) {
        return { action: 'call', thought_process: `🤖 Small bet, calling` };
    }

    if (valid_actions.includes('check')) {
        return { action: 'check', thought_process: `🤖 Free check` };
    }

    return { action: 'fold', thought_process: `🤖 Folding (${(strength*100).toFixed(0)}%)` };
}

async function runOpenClaw() {
    console.log('🤖 Starting OpenClawBot...');

    // Register OpenClawBot
    const reg = await api('POST', '/register', null, { agent_name: 'OpenClawBot' });
    clawToken = reg.api_token;
    console.log(`🤖 Registered OpenClawBot: ${reg.name} (${reg.agent_id})`);

    while (true) {
        try {
            const state = await api('GET', '/my-game', clawToken);

            if (state.status === 'idle') {
                console.log('🤖 OpenClawBot idle - joining queue');
                await api('POST', '/join-queue', clawToken);
                await sleep(3000);
                continue;
            }

            if (state.status === 'queued') {
                await sleep(2000);
                continue;
            }

            if (state.status === 'showdown') {
                if (state.hand_result) {
                    const winners = state.hand_result.winners.map(w => `${w.name} ($${w.amount_won})`).join(', ');
                    console.log(`🤖 Hand #${state.hand_number} result: ${winners}`);
                }
                await sleep(3000);
                continue;
            }

            if (state.your_turn) {
                const decision = decide(state);
                console.log(`🤖 OpenClawBot Hand #${state.hand_number}: ${decision.action}${decision.amount ? ' $' + decision.amount : ''}`);

                const result = await api('POST', '/action', clawToken, decision);
                if (result.error) {
                    console.log(`🤖 Action rejected: ${result.error}`);
                    await sleep(1000);
                    continue;
                }

                // Wait for turn to end
                for (let i = 0; i < 10; i++) {
                    await sleep(500);
                    const check = await api('GET', '/my-game', clawToken);
                    if (!check.your_turn) break;
                }
            } else {
                await sleep(1000);
            }
        } catch (error) {
            console.error(`🤖 Error: ${error.message}`);
            await sleep(2000);
        }
    }
}

// Clean exit handler
async function cleanup() {
    console.log('\n🤖 OpenClawBot shutting down...');
    if (clawToken) {
        try {
            await api('POST', '/leave', clawToken);
        } catch (e) {
            // Ignore cleanup errors
        }
    }
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start OpenClawBot
console.log('═══════════════════════════════════════');
console.log('   🤖 OPENCLAWBOT ACTIVATION 🤖');
console.log('═══════════════════════════════════════');
console.log('Press Ctrl+C to stop\n');

runOpenClaw().catch(console.error);