# K1 Integration Testing Quick Reference

## Quick Start

```bash
# Run integration tests
npm test -- --run K1Client.integration.test.ts

# Run with verbose output
npx vitest --run src/test/K1Client.integration.test.ts --reporter=verbose
```

## Essential Patterns

### Basic Test Structure
```typescript
describe('K1Client Feature Tests', () => {
  let client: K1Client
  
  beforeEach(async () => {
    await delay(2000)  // Avoid rate limiting
    client = new K1Client(K1_ENDPOINT)
  })
  
  afterEach(async () => {
    if (client?.isConnected()) {
      await client.disconnect()
    }
  })
  
  it('should test specific functionality', async () => {
    await client.connect(K1_ENDPOINT)
    // Test logic here
  }, 10000)  // 10s timeout
})
```

### Connection Test
```typescript
it('should connect to K1 device', async () => {
  const deviceInfo = await client.connect(K1_ENDPOINT)
  
  expect(deviceInfo.device).toBeDefined()
  expect(deviceInfo.firmware).toBeDefined()
  expect(deviceInfo.ip).toBe(K1_DEVICE_IP)
})
```

### Parameter Update Test
```typescript
it('should update parameters', async () => {
  await client.connect(K1_ENDPOINT)
  
  const result = await client.updateParameters({ brightness: 80 })
  expect(result.success).toBe(true)
  
  await delay(1500)  // Wait for device processing
  const params = await client.getParameters()
  expect(params.brightness).toBe(80)
})
```

### Error Handling Test
```typescript
it('should handle connection errors', async () => {
  const badClient = new K1Client('http://192.168.1.254')
  
  await expect(badClient.connect('http://192.168.1.254'))
    .rejects
    .toThrow(K1Error)
})
```

## Common Delays

```typescript
const DELAYS = {
  BETWEEN_TESTS: 2000,      // Avoid rate limiting
  BETWEEN_REQUESTS: 500,    // Between API calls
  AFTER_UPDATES: 1500,      // After parameter updates
  AFTER_CONNECT: 500        // After connection
}
```

## Rate Limiting Prevention

```typescript
// Add delays between operations
await client.updateParameters({ brightness: 80 })
await delay(500)
await client.getParameters()

// Use beforeEach delays
beforeEach(async () => {
  await delay(2000)
})
```

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `CONNECTION_FAILED` | HTTP error | Check device IP/status |
| `CONNECTION_TIMEOUT` | Request timeout | Check network/device |
| `NETWORK_ERROR` | Network issue | Check connectivity |
| `HTTP 429` | Rate limiting | Add delays |

## Device Configuration

```typescript
// Update device IP in tests
const K1_DEVICE_IP = '192.168.1.103'  // Change this
const K1_ENDPOINT = `http://${K1_DEVICE_IP}`
```

## Debugging

```typescript
// Add logging
console.log('Connecting to:', K1_ENDPOINT)
console.log('Device info:', deviceInfo)
console.log('Parameters:', params)

// Test device manually
curl http://192.168.1.103/api/patterns
```

## Best Practices

1. **Always add delays** between tests and requests
2. **Clean up connections** in afterEach
3. **Use specific timeouts** for slow operations
4. **Test both success and failure** paths
5. **Verify device state** after updates
6. **Handle rate limiting** gracefully

## Common Issues

### Tests Hang
- Check device is powered on
- Verify IP address is correct
- Add timeout to tests

### Rate Limiting
- Increase delays between requests
- Run tests sequentially
- Reduce API calls per test

### Inconsistent Results
- Add longer delays after updates
- Reset device state between tests
- Use proper cleanup in afterEach