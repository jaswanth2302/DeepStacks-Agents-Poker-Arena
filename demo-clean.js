/**
 * CLEAN DEMO SCRIPT - Agents properly wait when joining mid-hand
 * Run: node demo-clean.js
 * This ensures proper waiting behavior
 */

const BASE = process.env.ARENA_URL || 'https://deepstacks-agents-poker-arena-production.up.railway.app';

let agentTokens = [];

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

/** Decision making with proper waiting handling */
function decide(state) {
    const { hole_cards, board_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions } = state;

    // NO CARDS = We're waiting for next hand - DON'T try to play!
    if (!hole_cards || !hole_cards[0] || !hole_cards[1]) {
        console.log('[Agent] Waiting for next hand (no cards dealt)');
        // Don't make any actions when waiting
        return null; // Return null to skip action
    }

    // Normal decision logic when we have cards
    const rankOrder = '23456789TJQKA';
    const r1 = rankOrder.indexOf(hole_cards[0][0]);
    const r2 = rankOrder.indexOf(hole_cards[1][0]);
    const paired = hole_cards[0][0] === hole_cards[1][0];
    let strength = paired ? 0.7 + (r1 / 12) * 0.3 : (r1 + r2) / 24;

    // Add some aggression
    if (strength > 0.6 && valid_actions.includes('raise')) {
        const raiseAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * 0.75)),
            max_raise
        );
        return { action: 'raise', amount: raiseAmount };
    }

    if (strength > 0.4 && to_call <= pot) {
        if (valid_actions.includes('call')) {
            return { action: 'call' };
        }
    }

    if (to_call === 0 && valid_actions.includes('check')) {
        return { action: 'check' };
    }

    if (to_call < your_stack * 0.1 && valid_actions.includes('call')) {
        return { action: 'call' };
    }

    return { action: 'fold' };
}

async function runAgent(name, token) {
    console.log(`[${name}] Starting game loop...`);
    let isWaiting = false;

    while (true) {
        try {
            const state = await api('GET', '/my-game', token);

            // Check if busted
            if (state.your_stack !== undefined && state.your_stack <= 0) {
                console.log(`[${name}] Out of chips! Leaving table...`);
                await api('POST', '/leave', token);
                break;
            }

            if (state.status === 'idle') {
                console.log(`[${name}] Joining queue...`);
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
                    console.log(`[${name}] Hand result: ${winners}`);
                    isWaiting = false; // Reset waiting status on new hand
                }
                await sleep(3000);
                continue;
            }

            // Check if we're in a waiting state (no cards but game is active)
            if (!state.hole_cards || state.hole_cards.length === 0) {
                if (!isWaiting) {
                    console.log(`[${name}] ⏳ WAITING for next hand (joined mid-game)`);
                    isWaiting = true;
                }
                await sleep(2000);
                continue; // Don't try to make decisions without cards!
            }

            if (state.your_turn) {
                const decision = decide(state);
                if (decision) {
                    console.log(`[${name}] ${state.round}: ${decision.action}${decision.amount ? ' $' + decision.amount : ''}`);
                    const result = await api('POST', '/action', token, decision);
                    if (result.error) {
                        console.log(`[${name}] Error: ${result.error}`);
                    }
                }
                await sleep(1000);
            } else {
                await sleep(1000);
            }
        } catch (error) {
            console.error(`[${name}] Error: ${error.message}`);
            await sleep(2000);
        }
    }
}

async function cleanup() {
    console.log('\n⚠️  Shutting down demo...');
    for (const token of agentTokens) {
        try {
            await api('POST', '/leave', token);
        } catch (e) {}
    }
    console.log('✅ All agents have left');
    process.exit(0);
}

async function main() {
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║         🎮 CLEAN DEMO - PROPER WAITING 🎮               ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('📍 Starting with 2 agents first...\n');

    // Register first 2 agents
    const agent1 = await api('POST', '/register', null, { agent_name: 'PlayerOne' });
    const agent2 = await api('POST', '/register', null, { agent_name: 'PlayerTwo' });

    agentTokens = [agent1.api_token, agent2.api_token];

    console.log(`✅ ${agent1.name} registered`);
    console.log(`✅ ${agent2.name} registered\n`);

    // Start first 2 agents
    runAgent(agent1.name, agent1.api_token);
    runAgent(agent2.name, agent2.api_token);

    // Join queue
    await api('POST', '/join-queue', agent1.api_token);
    await api('POST', '/join-queue', agent2.api_token);

    console.log('🎮 First 2 agents starting game...\n');
    console.log('⏰ Will add 2 more agents in 20 seconds...\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Wait 20 seconds then add 2 more
    setTimeout(async () => {
        console.log('\n📍 Adding 2 more agents (they will WAIT for next hand)...\n');

        const agent3 = await api('POST', '/register', null, { agent_name: 'PlayerThree' });
        const agent4 = await api('POST', '/register', null, { agent_name: 'PlayerFour' });

        agentTokens.push(agent3.api_token, agent4.api_token);

        console.log(`✅ ${agent3.name} joining (will wait)`);
        console.log(`✅ ${agent4.name} joining (will wait)\n`);

        // Start the agents
        runAgent(agent3.name, agent3.api_token);
        runAgent(agent4.name, agent4.api_token);

        // Join queue
        await api('POST', '/join-queue', agent3.api_token);
        await api('POST', '/join-queue', agent4.api_token);

        console.log('⏳ New agents should show WAITING badges in UI\n');
        console.log('They will join automatically when current hand finishes!\n');
        console.log('═══════════════════════════════════════════════════════════\n');
    }, 20000);

    // Keep running
    await new Promise(() => {});
}

main().catch(console.error);