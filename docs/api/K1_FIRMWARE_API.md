# K1.reinvented Firmware API Reference

## Overview

The K1.reinvented firmware exposes a REST API for controlling patterns, parameters, and device configuration. This document describes the current API endpoints based on the implemented K1Client.

**Base URL**: `http://<device-ip>:80`  
**Content-Type**: `application/json` for POST requests  
**Response Format**: JSON

## Authentication

Currently no authentication required. All endpoints are publicly accessible on the local network.

## REST API Endpoints

### Pattern Management

#### GET /api/patterns
Get list of available patterns.

**Response**:
```json
{
  "patterns": [
    {
      "id": 0,
      "name": "Departure",
      "category": "static",
      "audio_reactive": false
    },
    {
      "id": 1,
      "name": "Lava",
      "category": "static", 
      "audio_reactive": false
    }
    // ... 11 total patterns
  ],
  "current": 0
}
```

#### POST /api/select
Select a pattern by index or ID.

**Request Body**:
```json
{
  "index": 2
}
```
OR
```json
{
  "id": "spectrum"
}
```

**Response**:
```json
{
  "success": true,
  "current_pattern": 2,
  "message": "Pattern selected successfully"
}
```

### Parameter Management

#### GET /api/params
Get current parameter values.

**Response**:
```json
{
  "brightness": 0.8,
  "speed": 0.5,
  "saturation": 1.0,
  "warmth": 0.2,
  "softness": 0.3,
  "background": 0.1,
  "palette_id": 5
}
```

#### POST /api/params
Update one or more parameters.

**Request Body** (partial updates supported):
```json
{
  "brightness": 0.9,
  "speed": 0.7,
  "palette_id": 12
}
```

**Response**:
```json
{
  "success": true,
  "params": {
    "brightness": 0.9,
    "speed": 0.7,
    "saturation": 1.0,
    "warmth": 0.2,
    "softness": 0.3,
    "background": 0.1,
    "palette_id": 12
  }
}
```

**Parameter Ranges**:
- `brightness`: 0.0 - 1.0 (firmware) / 0-100% (UI)
- `speed`: 0.0 - 1.0 (firmware) / 0-100% (UI)
- `saturation`: 0.0 - 1.0 (firmware) / 0-100% (UI)
- `warmth`: 0.0 - 1.0 (firmware) / 0-100% (UI)
- `softness`: 0.0 - 1.0 (firmware) / 0-100% (UI)
- `background`: 0.0 - 1.0 (firmware) / 0-100% (UI)
- `palette_id`: 0-32 (integer, no conversion needed)

#### POST /api/reset
Reset all parameters to default values.

**Response**:
```json
{
  "brightness": 0.8,
  "speed": 0.5,
  "saturation": 1.0,
  "warmth": 0.0,
  "softness": 0.0,
  "background": 0.0,
  "palette_id": 0
}
```

### Audio Configuration

#### GET /api/audio-config
Get current audio processing configuration.

**Response**:
```json
{
  "gain": 1.0,
  "noise_gate": 0.1,
  "beat_sensitivity": 0.7,
  "frequency_range": {
    "low": 20,
    "high": 20000
  }
}
```

#### POST /api/audio-config
Update audio processing configuration.

**Request Body**:
```json
{
  "gain": 1.2,
  "beat_sensitivity": 0.8
}
```

**Response**: Same as GET /api/audio-config

### Configuration Management

#### GET /api/config/backup
Export current device configuration as JSON.

**Rate Limit**: 2000ms cooldown. Returns 429 with rate-limit headers when exceeded.

**Response**:
```json
{
  "version": "1.0",
  "device": "K1.reinvented",
  "timestamp": 123456,
  "uptime_seconds": 5432,
  "parameters": {
    "brightness": 0.8,
    "softness": 0.25,
    "color": 0.33,
    "color_range": 0.0,
    "saturation": 0.75,
    "warmth": 0.0,
    "background": 0.25,
    "speed": 0.5,
    "palette_id": 5,
    "custom_param_1": 0.5,
    "custom_param_2": 0.5,
    "custom_param_3": 0.5
  },
  "current_pattern": 2,
  "device_info": {
    "ip": "192.168.1.100",
    "mac": "AA:BB:CC:DD:EE:FF",
    "firmware": "2.0"
  }
}
```

**Headers**:
- `Content-Disposition`: `attachment; filename="k1-config-backup.json"`
- CORS headers are attached on all responses

#### POST /api/config/restore
Restore configuration from a JSON backup.

**Rate Limit**: 2000ms cooldown. Returns 429 with rate-limit headers when exceeded.

