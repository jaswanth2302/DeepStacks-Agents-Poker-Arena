/**
 * Test script for 6-max table system
 * This script tests the realistic poker table implementation
 *
 * USAGE:
 *   node test-six-max-working.js                    (uses production)
 *   ARENA_URL=http://localhost:3001 node test-six-max-working.js  (uses local)
 */

const BASE = process.env.ARENA_URL || 'https://deepstacks-agents-poker-arena-production.up.railway.app';

// Agent profiles for testing
const AGENTS = [
  { name: 'Alice-6Max' },
  { name: 'Bob-6Max' },
  { name: 'Charlie-6Max' },
  { name: 'David-6Max' },
  { name: 'Eve-6Max' },
  { name: 'Frank-6Max' },
  { name: 'Grace-6Max' },
  { name: 'Henry-6Max' }
];

// Store agent credentials
const agentCredentials = new Map();

async function api(method, path, token, body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(`${BASE}${path}`, opts);
        const text = await res.text();

        // Try to parse as JSON
        try {
            return JSON.parse(text);
        } catch {
            console.error(`Response was not JSON: ${text.substring(0, 100)}...`);
            throw new Error(`Invalid response from ${path}`);
        }
    } catch (error) {
        console.error(`API call failed: ${error.message}`);
        throw error;
    }
}

async function registerAgent(agentName) {
  try {
    const data = await api('POST', '/register', null, { agent_name: agentName });

    if (data.agent_id && data.api_token) {
      agentCredentials.set(agentName, data);
      console.log(`✅ Registered: ${agentName} (ID: ${data.agent_id.slice(0, 8)}...)`);
      return data;
    } else {
      console.error(`❌ Registration failed for ${agentName}:`, data);
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to register ${agentName}:`, error.message);
    return null;
  }
}

async function joinQueue(agentName) {
  const creds = agentCredentials.get(agentName);
  if (!creds) {
    console.error(`No credentials for ${agentName}`);
    return false;
  }

  try {
    const data = await api('POST', '/join-queue', creds.api_token);

    if (data.message) {
      console.log(`✅ ${agentName} joined queue (position: ${data.queue_position || 'unknown'})`);
      return true;
    } else if (data.error) {
      console.log(`⚠️ ${agentName}: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to join queue for ${agentName}:`, error.message);
    return false;
  }
}

async function checkGameStatus(agentName) {
  const creds = agentCredentials.get(agentName);
  if (!creds) return null;

  try {
    const data = await api('GET', '/my-game', creds.api_token);
    return data;
  } catch (error) {
    return null;
  }
}

async function checkQueueStatus() {
  try {
    const data = await api('GET', '/queue-status');

    console.log('\n📊 Queue Status:');
    console.log(`   Queue length: ${data.queue_length}`);
    console.log(`   Active tables: ${data.active_tables}`);

    if (data.tables && data.tables.length > 0) {
      console.log('   Tables:');
      data.tables.forEach(table => {
        console.log(`     - Table ${table.id}: ${table.occupancy} (${table.status})`);
        if (table.waiting_players > 0) {
          console.log(`       ${table.waiting_players} waiting`);
        }
      });
    }

    if (data.queued_agents && data.queued_agents.length > 0) {
      console.log('   Queued agents:');
      data.queued_agents.forEach(agent => {
        console.log(`     - ${agent.name} (waiting ${Math.floor(agent.waited_ms / 1000)}s)`);
      });
    }

    return data;
  } catch (error) {
    console.error('Failed to check queue status:', error);
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🎰 Testing 6-Max Table System\n');
  console.log(`🌐 Server: ${BASE}\n`);
  console.log('================================\n');

  // First, test if the server is working
  console.log('Testing server connection...');
  try {
    const testData = await api('GET', '/queue-status');
    console.log('✅ Server is responding\n');
  } catch (error) {
    console.error('❌ Server is not responding. Make sure the backend is running.');
    console.error('   If using local server, run: npm start');
    console.error('   Then run: ARENA_URL=http://localhost:3001 node test-six-max-working.js');
    return;
  }

  // Register all agents
  console.log('📝 Registering agents...\n');
  let registeredCount = 0;
  for (const agent of AGENTS) {
    const result = await registerAgent(agent.name);
    if (result) registeredCount++;
    await sleep(100);
  }

  if (registeredCount === 0) {
    console.error('\n❌ No agents could be registered. Server may be having issues.');
    return;
  }

  console.log(`\n✅ Registered ${registeredCount}/${AGENTS.length} agents`);
  console.log('\n🎯 Testing table creation and seat management...\n');

  // Test 1: First agent creates table
  console.log('Test 1: First agent creates table and waits');
  await joinQueue(AGENTS[0].name);
  await sleep(2000);
  await checkQueueStatus();

  // Test 2: Second agent joins - should trigger 15s wait
  console.log('\nTest 2: Second agent joins table');
  await joinQueue(AGENTS[1].name);
  await sleep(2000);
  await checkQueueStatus();

  // Test 3: More agents join during the wait period
  console.log('\nTest 3: More agents join same table (filling seats)');
  await joinQueue(AGENTS[2].name);
  await sleep(1000);
  await joinQueue(AGENTS[3].name);
  await sleep(1000);
  await joinQueue(AGENTS[4].name);
  await sleep(1000);
  await checkQueueStatus();

  // Test 4: 6th agent fills the table
  console.log('\nTest 4: 6th agent fills the table (6/6)');
  await joinQueue(AGENTS[5].name);
  await sleep(2000);
  await checkQueueStatus();

  // Test 5: 7th agent should create new table
  console.log('\nTest 5: 7th agent creates new table (first table full)');
  await joinQueue(AGENTS[6].name);
  await sleep(2000);
  await checkQueueStatus();

  // Test 6: Check game status for some agents
  console.log('\nTest 6: Checking game status for agents...');
  for (let i = 0; i < Math.min(3, registeredCount); i++) {
    const status = await checkGameStatus(AGENTS[i].name);
    if (status) {
      console.log(`${AGENTS[i].name}: ${status.status}`);
      if (status.seats) {
        const occupied = status.seats.filter(s => s.state !== 'empty').length;
        const waiting = status.seats.filter(s => s.state === 'waiting').length;
        console.log(`  Seats: ${occupied}/6 occupied, ${waiting} waiting`);
      }
    }
  }

  console.log('\n✅ Test completed!');
  console.log(`Check the frontend at ${BASE.replace('3001', '5173')} to see the table visualization`);
}

// Run the test
runTest().catch(error => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});