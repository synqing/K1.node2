/**
 * Enhanced K1 Telemetry and Error Surface Manager
 * Implements Subtask 2.7: Error surfaces and telemetry hooks
 */

import {
  K1Error,
  K1ErrorType,
  K1TelemetryState,
  K1TelemetryEvent,
  K1TelemetryHook,
  K1ErrorSurfaceConfig,
  K1_DEFAULTS,
} from '../types/k1-types';

/**
 * Enhanced telemetry manager with error surfaces and hooks
 */
export class K1TelemetryManager {
  private hooks: K1TelemetryHook[] = [];
  private errorSurfaceConfig: K1ErrorSurfaceConfig = K1_DEFAULTS.ERROR_SURFACE;
  private toastQueue: Array<{ error: K1Error; timestamp: number }> = [];
  private toastTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register a telemetry hook for external integrations
   */
  registerHook(hook: K1TelemetryHook): () => void {
    this.hooks.push(hook);
    
    // Return unregister function
    return () => {
      const index = this.hooks.indexOf(hook);
      if (index > -1) {
        this.hooks.splice(index, 1);
      }
    };
  }

  /**
   * Configure error surface behavior
   */
  setErrorSurfaceConfig(config: Partial<K1ErrorSurfaceConfig>): void {
    this.errorSurfaceConfig = { ...this.errorSurfaceConfig, ...config };
  }

  /**
   * Get current error surface configuration
   */
  getErrorSurfaceConfig(): K1ErrorSurfaceConfig {
    return { ...this.errorSurfaceConfig };
  }

  /**
   * Record a telemetry event and notify hooks
   */
  recordEvent(event: K1TelemetryEvent): void {
    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }

    // Notify all hooks
    this.hooks.forEach(hook => {
      try {
        hook.onEvent(event);
      } catch (error) {
        console.warn('[TelemetryManager] Hook error:', error);
      }
    });

