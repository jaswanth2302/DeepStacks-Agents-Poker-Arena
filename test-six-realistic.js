/**
 * Test script: six autonomous agents playing poker with different personalities.
 *
 * USAGE:
 *   node test-six-realistic.js                    (uses Railway production)
 *   ARENA_URL=http://localhost:3001 node test-six-realistic.js  (uses local)
 *
 * Watch: open browser to same URL being used
 */

const BASE = process.env.ARENA_URL || 'https://deepstacks-agents-poker-arena-production.up.railway.app';

// Agent personalities for demo
const PERSONALITIES = {
    TightAggro: { icon: '🎯', desc: 'TAG - Plays premium hands, bets aggressively', color: '#ef4444' },
    LooseAggro: { icon: '⚡', desc: 'LAG - Plays many hands, very aggressive', color: '#f59e0b' },
    TightPassive: { icon: '🛡️', desc: 'Rock - Only plays strong hands, calls mostly', color: '#3b82f6' },
    CallingStation: { icon: '🐟', desc: 'Fish - Calls everything, rarely folds', color: '#10b981' },
    Maniac: { icon: '🎰', desc: 'Wild - Raises constantly, unpredictable', color: '#a855f7' },
    Professional: { icon: '👑', desc: 'Pro - Balanced, reads opponents, adapts', color: '#fbbf24' }
};

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

/** Simple decision-making: check/call weak hands, raise strong hands */
function decide(state) {
    const { hole_cards, board_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions } = state;

    // Very basic hand strength: high cards = stronger
    const rankOrder = '23456789TJQKA';
    const r1 = rankOrder.indexOf(hole_cards[0][0]);
    const r2 = rankOrder.indexOf(hole_cards[1][0]);
    const paired = hole_cards[0][0] === hole_cards[1][0];
    const strength = paired ? 0.7 + (r1 / 12) * 0.3 : (r1 + r2) / 24;

    if (!valid_actions.includes('raise') && valid_actions.includes('check')) {
        return { action: 'check' };
    }

    if (strength > 0.65 && valid_actions.includes('raise')) {
        // Raise 2.5x-3x the current bet or pot-size bet
        const raiseAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * 0.75)),
            max_raise
        );
        return { action: 'raise', amount: raiseAmount, thought_process: `Strong hand (${(strength*100).toFixed(0)}%), raising to ${raiseAmount}.` };
    }

    if (strength > 0.35 && to_call <= pot * 0.5) {
        if (valid_actions.includes('call')) {
            return { action: 'call', thought_process: `Decent hand (${(strength*100).toFixed(0)}%), calling ${to_call}.` };
        }
        return { action: 'check' };
    }

    if (to_call === 0 && valid_actions.includes('check')) {
        return { action: 'check', thought_process: `Weak hand (${(strength*100).toFixed(0)}%), checking.` };
    }

    if (to_call > 0 && to_call < your_stack * 0.05 && valid_actions.includes('call')) {
        return { action: 'call', thought_process: `Cheap call (${to_call}), worth seeing.` };
    }

    return { action: 'fold', thought_process: `Weak hand (${(strength*100).toFixed(0)}%), folding.` };
}

async function runAgent(name, token) {
    const personality = PERSONALITIES[name];
    console.log(`${personality.icon} [${name}] Starting game loop...`);
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

            if (state.status === 'showdown') {
                if (state.hand_result) {
                    const winners = state.hand_result.winners.map(w => `${w.name} ($${w.amount_won})`).join(', ');
                    console.log(`\n🏆 HAND #${state.hand_number} RESULT: ${winners}\n`);
                    hands++;
                }
                await sleep(3000);
                continue;
            }

            if (state.your_turn) {
                const decision = decide(state);
                const actionEmoji = decision.action === 'raise' ? '📈' : decision.action === 'fold' ? '📉' : '✅';
                console.log(`${actionEmoji} [${name}] Hand #${state.hand_number} ${state.round}: ${decision.action.toUpperCase()}${decision.amount ? ' $' + decision.amount : ''} | Cards: ${state.hole_cards.join(' ')} | Board: ${state.board_cards.join(' ') || '-'}`);

                const result = await api('POST', '/action', token, decision);
                if (result.error) {
                    console.log(`❌ [${name}] Action rejected: ${result.error}`);
                    await sleep(1000);
                    continue;
                }

                // Wait until our turn is over before polling again
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

    console.log(`\n✅ [${name}] Completed ${hands} hands. Exiting gracefully.\n`);
    await api('POST', '/leave', token);
}

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║       🎰 DEEPSTACK ARENA - 6 AI AGENTS DEMO 🎰       ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    console.log(`🌐 Server: ${BASE}\n`);
    console.log('📋 Registering 6 AI agents with unique personalities...\n');

    const a1 = await api('POST', '/register', null, { agent_name: 'TightAggro' });
    const a2 = await api('POST', '/register', null, { agent_name: 'LooseAggro' });
    const a3 = await api('POST', '/register', null, { agent_name: 'TightPassive' });
    const a4 = await api('POST', '/register', null, { agent_name: 'CallingStation' });
    const a5 = await api('POST', '/register', null, { agent_name: 'Maniac' });
    const a6 = await api('POST', '/register', null, { agent_name: 'Professional' });

    console.log(`${PERSONALITIES.TightAggro.icon} Agent 1: ${a1.name} - ${PERSONALITIES.TightAggro.desc}`);
    console.log(`${PERSONALITIES.LooseAggro.icon} Agent 2: ${a2.name} - ${PERSONALITIES.LooseAggro.desc}`);
    console.log(`${PERSONALITIES.TightPassive.icon} Agent 3: ${a3.name} - ${PERSONALITIES.TightPassive.desc}`);
    console.log(`${PERSONALITIES.CallingStation.icon} Agent 4: ${a4.name} - ${PERSONALITIES.CallingStation.desc}`);
    console.log(`${PERSONALITIES.Maniac.icon} Agent 5: ${a5.name} - ${PERSONALITIES.Maniac.desc}`);
    console.log(`${PERSONALITIES.Professional.icon} Agent 6: ${a6.name} - ${PERSONALITIES.Professional.desc}`);

    console.log('\n🎯 Joining 6-max poker queue...\n');
    await api('POST', '/join-queue', a1.api_token);
    await api('POST', '/join-queue', a2.api_token);
    await api('POST', '/join-queue', a3.api_token);
    await api('POST', '/join-queue', a4.api_token);
    await api('POST', '/join-queue', a5.api_token);
    await api('POST', '/join-queue', a6.api_token);
    console.log('✅ All 6 agents queued successfully!');
    console.log('⏳ Waiting for game to start...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Run all 6 agents concurrently
    await Promise.all([
        runAgent(a1.name, a1.api_token),
        runAgent(a2.name, a2.api_token),
        runAgent(a3.name, a3.api_token),
        runAgent(a4.name, a4.api_token),
        runAgent(a5.name, a5.api_token),
        runAgent(a6.name, a6.api_token),
    ]);

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║              🎉 DEMO COMPLETE! 🎉                    ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
});
