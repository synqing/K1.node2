---
title: K1 Control App - K1 Device Integration
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1 Control App - K1 Device Integration

## API Surface Overview

The K1 Control App communicates with K1 devices through the `K1Client` class, which provides both REST API and WebSocket interfaces for real-time communication.

### K1Client Class Structure (`k1-client.ts`)

```typescript
export class K1Client {
  private baseURL: string;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(ip: string, port: number = 80) {
    this.baseURL = `http://${ip}:${port}`;
  }
}
```

## REST API Endpoints

### Core Device Communication

#### Connection Testing
```typescript
async testConnection(): Promise<boolean>
```
- **Endpoint**: `GET /api/patterns`
- **Purpose**: Verify device connectivity and API availability
- **Timeout**: 5 seconds
- **Returns**: Boolean indicating connection success

#### Pattern Management
```typescript
async getPatterns(): Promise<K1Pattern[]>
```
- **Endpoint**: `GET /api/patterns`
- **Purpose**: Retrieve list of available patterns
- **Response**: Array of pattern objects with metadata

```typescript
async selectPattern(index: number): Promise<void>
```
- **Endpoint**: `POST /api/select`
- **Body**: `{ index: number }`
- **Purpose**: Switch to specified pattern by index

#### Parameter Control
```typescript
async getParameters(): Promise<K1Parameters>
```
- **Endpoint**: `GET /api/params`
- **Purpose**: Retrieve current parameter values
- **Returns**: Complete parameter state

```typescript
async updateParameters(params: Partial<K1ParameterUI>): Promise<K1Parameters>
```
- **Endpoint**: `POST /api/params`
- **Body**: Partial parameter object
- **Purpose**: Update device parameters
- **Conversion**: UI percentages (0-100) → firmware values (0.0-1.0)

#### Device Information
```typescript
async getDeviceInfo(): Promise<K1DeviceInfo>
```
- **Endpoint**: `GET /api/device/info`
- **Purpose**: Retrieve device metadata and performance stats
- **Fallback**: Returns default info if endpoint unavailable

#### Audio Configuration
```typescript
async getAudioConfig(): Promise<K1AudioConfig>
async updateAudioConfig(config: Partial<K1AudioConfig>): Promise<K1AudioConfig>
```
- **Endpoints**: `GET/POST /api/audio-config`
- **Purpose**: Manage audio processing settings

## WebSocket Integration

### Connection Management
```typescript
connectWebSocket(
  onMessage: (data: any) => void,
  onStatusChange: (status: string) => void
): void
```

**WebSocket URL**: `ws://{device_ip}/ws`

### Reconnection Strategy (Lines 208-214)
```typescript
private handleWebSocketReconnect(
  onMessage: (data: any) => void,
  onStatusChange: (status: string) => void
): void {
  if (this.reconnectAttempts < this.maxReconnectAttempts) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    setTimeout(() => {
      this.connectWebSocket(onMessage, onStatusChange);
    }, delay);
  }
}
```

**Backoff Schedule**:
- Attempt 1: 1 second
- Attempt 2: 2 seconds  
- Attempt 3: 4 seconds
- Attempt 4: 8 seconds
- Attempt 5: 16 seconds
- Max attempts: 5

### Planned WebSocket Enhancements

#### Real-time Parameter Updates
```typescript
// Proposed WebSocket message types
interface WSParameterUpdate {
  type: 'parameter_update';
  data: Partial<K1Parameters>;
}

interface WSPatternChange {
  type: 'pattern_change';
  data: { pattern_id: number };
}

interface WSLEDFrame {
  type: 'led_frame';
  data: Uint8Array; // RGB data for 180 LEDs
}
```

#### Backpressure Handling
- **Frame Dropping**: Drop old LED frames if rendering can't keep up
- **Parameter Coalescing**: Merge rapid parameter changes
- **Priority Queuing**: Critical messages bypass frame drops

