# K1 Control App Integration Testing Guide

## Overview

This guide covers the integration testing framework for the K1 Control App, which tests against real K1 hardware devices. Integration tests validate end-to-end functionality without mocks, ensuring the application works correctly with actual K1 devices.

## Table of Contents

1. [Test Architecture](#test-architecture)
2. [Setup and Prerequisites](#setup-and-prerequisites)
3. [Running Tests](#running-tests)
4. [Test Functions Reference](#test-functions-reference)
5. [Error Handling](#error-handling)
6. [Edge Cases](#edge-cases)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Test Architecture

### Integration Test Types

| Test Type | File Pattern | Purpose | Dependencies |
|-----------|--------------|---------|--------------|
| **K1Client Integration** | `*.integration.test.ts` | Direct API testing | Real K1 device |
| **Provider Integration** | `*.integration.test.tsx` | React provider testing | Real K1 device + React |
| **Component Integration** | `*Integration.test.tsx` | Full component testing | Real K1 device + UI |

### Test Environment

- **Runtime:** Node.js 18+ (native fetch support)
- **Test Framework:** Vitest
- **Environment:** jsdom (for React components)
- **Network:** Real HTTP requests to K1 device
- **Timing:** Real timers (no mocking)

## Setup and Prerequisites

### Hardware Requirements

1. **K1 Device:** Must be powered on and accessible
2. **Network:** Device and test machine on same network
3. **IP Address:** Device accessible at configured IP (default: 192.168.1.103)

### Software Requirements

```bash
# Node.js version
node --version  # Must be 18+

# Install dependencies
npm install

# Verify test environment
npm test -- --version
```

### Configuration

Update the device IP in test files:

```typescript
// In integration test files
const K1_DEVICE_IP = '192.168.1.103'  // Change to your device IP
const K1_ENDPOINT = `http://${K1_DEVICE_IP}`
```

## Running Tests

### Basic Commands

```bash
# Run all integration tests
npm test -- --run *.integration.test.*

# Run specific integration test
npm test -- --run K1Client.integration.test.ts

# Run with verbose output
npx vitest --run src/test/K1Client.integration.test.ts --reporter=verbose

# Run with timeout adjustment
npx vitest --run src/test/K1Client.integration.test.ts --testTimeout=30000
```

### Advanced Options

```bash
# Run tests in sequence (avoid rate limiting)
npm test -- --run *.integration.test.* --pool=forks --poolOptions.forks.singleFork=true

# Run with custom timeout
npm test -- --run *.integration.test.* --testTimeout=60000

# Run with environment variables
K1_DEVICE_IP=192.168.1.104 npm test -- --run K1Client.integration.test.ts
```

## Test Functions Reference

### Core Test Functions

#### `K1Client.connect(endpoint: string): Promise<K1DeviceInfo>`

**Purpose:** Establishes connection to K1 device

**Parameters:**
- `endpoint` (string): Full HTTP URL to K1 device (e.g., 'http://192.168.1.103')

**Returns:** Promise resolving to device information

**Example:**
```typescript
it('should connect to K1 device', async () => {
  const client = new K1Client(K1_ENDPOINT)
  const deviceInfo = await client.connect(K1_ENDPOINT)
  
  expect(deviceInfo.device).toBeDefined()
  expect(deviceInfo.firmware).toBeDefined()
  expect(deviceInfo.ip).toBe(K1_DEVICE_IP)
})
```

**Error Conditions:**
- `K1Error(CONNECTION_FAILED)`: Device unreachable
- `K1Error(CONNECTION_TIMEOUT)`: Request timeout (5s default)
- `K1Error(NETWORK_ERROR)`: Network connectivity issues

#### `K1Client.getPatterns(): Promise<K1PatternResponse>`

**Purpose:** Retrieves available patterns from device

**Returns:** Promise resolving to pattern list with current selection

**Example:**
```typescript
it('should get device patterns', async () => {
  await client.connect(K1_ENDPOINT)
  const patterns = await client.getPatterns()
  
  expect(patterns.patterns).toBeInstanceOf(Array)
  expect(patterns.patterns.length).toBeGreaterThan(0)
  expect(patterns.current_pattern).toBeGreaterThanOrEqual(0)
})
```

**Error Conditions:**
- `HTTP 429`: Rate limiting (too many requests)
- `HTTP 404`: Endpoint not found
- `K1Error(NETWORK_ERROR)`: Connection lost

#### `K1Client.getParameters(): Promise<K1Parameters>`

**Purpose:** Retrieves current device parameters

**Returns:** Promise resolving to parameter object

**Example:**
```typescript
it('should get device parameters', async () => {
  await client.connect(K1_ENDPOINT)
  const params = await client.getParameters()
  
  expect(params.brightness).toBeGreaterThanOrEqual(0)
  expect(params.brightness).toBeLessThanOrEqual(100)
  expect(params.speed).toBeGreaterThanOrEqual(0)
  expect(params.palette_id).toBeGreaterThanOrEqual(0)
})
```

#### `K1Client.updateParameters(params: Partial<K1Parameters>): Promise<K1ApiResponse>`

**Purpose:** Updates device parameters

**Parameters:**
- `params` (Partial<K1Parameters>): Parameters to update

**Returns:** Promise resolving to API response with success status

**Example:**
```typescript
it('should update device parameters', async () => {
  await client.connect(K1_ENDPOINT)
  
  const result = await client.updateParameters({ brightness: 80 })
  expect(result.success).toBe(true)
  
  // Verify update (with delay for device processing)
  await delay(1500)
  const updated = await client.getParameters()
  expect(updated.brightness).toBe(80)
})
```

**Important Notes:**
- Parameters are converted from UI scale (0-100) to firmware scale (0.0-1.0)
- Updates may take 1-2 seconds to propagate
- Rate limiting applies - space requests 500ms+ apart

#### `K1Client.setPalette(paletteId: number): Promise<K1ApiResponse>`

**Purpose:** Changes active color palette

**Parameters:**
- `paletteId` (number): Palette index (0-32)

**Returns:** Promise resolving to API response

**Example:**
```typescript
it('should change palette', async () => {
  await client.connect(K1_ENDPOINT)
  
  const result = await client.setPalette(5)
  expect(result.success).toBe(true)
})
```

### Utility Functions

#### `delay(ms: number): Promise<void>`

**Purpose:** Adds delay to prevent rate limiting

**Usage:**
```typescript
await delay(1000)  // Wait 1 second
await client.updateParameters({ brightness: 90 })
await delay(500)   // Cool down before next request
```

**Recommended Delays:**
- Between tests: 2-3 seconds
- Between API calls: 500-1500ms
- After parameter updates: 1500ms
- After connections: 500ms

## Error Handling

### Common Error Types

#### Rate Limiting (HTTP 429)
```typescript
// Error: HTTP 429: Too Many Requests
// Solution: Add delays between requests
await delay(2000)
const result = await client.getParameters()
```

#### Connection Timeout
```typescript
// Error: K1Error(CONNECTION_TIMEOUT)
// Solutions:
// 1. Check device is powered on
// 2. Verify IP address
// 3. Check network connectivity
// 4. Increase timeout in test
```

#### Network Errors
```typescript
// Error: K1Error(NETWORK_ERROR)
// Solutions:
// 1. Verify device IP address
// 2. Check network connectivity
// 3. Ensure device is on same network
// 4. Check firewall settings
```

### Error Handling Patterns

#### Retry with Exponential Backoff
```typescript
it('should handle temporary failures', async () => {
  let attempts = 0
  const maxAttempts = 3
  
  while (attempts < maxAttempts) {
    try {
      await client.connect(K1_ENDPOINT)
      break
    } catch (error) {
      attempts++
      if (attempts === maxAttempts) throw error
      await delay(1000 * Math.pow(2, attempts))
    }
  }
})
```

#### Graceful Degradation
```typescript
it('should handle invalid parameters gracefully', async () => {
  await client.connect(K1_ENDPOINT)
  
  // Test with invalid brightness
  const result = await client.updateParameters({ brightness: 150 })
  
  // Device should clamp to valid range
  expect(result.success).toBe(true)
  
  const params = await client.getParameters()
  expect(params.brightness).toBeLessThanOrEqual(100)
})
```

## Edge Cases

### Device State Edge Cases

#### Device Restart During Test
```typescript
it('should handle device restart', async () => {
  await client.connect(K1_ENDPOINT)
  
  // Simulate device restart by disconnecting and reconnecting
  await client.disconnect()
  await delay(5000)  // Wait for device boot
  
  // Should be able to reconnect
  await expect(client.connect(K1_ENDPOINT)).resolves.toBeDefined()
})
```

#### Concurrent Connections
```typescript
it('should handle multiple clients', async () => {
  const client1 = new K1Client(K1_ENDPOINT)
  const client2 = new K1Client(K1_ENDPOINT)
  
  // Both should be able to connect
  await Promise.all([
    client1.connect(K1_ENDPOINT),
    client2.connect(K1_ENDPOINT)
  ])
  
  // Both should be able to make requests
  const [params1, params2] = await Promise.all([
    client1.getParameters(),
    client2.getParameters()
  ])
  
  expect(params1).toEqual(params2)
})
```

### Network Edge Cases

#### Slow Network
```typescript
it('should handle slow network', async () => {
  // Increase timeout for slow networks
  const client = new K1Client(K1_ENDPOINT)
  
  // Use longer timeout
  await expect(client.connect(K1_ENDPOINT)).resolves.toBeDefined()
}, 30000)  // 30 second timeout
```

#### Network Interruption
```typescript
it('should handle network interruption', async () => {
  await client.connect(K1_ENDPOINT)
  
  // Make request that might fail due to network
  try {
    await client.getParameters()
  } catch (error) {
    expect(error).toBeInstanceOf(K1Error)
    expect(error.code).toMatch(/NETWORK_ERROR|CONNECTION_TIMEOUT/)
  }
})
```

### Parameter Edge Cases

#### Boundary Values
```typescript
it('should handle parameter boundaries', async () => {
  await client.connect(K1_ENDPOINT)
  
  // Test minimum values
  await client.updateParameters({ brightness: 0 })
  await delay(1500)
  let params = await client.getParameters()
  expect(params.brightness).toBe(0)
  
  // Test maximum values
  await client.updateParameters({ brightness: 100 })
  await delay(1500)
  params = await client.getParameters()
  expect(params.brightness).toBe(100)
})
```

#### Invalid Parameters
```typescript
it('should handle invalid parameters', async () => {
  await client.connect(K1_ENDPOINT)
  
  // Test out-of-range values
  const result = await client.updateParameters({ 
    brightness: -10,  // Invalid
    speed: 150        // Invalid
  })
  
  // Should succeed (device clamps values)
  expect(result.success).toBe(true)
  
  // Verify clamping
  const params = await client.getParameters()
  expect(params.brightness).toBeGreaterThanOrEqual(0)
  expect(params.speed).toBeLessThanOrEqual(100)
})
```

## Best Practices

### Test Organization

#### Group Related Tests
```typescript
describe('K1Client Connection Management', () => {
  // Connection-related tests
})

describe('K1Client Parameter Operations', () => {
  // Parameter-related tests
})

describe('K1Client Error Handling', () => {
  // Error scenario tests
})
```

#### Use Descriptive Test Names
```typescript
// Good
it('should connect to K1 device and return valid device info')
it('should update brightness parameter and verify change')
it('should handle rate limiting with appropriate delays')

// Bad
it('should work')
it('test connection')
it('parameters')
```

### Resource Management

#### Always Clean Up
```typescript
afterEach(async () => {
  if (client?.isConnected()) {
    await client.disconnect()
  }
})
```

#### Reuse Connections When Possible
```typescript
describe('Parameter Tests', () => {
  beforeAll(async () => {
    client = new K1Client(K1_ENDPOINT)
    await client.connect(K1_ENDPOINT)
  })
  
  afterAll(async () => {
    await client.disconnect()
  })
  
  // Tests can reuse the connection
})
```

### Timing and Rate Limiting

#### Use Consistent Delays
```typescript
const DELAYS = {
  BETWEEN_TESTS: 2000,
  BETWEEN_REQUESTS: 500,
  AFTER_UPDATES: 1500,
  AFTER_CONNECT: 500
}

beforeEach(async () => {
  await delay(DELAYS.BETWEEN_TESTS)
})
```

#### Batch Operations
```typescript
it('should update multiple parameters efficiently', async () => {
  await client.connect(K1_ENDPOINT)
  
  // Update multiple parameters in single call
  const result = await client.updateParameters({
    brightness: 80,
    speed: 60,
    saturation: 90
  })
  
  expect(result.success).toBe(true)
})
```

### Error Testing

#### Test Both Success and Failure Paths
```typescript
describe('Connection Scenarios', () => {
  it('should connect to valid device', async () => {
    // Test success path
  })
  
  it('should reject invalid IP address', async () => {
    // Test failure path
  })
})
```

#### Use Specific Error Assertions
```typescript
it('should throw specific error for timeout', async () => {
  const client = new K1Client('http://192.168.1.254')
  
  await expect(client.connect('http://192.168.1.254'))
    .rejects
    .toThrow(K1Error)
    
  // Or more specific
  try {
    await client.connect('http://192.168.1.254')
  } catch (error) {
    expect(error.code).toBe('CONNECTION_TIMEOUT')
    expect(error.userMessage).toContain('timed out')
  }
})
```

## Troubleshooting

### Common Issues

#### Tests Hang or Timeout
**Symptoms:** Tests never complete, timeout after 30+ seconds
**Causes:**
- Device not responding
- Network connectivity issues
- Rate limiting causing infinite retries

**Solutions:**
```bash
# Check device connectivity
ping 192.168.1.103

# Test device manually
curl http://192.168.1.103/api/patterns

# Run single test with verbose output
npx vitest --run src/test/K1Client.integration.test.ts --reporter=verbose
```

#### Rate Limiting Errors
**Symptoms:** HTTP 429 errors, "Too Many Requests"
**Solutions:**
- Increase delays between tests
- Run tests sequentially instead of parallel
- Reduce number of API calls per test

#### Connection Refused
**Symptoms:** "Connection refused", "ECONNREFUSED"
**Solutions:**
- Verify device IP address
- Check device is powered on
- Ensure device web server is running
- Check firewall settings

#### Inconsistent Results
**Symptoms:** Tests pass sometimes, fail other times
**Causes:**
- Race conditions
- Insufficient delays
- Device state changes between tests

**Solutions:**
- Add longer delays
- Reset device state between tests
- Use beforeEach/afterEach cleanup

### Debugging Techniques

#### Add Logging
```typescript
it('should debug connection issues', async () => {
  console.log('Connecting to:', K1_ENDPOINT)
  
  try {
    const deviceInfo = await client.connect(K1_ENDPOINT)
    console.log('Connected successfully:', deviceInfo)
  } catch (error) {
    console.error('Connection failed:', error)
    throw error
  }
})
```

#### Test Device Manually
```bash
# Test device endpoints manually
curl -v http://192.168.1.103/api/patterns
curl -v http://192.168.1.103/api/params
curl -X POST http://192.168.1.103/api/params -H "Content-Type: application/json" -d '{"brightness": 0.8}'
```

#### Isolate Issues
```typescript
// Test minimal functionality first
it('should ping device', async () => {
  const response = await fetch(`${K1_ENDPOINT}/api/patterns`)
  expect(response.ok).toBe(true)
})
```

### Performance Optimization

#### Reduce Test Duration
```typescript
// Use shorter timeouts for fast-failing tests
it('should reject invalid IP quickly', async () => {
  const client = new K1Client('http://192.168.1.254')
  await expect(client.connect('http://192.168.1.254')).rejects.toThrow()
}, 5000)  // 5 second timeout instead of default 30s
```

#### Parallel vs Sequential
```typescript
// Run independent tests in parallel
describe('Independent Tests', () => {
  it.concurrent('should get patterns', async () => { /* ... */ })
  it.concurrent('should get parameters', async () => { /* ... */ })
})

// Run dependent tests sequentially
describe('Dependent Tests', () => {
  it('should connect first', async () => { /* ... */ })
  it('should then update parameters', async () => { /* ... */ })
})
```

## Conclusion

Integration tests provide valuable validation of K1 device functionality but require careful consideration of timing, rate limiting, and error handling. Follow the patterns and best practices in this guide to create reliable, maintainable integration tests.

For questions or issues not covered in this guide, check the troubleshooting section or examine the existing test implementations in `src/test/*.integration.test.*`.