---
title: Debug Capabilities Guide
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Debug Capabilities Guide

This document outlines the comprehensive debugging features available in the K1 Control App for development and troubleshooting.

## DevDebugPanel Overview

The DevDebugPanel is a powerful development tool that provides real-time insights into application performance, error tracking, and subscription management.

### Access Methods

**Primary Method**: Hotkey Toggle
- **Combination**: `Alt + Shift + D`
- **Availability**: Development mode only
- **Behavior**: Toggles panel visibility instantly

**Programmatic Access**:
```typescript
// Import debug utilities
import { 
  getAbortStats, 
  setAbortLoggingEnabled, 
  isAbortLoggingEnabled 
} from '../utils/error-utils';
import { getRealtimeMetrics, getActiveCounts } from '../utils/realtime-metrics';
```

## Core Features

### 1. Real-time Metrics Monitoring

**Subscription Tracking**:
- Live counts for `realtime`, `audio`, and `performance` subscriptions
- Start/stop event monitoring
- Active subscription counts by category

**Metrics Categories**:
```typescript
type MetricType = 'realtime' | 'audio' | 'performance';

interface RealtimeMetrics {
  subscriptions: Record<MetricType, number>;
  starts: Record<MetricType, number>;
  stops: Record<MetricType, number>;
}
```

### 2. Abort Error Management

**HMR Error Tracking**:
- Monitors abort errors during Hot Module Replacement
- Configurable logging enable/disable
- Window-based and total error counts

**Error Detection**:
```typescript
// Detects various abort error types
function isAbortError(error: any): boolean {
  // Checks for:
  // - AbortError name
  // - DOMException with abort code
  // - Messages containing 'abort' or 'cancelled'
}
```

**Statistics Tracking**:
```typescript
interface AbortStats {
  windowCount: number;    // Errors in current window
  totalCount: number;     // Total errors since start
  windowMs: number;       // Window duration
  lastWindowTime: number; // Last window reset time
}
```

### 3. Performance Monitoring

**HMR Delay Tracking**:
- Measures Hot Module Replacement response times
- Identifies performance bottlenecks during development
- Real-time delay reporting

**Configuration Options**:
- Adjustable summary window duration (default: 10 seconds)
- Toggle abort logging on/off
- Runtime configuration changes

## API Reference

### Error Utils (`src/utils/error-utils.ts`)

#### Core Functions

```typescript
// Enable/disable abort logging
setAbortLoggingEnabled(enabled: boolean): void

// Check current logging state
isAbortLoggingEnabled(): boolean

// Configure summary window
setAbortWindowMs(ms: number): void

// Get current statistics
getAbortStats(): AbortStats

// Reset statistics (development only)
resetAbortStats(): void

// Detect abort errors
isAbortError(error: any): boolean
```

#### Usage Examples

```typescript
// Enable detailed abort logging
setAbortLoggingEnabled(true);

// Set 30-second summary window
setAbortWindowMs(30000);

// Monitor abort statistics
const stats = getAbortStats();
console.log(`Window: ${stats.windowCount}, Total: ${stats.totalCount}`);

// Filter abort errors in catch blocks
try {
  await apiCall();
} catch (err) {
  if (!isAbortError(err)) {
    console.error('Non-abort error:', err);
  }
}
```

### Realtime Metrics (`src/utils/realtime-metrics.ts`)

#### Core Functions

```typescript
// Record subscription events
recordSubscription(type: MetricType): void
recordStart(type: MetricType): void
recordStop(type: MetricType): void

// Get current metrics
getRealtimeMetrics(): RealtimeMetrics
getActiveCounts(): Record<MetricType, number>

// Reset metrics (development only)
resetMetrics(): void
```

#### Usage Examples

```typescript
// Track subscription lifecycle
recordSubscription('audio');
recordStart('audio');
// ... subscription active
recordStop('audio');

// Monitor active subscriptions
const activeCounts = getActiveCounts();
console.log('Active audio subscriptions:', activeCounts.audio);

// Get comprehensive metrics
const metrics = getRealtimeMetrics();
console.log('Total subscriptions:', metrics.subscriptions);
```

## Integration with useK1Realtime Hook

