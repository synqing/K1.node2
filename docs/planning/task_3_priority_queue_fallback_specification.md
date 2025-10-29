<!-- markdownlint-disable MD013 -->

# Task 3: Priority Queue Fallback Logic Specification

**Author:** Claude (Agent)
**Date:** 2025-10-27
**Status:** published
**Intent:** Formal specification for intelligent discovery method selection with queueing and learning-based priority adjustment

---

## 1. Executive Summary

Replace sequential K1Client → K1DiscoveryService fallback with intelligent priority queue supporting:
- Three execution strategies: Sequential, Race (parallel), Hybrid
- Per-method timeout and retry configuration
- Learning algorithm that adjusts priorities based on success rates and speed
- Configurable method priorities (1-10 scale)
- Fallback logic with intelligent retries

**Key Benefits:**
- Reduce average discovery time by 30-50% (race/hybrid strategies)
- Improve success rates through intelligent method selection
- Adapt to network conditions automatically (learning algorithm)
- Maintain reliability through sequential fallback when needed

---

## 2. Functional Requirements

### 2.1 Core Module: DiscoveryMethodQueue

**File Location:** `src/services/discovery-queue.ts`
**Module Type:** Service
**Dependencies:** `discovery-metrics.ts` (for method statistics)
**Export:** New instance passed to DeviceDiscoveryAbstraction in constructor

#### 2.1.1 Class Definition

```typescript
export class DiscoveryMethodQueue {
  // Registered discovery methods
  private methods: Map<string, DiscoveryMethod>;

  // Current configuration (priorities, timeouts, strategies)
  private config: DiscoveryQueueConfig;

  // Reference to metrics for scoring
  private metrics: DiscoveryMetricsCollector;

  // Executor function (provided by device-discovery.ts)
  private executor: (method: string, timeout: number) => Promise<DiscoveryResult>;

  // Current execution strategy
  private strategy: ExecutionStrategy;

  constructor(
    config: DiscoveryQueueConfig,
    metrics: DiscoveryMetricsCollector,
    executor: (method: string, timeout: number) => Promise<DiscoveryResult>
  ) {
    this.config = config;
    this.metrics = metrics;
    this.executor = executor;
    this.strategy = config.strategy || 'sequential';
  }
}
```

#### 2.1.2 Core Methods

**Method 1: execute()**

```typescript
async execute(options: ExecutionOptions): Promise<DiscoveryResult> {
  /**
   * Purpose: Execute discovery using configured strategy
   *
   * Inputs:
   *   - options: ExecutionOptions
   *     {
   *       strategy?: 'sequential' | 'race' | 'hybrid',
   *       timeout?: number,
   *       preferredMethods?: string[]
   *     }
   *
   * Returns: DiscoveryResult (from first successful method or all errors)
   *
   * Logic:
   *   1. Determine strategy: options.strategy || this.strategy || 'sequential'
   *   2. Select methods to execute (from config.methods, sorted by priority)
   *   3. Delegate to appropriate executor:
   *      - 'sequential' → executeSequential()
   *      - 'race' → executeRace()
   *      - 'hybrid' → executeHybrid()
   *   4. Record execution metrics
   *   5. Return result
   *
   * Error Handling:
   *   - If all methods fail: aggregate errors, return failure
   *   - If strategy is invalid: default to sequential
   */
}
```

**Method 2: executeSequential()**

