/**
 * AGGRESSIVE DEMO SCRIPT - Shows exciting poker action for demo
 * Run: node demo-aggressive.js
 * This script creates 5 agents with varied aggressive playing styles
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

/** AGGRESSIVE SHARK - Raises frequently with good hands */
function sharkStrategy(state) {
    const { hole_cards, board_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions, round } = state;

    const rankOrder = '23456789TJQKA';
    const r1 = rankOrder.indexOf(hole_cards[0][0]);
    const r2 = rankOrder.indexOf(hole_cards[1][0]);
    const paired = hole_cards[0][0] === hole_cards[1][0];
    const suited = hole_cards[0][1] === hole_cards[1][1];

    let strength = paired ? 0.7 + (r1 / 12) * 0.3 : (r1 + r2) / 24;
    if (suited) strength += 0.15;
    if (r1 >= 10 || r2 >= 10) strength += 0.2; // Premium cards bonus

    // AGGRESSIVE: Raise more often, especially preflop
    if (round === 'preflop' && strength > 0.4 && valid_actions.includes('raise')) {
        const raiseAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * 1.5)), // Bigger raises
            max_raise
        );
        return { action: 'raise', amount: raiseAmount, thought_process: `🦈 Shark attack! (${(strength*100).toFixed(0)}%)` };
    }

    if (strength > 0.5 && valid_actions.includes('raise')) {
        const raiseAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * 0.8)),
            max_raise
        );
        return { action: 'raise', amount: raiseAmount };
    }

    if (strength > 0.3 && to_call <= pot && valid_actions.includes('call')) {
        return { action: 'call' };
    }

    if (to_call === 0 && valid_actions.includes('check')) {
        return { action: 'check' };
    }

    if (to_call < your_stack * 0.1 && valid_actions.includes('call')) {
        return { action: 'call' };
    }

    return { action: 'fold' };
}

/** MANIAC - Raises very frequently, even with weak hands */
function maniacStrategy(state) {
    const { hole_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions, round } = state;

    // MANIAC: Raise 60% of the time randomly
    if (Math.random() < 0.6 && valid_actions.includes('raise')) {
        const raiseAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * (0.5 + Math.random()))), // Random sized raises
            max_raise
        );
        return { action: 'raise', amount: raiseAmount, thought_process: `🎰 YOLO raise!` };
    }

    if (to_call === 0 && valid_actions.includes('check')) {
        return { action: 'check' };
    }

    // Call most of the time
    if (to_call < pot * 2 && valid_actions.includes('call')) {
        return { action: 'call', thought_process: `🎲 Let's gamble!` };
    }

    // Only fold huge bets
    if (to_call > your_stack * 0.5) {
        return { action: 'fold', thought_process: `Too rich for me!` };
    }

    if (valid_actions.includes('call')) {
        return { action: 'call' };
    }

    return { action: 'check' };
}

/** BALANCED PRO - Mix of aggressive and conservative play */
function proStrategy(state) {
    const { hole_cards, board_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions, round } = state;

    const rankOrder = '23456789TJQKA';
    const r1 = rankOrder.indexOf(hole_cards[0][0]);
    const r2 = rankOrder.indexOf(hole_cards[1][0]);
    const paired = hole_cards[0][0] === hole_cards[1][0];

    let strength = paired ? 0.75 + (r1 / 12) * 0.25 : (r1 + r2) / 24;

    // Mix up play - sometimes bluff
    const bluffChance = Math.random() < 0.25;

    if ((strength > 0.6 || bluffChance) && valid_actions.includes('raise')) {
        const raiseAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * 0.75)),
            max_raise
        );
        return { action: 'raise', amount: raiseAmount, thought_process: bluffChance ? `👑 Bluffing!` : `👑 Value bet!` };
    }

    if (strength > 0.4 && to_call <= pot && valid_actions.includes('call')) {
        return { action: 'call', thought_process: `👑 Calculated call` };
    }

    if (to_call === 0 && valid_actions.includes('check')) {
        return { action: 'check' };
    }

    return { action: 'fold', thought_process: `👑 Strategic fold` };
}

/** CALLING STATION - Calls almost everything */
function fishStrategy(state) {
    const { to_call, pot, your_stack, valid_actions } = state;

    // Fish rarely raises but calls everything
    if (Math.random() < 0.1 && valid_actions.includes('raise')) {
        return { action: 'raise', amount: state.min_raise, thought_process: `🐟 Surprise raise!` };
    }

    if (to_call === 0 && valid_actions.includes('check')) {
        return { action: 'check' };
    }

    // Call almost everything
    if (to_call < your_stack * 0.7 && valid_actions.includes('call')) {
        return { action: 'call', thought_process: `🐟 I call everything!` };
    }

    if (valid_actions.includes('check')) {
        return { action: 'check' };
    }

    return { action: 'fold', thought_process: `🐟 Too expensive...` };
}