The debug capabilities are seamlessly integrated with the `useK1Realtime` hook:

```typescript
// Hook automatically records metrics
const realtime = useK1Realtime({
  subscribe: (callback) => k1Actions.subscribeAudio(callback),
  onData: (data) => handleAudioData(data),
  metricType: 'audio', // Automatically tracked
  autoStart: true
});

// Metrics are recorded automatically:
// - recordSubscription() on hook creation
// - recordStart() when realtime.start() called
// - recordStop() when realtime.stop() called
```

## Development Workflows

### 1. Performance Debugging

```typescript
// 1. Enable debug panel
// Press Alt+Shift+D

// 2. Monitor subscription overhead
const activeCounts = getActiveCounts();
if (activeCounts.realtime > 10) {
  console.warn('High subscription count detected');
}

// 3. Track HMR performance
// Watch HMR delay metrics in debug panel
// Identify slow reload patterns
```

### 2. Error Analysis

```typescript
// 1. Enable abort logging
setAbortLoggingEnabled(true);

// 2. Trigger HMR events
// Make code changes and observe abort patterns

// 3. Analyze error statistics
const stats = getAbortStats();
if (stats.windowCount > 5) {
  console.warn('High abort rate detected');
}
```

### 3. Subscription Management

```typescript
// 1. Monitor active subscriptions
const metrics = getRealtimeMetrics();

// 2. Identify subscription leaks
if (metrics.starts.audio > metrics.stops.audio + getActiveCounts().audio) {
  console.warn('Potential subscription leak in audio category');
}

// 3. Reset metrics for clean testing
resetMetrics();
```

## Best Practices

### 1. Development Environment

- Always enable the debug panel during active development
- Monitor subscription counts to prevent memory leaks
- Use abort logging to identify HMR-related issues

### 2. Error Handling

```typescript
// Proper error filtering
try {
  await k1Client.connect();
} catch (err) {
  if (isAbortError(err)) {
    // Ignore abort errors during HMR
    return;
  }
  // Handle real errors
  console.error('Connection failed:', err);
}
```

### 3. Performance Monitoring

- Set appropriate summary windows for your testing needs
- Monitor HMR delays to identify performance bottlenecks
- Use active counts to validate component cleanup

### 4. Testing Integration

```typescript
// Include debug panel in testing workflows
describe('Debug Panel Integration', () => {
  beforeEach(() => {
    resetMetrics();
    resetAbortStats();
  });

  it('should track subscription lifecycle', () => {
    recordSubscription('audio');
    recordStart('audio');
    
    const counts = getActiveCounts();
    expect(counts.audio).toBe(1);
    
    recordStop('audio');
    expect(getActiveCounts().audio).toBe(0);
  });
});
```

## Troubleshooting

### Common Issues

**Debug Panel Not Visible**:
- Ensure you're in development mode
- Verify hotkey combination: Alt+Shift+D
- Check browser console for JavaScript errors

**Metrics Not Updating**:
- Confirm components are using `useK1Realtime` hook correctly
- Verify `metricType` is specified in hook configuration
- Check that `recordStart`/`recordStop` are being called

**Abort Logging Not Working**:
- Enable logging: `setAbortLoggingEnabled(true)`
- Verify errors are actually abort errors using `isAbortError()`
- Check summary window configuration

### Debug Commands

```typescript
// Reset all debug state
resetMetrics();
resetAbortStats();

// Enable verbose logging
setAbortLoggingEnabled(true);
setAbortWindowMs(5000); // 5-second window

// Check current state
console.log('Metrics:', getRealtimeMetrics());
console.log('Abort Stats:', getAbortStats());
console.log('Active Counts:', getActiveCounts());
```

## Cross-References

- [Development Guide](../../../k1-control-app/DEVELOPMENT.md) - Main development setup
- [Development Workflows](./DEVELOPMENT_WORKFLOWS.md) - Testing and debugging workflows
- [useK1Realtime Hook](../../../k1-control-app/src/hooks/useK1Realtime.ts) - Hook implementation
- [Error Utils](../../../k1-control-app/src/utils/error-utils.ts) - Error handling utilities
- [Realtime Metrics](../../../k1-control-app/src/utils/realtime-metrics.ts) - Metrics tracking utilities