```typescript
private async executeSequential(
  methods: DiscoveryMethod[],
  timeout: number
): Promise<DiscoveryResult> {
  /**
   * Purpose: Try methods in priority order, return first success
   *
   * Inputs:
   *   - methods: DiscoveryMethod[] (sorted by priority desc)
   *   - timeout: number (per-method timeout in ms)
   *
   * Returns: DiscoveryResult
   *
   * Algorithm:
   *   1. For each method in order:
   *      a. Set method timeout (method.timeout || timeout)
   *      b. Call executor(method.name, methodTimeout)
   *      c. If success && devices.length > 0: return result (FAST RETURN)
   *      d. If error: record failure, continue to next
   *      e. If retries remain for this method: retry before next method
   *   2. If all methods exhausted: return last error
   *
   * Pseudo-code:
   *   for each method (sorted by priority):
   *     for attempt = 0 to method.retries:
   *       result = await executor(method, timeout)
   *       if success: return result
   *       if error: recordError(method)
   *   return aggregatedError
   *
   * Performance:
   *   - Best case: first method succeeds → ~3-5 seconds
   *   - Worst case: all fail → 3s + 5s + ...
   *   - Average: ~5-8 seconds (mdns + scan both attempted)
   *
   * Use Case:
   *   - Reliable networks: sequential is fast enough
   *   - High success rate expected: minimal retries needed
   */
}
```

**Method 3: executeRace()**

```typescript
private async executeRace(
  methods: DiscoveryMethod[],
  timeout: number
): Promise<DiscoveryResult> {
  /**
   * Purpose: Execute all methods in parallel, return first success
   *
   * Inputs:
   *   - methods: DiscoveryMethod[]
   *   - timeout: number (per-method timeout in ms)
   *
   * Returns: DiscoveryResult
   *
   * Algorithm:
   *   1. Create promises for each method (all in parallel)
   *   2. Use Promise.race() to return first successful result
   *   3. If first result fails, continue waiting for others
   *   4. Return first success or aggregate all errors if all fail
   *
   * Pseudo-code:
   *   const promises = methods.map(m =>
   *     executor(m.name, m.timeout || timeout)
   *       .then(r => ({ success: true, result: r, method: m.name }))
   *       .catch(e => ({ success: false, error: e, method: m.name }))
   *   )
   *
   *   while promises not empty:
   *     fastest = await Promise.race(promises)
   *     if fastest.success: return fastest.result
   *     remove fastest from promises
   *
   *   return aggregateErrors
   *
   * Performance:
   *   - Best case: fastest method succeeds in ~3-5 seconds
   *   - Worst case: all fail → ~5 seconds (slowest method's timeout)
   *   - Average: ~3-4 seconds (likely mdns succeeds before scan timeout)
   *
   * Network Usage:
   *   - High: Both methods running simultaneously
   *   - ~200KB for mDNS broadcast + 1-2MB for IP scan
   *
   * Use Case:
   *   - Unreliable networks: one method likely to fail
   *   - Speed critical: minimize latency
   *   - Resource available: parallel execution acceptable
   */
}
```

**Method 4: executeHybrid()**

```typescript
private async executeHybrid(
  methods: DiscoveryMethod[],
  timeout: number
): Promise<DiscoveryResult> {
  /**
   * Purpose: Sequential for high-priority, race for low-priority
   *
   * Inputs:
   *   - methods: DiscoveryMethod[] (sorted by priority desc)
   *   - timeout: number
   *
   * Returns: DiscoveryResult
   *
   * Algorithm:
   *   1. Split methods into two groups:
   *      - highPriority: priority >= 7 (sequential)
   *      - lowPriority: priority < 7 (race if high fails)
   *   2. Execute high priority sequentially:
   *      - Try each in order with retries
   *      - Return immediately on success
   *   3. If high priority fails, race low priority:
   *      - Execute remaining in parallel
   *      - Return first success or aggregate errors
   *
   * Pseudo-code:
   *   // Phase 1: Sequential high-priority
   *   for method in highPriority (sorted desc):
   *     result = await executeSequential([method], timeout)
   *     if success: return result
   *
   *   // Phase 2: Race low-priority
   *   return await executeRace(lowPriority, timeout)
   *
   * Performance:
   *   - Best case: high-priority method succeeds → ~3-5 sec
   *   - Worst case: high fails, low race → ~5-8 sec
   *   - Average: ~5 sec (balances speed and reliability)
   *
   * Rationale:
   *   - High-priority methods usually fastest/most reliable
   *   - If primary fails, parallel fallback recovers quickly
   *   - Reduces network churn vs. pure race
   *   - Better than pure sequential for unreliable networks
   *
   * Use Case:
   *   - Default strategy (recommended)
   *   - Works well in most network conditions
   *   - Balances speed, reliability, and resource usage
   */
}
```