/** TIGHT AGGRESSIVE - Only plays premium hands but plays them hard */
function tagStrategy(state) {
    const { hole_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions, round } = state;

    const rankOrder = '23456789TJQKA';
    const r1 = rankOrder.indexOf(hole_cards[0][0]);
    const r2 = rankOrder.indexOf(hole_cards[1][0]);
    const paired = hole_cards[0][0] === hole_cards[1][0];

    let strength = paired ? 0.8 + (r1 / 12) * 0.2 : (r1 + r2) / 24;

    // Only play strong hands
    if (strength < 0.55) {
        if (to_call > 0) return { action: 'fold', thought_process: `🎯 Not strong enough` };
        if (valid_actions.includes('check')) return { action: 'check' };
    }

    // But play them VERY aggressively
    if (strength > 0.65 && valid_actions.includes('raise')) {
        const raiseAmount = Math.min(
            Math.max(min_raise * 2, Math.floor(pot * 1.2)), // Big raises
            max_raise
        );
        return { action: 'raise', amount: raiseAmount, thought_process: `🎯 Premium hand, big raise!` };
    }

    if (to_call <= pot * 0.5 && valid_actions.includes('call')) {
        return { action: 'call' };
    }

    if (valid_actions.includes('check')) {
        return { action: 'check' };
    }

    return { action: 'fold' };
}

async function runAgent(name, token, strategy) {
    console.log(`[${name}] Starting aggressive game loop...`);

    while (true) {
        try {
            const state = await api('GET', '/my-game', token);

            if (state.status === 'idle') {
                console.log(`[${name}] Joining queue`);
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
                }
                await sleep(3000);
                continue;
            }

            if (state.your_turn) {
                const decision = strategy(state);
                console.log(`[${name}] ${state.round}: ${decision.action}${decision.amount ? ' $' + decision.amount : ''} - ${decision.thought_process || ''}`);

                const result = await api('POST', '/action', token, decision);
                if (result.error) {
                    console.log(`[${name}] Error: ${result.error}`);
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
    console.log('║     🎰 AGGRESSIVE POKER DEMO - DYNAMIC JOINING 🎰       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Define all agents with different personalities
    const allAgents = [
        { name: 'SharkAttack', strategy: sharkStrategy, desc: '🦈 Aggressive Shark' },
        { name: 'CrazyManiac', strategy: maniacStrategy, desc: '🎰 Wild Maniac' },
        { name: 'ProPlayer', strategy: proStrategy, desc: '👑 Balanced Pro' },
        { name: 'FishCaller', strategy: fishStrategy, desc: '🐟 Calling Station' },
        { name: 'TightAggro', strategy: tagStrategy, desc: '🎯 TAG Player' }
    ];

    // Split agents into waves
    const firstWave = allAgents.slice(0, 2);  // First 2 agents
    const secondWave = allAgents.slice(2, 4); // Next 2 agents
    const thirdWave = allAgents.slice(4, 5);  // Last agent

    console.log('📍 PHASE 1: Starting with 2 agents\n');

    const registeredAgents = [];

    // Register and join first 2 agents
    for (const agent of firstWave) {
        const reg = await api('POST', '/register', null, { agent_name: agent.name });
        agentTokens.push(reg.api_token);
        const agentData = {
            ...agent,
            token: reg.api_token,
            id: reg.agent_id
        };
        registeredAgents.push(agentData);
        console.log(`✅ ${agent.desc}: ${agent.name} registered`);

        // Start the agent immediately
        runAgent(agent.name, agent.token, agent.strategy);

        // Join queue
        await api('POST', '/join-queue', agent.token);
    }

    console.log('\n🎮 First 2 agents starting game...\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Wait 15 seconds then add 2 more agents
    setTimeout(async () => {
        console.log('\n📍 PHASE 2: Adding 2 more agents (they will WAIT)\n');

        for (const agent of secondWave) {
            const reg = await api('POST', '/register', null, { agent_name: agent.name });
            agentTokens.push(reg.api_token);
            const agentData = {
                ...agent,
                token: reg.api_token,
                id: reg.agent_id
            };
            registeredAgents.push(agentData);
            console.log(`✅ ${agent.desc}: ${agent.name} joining (will wait for next hand)`);

            // Start the agent
            runAgent(agent.name, agent.token, agent.strategy);

            // Join queue - they'll be in waiting state
            await api('POST', '/join-queue', agent.token);
        }

        console.log('\n⏳ New agents waiting for current hand to finish...\n');
        console.log('═══════════════════════════════════════════════════════════\n');
    }, 15000); // 15 seconds

    // Wait 30 seconds then add the 5th agent
    setTimeout(async () => {
        console.log('\n📍 PHASE 3: Adding 5th agent (will also WAIT)\n');

        for (const agent of thirdWave) {
            const reg = await api('POST', '/register', null, { agent_name: agent.name });
            agentTokens.push(reg.api_token);
            const agentData = {
                ...agent,
                token: reg.api_token,
                id: reg.agent_id
            };
            registeredAgents.push(agentData);
            console.log(`✅ ${agent.desc}: ${agent.name} joining (will wait for next hand)`);

            // Start the agent
            runAgent(agent.name, agent.token, agent.strategy);

            // Join queue - they'll be in waiting state
            await api('POST', '/join-queue', agent.token);
        }

        console.log('\n🔥 5 PLAYERS TOTAL - Full table action!\n');
        console.log('Press Ctrl+C to stop\n');
        console.log('═══════════════════════════════════════════════════════════\n');
    }, 30000); // 30 seconds

    // Keep the script running
    await new Promise(() => {});
}

main().catch(console.error);