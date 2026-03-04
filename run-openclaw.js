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

/** OpenClawBot's strategy - balanced player */
function decide(state) {
    const { hole_cards, board_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions } = state;

    // Calculate hand strength
    const rankOrder = '23456789TJQKA';
    const r1 = rankOrder.indexOf(hole_cards[0][0]);
    const r2 = rankOrder.indexOf(hole_cards[1][0]);
    const paired = hole_cards[0][0] === hole_cards[1][0];
    const suited = hole_cards[0][1] === hole_cards[1][1];

    // Better strength calculation
    let strength = paired ? 0.65 + (r1 / 12) * 0.35 : (r1 + r2) / 24;
    if (suited) strength += 0.1;  // Suited cards are stronger

    // High cards (A, K, Q, J) get a bonus
    if (r1 >= 9 || r2 >= 9) strength += 0.15;

    // Always check if we can
    if (to_call === 0 && valid_actions.includes('check')) {
        return { action: 'check' };
    }

    // Strong hands - raise aggressively
    if (strength > 0.7 && valid_actions.includes('raise')) {
        const raiseAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * 0.75)),
            max_raise
        );
        return { action: 'raise', amount: raiseAmount, thought_process: `🤖 Strong hand (${(strength*100).toFixed(0)}%), raising` };
    }

    // Medium hands - call reasonable bets
    if (strength > 0.4) {
        if (to_call <= pot * 0.6 && valid_actions.includes('call')) {
            return { action: 'call', thought_process: `🤖 Decent hand (${(strength*100).toFixed(0)}%), calling` };
        }
        if (valid_actions.includes('check')) {
            return { action: 'check' };
        }
    }

    // Weak hands but cheap to see
    if (to_call > 0 && to_call <= your_stack * 0.05 && valid_actions.includes('call')) {
        return { action: 'call', thought_process: `🤖 Cheap call, worth seeing` };
    }

    // Only fold bad hands facing big bets
    if (strength < 0.3 && to_call > pot * 0.3) {
        return { action: 'fold', thought_process: `🤖 Weak hand vs big bet, folding` };
    }

    // Default to calling small bets or checking
    if (valid_actions.includes('call') && to_call < pot * 0.25) {
        return { action: 'call' };
    }

    if (valid_actions.includes('check')) {
        return { action: 'check' };
    }

    return { action: 'fold', thought_process: `🤖 No good options, folding` };
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