**Method 5: adjustPriorities()**

```typescript
adjustPriorities(): void {
  /**
   * Purpose: Adjust method priorities based on recent success rates and speed
   *
   * Inputs: None (uses metrics from discovery-metrics singleton)
   *
   * Logic:
   *   For each method:
   *     1. Get metrics: successRate, avgDurationMs
   *     2. Calculate score:
   *        score = (successRate * 0.7) + (speedFactor * 0.3)
   *        speedFactor = max(0, 1 - avgDurationMs / 10000)
   *     3. Map score to priority (1-10 scale):
   *        score 0.90-1.00 → priority 9-10
   *        score 0.70-0.90 → priority 7-8
   *        score 0.50-0.70 → priority 5-6
   *        score 0.00-0.50 → priority 1-4
   *     4. Update method.priority in config
   *
   * Execution Frequency:
   *   - Called after every successful discovery
   *   - Or manually via setConfig()
   *
   * Constraints:
   *   - Priority stays within [1, 10]
   *   - Don't change priority if < 10 attempts (insufficient data)
   *   - Smooth transitions (±1 step per adjustment)
   *
   * Example:
   *   mDNS: successRate 0.9, avgDuration 1.5s
   *   score = (0.9 * 0.7) + ((1 - 1500/10000) * 0.3) = 0.63 + 0.255 = 0.885
   *   priority = 8
   *
   *   Scan: successRate 0.6, avgDuration 5.0s
   *   score = (0.6 * 0.7) + ((1 - 5000/10000) * 0.3) = 0.42 + 0.15 = 0.57
   *   priority = 5
   */
}
```

**Method 6: getRecommendedStrategy()**

```typescript
getRecommendedStrategy(): ExecutionStrategy {
  /**
   * Purpose: Suggest optimal strategy based on network conditions
   *
   * Returns: 'sequential' | 'race' | 'hybrid'
   *
   * Logic:
   *   1. Analyze recent discovery attempts (last 10)
   *   2. Calculate success rate across all methods
   *   3. Calculate variance in method performance
   *
   *   If success rate > 0.95 and variance < 0.1:
   *     return 'sequential' (very reliable network)
   *   Else if success rate > 0.80 and variance > 0.3:
   *     return 'hybrid' (inconsistent methods)
   *   Else if success rate < 0.70:
   *     return 'race' (unreliable network, need speed)
   *   Else:
   *     return current strategy (no improvement expected)
   */
}
```

**Method 7: setConfig()**

```typescript
setConfig(config: Partial<DiscoveryQueueConfig>): void {
  /**
   * Purpose: Update queue configuration (priorities, timeouts, strategy)
   *
   * Inputs:
   *   - config: Partial<DiscoveryQueueConfig>
   *     {
   *       strategy?: 'sequential' | 'race' | 'hybrid',
   *       methods?: {
   *         mdns: { priority: 1-10, timeout: ms, retries: 0-3 },
   *         scan: { priority: 1-10, timeout: ms, retries: 0-3 }
   *       }
   *     }
   *
   * Validation:
   *   - Priority must be 1-10
   *   - Timeout must be > 0
   *   - Retries must be 0-3
   *
   * Side Effects:
   *   - Updates this.config
   *   - Calls adjustPriorities() if priorities changed
   *
   * Error Handling:
   *   - Invalid priority: skip, log warning
   *   - Invalid timeout: default to 5000ms
   *   - Invalid retries: default to 1
   */
}
```

**Method 8: getConfig()**

```typescript
getConfig(): DiscoveryQueueConfig {
  /**
   * Purpose: Get current queue configuration
   *
   * Returns: DiscoveryQueueConfig
   *
   * Use Cases:
   *   - Dashboard: display current settings
   *   - API: expose configuration to consumers
   *   - Debugging: verify settings
   */
}
```

