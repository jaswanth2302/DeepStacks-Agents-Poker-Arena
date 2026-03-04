/**
 * 🎯 HYBRID DEMO - 1 ClawBot + 5 Internal Agents
 *
 * This demonstrates:
 * 1. External bot integration (ClawBot using API)
 * 2. Internal agents with diverse personalities
 * 3. Real competitive poker gameplay
 *
 * Perfect for showing your platform's flexibility!
 *
 * Run: node demo-hybrid.js
 */

const BASE = process.env.ARENA_URL || 'https://deepstacks-agents-poker-arena-production.up.railway.app';

// Agent personalities (same as test-six-realistic)
const PERSONALITIES = {
    TightAggro: { icon: '🎯', desc: 'TAG - Plays premium hands, bets aggressively', color: '#ef4444' },
    LooseAggro: { icon: '⚡', desc: 'LAG - Plays many hands, very aggressive', color: '#f59e0b' },
    TightPassive: { icon: '🛡️', desc: 'Rock - Only plays strong hands, calls mostly', color: '#3b82f6' },
    CallingStation: { icon: '🐟', desc: 'Fish - Calls everything, rarely folds', color: '#10b981' },
    Professional: { icon: '👑', desc: 'Pro - Balanced, reads opponents, adapts', color: '#fbbf24' },
    ClawBot: { icon: '🤖', desc: 'External AI - API Integration Demo', color: '#8b5cf6' }
};

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
    const res = await fetch(`${BASE}${path}`, opts);
    return res.json();
}

/** ClawBot decision logic (improved - doesn't always fold!) */
function clawBotDecide(state) {
    const { hole_cards, board_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions } = state;

    const rankOrder = '23456789TJQKA';
    const r1 = rankOrder.indexOf(hole_cards[0][0]);
    const r2 = rankOrder.indexOf(hole_cards[1][0]);
    const paired = hole_cards[0][0] === hole_cards[1][0];
    const strength = paired ? 0.7 + (r1 / 12) * 0.3 : (r1 + r2) / 24;

    // Can check for free?
    if (to_call === 0 && valid_actions.includes('check')) {
        if (strength > 0.65 && valid_actions.includes('raise')) {
            const amt = Math.min(Math.max(min_raise, Math.floor(pot * 0.75)), max_raise);
            return { action: 'raise', amount: amt, thought_process: `Strong hand (${(strength*100).toFixed(0)}%), betting` };
        }
        return { action: 'check', thought_process: 'Check to see more cards' };
    }

    // Facing a bet
    if (to_call > 0) {
        // Strong hand? Raise
        if (strength > 0.7 && valid_actions.includes('raise')) {
            const amt = Math.min(to_call * 3, max_raise, your_stack);
            return { action: 'raise', amount: amt, thought_process: `Very strong (${(strength*100).toFixed(0)}%), raising!` };
        }
        // Good hand? Call
        if (strength > 0.5 && valid_actions.includes('call')) {
            return { action: 'call', thought_process: `Decent hand (${(strength*100).toFixed(0)}%), calling` };
        }
        // Medium + small bet? Sometimes call
        if (strength > 0.35 && to_call < pot * 0.5 && valid_actions.includes('call')) {
            return { action: 'call', thought_process: `Medium hand, small bet` };
        }
        // Weak? Fold
        return { action: 'fold', thought_process: `Weak hand (${(strength*100).toFixed(0)}%)` };
    }

    return valid_actions.includes('check') ? { action: 'check' } : { action: 'fold' };
}

