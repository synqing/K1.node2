/**
 * Toast notification system for errors
 */

import React, { useState, useEffect } from 'react';
import { K1Error, ErrorCode } from '../utils/error-types';

interface ErrorToastProps {
  error: K1Error;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function ErrorToast({ error, onDismiss, onRetry }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Auto-dismiss after 5 seconds for recoverable errors
    if (error.recoverable) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Allow fade animation
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error.recoverable, onDismiss]);
  
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
      case ErrorCode.DISCOVERY_FAILED:
        return '🔍';
      default:
        return '⚠️';
    }
  };
  
  const getSeverityColor = (code: ErrorCode) => {
    switch (code) {
      case ErrorCode.CONNECTION_FAILED:
      case ErrorCode.DEVICE_NOT_FOUND:
        return 'border-red-500 bg-red-50';
      case ErrorCode.CONNECTION_TIMEOUT:
      case ErrorCode.NETWORK_ERROR:
        return 'border-yellow-500 bg-yellow-50';
      case ErrorCode.WEBSOCKET_ERROR:
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-red-500 bg-red-50';
    }
  };
  
  return (
    <div className={`fixed top-4 right-4 max-w-sm border-l-4 rounded-lg shadow-lg transition-all duration-300 z-50 ${
      getSeverityColor(error.code)
    } ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="p-4 bg-white">
        <div className="flex items-start">
          <div className="text-2xl mr-3">{getErrorIcon(error.code)}</div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Error</h4>
            <p className="text-sm text-gray-600 mt-1">{error.userMessage}</p>
            
            {error.recoverable && onRetry && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onRetry}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={onDismiss}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}