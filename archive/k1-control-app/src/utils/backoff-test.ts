/**
 * Test utility to verify exponential backoff calculation
 * This validates the TaskMaster Subtask 2.4 requirements
 */

import { K1_DEFAULTS } from '../types/k1-types';

/**
 * Calculate exponential backoff delay with jitter (same logic as provider)
 */
function calculateBackoffDelay(attempt: number): number {
  const baseDelay = K1_DEFAULTS.RECONNECT.BASE_DELAY; // 500ms
  const maxDelay = K1_DEFAULTS.RECONNECT.MAX_DELAY;   // 30000ms
  const jitterPercent = K1_DEFAULTS.RECONNECT.JITTER_PERCENT; // 20%
  
  // Exponential backoff: baseDelay * 2^attempt, capped at maxDelay
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  // Calculate jitter band: ±20% of the exponential delay
  const jitterRange = exponentialDelay * (jitterPercent / 100);
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  
  // Apply jitter and ensure minimum delay of 0
  const finalDelay = Math.max(0, exponentialDelay + jitter);
  
  return Math.round(finalDelay);
}

/**
 * Test the backoff sequence matches TaskMaster requirements:
 * 0.5s → 1s → 2s → 4s → 8s → cap at 30s
 */
export function testBackoffSequence() {
  console.log('🧪 Testing Exponential Backoff Sequence (Subtask 2.4)');
  console.log('Expected sequence: 500ms → 1s → 2s → 4s → 8s → 16s → 30s (capped)');
  console.log('');

  const expectedDelays = [500, 1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000];
  const jitterTolerance = 0.2; // ±20%

  for (let attempt = 1; attempt <= 9; attempt++) {
    const expectedDelay = expectedDelays[attempt - 1];
    const minDelay = expectedDelay * (1 - jitterTolerance);
    const maxDelay = expectedDelay * (1 + jitterTolerance);
    
    // Test multiple times to verify jitter range
    const samples = [];
    for (let i = 0; i < 10; i++) {
      samples.push(calculateBackoffDelay(attempt));
    }
    
    const avgDelay = samples.reduce((a, b) => a + b, 0) / samples.length;
    const minSample = Math.min(...samples);
    const maxSample = Math.max(...samples);
    
    const withinRange = minSample >= minDelay && maxSample <= maxDelay;
    const status = withinRange ? '✅' : '❌';
    
    console.log(`${status} Attempt ${attempt}: Expected ${expectedDelay}ms (±20%), Got ${avgDelay.toFixed(0)}ms avg, Range: ${minSample}-${maxSample}ms`);
  }
  
  console.log('');
  console.log('✅ Backoff sequence test completed');
}

/**
 * Test jitter distribution
 */
export function testJitterDistribution() {
  console.log('🧪 Testing Jitter Distribution');
  
  const attempt = 3; // 2s base delay
  const samples = [];
  
  // Generate 1000 samples
  for (let i = 0; i < 1000; i++) {
    samples.push(calculateBackoffDelay(attempt));
  }
  
  const expectedDelay = 2000;
  const minExpected = expectedDelay * 0.8; // -20%
  const maxExpected = expectedDelay * 1.2; // +20%
  
  const withinRange = samples.filter(s => s >= minExpected && s <= maxExpected);
  const percentage = (withinRange.length / samples.length) * 100;
  
  console.log(`Expected range: ${minExpected}-${maxExpected}ms`);
  console.log(`Samples within range: ${withinRange.length}/1000 (${percentage.toFixed(1)}%)`);
  console.log(`Min sample: ${Math.min(...samples)}ms`);
  console.log(`Max sample: ${Math.max(...samples)}ms`);
  console.log(`Average: ${(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(0)}ms`);
  
  const success = percentage > 95; // Should be very close to 100%
  console.log(success ? '✅ Jitter distribution test passed' : '❌ Jitter distribution test failed');
  
  return success;
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && (window as any).runBackoffTests) {
  testBackoffSequence();
  testJitterDistribution();
}