/** Internal agent decision logic (same as test-six-realistic) */
function internalAgentDecide(state) {
    const { hole_cards, board_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions } = state;

    const rankOrder = '23456789TJQKA';
    const r1 = rankOrder.indexOf(hole_cards[0][0]);
    const r2 = rankOrder.indexOf(hole_cards[1][0]);
    const paired = hole_cards[0][0] === hole_cards[1][0];
    const strength = paired ? 0.7 + (r1 / 12) * 0.3 : (r1 + r2) / 24;

    if (!valid_actions.includes('raise') && valid_actions.includes('check')) {
        return { action: 'check' };
    }

    if (strength > 0.65 && valid_actions.includes('raise')) {
        const raiseAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * 0.75)),
            max_raise
        );
        return { action: 'raise', amount: raiseAmount, thought_process: `Strong hand (${(strength*100).toFixed(0)}%)` };
    }

    if (strength > 0.35 && to_call <= pot * 0.5) {
        if (valid_actions.includes('call')) {
            return { action: 'call', thought_process: `Decent hand (${(strength*100).toFixed(0)}%)` };
        }
        return { action: 'check' };
    }

    if (to_call === 0 && valid_actions.includes('check')) {
        return { action: 'check', thought_process: `Weak hand, checking` };
    }

    if (to_call > 0 && to_call < your_stack * 0.05 && valid_actions.includes('call')) {
        return { action: 'call', thought_process: `Cheap call` };
    }

    return { action: 'fold', thought_process: `Weak hand` };
}

/** Run ClawBot (external) */
async function runClawBot(name, token) {
    console.log(`🤖 [${name}] Starting game loop (EXTERNAL BOT)...`);
    let hands = 0;

    while (hands < 20) {
        try {
            const state = await api('GET', '/my-game', token);

            if (state.status === 'idle') {
                console.log(`🤖 [${name}] Idle — joining queue`);
                await api('POST', '/join-queue', token);
                await sleep(3000);
                continue;
            }

            if (state.status === 'queued') {
                await sleep(2000);
                continue;
            }

            if (state.status === 'showdown' && state.hand_result) {
                const winners = state.hand_result.winners.map(w => `${w.name} ($${w.amount_won})`).join(', ');
                console.log(`\n🏆 HAND #${state.hand_number} RESULT: ${winners}\n`);
                hands++;
                await sleep(3000);
                continue;
            }

            if (state.your_turn) {
                const decision = clawBotDecide(state);
                const actionEmoji = decision.action === 'raise' ? '📈' : decision.action === 'fold' ? '📉' : '✅';
                console.log(`${actionEmoji} [${name}] Hand #${state.hand_number} ${state.round}: ${decision.action.toUpperCase()}${decision.amount ? ' $' + decision.amount : ''} | Cards: ${state.hole_cards.join(' ')} | Board: ${state.board_cards.join(' ') || '-'}`);

                const result = await api('POST', '/action', token, decision);
                if (result.error) {
                    console.log(`❌ [${name}] Action rejected: ${result.error}`);
                    await sleep(1000);
                    continue;
                }

                for (let i = 0; i < 10; i++) {
                    await sleep(500);
                    const check = await api('GET', '/my-game', token);
                    if (!check.your_turn) break;
                }
            } else {
                await sleep(1000);
            }
        } catch (error) {
            console.error(`❌ [${name}] Error: ${error.message}`);
            await sleep(2000);
        }
    }

    console.log(`\n✅ [${name}] Completed ${hands} hands. Leaving.\n`);
    await api('POST', '/leave', token);
}

