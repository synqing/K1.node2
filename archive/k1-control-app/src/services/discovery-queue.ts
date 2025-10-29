/**
 * Priority Queue Fallback Logic for Device Discovery
 *
 * Provides intelligent discovery method selection with:
 * - Three execution strategies: Sequential, Race (parallel), Hybrid
 * - Learning algorithm that adjusts priorities based on success rates and speed
 * - Configurable method priorities and timeouts
 * - Intelligent retry logic
 */

import { DiscoveryMetricsCollector } from './discovery-metrics';

/**
 * Discovery method configuration
 */
export interface DiscoveryMethod {
  name: string;                    // Method identifier ('mdns', 'scan', 'manual')
  priority: number;                // Priority 1-10 (10 = highest)
  timeout: number;                 // Method-specific timeout in ms
  retries: number;                 // Number of retry attempts
  enabled: boolean;                // Whether method is active
}

/**
 * Queue configuration
 */
export interface DiscoveryQueueConfig {
  strategy: 'sequential' | 'race' | 'hybrid';
  methods: DiscoveryMethod[];
  defaultTimeout: number;          // Default timeout if method doesn't specify
  learningEnabled: boolean;        // Whether to auto-adjust priorities
}

/**
 * Execution options for discovery
 */
export interface ExecutionOptions {
  strategy?: 'sequential' | 'race' | 'hybrid';
  timeout?: number;
  preferredMethods?: string[];     // Override method selection
}

/**
 * Result from discovery execution
 */
export interface DiscoveryResult {
  devices: any[];                  // Discovered devices
  method: string;                  // Which method succeeded
  duration: number;                // Total execution time
  errors?: string[];               // Any errors encountered
  hasErrors?: boolean;             // Whether errors occurred
  cancelled: boolean;              // Whether operation was cancelled
}

/**
 * Execution result for internal tracking
 */
interface MethodExecutionResult {
  success: boolean;
  result?: DiscoveryResult;
  error?: Error;
  method: string;
  duration: number;
}

/**
 * Priority queue for intelligent discovery method selection
 */
export class DiscoveryMethodQueue {
  // Registered discovery methods
  private methods: Map<string, DiscoveryMethod> = new Map();

  // Current configuration
  private config: DiscoveryQueueConfig;

  // Reference to metrics for scoring
  private metrics: DiscoveryMetricsCollector;

  // Executor function (provided by device-discovery.ts)
  private executor: (method: string, timeout: number) => Promise<DiscoveryResult>;

  // Current execution strategy
  private strategy: 'sequential' | 'race' | 'hybrid';

  constructor(
    config: DiscoveryQueueConfig,
    metrics: DiscoveryMetricsCollector,
    executor: (method: string, timeout: number) => Promise<DiscoveryResult>
  ) {
    this.config = config;
    this.metrics = metrics;
    this.executor = executor;
    this.strategy = config.strategy || 'sequential';

    // Initialize methods map
    config.methods.forEach(method => {
      this.methods.set(method.name, { ...method });
    });
  }

  /**
   * Execute discovery using configured strategy
   */
  async execute(options: ExecutionOptions = {}): Promise<DiscoveryResult> {
    const startTime = performance.now();
    
    // Determine strategy
    const strategy = options.strategy || this.strategy || 'sequential';
    const defaultTimeout = options.timeout || this.config.defaultTimeout || 5000;

    // Select and sort methods
    let methodsToUse = this.getEnabledMethods();
    
    if (options.preferredMethods && options.preferredMethods.length > 0) {
      // Filter to preferred methods only
      methodsToUse = methodsToUse.filter(m => options.preferredMethods!.includes(m.name));
    }

    if (methodsToUse.length === 0) {
      return {
        devices: [],
        method: 'none',
        duration: performance.now() - startTime,
        errors: ['No enabled discovery methods available'],
        hasErrors: true,
        cancelled: false,
      };
    }

    // Sort by priority (highest first)
    methodsToUse.sort((a, b) => b.priority - a.priority);

    try {
      let result: DiscoveryResult;

      // Execute based on strategy
      switch (strategy) {
        case 'race':
          result = await this.executeRace(methodsToUse, defaultTimeout);
          break;
        case 'hybrid':
          result = await this.executeHybrid(methodsToUse, defaultTimeout);
          break;
        case 'sequential':
        default:
          result = await this.executeSequential(methodsToUse, defaultTimeout);
          break;
      }

      // Update priorities if learning is enabled and execution was successful
      if (this.config.learningEnabled && !result.hasErrors) {
        this.adjustPriorities();
      }

      return result;
    } catch (error) {
      return {
        devices: [],
        method: 'error',
        duration: performance.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
        hasErrors: true,
        cancelled: false,
      };
    }
  }