## UI ↔ Firmware Parameter Mapping

### Parameter Conversion Utilities (Line 238)

```typescript
static firmwareToUI(params: K1Parameters): K1ParameterUI {
  return {
    brightness: Math.round(params.brightness * 100),
    speed: Math.round(params.speed * 100),
    saturation: Math.round(params.saturation * 100),
    warmth: Math.round(params.warmth * 100),
    softness: Math.round(params.softness * 100),
    background: Math.round(params.background * 100),
    palette_id: params.palette_id, // Direct mapping
  };
}

static uiToFirmware(params: K1ParameterUI): K1Parameters {
  return {
    brightness: params.brightness / 100,
    speed: params.speed / 100,
    saturation: params.saturation / 100,
    warmth: params.warmth / 100,
    softness: params.softness / 100,
    background: params.background / 100,
    palette_id: params.palette_id, // Direct mapping
  };
}
```

### Parameter Ranges and Validation

| Parameter | UI Range | Firmware Range | Validation |
|-----------|----------|----------------|------------|
| brightness | 0-100% | 0.0-1.0 | Clamp to range |
| speed | 0-100% | 0.0-1.0 | Clamp to range |
| saturation | 0-100% | 0.0-1.0 | Clamp to range |
| warmth | 0-100% | 0.0-1.0 | Clamp to range |
| softness | 0-100% | 0.0-1.0 | Clamp to range |
| background | 0-100% | 0.0-1.0 | Clamp to range |
| palette_id | 0-32 | 0-32 | Integer validation |

## Type Definitions (`k1-types.ts`)

### Core Interfaces

```typescript
export interface K1Pattern {
  index: number;
  id: string;
  name: string;
  description: string;
  is_audio_reactive: boolean;
}

export interface K1Parameters {
  brightness: number;
  softness: number;
  color: number;
  color_range: number;
  saturation: number;
  warmth: number;
  background: number;
  speed: number;
  palette_id: number;
  custom_param_1: number;
  custom_param_2: number;
  custom_param_3: number;
}

export interface K1DeviceInfo {
  firmware?: string;
  uptime?: number;
  ip?: string;
  mac?: string;
  performance?: {
    fps?: number;
    cpu_usage?: number;
    memory_usage?: number;
  };
}
```

### Audio Data Structures
```typescript
export interface K1AudioData {
  spectrum: number[];        // 64 frequency bins
  chromagram: number[];      // 12 musical notes  
  vu_level: number;         // Overall volume level
  vu_level_raw: number;     // Unfiltered volume
  tempo_confidence: number; // Beat detection confidence
  novelty_curve: number;    // Spectral flux
  update_counter: number;   // Freshness tracking
  timestamp_us: number;     // Timing information
}
```

## Static Data Integration (`k1-data.ts`)

### Pattern Definitions
```typescript
export const K1_PATTERNS: K1PatternWithCategory[] = [
  {
    index: 0,
    id: 'departure',
    name: 'Departure',
    description: 'Transformation: earth → light → growth',
    is_audio_reactive: false,
    category: 'static',
    icon: 'Sunrise',
    color: '#84cc16'
  },
  // ... 10 more patterns
];
```

### Palette System (33 Palettes)
```typescript
export const K1_PALETTES: K1Palette[] = [
  {
    id: 0,
    name: 'Warm Sunset',
    category: 'warm',
    swatches: ['#ff6b35', '#f7931e', '#ffd23f', '#06ffa5']
  },
  // ... 32 more palettes
];
```

## Discovery and Connection Flow

### Current Implementation
```typescript
// Manual IP entry in Sidebar component
const [connectionIP, setConnectionIP] = useState('192.168.1.100');
```