### 2.2 Interface Definitions

#### DiscoveryMethod

```typescript
export interface DiscoveryMethod {
  name: 'mdns' | 'scan';              // Method identifier
  priority: number;                    // 1-10 (higher = try first)
  timeout: number;                     // ms to wait for this method
  retries: number;                     // 0-3 retry attempts
  enabled: boolean;                    // Can be disabled
  description: string;                 // Human-readable name
}
```

#### DiscoveryQueueConfig

```typescript
export interface DiscoveryQueueConfig {
  strategy: ExecutionStrategy;         // 'sequential', 'race', or 'hybrid'
  methods: {
    mdns: DiscoveryMethod,
    scan: DiscoveryMethod
  };
  maxConcurrent?: number;              // Parallel execution limit
  globalTimeout?: number;              // Overall timeout (ms)
}
```

#### ExecutionStrategy

```typescript
export type ExecutionStrategy = 'sequential' | 'race' | 'hybrid';
```

#### ExecutionOptions

```typescript
export interface ExecutionOptions {
  strategy?: ExecutionStrategy;        // Override config strategy
  timeout?: number;                    // Override method timeout
  preferredMethods?: string[];         // Prefer certain methods
}
```

### 2.3 Default Configuration

```typescript
const DEFAULT_QUEUE_CONFIG: DiscoveryQueueConfig = {
  strategy: 'hybrid',  // Recommended default
  methods: {
    mdns: {
      name: 'mdns',
      priority: 9,      // High priority (mdns usually fastest)
      timeout: 3000,    // 3 seconds
      retries: 1,       // 1 retry
      enabled: true,
      description: 'mDNS (Bonjour) broadcast discovery'
    },
    scan: {
      name: 'scan',
      priority: 5,      // Lower priority (fallback)
      timeout: 5000,    // 5 seconds
      retries: 0,       // No retries (takes longer)
      enabled: true,
      description: 'IP range scanning'
    }
  },
  maxConcurrent: 2,
  globalTimeout: 15000  // 15 second overall limit
};
```

---

## 3. Integration Points

### 3.1 DeviceDiscoveryAbstraction Modifications

**Location 1: Constructor**

```typescript
export class DeviceDiscoveryAbstraction {
  private _queue: DiscoveryMethodQueue;

  constructor() {
    this._discoveryService = new K1DiscoveryService();

    // Initialize queue with metrics reference
    const defaultConfig = getDefaultQueueConfig();
    this._queue = new DiscoveryMethodQueue(
      defaultConfig,
      discoveryMetrics,
      this._executeDiscoveryMethod.bind(this)
    );
  }
}
```

**Location 2: discover() method replacement**

```typescript
async discover(options: K1DiscoveryOptions = {}): Promise<DiscoveryResult> {
  // ... existing debounce/queue logic ...

  try {
    const startTime = performance.now();
    const attemptId = discoveryMetrics.startDiscovery('hybrid');

    // OLD: Sequential K1Client → K1DiscoveryService
    // NEW: Use intelligent queue with configured strategy
    const result = await this._queue.execute({
      strategy: options.strategy || 'hybrid',
      timeout: options.timeout || 5000
    });

    // ... rest of existing discovery flow ...
  }
}
```

**Location 3: New method _executeDiscoveryMethod()**

```typescript
private async _executeDiscoveryMethod(
  method: string,
  timeout: number
): Promise<DiscoveryResult> {
  /**
   * Purpose: Execute a single discovery method
   * Called by DiscoveryMethodQueue.execute()
   *
   * Inputs:
   *   - method: 'mdns' | 'scan'
   *   - timeout: ms timeout for this method
   *
   * Returns: DiscoveryResult or throws error
   *
   * Implementation:
   *   1. Validate method name
   *   2. Route to appropriate discoverer:
   *      - 'mdns' → K1Client.discover()
   *      - 'scan' → K1DiscoveryService.discoverDevices()
   *   3. Return normalized result
   *   4. On error: throw with method context
   */
}
```

