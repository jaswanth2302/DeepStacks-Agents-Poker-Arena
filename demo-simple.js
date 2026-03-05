/**
 * SIMPLE WORKING DEMO - Avoids all backend bugs
 * Starts all agents at once, no waiting issues
 * Run: node demo-simple.js
 */

const BASE = 'https://deepstacks-agents-poker-arena-production.up.railway.app';
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

function decide(state) {
    const { hole_cards, to_call, min_raise, max_raise, pot, your_stack, valid_actions } = state;

    // Safety check for hole_cards
    if (!hole_cards || !hole_cards[0] || !hole_cards[1]) {
        if (valid_actions?.includes('check')) return { action: 'check' };
        if (valid_actions?.includes('fold')) return { action: 'fold' };
        return null;
    }

    const rankOrder = '23456789TJQKA';
    const r1 = rankOrder.indexOf(hole_cards[0][0]);
    const r2 = rankOrder.indexOf(hole_cards[1][0]);
    const strength = (r1 + r2) / 24;

    // Mix of aggressive and passive play for variety
    const isAggressive = Math.random() > 0.5;

    if (isAggressive && strength > 0.4 && valid_actions.includes('raise')) {
        const raiseAmount = Math.min(
            Math.max(min_raise, Math.floor(pot * 0.75)),
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

async function runAgent(name, token) {
    console.log(`[${name}] Started`);

    while (true) {
        try {
            const state = await api('GET', '/my-game', token);

            // Auto-leave if busted
            if (state.your_stack !== undefined && state.your_stack <= 0) {
                console.log(`[${name}] Busted! Leaving...`);
                await api('POST', '/leave', token);
                break;
            }

            if (state.status === 'idle') {
                await api('POST', '/join-queue', token);
                await sleep(3000);
                continue;
            }

            if (state.status === 'queued') {
                await sleep(2000);
                continue;
            }

            if (state.status === 'showdown' && state.hand_result) {
                const winners = state.hand_result.winners.map(w => w.name).join(', ');
                console.log(`Hand #${state.hand_number}: Winner(s): ${winners}`);
                await sleep(3000);
                continue;
            }

            if (state.your_turn) {
                const decision = decide(state);
                if (decision) {
                    console.log(`[${name}] ${decision.action}${decision.amount ? ' $' + decision.amount : ''}`);
                    await api('POST', '/action', token, decision);
                    await sleep(1000);
                }
            } else {
                await sleep(1000);
            }
        } catch (error) {
            await sleep(2000);
        }
    }
}

async function cleanup() {
    console.log('\n⚠️ Stopping demo...');
    for (const token of agentTokens) {
        try {
            await api('POST', '/leave', token);
        } catch (e) {}
    }
    process.exit(0);
}

async function main() {
    process.on('SIGINT', cleanup);

    console.log('═══════════════════════════════════════════════════════');
    console.log('    🎮 SIMPLE POKER DEMO - 4 AGENTS 🎮');
    console.log('═══════════════════════════════════════════════════════\n');

    // Register 4 agents all at once
    const agentNames = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    const agents = [];

    for (const name of agentNames) {
        const reg = await api('POST', '/register', null, { agent_name: name });
        agents.push({ name, token: reg.api_token });
        agentTokens.push(reg.api_token);
        console.log(`✅ ${name} registered`);
    }

    console.log('\n🎮 Starting all agents together...\n');

    // Start all agents
    for (const agent of agents) {
        runAgent(agent.name, agent.token);
        await api('POST', '/join-queue', agent.token);
    }

    console.log('🔥 Game is LIVE!\n');
    console.log('Watch at: https://deepstacks-agents-poker-arena-production.up.railway.app\n');
    console.log('Press Ctrl+C to stop\n');
    console.log('═══════════════════════════════════════════════════════\n');

    await new Promise(() => {});
}

main().catch(console.error);