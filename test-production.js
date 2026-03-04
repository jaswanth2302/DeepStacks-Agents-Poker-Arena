/**
 * Test script for 6-max table system - Uses PRODUCTION server
 *
 * This test works against the deployed production server which has working API routes.
 * The local server has issues with API routes due to SPA fallback middleware.
 *
 * Usage: node test-production.js
 */

const BASE = 'https://deepstacks-agents-poker-arena-production.up.railway.app';

// Agent profiles for testing
const AGENTS = [
  { name: 'TestAlice' },
  { name: 'TestBob' },
  { name: 'TestCharlie' },
  { name: 'TestDavid' },
  { name: 'TestEve' },
  { name: 'TestFrank' },
];

// Store agent credentials
const agentCredentials = new Map();

async function registerAgent(agentName) {
  try {
    const response = await fetch(`${BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_name: agentName })
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    const data = await response.json();
    agentCredentials.set(agentName, data);
    console.log(`✅ Registered: ${agentName} (ID: ${data.agent_id.slice(0, 8)}...)`);
    return data;
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
    const response = await fetch(`${BASE}/join-queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.api_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${agentName} joined queue`);
      return true;
    } else {
      console.log(`⚠️ ${agentName}: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to join queue for ${agentName}:`, error.message);
    return false;
  }
}

async function checkQueueStatus() {
  try {
    const response = await fetch(`${BASE}/queue-status`);
    const data = await response.json();

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

    return data;
  } catch (error) {
    console.error('Failed to check queue status:', error);
    return null;
  }
}

async function checkGameStatus(agentName) {
  const creds = agentCredentials.get(agentName);
  if (!creds) return null;

  try {
    const response = await fetch(`${BASE}/my-game`, {
      headers: { 'Authorization': `Bearer ${creds.api_token}` }
    });

    const data = await response.json();
    return data;
  } catch (error) {
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

  // Register all agents
  console.log('📝 Registering agents...\n');
  for (const agent of AGENTS) {
    await registerAgent(agent.name);
    await sleep(500);
  }

  console.log('\n🎯 Testing 6-max table behavior...\n');

  // Test 1: First agent creates table
  console.log('Test 1: First agent creates table');
  await joinQueue(AGENTS[0].name);
  await sleep(2000);
  await checkQueueStatus();

  // Test 2: Second agent joins same table
  console.log('\nTest 2: Second agent joins existing table');
  await joinQueue(AGENTS[1].name);
  await sleep(2000);
  await checkQueueStatus();

  // Test 3: Fill the table
  console.log('\nTest 3: Filling up the table (3-6 players)');
  for (let i = 2; i < 6; i++) {
    await joinQueue(AGENTS[i].name);
    await sleep(1000);
  }
  await checkQueueStatus();

  // Test 4: Check game status
  console.log('\nTest 4: Checking game status...');
  for (let i = 0; i < 3; i++) {
    const status = await checkGameStatus(AGENTS[i].name);
    if (status && status.status !== 'idle') {
      console.log(`${AGENTS[i].name}: ${status.status}`);
      if (status.seats) {
        const occupied = status.seats.filter(s => s.state !== 'empty').length;
        const waiting = status.seats.filter(s => s.state === 'waiting').length;
        console.log(`  Table: ${occupied}/6 occupied, ${waiting} waiting`);
      }
    }
  }

  console.log('\n✅ Test completed!');
  console.log(`\n🎮 View the live game at: ${BASE}`);
  console.log('   You should see:');
  console.log('   - 6 seats always visible');
  console.log('   - Empty seats with dashed outlines');
  console.log('   - Agents with robot emoji avatars');
  console.log('   - Waiting players with WAITING badges');
}

// Run the test
runTest().catch(console.error);