/**
 * Error Boundary System for React Components
 */

import React, { Component, ReactNode, ErrorInfo, ComponentType } from 'react';
import { K1Error, ErrorCode } from '../utils/error-types';
import { telemetryManager } from '../utils/telemetry-manager';

interface ErrorBoundaryState {
  hasError: boolean;
  error: K1Error | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<{ error: K1Error; retry: () => void }>;
  onError?: (error: K1Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const k1Error = K1Error.fromUnknown(error);
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log to telemetry
    telemetryManager.recordError(k1Error, { errorId, boundary: true });
    
    return {
      hasError: true,
      error: k1Error,
      errorId
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    if (this.state.error && this.props.onError) {
      this.props.onError(this.state.error, errorInfo);
    }
  }
  
  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          retry={() => {
            this.setState({ hasError: false, error: null, errorId: null });
          }}
        />
      );
    }
    
    return this.props.children;
  }
}

function DefaultErrorFallback({ error, retry }: { error: K1Error; retry: () => void }) {
  const getErrorIcon = (code: ErrorCode) => {
    switch (code) {
      case ErrorCode.CONNECTION_FAILED:
      case ErrorCode.CONNECTION_TIMEOUT:
        return '🔌';
      case ErrorCode.DEVICE_NOT_FOUND:
        return '📡';
      case ErrorCode.PERMISSION_DENIED:
        return '🔒';
      case ErrorCode.NETWORK_ERROR:
        return '🌐';
      case ErrorCode.WEBSOCKET_ERROR:
        return '⚡';
      default:
        return '⚠️';
    }
  };
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4">{getErrorIcon(error.code)}</div>
        <h2 className="text-xl font-semibold text-[var(--k1-text)] mb-2">Something went wrong</h2>
        <p className="text-[var(--k1-text-dim)] mb-6">{error.userMessage}</p>
        
        <div className="space-y-3">
          {error.recoverable && (
            <button
              onClick={retry}
              className="w-full px-4 py-2 bg-[var(--k1-primary)] text-white rounded-md hover:bg-[var(--k1-primary-hover)] transition-colors"
            >
              Try Again
            </button>
          )}
          
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-[var(--k1-text-dim)] hover:text-[var(--k1-text)]">
              Technical Details
            </summary>
            <pre className="mt-2 p-3 bg-[var(--k1-bg)] rounded text-xs overflow-auto border border-[var(--k1-border)] font-mono">
              {JSON.stringify({ 
                code: error.code, 
                message: error.message, 
                context: error.context 
              }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}