**Location 4: Public configuration methods**

```typescript
export class DeviceDiscoveryAbstraction {
  // ... existing methods ...

  setDiscoveryStrategy(strategy: 'sequential' | 'race' | 'hybrid'): void {
    const config = this._queue.getConfig();
    config.strategy = strategy;
    this._queue.setConfig(config);
  }

  getDiscoveryQueueConfig(): DiscoveryQueueConfig {
    return this._queue.getConfig();
  }
}
```

---

## 4. Testing Requirements

### 4.1 Unit Tests: discovery-queue.test.ts

**Test Categories:** 5 major areas with 20+ individual tests

#### Category 1: Sequential Strategy (5 tests)
- ✓ Returns first successful method
- ✓ Skips failed methods and tries next
- ✓ Respects per-method retries
- ✓ Returns error if all methods fail
- ✓ Respects method priorities (high priority first)

#### Category 2: Race Strategy (4 tests)
- ✓ Executes all methods in parallel
- ✓ Returns first successful result
- ✓ Waits for all if first fails
- ✓ Returns error if all fail

#### Category 3: Hybrid Strategy (4 tests)
- ✓ Runs high-priority (>=7) sequentially
- ✓ Falls back to low-priority race
- ✓ Returns immediately on high-priority success
- ✓ Uses race timeout for low-priority methods

#### Category 4: Priority Learning (3 tests)
- ✓ Adjusts priority based on success rate
- ✓ Weights speed factor (30%) and success (70%)
- ✓ Clamps priority to [1, 10]

#### Category 5: Configuration (4 tests)
- ✓ Sets and retrieves configuration
- ✓ Validates priority ranges (1-10)
- ✓ Rejects invalid timeouts
- ✓ Default configuration is sensible

### 4.2 Integration Tests: device-discovery with queue

**Test Scenarios:** 4 major flows

#### Scenario 1: Sequential Discovery (Reliable Network)
- mDNS succeeds → returns immediately
- Doesn't try scan (unnecessary)
- ✓ Performance: ~3-5s

#### Scenario 2: Race Discovery (Unreliable Network)
- mDNS and scan both execute
- mDNS fails, scan succeeds → return scan result
- ✓ Performance: ~4-5s (faster than sequential failure)

#### Scenario 3: Hybrid Discovery (Mixed Conditions)
- High priority (mdns, priority=9) tried first
- If fails, low priority (scan, priority=5) raced
- ✓ Balances speed and reliability

#### Scenario 4: Learning Adjustment
- 10 discoveries with mdns/scan
- Calculate success rates and speeds
- Adjust priorities based on learning algorithm
- New discovery respects adjusted priorities
- ✓ Priorities adapt to network conditions

---

## 5. Performance Specifications

### 5.1 Execution Time Targets

| Strategy | Best Case | Worst Case | Average | Condition |
|----------|-----------|-----------|---------|-----------|
| Sequential | 3s | 8s | 5-6s | Reliable network |
| Race | 3s | 5s | 4s | Unreliable network |
| Hybrid | 3s | 5s | 4-5s | Mixed conditions |

### 5.2 Network Impact

| Metric | Sequential | Race | Hybrid |
|--------|-----------|------|--------|
| Parallel methods | 1 | 2 | 1 then 2 |
| Total bandwidth | 200KB | 1.2MB | 600KB avg |
| Failed attempts | High | Low | Low |

### 5.3 CPU/Memory Impact

| Operation | Time | Memory |
|-----------|------|--------|
| executSequential() | <10ms | <100KB |
| executeRace() | <10ms | <150KB |
| executeHybrid() | <10ms | <125KB |
| adjustPriorities() | <5ms | Negligible |

---

## 6. Configuration Examples

### 6.1 Conservative (Reliable Networks)

