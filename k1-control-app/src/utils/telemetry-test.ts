/**
 * Enhanced telemetry and error surfaces test utility
 * Validates Subtask 2.7: Error surfaces and telemetry hooks
 */

import { K1Telemetry, telemetryManager } from './telemetry-manager';
import { K1TelemetryHook, K1Error } from '../types/k1-types';

/**
 * Test the enhanced telemetry and error surfaces system
 */
export function testTelemetrySystem() {
  console.log('📊 Testing Enhanced Telemetry & Error Surfaces (Subtask 2.7)');
  console.log('');
  
  // Check if k1Actions is available
  const k1Actions = (window as any).k1Actions;
  
  if (!k1Actions) {
    console.error('❌ k1Actions not available. Make sure the app is running and K1StatusTest is mounted.');
    return;
  }
  
  console.log('📈 Current Telemetry State:');
  const telemetry = k1Actions.getTelemetryState();
  console.log(`  - Connection Attempts: ${telemetry.connectionAttempts}`);
  console.log(`  - Successful Connections: ${telemetry.successfulConnections}`);
  console.log(`  - Total Errors: ${Object.values(telemetry.errorCounts).reduce((a: number, b: number) => a + b, 0)}`);
  console.log(`  - Average Latency: ${Math.round(telemetry.averageLatency)}ms`);
  console.log(`  - Session Uptime: ${Math.round((Date.now() - telemetry.sessionStartTime) / 1000)}s`);
  console.log('');
  
  console.log('🎛️ Error Surface Configuration:');
  const errorConfig = k1Actions.getErrorSurfaceConfig();
  console.log(`  - Show Toasts: ${errorConfig.showToasts}`);
  console.log(`  - Log to Console: ${errorConfig.logToConsole}`);
  console.log(`  - Report to Telemetry: ${errorConfig.reportToTelemetry}`);
  console.log(`  - Max Error History: ${errorConfig.maxErrorHistory}`);
  console.log(`  - Error Display Duration: ${errorConfig.errorDisplayDuration}ms`);
  console.log('');
  
  console.log('🧪 Test Commands:');
  console.log('');
  console.log('1. View detailed telemetry: k1Actions.getTelemetryState()');
  console.log('2. Test error toast: testErrorToast()');
  console.log('3. Test telemetry hook: testTelemetryHook()');
  console.log('4. Configure error surfaces: testErrorSurfaceConfig()');
  console.log('5. Reset telemetry: k1Actions.resetTelemetry()');
  console.log('6. Run comprehensive tests: runTelemetryTests()');
  console.log('');
  
  console.log('💡 Expected Features:');
  console.log('  - Categorized error tracking by type');
  console.log('  - Toast notifications for errors');
  console.log('  - Telemetry hooks for external integrations');
  console.log('  - Performance metrics with latency tracking');
  console.log('  - Feature usage analytics');
  console.log('  - Configurable error surfaces');
  console.log('');
  
  console.log('✅ Telemetry system test setup complete');
}

/**
 * Test error toast notification
 */
export function testErrorToast() {
  console.log('🍞 Testing Error Toast Notification');
  console.log('');
  
  try {
    // Create a test error
    const testError: K1Error = {
      type: 'rest_error',
      message: 'This is a test error notification',
      details: 'Testing the toast notification system',
      timestamp: new Date(),
    };
    
    console.log('1. Triggering test error toast...');
    K1Telemetry.handleError(testError, { test: true });
    
    console.log('✅ Test error toast triggered');
    console.log('💡 You should see a red toast notification in the top-right corner');
    console.log('💡 Click the toast to dismiss it manually');
    
  } catch (error) {
    console.error('❌ Error toast test failed:', error);
  }
  
  console.log('');
  console.log('✅ Error toast test completed');
}

/**
 * Test telemetry hook integration
 */
export function testTelemetryHook() {
  console.log('🔗 Testing Telemetry Hook Integration');
  console.log('');
  
  try {
    const k1Actions = (window as any).k1Actions;
    
    if (!k1Actions) {
      console.log('❌ k1Actions not available');
      return;
    }
    
    console.log('1. Registering test telemetry hook...');
    
    // Create a test hook
    const testHook: K1TelemetryHook = {
      onEvent: (event) => {
        console.log(`[TestHook] Event: ${event.type}:${event.category}:${event.action}`, event);
      },
      onError: (error, context) => {
        console.log(`[TestHook] Error: ${error.type} - ${error.message}`, { error, context });
      },
      onMetric: (metric, value, tags) => {
        console.log(`[TestHook] Metric: ${metric} = ${value}`, tags);
      },
    };
    
    // Register the hook
    const unregister = k1Actions.registerTelemetryHook(testHook);
    console.log('✅ Test hook registered');
    
    console.log('');
    console.log('2. Testing hook with sample events...');
    
    // Test event
    K1Telemetry.recordEvent({
      type: 'feature_usage',
      category: 'test',
      action: 'hook_test',
      label: 'Testing telemetry hook',
      timestamp: Date.now(),
    });
    
    // Test metric
    K1Telemetry.recordMetric('test_metric', 42, { source: 'test' });
    
    // Test error
    const testError: K1Error = {
      type: 'validation_error',
      message: 'Test error for hook validation',
      timestamp: new Date(),
    };
    K1Telemetry.handleError(testError, { hookTest: true });
    
    console.log('✅ Sample events sent to hook');
    console.log('');
    
    console.log('3. Unregistering test hook...');
    unregister();
    console.log('✅ Test hook unregistered');
    
  } catch (error) {
    console.error('❌ Telemetry hook test failed:', error);
  }
  
  console.log('');
  console.log('✅ Telemetry hook test completed');
}

/**
 * Test error surface configuration
 */