**Request Body**:
```json
{
  "version": "1.0",
  "parameters": {
    "brightness": 1.0,
    "softness": 0.25,
    "color": 0.33,
    "color_range": 0.0,
    "saturation": 0.75,
    "warmth": 0.0,
    "background": 0.25,
    "speed": 0.5,
    "palette_id": 0,
    "custom_param_1": 0.5,
    "custom_param_2": 0.5,
    "custom_param_3": 0.5
  },
  "current_pattern": 2
}
```

- Required fields: `version`, `parameters`
- Optional field: `current_pattern` (restores selection if valid)

**Response**:
```json
{
  "success": true,
  "parameters_restored": true,
  "pattern_restored": true,
  "timestamp": 1234567,
  "warning": "Some parameters were clamped to valid ranges"
}
```

### Device Information (Future)

#### GET /api/device/info
Get device information and status.

**Response** (when implemented):
```json
{
  "device": "K1.reinvented",
  "firmware": "1.0.0",
  "uptime": 3600,
  "ip": "192.168.1.100",
  "mac": "AA:BB:CC:DD:EE:FF",
  "performance": {
    "fps": 120,
    "cpu_usage": 45,
    "memory_usage": 60,
    "temperature": 42
  }
}
```

**Current Fallback**: Returns basic info with "Unknown" values for missing data.

## WebSocket API (Future Enhancement)

### Connection
**URL**: `ws://<device-ip>:80/ws`

### Real-time Data Stream
When implemented, the WebSocket will stream real-time data:

```json
{
  "type": "realtime_update",
  "timestamp": 1640995200000,
  "led_data": [255, 128, 64, ...], // RGB values for 180 LEDs
  "audio_data": {
    "spectrum": [0.1, 0.3, 0.8, ...], // 64 frequency bins
    "beat_detected": true,
    "tempo": 120,
    "rms_level": 0.6
  },
  "performance": {
    "fps": 118,
    "dropped_frames": 2
  }
}
```

### Parameter Updates
Send parameter updates via WebSocket:

```json
{
  "type": "param_update",
  "params": {
    "brightness": 0.9,
    "speed": 0.6
  }
}
```

## Error Responses

All endpoints use a standardized error format:

```json
{
  "error": "invalid_json",
  "message": "Request body contains invalid JSON",
  "timestamp": 1640995200000,
  "status": 400
}
```

- CORS headers are attached to all error responses.
- For rate limiting (429), responses include:
  - `X-RateLimit-Window` (ms)
  - `X-RateLimit-NextAllowedMs` (ms)

**Common Error Codes**:
- `400`: Bad Request (invalid or missing fields)
- `404`: Not Found (invalid endpoint or resource)
- `429`: Too Many Requests (per-route rate limit)
- `500`: Internal Server Error (firmware issue)
- `503`: Service Unavailable (device busy)

## Connection Testing

To test if a K1 device is reachable:

```bash
curl http://192.168.1.100/api/patterns
```

Should return the patterns list if the device is accessible.

## Implementation Status

### ✅ Currently Implemented
- Pattern selection and listing
- Parameter management (all 6 parameters + palette_id)
- Parameter reset
- Audio configuration
- Configuration backup/restore
- Device discovery via mDNS
- Standardized error handling and CORS

### 🔄 Partially Implemented
- Device info (fallback values only)
- Connection testing

### 📋 Future Enhancements
- WebSocket real-time updates
- Performance metrics
- Firmware update endpoints

## Notes for Developers

1. **Parameter Conversion**: The K1Client automatically converts between UI percentages (0-100%) and firmware values (0.0-1.0) for all parameters except `palette_id`.

2. **Error Handling**: All API calls should be wrapped in try-catch blocks. Network timeouts are common in WiFi environments.

3. **WebSocket Fallback**: The current implementation includes WebSocket connection logic but falls back gracefully to REST-only operation if WebSocket is unavailable.

4. **IP Address Validation**: Use `K1Client.isValidIP()` to validate IP addresses before creating client instances.

5. **Connection Testing**: Always test connectivity with `testConnection()` before attempting other operations.

## Example Usage

```typescript
// Create client
const client = new K1Client('192.168.1.100');

// Test connection
const isConnected = await client.testConnection();

// Select pattern
await client.selectPattern(3);

// Update parameters
await client.updateParameters({
  brightness: 90,  // UI percentage
  speed: 75,       // UI percentage
  palette_id: 12   // Direct value
});

// Get current state
const patterns = await client.getPatterns();
const params = await client.getParameters();
```

---

**Last Updated**: 2025-10-27  
**API Version**: 1.0  
**Firmware Compatibility**: K1.reinvented v1.0+