### Planned Discovery Enhancement
```typescript
interface K1DiscoveryService {
  discoverDevices(): Promise<K1DeviceInfo[]>;
  scanSubnet(subnet: string): Promise<K1DeviceInfo[]>;
  validateDevice(ip: string): Promise<boolean>;
}

// Potential mDNS discovery
const discoverK1Devices = async (): Promise<K1DeviceInfo[]> => {
  // Look for _k1._tcp.local services
  // Fallback to subnet scanning
  // Return list of discovered devices
};
```

## Error Handling and Recovery

### Error Types
```typescript
type K1ErrorType = 
  | 'connection_failed'
  | 'timeout'
  | 'invalid_response'
  | 'parameter_validation'
  | 'websocket_error'
  | 'device_not_found';

interface K1Error {
  type: K1ErrorType;
  message: string;
  timestamp: number;
  recoverable: boolean;
}
```

### Recovery Strategies

#### Connection Failures
1. **Immediate Retry**: For transient network issues
2. **Exponential Backoff**: For persistent connection problems
3. **User Notification**: Clear error messages with suggested actions
4. **Fallback Mode**: Offline mode with simulated responses

#### Parameter Update Failures
1. **Optimistic Updates**: Update UI immediately, rollback on error
2. **Retry Logic**: Automatic retry for recoverable errors
3. **State Reconciliation**: Sync UI with device state after recovery

#### WebSocket Disconnections
1. **Automatic Reconnection**: Exponential backoff strategy
2. **REST Fallback**: Switch to polling for critical updates
3. **Buffer Management**: Handle missed messages during disconnection

## Performance Optimization

### Request Optimization
- **Parameter Coalescing**: Merge rapid parameter changes
- **Request Deduplication**: Avoid duplicate in-flight requests
- **Timeout Management**: Appropriate timeouts for different operations

### WebSocket Optimization
- **Frame Dropping**: Drop old LED frames to maintain real-time performance
- **Compression**: Use WebSocket compression for large data
- **Heartbeat**: Maintain connection with periodic ping/pong

### Caching Strategy
- **Pattern List**: Cache patterns after first load
- **Device Info**: Cache with TTL for performance data
- **Parameter State**: Local state with periodic sync

## Integration Testing Strategy

### API Testing
```typescript
describe('K1Client', () => {
  it('should connect to device and retrieve patterns', async () => {
    const client = new K1Client('192.168.1.100');
    const connected = await client.testConnection();
    expect(connected).toBe(true);
    
    const patterns = await client.getPatterns();
    expect(patterns).toHaveLength(11);
  });
});
```

### WebSocket Testing
```typescript
describe('WebSocket Integration', () => {
  it('should handle reconnection with exponential backoff', async () => {
    // Mock WebSocket failures
    // Verify backoff timing
    // Confirm successful reconnection
  });
});
```

### Parameter Conversion Testing
```typescript
describe('Parameter Conversion', () => {
  it('should convert UI percentages to firmware values', () => {
    const uiParams = { brightness: 75, speed: 50 };
    const firmwareParams = K1Client.uiToFirmware(uiParams);
    expect(firmwareParams.brightness).toBe(0.75);
    expect(firmwareParams.speed).toBe(0.5);
  });
});
```

## Future Enhancements

### Advanced Features
1. **Device Clustering**: Control multiple K1 devices
2. **Preset Management**: Save/load parameter presets
3. **Scheduling**: Time-based pattern changes
4. **Audio Sync**: Multi-device audio synchronization

### Protocol Extensions
1. **Binary Protocol**: More efficient than JSON for high-frequency updates
2. **Compression**: Reduce bandwidth for LED frame data
3. **Authentication**: Secure device access
4. **Encryption**: Protect sensitive configuration data

## Cross-References

- [State and Data Flow](./STATE_AND_DATA_FLOW.md) - How K1Client integrates with app state
- [Component Hierarchy](./COMPONENT_HIERARCHY.md) - Which components use K1Client
- [Quality Playbook](./QUALITY_PLAYBOOK.md) - Testing strategies for API integration
- [K1 Firmware API](../../api/K1_FIRMWARE_API.md) - Complete API reference