    // Log to console if enabled
    if (this.errorSurfaceConfig.logToConsole) {
      console.log(`[K1Telemetry] ${event.type}:${event.category}:${event.action}`, event);
    }
  }

  /**
   * Record a metric and notify hooks
   */
  recordMetric(metric: string, value: number, tags?: Record<string, string>): void {
    // Notify all hooks
    this.hooks.forEach(hook => {
      try {
        hook.onMetric(metric, value, tags);
      } catch (error) {
        console.warn('[TelemetryManager] Hook metric error:', error);
      }
    });

    // Create telemetry event
    this.recordEvent({
      type: 'performance',
      category: 'metric',
      action: metric,
      value,
      metadata: tags,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle error with surfaces and telemetry
   */
  handleError(error: K1Error, context?: Record<string, any>): void {
    // Update error timestamp
    error.timestamp = new Date();

    // Log to console if enabled
    if (this.errorSurfaceConfig.logToConsole) {
      console.error(`[K1Error] ${error.type}: ${error.message}`, {
        error,
        context,
        originalError: error.originalError,
      });
    }

    // Show toast notification if enabled
    if (this.errorSurfaceConfig.showToasts) {
      this.showErrorToast(error);
    }

    // Report to telemetry if enabled
    if (this.errorSurfaceConfig.reportToTelemetry) {
      this.recordEvent({
        type: 'error',
        category: error.type,
        action: 'error_occurred',
        label: error.message,
        metadata: {
          details: error.details,
          retryAttempt: error.retryAttempt,
          context,
        },
        timestamp: error.timestamp.getTime(),
      });
    }

    // Notify hooks
    this.hooks.forEach(hook => {
      try {
        hook.onError(error, context);
      } catch (hookError) {
        console.warn('[TelemetryManager] Hook error handling failed:', hookError);
      }
    });
  }

  /**
   * Show error toast notification
   */
  private showErrorToast(error: K1Error): void {
    const toastId = `${error.type}-${error.timestamp.getTime()}`;
    
    // Add to queue
    this.toastQueue.push({ error, timestamp: Date.now() });
    
    // Limit queue size
    if (this.toastQueue.length > 5) {
      this.toastQueue.shift();
    }

    // Create toast element (simple implementation)
    this.createToastElement(error, toastId);

    // Auto-remove after duration
    const timeout = setTimeout(() => {
      this.removeToast(toastId);
    }, this.errorSurfaceConfig.errorDisplayDuration);
    
    this.toastTimeouts.set(toastId, timeout);
  }

  /**
   * Create toast DOM element
   */
  private createToastElement(error: K1Error, toastId: string): void {
    // Check if toast container exists
    let container = document.getElementById('k1-toast-container');
    if (!container) {
      // Guard document.body appendChild availability
      if (!document.body || typeof (document.body as any).appendChild !== 'function') {
        return;
      }
      const created = document.createElement('div');
      created.id = 'k1-toast-container';
      created.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(created);
      container = created;
    }

    // Guard container appendChild availability
    if (!container || !("appendChild" in container)) {
      return;
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.style.cssText = `
      background: var(--k1-error, #dc2626);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 400px;
      pointer-events: auto;
      cursor: pointer;
      animation: k1ToastSlideIn 0.3s ease-out;
    `;

    // Add animation keyframes if not already added
    if (!document.getElementById('k1-toast-styles')) {
      if (document.head && typeof (document.head as any).appendChild === 'function') {
        const style = document.createElement('style');
        style.id = 'k1-toast-styles';
        style.textContent = `
          @keyframes k1ToastSlideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes k1ToastSlideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Set toast content
    const title = this.getErrorTitle(error.type);
    toast.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 13px; opacity: 0.9;">${error.message}</div>
      ${error.retryAttempt ? `<div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">Attempt ${error.retryAttempt}</div>` : ''}
    `;

    // Click to dismiss
    toast.addEventListener('click', () => {
      this.removeToast(toastId);
    });

    (container as HTMLElement).appendChild(toast);
  }

  /**
   * Remove toast element
   */
  private removeToast(toastId: string): void {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.style.animation = 'k1ToastSlideOut 0.3s ease-in';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }

    // Clear timeout
    const timeout = this.toastTimeouts.get(toastId);
    if (timeout) {
      clearTimeout(timeout);
      this.toastTimeouts.delete(toastId);
    }
  }

  /**
   * Get user-friendly error title
   */
  private getErrorTitle(errorType: K1ErrorType): string {
    const titles: Record<K1ErrorType, string> = {
      connect_error: 'Connection Failed',
      reconnect_giveup: 'Reconnection Failed',
      ws_send_error: 'WebSocket Error',
      rest_error: 'API Error',
      validation_error: 'Validation Error',
      timeout_error: 'Request Timeout',
      network_error: 'Network Error',
      backup_error: 'Backup Failed',
      restore_error: 'Restore Failed',
    };
    
    return titles[errorType] || 'K1 Error';
  }

  /**
   * Update telemetry state with error
   */
  updateTelemetryForError(telemetry: K1TelemetryState, error: K1Error): K1TelemetryState {
    const updated = { ...telemetry };
    
    // Increment error count for this type
    if (error.type in updated.errorCounts) {
      updated.errorCounts[error.type]++;
    }
    
    // Update last error time
    updated.lastErrorTime = error.timestamp.getTime();
    
    // Update connection-specific metrics
    if (error.type === 'connect_error') {
      updated.failedConnections++;
    } else if (error.type === 'ws_send_error') {
      updated.wsErrors++;
    } else if (error.type === 'rest_error') {
      updated.restErrors++;
    }
    
    return updated;
  }

  /**
   * Update telemetry state with successful operation
   */
  updateTelemetryForSuccess(
    telemetry: K1TelemetryState, 
    operation: string, 
    latency?: number
  ): K1TelemetryState {
    const updated = { ...telemetry };
    
    // Update request metrics
    updated.totalRequests++;
    updated.successfulRequests++;
    
    // Update latency if provided
    if (latency !== undefined) {
      updated.latencyHistory = [...updated.latencyHistory, latency].slice(-10);
      updated.averageLatency = updated.latencyHistory.reduce((a, b) => a + b, 0) / updated.latencyHistory.length;
    }
    
    // Update feature usage
    switch (operation) {
      case 'pattern_change':
        updated.featureUsage.patternChanges++;
        break;
      case 'parameter_update':
        updated.featureUsage.parameterUpdates++;
        break;
      case 'palette_change':
        updated.featureUsage.paletteChanges++;
        break;
      case 'backup':
        updated.featureUsage.backups++;
        break;
      case 'restore':
        updated.featureUsage.restores++;
        break;
    }
    
    return updated;
  }

  /**
   * Update telemetry state with connection event
   */
  updateTelemetryForConnection(
    telemetry: K1TelemetryState, 
    event: 'attempt' | 'success' | 'ws_attempt' | 'ws_success' | 'reconnect_attempt'
  ): K1TelemetryState {
    const updated = { ...telemetry };
    
    switch (event) {
      case 'attempt':
        updated.connectionAttempts++;
        break;
      case 'success':
        updated.successfulConnections++;
        break;
      case 'ws_attempt':
        updated.wsConnectionAttempts++;
        break;
      case 'ws_success':
        updated.wsSuccessfulConnections++;
        break;
      case 'reconnect_attempt':
        updated.reconnectionAttempts++;
        break;
    }
    
    return updated;
  }

  /**
   * Calculate session uptime
   */
  calculateUptime(telemetry: K1TelemetryState): number {
    return Date.now() - telemetry.sessionStartTime;
  }

  /**
   * Get telemetry summary for reporting
   */
  getTelemetrySummary(telemetry: K1TelemetryState): Record<string, any> {
    const uptime = this.calculateUptime(telemetry);
    const totalErrors = Object.values(telemetry.errorCounts).reduce((a, b) => a + b, 0);
    
    return {
      session: {
        uptime,
        startTime: new Date(telemetry.sessionStartTime).toISOString(),
      },
      connections: {
        attempts: telemetry.connectionAttempts,
        successful: telemetry.successfulConnections,
        failed: telemetry.failedConnections,
        successRate: telemetry.connectionAttempts > 0 
          ? (telemetry.successfulConnections / telemetry.connectionAttempts * 100).toFixed(1) + '%'
          : '0%',
      },
      requests: {
        total: telemetry.totalRequests,
        successful: telemetry.successfulRequests,
        successRate: telemetry.totalRequests > 0
          ? (telemetry.successfulRequests / telemetry.totalRequests * 100).toFixed(1) + '%'
          : '0%',
        averageLatency: Math.round(telemetry.averageLatency) + 'ms',
      },
      errors: {
        total: totalErrors,
        byType: telemetry.errorCounts,
        lastErrorTime: telemetry.lastErrorTime 
          ? new Date(telemetry.lastErrorTime).toISOString()
          : null,
      },
      transport: {
        websocket: {
          attempts: telemetry.wsConnectionAttempts,
          successful: telemetry.wsSuccessfulConnections,
          errors: telemetry.wsErrors,
        },
        rest: {
          requests: telemetry.restRequests,
          errors: telemetry.restErrors,
        },
      },
      features: telemetry.featureUsage,
    };
  }

  /**
   * Reset all telemetry data
   */
  resetTelemetry(): K1TelemetryState {
    return {
      ...K1_DEFAULTS.TELEMETRY,
      sessionStartTime: Date.now(),
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Clear all toast timeouts
    this.toastTimeouts.forEach(timeout => clearTimeout(timeout));
    this.toastTimeouts.clear();
    
    // Remove toast container
    const container = document.getElementById('k1-toast-container');
    if (container) {
      container.remove();
    }
    
    // Clear hooks
    this.hooks = [];
    this.toastQueue = [];
  }
}

/**
 * Global telemetry manager instance
 */
export const telemetryManager = new K1TelemetryManager();

/**
 * Convenience functions for common telemetry operations
 */
export const K1Telemetry = {
  // Error handling
  handleError: (error: K1Error, context?: Record<string, any>) => 
    telemetryManager.handleError(error, context),
  
  // Event recording
  recordEvent: (event: K1TelemetryEvent) => 
    telemetryManager.recordEvent(event),
  
  // Metric recording
  recordMetric: (metric: string, value: number, tags?: Record<string, string>) => 
    telemetryManager.recordMetric(metric, value, tags),
  
  // Hook management
  registerHook: (hook: K1TelemetryHook) => 
    telemetryManager.registerHook(hook),
  
  // Configuration
  setErrorSurfaceConfig: (config: Partial<K1ErrorSurfaceConfig>) => 
    telemetryManager.setErrorSurfaceConfig(config),
  
  getErrorSurfaceConfig: () => 
    telemetryManager.getErrorSurfaceConfig(),
  
  // Telemetry state updates
  updateForError: (telemetry: K1TelemetryState, error: K1Error) => 
    telemetryManager.updateTelemetryForError(telemetry, error),
  
  updateForSuccess: (telemetry: K1TelemetryState, operation: string, latency?: number) => 
    telemetryManager.updateTelemetryForSuccess(telemetry, operation, latency),
  
  updateForConnection: (telemetry: K1TelemetryState, event: 'attempt' | 'success' | 'ws_attempt' | 'ws_success' | 'reconnect_attempt') => 
    telemetryManager.updateTelemetryForConnection(telemetry, event),
  
  // Utilities
  getSummary: (telemetry: K1TelemetryState) => 
    telemetryManager.getTelemetrySummary(telemetry),
  
  reset: () => 
    telemetryManager.resetTelemetry(),
  
  cleanup: () => 
    telemetryManager.cleanup(),
};