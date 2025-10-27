/**
 * K1 Error Handling System
 * Provides typed errors with user-friendly messages and recovery strategies
 */

export enum ErrorCode {
  // Connection Errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  
  // API Errors
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Validation Errors
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // System Errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DISCOVERY_FAILED = 'DISCOVERY_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class K1Error extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public userMessage: string,
    public recoverable: boolean = true,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'K1Error';
  }
  
  static fromUnknown(error: unknown, context?: Record<string, any>): K1Error {
    if (error instanceof K1Error) return error;
    
    if (error instanceof Error) {
      // Map common error patterns
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        return new K1Error(
          ErrorCode.NETWORK_ERROR,
          error.message,
          'Network connection failed. Please check your internet connection.',
          true,
          context
        );
      }
      
      if (error.message.includes('timeout') || error.message.includes('AbortError')) {
        return new K1Error(
          ErrorCode.CONNECTION_TIMEOUT,
          error.message,
          'Connection timed out. The device may be offline or unreachable.',
          true,
          context
        );
      }
      
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        return new K1Error(
          ErrorCode.DEVICE_NOT_FOUND,
          error.message,
          'Device not found. Please check the IP address and try again.',
          true,
          context
        );
      }
      
      if (error.message.includes('WebSocket')) {
        return new K1Error(
          ErrorCode.WEBSOCKET_ERROR,
          error.message,
          'Real-time connection failed. Falling back to polling mode.',
          true,
          context
        );
      }
    }
    
    return new K1Error(
      ErrorCode.UNKNOWN_ERROR,
      String(error),
      'An unexpected error occurred. Please try again.',
      true,
      context
    );
  }
  
  /**
   * Get appropriate retry delay based on error type
   */
  getRetryDelay(): number {
    switch (this.code) {
      case ErrorCode.CONNECTION_TIMEOUT:
        return 2000;
      case ErrorCode.NETWORK_ERROR:
        return 1000;
      case ErrorCode.RATE_LIMITED:
        return 5000;
      default:
        return 1000;
    }
  }
  
  /**
   * Check if error should be retried automatically
   */
  shouldRetry(): boolean {
    return this.recoverable && [
      ErrorCode.CONNECTION_TIMEOUT,
      ErrorCode.NETWORK_ERROR,
      ErrorCode.WEBSOCKET_ERROR
    ].includes(this.code);
  }
}

/**
 * Utility to check if an error is an abort error (during HMR/navigation)
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return error.name === 'AbortError' || 
           msg.includes('abort') || 
           msg.includes('cancelled');
  }
  return false;
}