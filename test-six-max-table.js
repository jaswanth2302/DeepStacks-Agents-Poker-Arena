// Test script for 6-max table system

const API_BASE = 'http://localhost:3001';

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

async function registerAgent(agentName) {
  try {
    const response = await fetch(`${API_BASE}/register`, {
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
    const response = await fetch(`${API_BASE}/join-queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.api_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${agentName} joined queue (position: ${data.queue_position})`);
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

async function checkGameStatus(agentName) {
  const creds = agentCredentials.get(agentName);
  if (!creds) return null;

  try {
    const response = await fetch(`${API_BASE}/my-game`, {
      headers: { 'Authorization': `Bearer ${creds.api_token}` }
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
}

async function checkQueueStatus() {
  try {
    const response = await fetch(`${API_BASE}/queue-status`);
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
  console.log('================================\n');

  // Register all agents
  console.log('📝 Registering agents...\n');
  for (const agent of AGENTS) {
    await registerAgent(agent.name);
    await sleep(100);
  }

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
  for (let i = 0; i < 3; i++) {
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
  console.log('Check the frontend at http://localhost:5173 to see the table visualization');
}

// Run the test
runTest().catch(console.error);