```typescript
const conservativeConfig: DiscoveryQueueConfig = {
  strategy: 'sequential',
  methods: {
    mdns: { priority: 10, timeout: 3000, retries: 2 },
    scan: { priority: 5, timeout: 5000, retries: 1 }
  }
};
// Minimizes network load, assumes methods succeed
```

### 6.2 Aggressive (Unreliable Networks)

```typescript
const aggressiveConfig: DiscoveryQueueConfig = {
  strategy: 'race',
  methods: {
    mdns: { priority: 8, timeout: 2000, retries: 0 },
    scan: { priority: 7, timeout: 4000, retries: 0 }
  }
};
// Maximizes discovery speed, accepts higher bandwidth
```

### 6.3 Balanced (Recommended Default)

```typescript
const balancedConfig: DiscoveryQueueConfig = {
  strategy: 'hybrid',
  methods: {
    mdns: { priority: 9, timeout: 3000, retries: 1 },
    scan: { priority: 5, timeout: 5000, retries: 0 }
  }
};
// Good balance of speed, reliability, and resource usage
```

---

## 7. Error Handling & Edge Cases

### 7.1 Edge Cases

| Case | Behavior |
|------|----------|
| Both methods fail | Return aggregated error with both reasons |
| All methods disabled | Return error "No discovery methods enabled" |
| Invalid strategy | Default to 'hybrid' |
| Timeout during execution | Return timeout error |
| Very fast method (<100ms) | Still counted as priority candidate |

### 7.2 Error Handling

| Error | Recovery |
|-------|----------|
| Method executor throws | Catch, record failure, try next method |
| Invalid method name | Skip method, log warning |
| Config update during execution | Wait for current execution, apply after |
| Memory error | Return failure, don't crash |

---

## 8. Success Criteria

### 8.1 Functional Success

- ✓ Sequential strategy works correctly
- ✓ Race strategy works correctly
- ✓ Hybrid strategy works correctly
- ✓ Priority learning adjusts priorities
- ✓ Configuration can be changed dynamically

### 8.2 Performance Success

- ✓ Sequential: average ~5-6s on reliable networks
- ✓ Race: average ~4s on unreliable networks
- ✓ Hybrid: average ~4-5s (recommended default)
- ✓ Learning overhead <5ms per discovery

### 8.3 Integration Success

- ✓ device-discovery.ts integration points work
- ✓ Metrics collection tracks method performance
- ✓ All 20+ unit tests pass
- ✓ All 4 integration scenarios work
- ✓ No regressions to existing tests
- ✓ Can adjust strategy via API

---

## 9. Code Review Checklist

- [ ] All methods have JSDoc with Inputs/Outputs/Algorithm
- [ ] Interface definitions match usage throughout code
- [ ] All three strategies implemented correctly
- [ ] Priority learning algorithm matches specification
- [ ] Integration points in device-discovery.ts correct
- [ ] Error handling covers all edge cases
- [ ] All 20+ unit tests pass
- [ ] All 4 integration scenarios pass
- [ ] No TypeScript errors
- [ ] Performance meets targets (all operations <10ms)
- [ ] Code follows project style guide

---

## 10. Related Documents

- **Previous Task:** docs/planning/task_2_smart_cache_invalidation_specification.md
- **Following Task:** docs/planning/task_4_monitoring_dashboard_specification.md
- **Base Task:** docs/planning/task_1_metrics_collection_specification.md
- **Architecture:** docs/architecture/device-discovery-system-overview.md

---

## Changelog

- `2025-10-27` — Initial specification published
  - Defined DiscoveryMethodQueue with execute() delegation
  - Specified 3 execution strategies: sequential, race, hybrid
  - Outlined priority learning algorithm (70% success, 30% speed)
  - Provided integration points for device-discovery.ts
  - Listed 20+ unit test cases and 4 integration scenarios
  - Included configuration examples (conservative, aggressive, balanced)

<!-- markdownlint-enable MD013 -->
