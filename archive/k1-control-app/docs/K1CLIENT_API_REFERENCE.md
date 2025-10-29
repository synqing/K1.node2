# K1Client API Reference for Integration Testing

## Overview

This document provides a complete API reference for the K1Client class methods used in integration testing. Each method includes detailed parameters, return values, error conditions, and usage examples.

## Table of Contents

1. [Constructor](#constructor)
2. [Connection Methods](#connection-methods)
3. [Device Information](#device-information)
4. [Pattern Management](#pattern-management)
5. [Parameter Control](#parameter-control)
6. [Palette Management](#palette-management)
7. [Configuration Backup/Restore](#configuration-backuprestore)
8. [Transport Management](#transport-management)
9. [Error Types](#error-types)
10. [Type Definitions](#type-definitions)

## Constructor

### `new K1Client(endpoint: string)`

Creates a new K1Client instance for communicating with a K1 device.

**Parameters:**
- `endpoint` (string): Base URL of the K1 device (e.g., 'http://192.168.1.103')

**Example:**
```typescript
const client = new K1Client('http://192.168.1.103')
```

**Notes:**
- Does not establish connection immediately
- Endpoint should include protocol (http:// or https://)
- Port number optional (defaults to 80 for HTTP)

## Connection Methods

### `connect(endpoint: string): Promise<K1DeviceInfo>`

Establishes connection to the K1 device and retrieves device information.

**Parameters:**
- `endpoint` (string): Full HTTP URL to K1 device

**Returns:**
- `Promise<K1DeviceInfo>`: Device information object

**Throws:**
- `K1Error(CONNECTION_FAILED)`: HTTP error response
- `K1Error(CONNECTION_TIMEOUT)`: Request timeout (5s default)
- `K1Error(NETWORK_ERROR)`: Network connectivity issues

**Example:**
```typescript
try {
  const deviceInfo = await client.connect('http://192.168.1.103')
  console.log('Connected to:', deviceInfo.device)
  console.log('Firmware:', deviceInfo.firmware)
  console.log('IP:', deviceInfo.ip)
} catch (error) {
  if (error.code === 'CONNECTION_TIMEOUT') {
    console.error('Device not responding')
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('Network connectivity issue')
  }
}
```

**Retry Behavior:**
- Automatically retries up to 3 times
- Uses exponential backoff (1s, 2s, 4s delays)
- Only retries on timeout or network errors

### `disconnect(): Promise<void>`

Closes connection to the K1 device and cleans up resources.

**Returns:**
- `Promise<void>`: Resolves when disconnection complete

**Example:**
```typescript
await client.disconnect()
console.log('Disconnected from device')
```

**Notes:**
- Safe to call multiple times
- Automatically called on client destruction
- Closes WebSocket connections if active

### `isConnected(): boolean`

Checks if client is currently connected to device.

**Returns:**
- `boolean`: True if connected, false otherwise

**Example:**
```typescript
if (client.isConnected()) {
  const params = await client.getParameters()
}
```

### `getEndpoint(): string`

Returns the current endpoint URL.

**Returns:**
- `string`: Current endpoint URL

**Example:**
```typescript
console.log('Connected to:', client.getEndpoint())
```

## Device Information

### `getDeviceInfo(): Promise<K1DeviceInfo>`

Retrieves current device information.

**Returns:**
- `Promise<K1DeviceInfo>`: Device information object

**Throws:**
- `Error`: If not connected

**Example:**
```typescript
const deviceInfo = await client.getDeviceInfo()
console.log('Device:', deviceInfo.device)
console.log('Firmware:', deviceInfo.firmware)
console.log('Uptime:', deviceInfo.uptime)
console.log('MAC:', deviceInfo.mac)
```

**K1DeviceInfo Properties:**
```typescript
interface K1DeviceInfo {
  device: string        // Device name (e.g., "K1.reinvented")
  firmware: string      // Firmware version (e.g., "1.0.0")
  uptime: number        // Uptime in milliseconds
  ip: string           // Device IP address
  mac: string          // MAC address
  lastSeen?: Date      // Last successful connection
  latency?: number     // Connection latency in ms
}
```

## Pattern Management

### `getPatterns(): Promise<K1PatternResponse>`

Retrieves list of available patterns and current selection.

**Returns:**
- `Promise<K1PatternResponse>`: Pattern list with current selection

**Throws:**
- `Error`: If request fails

**Example:**
```typescript
const response = await client.getPatterns()
console.log('Available patterns:', response.patterns.length)
console.log('Current pattern:', response.current_pattern)

response.patterns.forEach((pattern, index) => {
  console.log(`${index}: ${pattern.name} - ${pattern.description}`)
  console.log(`  Audio reactive: ${pattern.is_audio_reactive}`)
})
```

**K1PatternResponse Properties:**
```typescript
interface K1PatternResponse {
  patterns: K1Pattern[]    // Array of available patterns
  current_pattern: number  // Index of currently selected pattern
}

interface K1Pattern {
  index: number           // Pattern index
  id: string             // Unique pattern identifier
  name: string           // Display name
  description: string    // Pattern description
  is_audio_reactive: boolean  // Whether pattern responds to audio
}
```

### `selectPattern(patternId: string): Promise<K1ApiResponse<{ pattern: K1Pattern }>>`

Selects a pattern by ID.

**Parameters:**
- `patternId` (string): Pattern identifier

**Returns:**
- `Promise<K1ApiResponse>`: API response with selected pattern

**Example:**
```typescript
const result = await client.selectPattern('rainbow')
if (result.success) {
  console.log('Selected pattern:', result.data.pattern.name)
} else {
  console.error('Pattern selection failed:', result.error.error)
}
```

**Error Handling:**
```typescript
try {
  const result = await client.selectPattern('invalid_pattern')
  if (!result.success) {
    console.error('Pattern not found:', result.error.error)
  }
} catch (error) {
  console.error('Request failed:', error.message)
}
```

## Parameter Control

### `getParameters(): Promise<K1Parameters>`

Retrieves current device parameters.

**Returns:**
- `Promise<K1Parameters>`: Current parameter values

**Example:**
```typescript
const params = await client.getParameters()
console.log('Brightness:', params.brightness)
console.log('Speed:', params.speed)
console.log('Saturation:', params.saturation)
console.log('Palette ID:', params.palette_id)
```

**K1Parameters Properties:**
```typescript
interface K1Parameters {
  // Visual controls (0-100 scale in UI)
  brightness: number      // Overall brightness
  softness: number       // Edge softness
  color: number          // Color shift
  color_range: number    // Color range
  saturation: number     // Color saturation
  warmth: number         // Color temperature
  background: number     // Background brightness
  dithering: number      // Dithering amount
  
  // Pattern controls
  speed: number          // Animation speed
  palette_id: number     // Active palette (0-32)
  
  // Custom parameters
  custom_param_1: number // Pattern-specific parameter 1
  custom_param_2: number // Pattern-specific parameter 2
  custom_param_3: number // Pattern-specific parameter 3
}
```

### `updateParameters(params: Partial<K1Parameters>): Promise<K1ApiResponse<{ params: K1Parameters }>>`

Updates device parameters.

**Parameters:**
- `params` (Partial<K1Parameters>): Parameters to update

**Returns:**
- `Promise<K1ApiResponse>`: API response with updated parameters

**Example:**
```typescript
// Update single parameter
const result = await client.updateParameters({ brightness: 80 })
if (result.success) {
  console.log('Brightness updated to:', result.data.params.brightness)
}

// Update multiple parameters
const multiResult = await client.updateParameters({
  brightness: 90,
  speed: 60,
  saturation: 85
})
```

**Parameter Scaling:**
- UI values (0-100) are automatically converted to firmware values (0.0-1.0)
- palette_id is passed through unchanged
- Values are automatically clamped to valid ranges

**Rate Limiting:**
```typescript
// Respect rate limits with delays
await client.updateParameters({ brightness: 80 })
await delay(500)  // Wait before next update
await client.updateParameters({ speed: 60 })
```

**Error Handling:**
```typescript
try {
  const result = await client.updateParameters({ brightness: 150 })  // Invalid value
  if (result.success) {
    // Device will clamp to valid range (100)
    console.log('Actual brightness:', result.data.params.brightness)
  }
} catch (error) {
  console.error('Update failed:', error.message)
}
```

## Palette Management

### `setPalette(paletteId: number): Promise<K1ApiResponse<{ palette_id: number }>>`

Changes the active color palette.

**Parameters:**
- `paletteId` (number): Palette index (0-32)

**Returns:**
- `Promise<K1ApiResponse>`: API response with palette ID

**Example:**
```typescript
// Change to palette 5
const result = await client.setPalette(5)
if (result.success) {
  console.log('Palette changed to:', result.data.palette_id)
}

// Cycle through palettes
for (let i = 0; i < 10; i++) {
  await client.setPalette(i)
  await delay(1000)  // Show each palette for 1 second
}
```

**Error Handling:**
```typescript
try {
  const result = await client.setPalette(50)  // Invalid palette
  if (!result.success) {
    console.error('Invalid palette:', result.error.error)
  }
} catch (error) {
  console.error('Request failed:', error.message)
}
```

## Configuration Backup/Restore

### `backupConfig(): Promise<K1ConfigBackup>`

Creates a backup of the current device configuration.

**Returns:**
- `Promise<K1ConfigBackup>`: Complete device configuration

**Example:**
```typescript
const backup = await client.backupConfig()
console.log('Backup created:', backup.timestamp)
console.log('Device:', backup.device_info.device)
console.log('Patterns:', backup.configuration.patterns.length)

// Save backup to file
const backupJson = JSON.stringify(backup, null, 2)
fs.writeFileSync('k1-backup.json', backupJson)
```

**K1ConfigBackup Properties:**
```typescript
interface K1ConfigBackup {
  version: string           // Backup format version
  timestamp: string         // ISO timestamp
  device_info: {
    device: string         // Device name
    firmware: string       // Firmware version
    mac: string           // MAC address
  }
  configuration: {
    patterns: K1Pattern[]         // Available patterns
    current_pattern: number       // Selected pattern index
    parameters: K1Parameters      // Current parameters
    audio_config: K1AudioConfig   // Audio settings
    palette_id: number           // Active palette
  }
}
```

### `restoreConfig(config: K1ConfigBackup): Promise<K1ConfigRestoreResponse>`

Restores device configuration from backup.

**Parameters:**
- `config` (K1ConfigBackup): Configuration backup to restore

**Returns:**
- `Promise<K1ConfigRestoreResponse>`: Restore operation result

**Example:**
```typescript
// Load backup from file
const backupJson = fs.readFileSync('k1-backup.json', 'utf8')
const backup = JSON.parse(backupJson)

// Restore configuration
const result = await client.restoreConfig(backup)
if (result.success) {
  console.log('Configuration restored:', result.message)
  console.log('Restored items:', result.restored_items)
} else {
  console.error('Restore failed')
}
```

**K1ConfigRestoreResponse Properties:**
```typescript
interface K1ConfigRestoreResponse {
  success: boolean        // Whether restore succeeded
  message: string         // Status message
  restored_items: string[] // List of restored components
  warnings?: string[]     // Any warnings during restore
}
```

## Transport Management

### `setWebSocketEnabled(enabled: boolean): void`

Enables or disables WebSocket transport.

**Parameters:**
- `enabled` (boolean): Whether to enable WebSocket

**Example:**
```typescript
// Enable WebSocket for real-time data
client.setWebSocketEnabled(true)

// Disable WebSocket (use REST only)
client.setWebSocketEnabled(false)
```

### `isWebSocketEnabled(): boolean`

Checks if WebSocket transport is enabled.

**Returns:**
- `boolean`: True if WebSocket enabled

**Example:**
```typescript
if (client.isWebSocketEnabled()) {
  console.log('WebSocket transport active')
} else {
  console.log('Using REST transport only')
}
```

### `getTransportStatus(): TransportStatus`

Gets current transport status information.

**Returns:**
- `TransportStatus`: Transport status object

**Example:**
```typescript
const status = client.getTransportStatus()
console.log('WebSocket available:', status.wsAvailable)
console.log('WebSocket enabled:', status.wsEnabled)
console.log('REST available:', status.restAvailable)
console.log('Active transport:', status.activeTransport)
if (status.lastWSError) {
  console.log('Last WebSocket error:', status.lastWSError.message)
}
```

**TransportStatus Properties:**
```typescript
interface TransportStatus {
  wsAvailable: boolean      // WebSocket connection available
  wsEnabled: boolean        // WebSocket enabled in settings
  restAvailable: boolean    // REST API available
  activeTransport: 'ws' | 'rest'  // Currently active transport
  lastWSError: Error | null // Last WebSocket error
}
```

## Error Types

### K1Error Class

All K1Client methods throw structured K1Error instances for better error handling.

**Properties:**
```typescript
class K1Error extends Error {
  code: string              // Error code (e.g., 'CONNECTION_FAILED')
  userMessage: string       // User-friendly message
  recoverable: boolean      // Whether error is recoverable
  context?: any            // Additional error context
}
```

### Error Codes

| Code | Description | Recoverable | Common Causes |
|------|-------------|-------------|---------------|
| `CONNECTION_FAILED` | HTTP error response | Yes | Device offline, wrong IP |
| `CONNECTION_TIMEOUT` | Request timeout | Yes | Slow network, device busy |
| `NETWORK_ERROR` | Network connectivity | Yes | WiFi issues, firewall |
| `VALIDATION_ERROR` | Invalid parameters | No | Bad input values |
| `UNKNOWN_ERROR` | Unexpected error | Maybe | Firmware bugs, corruption |

### Error Handling Patterns

#### Basic Error Handling
```typescript
try {
  await client.connect(endpoint)
} catch (error) {
  if (error instanceof K1Error) {
    console.error(`K1 Error [${error.code}]: ${error.userMessage}`)
    if (error.recoverable) {
      console.log('Retrying...')
      // Implement retry logic
    }
  } else {
    console.error('Unexpected error:', error)
  }
}
```

#### Specific Error Handling
```typescript
try {
  await client.updateParameters({ brightness: 80 })
} catch (error) {
  switch (error.code) {
    case 'CONNECTION_TIMEOUT':
      console.log('Device is busy, retrying...')
      await delay(2000)
      // Retry operation
      break
    case 'NETWORK_ERROR':
      console.log('Network issue, check connectivity')
      break
    case 'VALIDATION_ERROR':
      console.log('Invalid parameter value')
      break
    default:
      console.error('Unexpected error:', error.message)
  }
}
```

## Type Definitions

### Core Types

```typescript
// API Response wrapper
interface K1ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: K1ApiError
  clamped?: boolean  // For parameter updates that were clamped
}

interface K1ApiError {
  error: string      // Error message
  details?: string   // Additional details
}

// Audio configuration
interface K1AudioConfig {
  microphone_gain: number  // 0.5-2.0 range
}
```

### Utility Types

```typescript
// For partial parameter updates
type PartialK1Parameters = Partial<K1Parameters>

// For pattern filtering
type AudioReactivePattern = K1Pattern & { is_audio_reactive: true }
type StaticPattern = K1Pattern & { is_audio_reactive: false }
```

## Usage Examples

### Complete Connection Flow
```typescript
async function connectAndTest() {
  const client = new K1Client('http://192.168.1.103')
  
  try {
    // Connect
    const deviceInfo = await client.connect('http://192.168.1.103')
    console.log('Connected to:', deviceInfo.device)
    
    // Get current state
    const patterns = await client.getPatterns()
    const params = await client.getParameters()
    
    console.log('Current pattern:', patterns.patterns[patterns.current_pattern].name)
    console.log('Current brightness:', params.brightness)
    
    // Make changes
    await client.updateParameters({ brightness: 90 })
    await delay(1500)  // Wait for update
    
    // Verify changes
    const newParams = await client.getParameters()
    console.log('New brightness:', newParams.brightness)
    
  } catch (error) {
    console.error('Operation failed:', error.message)
  } finally {
    // Always disconnect
    await client.disconnect()
  }
}
```

### Batch Parameter Updates
```typescript
async function updateMultipleParameters() {
  const client = new K1Client('http://192.168.1.103')
  await client.connect('http://192.168.1.103')
  
  // Update multiple parameters at once (more efficient)
  const updates = {
    brightness: 85,
    speed: 70,
    saturation: 90,
    palette_id: 3
  }
  
  const result = await client.updateParameters(updates)
  if (result.success) {
    console.log('All parameters updated successfully')
  }
  
  await client.disconnect()
}
```

### Pattern Cycling
```typescript
async function cyclePatterns() {
  const client = new K1Client('http://192.168.1.103')
  await client.connect('http://192.168.1.103')
  
  const patterns = await client.getPatterns()
  
  for (const pattern of patterns.patterns) {
    console.log(`Switching to: ${pattern.name}`)
    await client.selectPattern(pattern.id)
    await delay(3000)  // Show each pattern for 3 seconds
  }
  
  await client.disconnect()
}
```

This API reference provides comprehensive documentation for all K1Client methods used in integration testing. Use it as a reference when writing tests or debugging integration issues.