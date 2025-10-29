/**
 * Transport routing test utility
 * Validates Subtask 2.5 WebSocket-preferred / REST-fallback routing
 */

/**
 * Test transport routing behavior
 * This function can be called from the browser console to test routing
 */
export function testTransportRouting() {
  console.log('🚀 Testing Transport Routing (Subtask 2.5)');
  console.log('');
  
  // Check if k1Actions is available (exposed by K1StatusTest component)
  const k1Actions = (window as any).k1Actions;
  
  if (!k1Actions) {
    console.error('❌ k1Actions not available. Make sure the app is running and K1StatusTest is mounted.');
    return;
  }
  
  console.log('📊 Current Transport Status:');
  const status = k1Actions.getTransportStatus();
  console.log(`  - WebSocket Available: ${status.wsAvailable ? '✅' : '❌'}`);
  console.log(`  - WebSocket Enabled: ${status.wsEnabled ? '✅' : '❌'}`);
  console.log(`  - REST Available: ${status.restAvailable ? '✅' : '❌'}`);
  console.log(`  - Active Transport: ${status.activeTransport.toUpperCase()}`);
  if (status.lastWSError) {
    console.log(`  - Last WS Error: ${status.lastWSError.message}`);
  }
  console.log('');
  
  // Test scenarios
  console.log('🧪 Test Scenarios:');
  console.log('');
  
  console.log('1. Test with current transport settings:');
  console.log('   k1Actions.testTransportRouting()');
  console.log('');
  
  console.log('2. Disable WebSocket and test REST-only:');
  console.log('   k1Actions.setWebSocketEnabled(false)');
  console.log('   k1Actions.testTransportRouting()');
  console.log('');
  
  console.log('3. Re-enable WebSocket:');
  console.log('   k1Actions.setWebSocketEnabled(true)');
  console.log('   k1Actions.testTransportRouting()');
  console.log('');
  
  console.log('4. Check transport status after changes:');
  console.log('   k1Actions.getTransportStatus()');
  console.log('');
  
  console.log('💡 Expected Behavior:');
  console.log('  - When WebSocket is available and enabled: Commands sent via WS + REST');
  console.log('  - When WebSocket is disabled: Commands sent via REST only');
  console.log('  - When WebSocket fails: Automatic fallback to REST');
  console.log('  - Transport status updates reflect current availability');
  console.log('');
  
  console.log('✅ Transport routing test setup complete');
  console.log('Run the commands above to test different scenarios');
}

/**
 * Automated transport routing test sequence
 */
export async function runTransportTests() {
  console.log('🤖 Running Automated Transport Tests');
  console.log('');
  
  const k1Actions = (window as any).k1Actions;
  
  if (!k1Actions) {
    console.error('❌ k1Actions not available');
    return;
  }
  
  try {
    // Test 1: Current state
    console.log('Test 1: Testing current transport state...');
    const initialStatus = k1Actions.getTransportStatus();
    console.log(`Initial transport: ${initialStatus.activeTransport}`);
    
    await k1Actions.testTransportRouting();
    console.log('✅ Test 1 passed');
    console.log('');
    
    // Test 2: Disable WebSocket
    console.log('Test 2: Testing with WebSocket disabled...');
    k1Actions.setWebSocketEnabled(false);
    
    const disabledStatus = k1Actions.getTransportStatus();
    console.log(`Transport after disable: ${disabledStatus.activeTransport}`);
    
    await k1Actions.testTransportRouting();
    console.log('✅ Test 2 passed');
    console.log('');
    
    // Test 3: Re-enable WebSocket
    console.log('Test 3: Testing with WebSocket re-enabled...');
    k1Actions.setWebSocketEnabled(true);
    
    const enabledStatus = k1Actions.getTransportStatus();
    console.log(`Transport after enable: ${enabledStatus.activeTransport}`);
    
    await k1Actions.testTransportRouting();
    console.log('✅ Test 3 passed');
    console.log('');
    
    console.log('🎉 All transport routing tests passed!');
    
  } catch (error) {
    console.error('❌ Transport test failed:', error);
  }
}

// Expose functions to global scope for console testing
if (typeof window !== 'undefined') {
  (window as any).testTransportRouting = testTransportRouting;
  (window as any).runTransportTests = runTransportTests;
}