  /**
   * Execute methods sequentially in priority order
   */
  private async executeSequential(
    methods: DiscoveryMethod[],
    timeout: number
  ): Promise<DiscoveryResult> {
    const errors: string[] = [];
    const startTime = performance.now();

    for (const method of methods) {
      const methodTimeout = method.timeout || timeout;
      let attempts = 0;
      const maxAttempts = method.retries + 1;

      while (attempts < maxAttempts) {
        try {
          const result = await this.executor(method.name, methodTimeout);
          
          if (!result.hasErrors && result.devices.length > 0) {
            // Success! Return immediately
            return {
              ...result,
              duration: performance.now() - startTime,
            };
          } else {
            // Method completed but found no devices or had errors
            if (result.errors) {
              errors.push(...result.errors);
            }
          }
        } catch (error) {
          const errorMsg = `${method.name} failed: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
        }

        attempts++;
        
        // If we have more attempts, wait a bit before retrying
        if (attempts < maxAttempts) {
          await this.delay(500); // 500ms between retries
        }
      }
    }

    // All methods failed
    return {
      devices: [],
      method: 'sequential_failed',
      duration: performance.now() - startTime,
      errors,
      hasErrors: true,
      cancelled: false,
    };
  }

  /**
   * Execute all methods in parallel, return first success
   */
  private async executeRace(
    methods: DiscoveryMethod[],
    timeout: number
  ): Promise<DiscoveryResult> {
    const startTime = performance.now();

    // Create promises for each method
    const promises = methods.map(async (method): Promise<MethodExecutionResult> => {
      const methodTimeout = method.timeout || timeout;
      const methodStartTime = performance.now();

      try {
        const result = await this.executor(method.name, methodTimeout);
        return {
          success: !result.hasErrors && result.devices.length > 0,
          result,
          method: method.name,
          duration: performance.now() - methodStartTime,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          method: method.name,
          duration: performance.now() - methodStartTime,
        };
      }
    });

    const errors: string[] = [];
    const results: MethodExecutionResult[] = [];

    // Wait for all promises to complete
    const allResults = await Promise.allSettled(promises);

    allResults.forEach((promiseResult, index) => {
      if (promiseResult.status === 'fulfilled') {
        results.push(promiseResult.value);
      } else {
        errors.push(`${methods[index].name} promise rejected: ${promiseResult.reason}`);
      }
    });

    // Find first successful result (by priority order)
    const successfulResults = results.filter(r => r.success && r.result);
    if (successfulResults.length > 0) {
      // Sort by method priority (highest first) and return the highest priority success
      for (const method of methods) {
        const result = successfulResults.find(r => r.method === method.name);
        if (result && result.result) {
          return {
            ...result.result,
            duration: performance.now() - startTime,
          };
        }
      }
    }

    // Collect all errors
    results.forEach(result => {
      if (!result.success) {
        if (result.error) {
          errors.push(`${result.method}: ${result.error.message}`);
        } else if (result.result?.errors) {
          errors.push(...result.result.errors.map(e => `${result.method}: ${e}`));
        }
      }
    });

    return {
      devices: [],
      method: 'race_failed',
      duration: performance.now() - startTime,
      errors,
      hasErrors: true,
      cancelled: false,
    };
  }

  /**
   * Hybrid strategy: sequential for high-priority, race for low-priority
   */
  private async executeHybrid(
    methods: DiscoveryMethod[],
    timeout: number
  ): Promise<DiscoveryResult> {
    const startTime = performance.now();

    // Split methods by priority threshold
    const highPriority = methods.filter(m => m.priority >= 7);
    const lowPriority = methods.filter(m => m.priority < 7);

    // Phase 1: Try high-priority methods sequentially
    if (highPriority.length > 0) {
      const sequentialResult = await this.executeSequential(highPriority, timeout);
      
      if (!sequentialResult.hasErrors && sequentialResult.devices.length > 0) {
        return {
          ...sequentialResult,
          duration: performance.now() - startTime,
        };
      }
    }

    // Phase 2: If high-priority failed, race low-priority methods
    if (lowPriority.length > 0) {
      const raceResult = await this.executeRace(lowPriority, timeout);
      return {
        ...raceResult,
        duration: performance.now() - startTime,
      };
    }

    // No methods available or all failed
    return {
      devices: [],
      method: 'hybrid_failed',
      duration: performance.now() - startTime,
      errors: ['No methods succeeded in hybrid strategy'],
      hasErrors: true,
      cancelled: false,
    };
  }

  /**
   * Adjust method priorities based on recent success rates and speed
   */
  adjustPriorities(): void {
    if (!this.config.learningEnabled) {
      return;
    }

    const methodMetrics = this.metrics.getMethodMetrics();

    this.methods.forEach((method, methodName) => {
      const metrics = methodMetrics.get(methodName);
      
      if (!metrics || metrics.attemptCount < 10) {
        // Insufficient data for learning
        return;
      }

      // Calculate performance score
      const successRate = metrics.successRate;
      const speedFactor = Math.max(0, 1 - metrics.avgDurationMs / 10000); // 10s max
      const score = successRate * 0.7 + speedFactor * 0.3;

      // Map score to priority (1-10 scale)
      let newPriority: number;
      if (score >= 0.90) {
        newPriority = Math.floor(9 + score * 10) % 10 + 1; // 9-10
      } else if (score >= 0.70) {
        newPriority = Math.floor(7 + (score - 0.70) * 10); // 7-8
      } else if (score >= 0.50) {
        newPriority = Math.floor(5 + (score - 0.50) * 10); // 5-6
      } else {
        newPriority = Math.floor(1 + score * 8); // 1-4
      }

      // Smooth transitions (±1 step per adjustment)
      const currentPriority = method.priority;
      if (Math.abs(newPriority - currentPriority) > 1) {
        newPriority = currentPriority + (newPriority > currentPriority ? 1 : -1);
      }

      // Clamp to valid range
      newPriority = Math.max(1, Math.min(10, newPriority));

      // Update priority
      method.priority = newPriority;

      console.log(`[DiscoveryQueue] Adjusted ${methodName} priority: ${currentPriority} → ${newPriority} (score: ${score.toFixed(3)})`);
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): DiscoveryQueueConfig {
    return {
      ...this.config,
      methods: Array.from(this.methods.values()),
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<DiscoveryQueueConfig>): void {
    if (config.strategy) {
      this.strategy = config.strategy;
      this.config.strategy = config.strategy;
    }

    if (config.defaultTimeout) {
      this.config.defaultTimeout = config.defaultTimeout;
    }

    if (config.learningEnabled !== undefined) {
      this.config.learningEnabled = config.learningEnabled;
    }

    if (config.methods) {
      this.methods.clear();
      config.methods.forEach(method => {
        this.methods.set(method.name, { ...method });
      });
      this.config.methods = [...config.methods];
    }
  }

  /**
   * Get enabled methods sorted by priority
   */
  private getEnabledMethods(): DiscoveryMethod[] {
    return Array.from(this.methods.values()).filter(m => m.enabled);
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get method statistics for debugging
   */
  getMethodStats(): { [methodName: string]: any } {
    const stats: { [methodName: string]: any } = {};
    const methodMetrics = this.metrics.getMethodMetrics();

    this.methods.forEach((method, methodName) => {
      const metrics = methodMetrics.get(methodName);
      stats[methodName] = {
        priority: method.priority,
        enabled: method.enabled,
        timeout: method.timeout,
        retries: method.retries,
        successRate: metrics?.successRate || 0,
        avgDuration: metrics?.avgDurationMs || 0,
        attemptCount: metrics?.attemptCount || 0,
      };
    });

    return stats;
  }

  /**
   * Reset all method priorities to defaults
   */
  resetPriorities(): void {
    // Reset to default priorities
    const defaultPriorities: { [key: string]: number } = {
      'mdns': 8,
      'scan': 6,
      'manual': 4,
    };

    this.methods.forEach((method, methodName) => {
      method.priority = defaultPriorities[methodName] || 5;
    });

    console.log('[DiscoveryQueue] Reset all method priorities to defaults');
  }
}