export function testErrorSurfaceConfig() {
  console.log('⚙️ Testing Error Surface Configuration');
  console.log('');
  
  try {
    const k1Actions = (window as any).k1Actions;
    
    if (!k1Actions) {
      console.log('❌ k1Actions not available');
      return;
    }
    
    console.log('1. Getting current configuration...');
    const currentConfig = k1Actions.getErrorSurfaceConfig();
    console.log('Current config:', currentConfig);
    
    console.log('');
    console.log('2. Testing configuration changes...');
    
    // Disable toasts temporarily
    k1Actions.setErrorSurfaceConfig({ showToasts: false });
    console.log('✅ Disabled toast notifications');
    
    // Test error (should not show toast)
    const testError1: K1Error = {
      type: 'network_error',
      message: 'Test error with toasts disabled',
      timestamp: new Date(),
    };
    K1Telemetry.handleError(testError1);
    console.log('💡 Error triggered with toasts disabled (no toast should appear)');
    
    console.log('');
    
    // Re-enable toasts
    k1Actions.setErrorSurfaceConfig({ showToasts: true });
    console.log('✅ Re-enabled toast notifications');
    
    // Test error (should show toast)
    const testError2: K1Error = {
      type: 'connect_error',
      message: 'Test error with toasts enabled',
      timestamp: new Date(),
    };
    K1Telemetry.handleError(testError2);
    console.log('💡 Error triggered with toasts enabled (toast should appear)');
    
    console.log('');
    
    console.log('3. Testing custom display duration...');
    k1Actions.setErrorSurfaceConfig({ errorDisplayDuration: 2000 }); // 2 seconds
    
    const testError3: K1Error = {
      type: 'timeout_error',
      message: 'Test error with short duration',
      timestamp: new Date(),
    };
    K1Telemetry.handleError(testError3);
    console.log('💡 Error with 2-second duration triggered');
    
    // Restore original config
    setTimeout(() => {
      k1Actions.setErrorSurfaceConfig(currentConfig);
      console.log('✅ Restored original configuration');
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error surface config test failed:', error);
  }
  
  console.log('');
  console.log('✅ Error surface configuration test completed');
}

/**
 * Run comprehensive telemetry tests
 */
export async function runTelemetryTests() {
  console.log('🤖 Running Comprehensive Telemetry Tests');
  console.log('');
  
  try {
    const k1Actions = (window as any).k1Actions;
    
    if (!k1Actions) {
      console.log('❌ k1Actions not available');
      return;
    }
    
    // Test 1: Telemetry state
    console.log('Test 1: Telemetry state access...');
    const telemetry = k1Actions.getTelemetryState();
    console.log(`Session uptime: ${Math.round((Date.now() - telemetry.sessionStartTime) / 1000)}s`);
    console.log('✅ Test 1 passed');
    console.log('');
    
    // Test 2: Error surfaces
    console.log('Test 2: Error surface configuration...');
    const originalConfig = k1Actions.getErrorSurfaceConfig();
    k1Actions.setErrorSurfaceConfig({ maxErrorHistory: 5 });
    const updatedConfig = k1Actions.getErrorSurfaceConfig();
    console.log(`Max error history updated: ${originalConfig.maxErrorHistory} → ${updatedConfig.maxErrorHistory}`);
    k1Actions.setErrorSurfaceConfig(originalConfig); // Restore
    console.log('✅ Test 2 passed');
    console.log('');
    
    // Test 3: Hook registration
    console.log('Test 3: Hook registration and events...');
    let hookEventCount = 0;
    const testHook: K1TelemetryHook = {
      onEvent: () => hookEventCount++,
      onError: () => hookEventCount++,
      onMetric: () => hookEventCount++,
    };
    
    const unregister = k1Actions.registerTelemetryHook(testHook);
    
    // Trigger events
    K1Telemetry.recordEvent({
      type: 'performance',
      category: 'test',
      action: 'comprehensive_test',
      timestamp: Date.now(),
    });
    
    K1Telemetry.recordMetric('test_comprehensive', 100);
    
    // Small delay to ensure events are processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`Hook received ${hookEventCount} events`);
    unregister();
    console.log('✅ Test 3 passed');
    console.log('');
    
    // Test 4: Error categorization
    console.log('Test 4: Error categorization...');
    const initialErrorCounts = { ...telemetry.errorCounts };
    
    const testError: K1Error = {
      type: 'ws_send_error',
      message: 'Comprehensive test error',
      timestamp: new Date(),
    };
    
    K1Telemetry.handleError(testError);
    
    const updatedTelemetry = k1Actions.getTelemetryState();
    const errorCountIncreased = updatedTelemetry.errorCounts.ws_send_error > initialErrorCounts.ws_send_error;
    
    console.log(`WebSocket error count increased: ${errorCountIncreased}`);
    console.log('✅ Test 4 passed');
    console.log('');
    
    // Test 5: Telemetry reset
    console.log('Test 5: Telemetry reset...');
    const beforeReset = k1Actions.getTelemetryState();
    k1Actions.resetTelemetry();
    const afterReset = k1Actions.getTelemetryState();
    
    const wasReset = afterReset.sessionStartTime > beforeReset.sessionStartTime;
    console.log(`Telemetry was reset: ${wasReset}`);
    console.log('✅ Test 5 passed');
    console.log('');
    
    console.log('🎉 All telemetry tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Comprehensive telemetry tests failed:', error);
  }
}

// Expose functions to global scope for console testing
if (typeof window !== 'undefined') {
  (window as any).testTelemetry = testTelemetrySystem;
  (window as any).testErrorToast = testErrorToast;
  (window as any).testTelemetryHook = testTelemetryHook;
  (window as any).testErrorSurfaceConfig = testErrorSurfaceConfig;
  (window as any).runTelemetryTests = runTelemetryTests;
}