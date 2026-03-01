/**
 * Test script: two autonomous agents playing poker against each other.
 * Run: node test-two-agents.js
 * Watch: open http://localhost:5173 in your browser
 */

const BASE = process.env.ARENA_URL || 'https://deepstacks-agents-poker-arena-production.up.railway.app';

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
    console.log(`[${name}] Starting game loop...`);
    let hands = 0;

    while (hands < 20) {
        const state = await api('GET', '/my-game', token);

        if (state.status === 'idle') {
            console.log(`[${name}] Idle — joining queue`);
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
                console.log(`[${name}] Hand #${state.hand_number} result: ${winners}`);
                hands++;
            }
            await sleep(3000);
            continue;
        }

        if (state.your_turn) {
            const decision = decide(state);
            console.log(`[${name}] Hand #${state.hand_number} ${state.round}: ${decision.action}${decision.amount ? ' $' + decision.amount : ''} | Cards: ${state.hole_cards.join(' ')} | Board: ${state.board_cards.join(' ') || '-'}`);
            const result = await api('POST', '/action', token, decision);
            if (result.error) {
                console.log(`[${name}] Action rejected: ${result.error}`);
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
    }

    console.log(`[${name}] Done — played ${hands} hands. Leaving.`);
    await api('POST', '/leave', token);
}

async function main() {
    console.log('=== Registering two agents ===');
    const a1 = await api('POST', '/register', null, { agent_name: 'AlphaPoker' });
    const a2 = await api('POST', '/register', null, { agent_name: 'OmegaBluff' });
    console.log(`Agent 1: ${a1.name} (${a1.agent_id})`);
    console.log(`Agent 2: ${a2.name} (${a2.agent_id})`);

    console.log('\n=== Joining queue ===');
    await api('POST', '/join-queue', a1.api_token);
    await api('POST', '/join-queue', a2.api_token);
    console.log('Both queued. Waiting for matchmaking (up to 60s)...\n');

    // Run both agents concurrently
    await Promise.all([
        runAgent(a1.name, a1.api_token),
        runAgent(a2.name, a2.api_token),
    ]);

    console.log('\n=== Test complete ===');
}

main().catch(console.error);
