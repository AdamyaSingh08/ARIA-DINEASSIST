/**
 * DineAssist — Robot Hardware Integration Test Utility
 * 
 * Simulates XiaoZhi / Xhaizi rovers or bridge microservices sending 
 * authenticated events to the DineAssist backend gateway.
 * 
 * Usage:
 *   node scripts/test_robot_event.js [scenario] [options]
 * 
 * Scenarios:
 *   water       — Table 4 requests water
 *   waiter      — Table 2 calls waiter
 *   bill        — Table 3 requests bill
 *   food        — Table 1 submits multi-item food order
 *   heartbeat   — Robot 1 sends periodic keep-alive
 *   auth-fail   — Tests rejection of invalid API key
 *   duplicate   — Tests idempotent deduplication of repeated event_id
 *   all         — Runs full test suite consecutively
 */

const SERVER_URL = process.env.DINEASSIST_URL || 'http://127.0.0.1:5000';
const API_KEY = process.env.ROBOT_API_KEY || 'xiaozhi_secret_key_innotech2026';

async function sendEvent(payload, customApiKey = API_KEY) {
  const url = `${SERVER_URL}/api/integrations/robot/events`;
  console.log(`\n➡️  POST ${url}`);
  console.log(`🔑 Key: ${customApiKey ? customApiKey.substring(0, 10) + '...' : '(None)'}`);
  console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': customApiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(`⬅️  HTTP Status: ${res.status} ${res.ok ? '✅ OK' : '❌ ERROR'}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`💥 Connection Failed:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function sendHeartbeat(robotId = 'robot-01', battery = 95) {
  const url = `${SERVER_URL}/api/integrations/robot/heartbeat`;
  console.log(`\n➡️  POST ${url} (Heartbeat)`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({ robot_id: robotId, battery_level: battery })
    });
    const data = await res.json();
    console.log(`⬅️  Status: ${res.status} ${res.ok ? '✅ OK' : '❌ ERROR'}`);
    console.log(`📄 Response:`, data);
  } catch (err) {
    console.error(`💥 Heartbeat failed:`, err.message);
  }
}

async function runScenario(scenario) {
  const now = new Date().toISOString();

  switch (scenario) {
    case 'water':
      return sendEvent({
        event_id: 'evt-cli-water-' + Date.now(),
        robot_id: 'robot-04',
        table_id: 'T04',
        type: 'service_request',
        request_type: 'water',
        message: 'Customer requested 2 bottles of cold mineral water',
        timestamp: now
      });

    case 'waiter':
      return sendEvent({
        event_id: 'evt-cli-waiter-' + Date.now(),
        robot_id: 'robot-02',
        table_id: 'T02',
        type: 'service_request',
        request_type: 'waiter',
        message: 'Customer requested captain to explain daily chef specials',
        timestamp: now
      });

    case 'bill':
      return sendEvent({
        event_id: 'evt-cli-bill-' + Date.now(),
        robot_id: 'robot-03',
        table_id: 'T03',
        type: 'bill_requested',
        timestamp: now
      });

    case 'food':
      return sendEvent({
        event_id: 'evt-cli-food-' + Date.now(),
        robot_id: 'robot-01',
        table_id: 'T01',
        type: 'food_order_submitted',
        items: [
          { menu_item_id: 'item-001', quantity: 2, notes: 'Less spicy, charred crisp' },
          { menu_item_id: 'item-006', quantity: 1, notes: 'Extra butter on side' },
          { menu_item_id: 'item-011', quantity: 4 },
          { menu_item_id: 'item-018', quantity: 2 }
        ],
        special_instructions: 'Customer is celebrating an anniversary',
        timestamp: now
      });

    case 'heartbeat':
      return sendHeartbeat('robot-01', 97);

    case 'auth-fail':
      console.log('\n🔒 Testing Invalid API Key Rejection...');
      return sendEvent(
        {
          event_id: 'evt-bad-auth-' + Date.now(),
          robot_id: 'robot-01',
          table_id: 'T01',
          type: 'service_request',
          request_type: 'water',
          timestamp: now
        },
        'invalid_bogus_token_123'
      );

    case 'duplicate': {
      console.log('\n🔁 Testing Duplicate Event Idempotency...');
      const duplicateId = 'evt-fixed-idempotent-test-999';
      const eventPayload = {
        event_id: duplicateId,
        robot_id: 'robot-04',
        table_id: 'T04',
        type: 'service_request',
        request_type: 'water',
        message: 'Idempotency test payload',
        timestamp: now
      };
      console.log('Sending first attempt (should succeed):');
      await sendEvent(eventPayload);
      console.log('\nSending second attempt with IDENTICAL event_id (should be detected as duplicate):');
      await sendEvent(eventPayload);
      break;
    }

    case 'all':
      console.log('🚀 Running Complete DineAssist Robot Integration Test Suite...\n');
      await runScenario('water');
      await runScenario('waiter');
      await runScenario('food');
      await runScenario('bill');
      await runScenario('heartbeat');
      await runScenario('auth-fail');
      await runScenario('duplicate');
      console.log('\n✨ All integration scenarios completed.');
      break;

    default:
      console.log(`Unknown scenario: "${scenario}".`);
      console.log('Available scenarios: water, waiter, bill, food, heartbeat, auth-fail, duplicate, all');
  }
}

const arg = process.argv[2] || 'water';
runScenario(arg);