/** Run internal agent */
async function runInternalAgent(name, token) {
    const personality = PERSONALITIES[name];
    console.log(`${personality.icon} [${name}] Starting game loop (INTERNAL AGENT)...`);
    let hands = 0;

    while (hands < 20) {
        try {
            const state = await api('GET', '/my-game', token);

            if (state.status === 'idle') {
                console.log(`${personality.icon} [${name}] Idle — joining queue`);
                await api('POST', '/join-queue', token);
                await sleep(3000);
                continue;
            }

            if (state.status === 'queued') {
                await sleep(2000);
                continue;
            }

            if (state.status === 'showdown' && state.hand_result) {
                hands++;
                await sleep(3000);
                continue;
            }

            if (state.your_turn) {
                const decision = internalAgentDecide(state);
                const actionEmoji = decision.action === 'raise' ? '📈' : decision.action === 'fold' ? '📉' : '✅';
                console.log(`${actionEmoji} [${name}] Hand #${state.hand_number} ${state.round}: ${decision.action.toUpperCase()}${decision.amount ? ' $' + decision.amount : ''} | Cards: ${state.hole_cards.join(' ')} | Board: ${state.board_cards.join(' ') || '-'}`);

                const result = await api('POST', '/action', token, decision);
                if (result.error) {
                    console.log(`❌ [${name}] Action rejected: ${result.error}`);
                    await sleep(1000);
                    continue;
                }

                for (let i = 0; i < 10; i++) {
                    await sleep(500);
                    const check = await api('GET', '/my-game', token);
                    if (!check.your_turn) break;
                }
            } else {
                await sleep(1000);
            }
        } catch (error) {
            console.error(`❌ [${name}] Error: ${error.message}`);
            await sleep(2000);
        }
    }

    console.log(`\n✅ [${name}] Completed ${hands} hands. Leaving.\n`);
    await api('POST', '/leave', token);
}

/** Main execution */
async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║     🎯 HYBRID DEMO - CLAWBOT + 5 AGENTS 🎯          ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    console.log(`🌐 Server: ${BASE}\n`);
    console.log('📋 Registering agents...\n');

    // Register ClawBot (external)
    const clawbot = await api('POST', '/register', null, { agent_name: 'ClawBot' });
    console.log(`${PERSONALITIES.ClawBot.icon} ClawBot (EXTERNAL) - ${PERSONALITIES.ClawBot.desc}`);

    // Register 5 internal agents
    const a1 = await api('POST', '/register', null, { agent_name: 'TightAggro' });
    console.log(`${PERSONALITIES.TightAggro.icon} TightAggro (INTERNAL) - ${PERSONALITIES.TightAggro.desc}`);

    const a2 = await api('POST', '/register', null, { agent_name: 'LooseAggro' });
    console.log(`${PERSONALITIES.LooseAggro.icon} LooseAggro (INTERNAL) - ${PERSONALITIES.LooseAggro.desc}`);

    const a3 = await api('POST', '/register', null, { agent_name: 'TightPassive' });
    console.log(`${PERSONALITIES.TightPassive.icon} TightPassive (INTERNAL) - ${PERSONALITIES.TightPassive.desc}`);

    const a4 = await api('POST', '/register', null, { agent_name: 'CallingStation' });
    console.log(`${PERSONALITIES.CallingStation.icon} CallingStation (INTERNAL) - ${PERSONALITIES.CallingStation.desc}`);

    const a5 = await api('POST', '/register', null, { agent_name: 'Professional' });
    console.log(`${PERSONALITIES.Professional.icon} Professional (INTERNAL) - ${PERSONALITIES.Professional.desc}`);

    console.log('\n🎯 Joining 6-max poker queue...\n');
    await api('POST', '/join-queue', clawbot.api_token);
    await api('POST', '/join-queue', a1.api_token);
    await api('POST', '/join-queue', a2.api_token);
    await api('POST', '/join-queue', a3.api_token);
    await api('POST', '/join-queue', a4.api_token);
    await api('POST', '/join-queue', a5.api_token);

    console.log('✅ All 6 agents queued (1 external + 5 internal)!');
    console.log('⏳ Waiting for game to start...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Run all agents concurrently
    await Promise.all([
        runClawBot(clawbot.name, clawbot.api_token),
        runInternalAgent(a1.name, a1.api_token),
        runInternalAgent(a2.name, a2.api_token),
        runInternalAgent(a3.name, a3.api_token),
        runInternalAgent(a4.name, a4.api_token),
        runInternalAgent(a5.name, a5.api_token),
    ]);

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║              🎉 HYBRID DEMO COMPLETE! 🎉             ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
});
