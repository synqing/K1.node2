/**
 * UI Guard Provider
 * 
 * Global context provider for UI guards and validation system.
 * Enables application-wide monitoring and enforcement of UI standards.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { enableGlobalUIGuards, auditCurrentUI, UI_CONSTANTS } from "../../utils/ui-guards";

// ============================================================================
// TYPES
// ============================================================================

interface UIViolation {
  id: string;
  componentName: string;
  type: 'layout' | 'spacing' | 'color' | 'typography' | 'accessibility' | 'performance';
  severity: 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  element?: HTMLElement;
}

interface UIGuardConfig {
  enabled: boolean;
  strictMode: boolean;
  showViolationIndicators: boolean;
  logViolations: boolean;
  auditOnMount: boolean;
  maxViolations: number;
  excludeComponents: string[];
}

interface UIGuardContextValue {
  config: UIGuardConfig;
  violations: UIViolation[];
  updateConfig: (updates: Partial<UIGuardConfig>) => void;
  reportViolation: (violation: Omit<UIViolation, 'id' | 'timestamp'>) => void;
  clearViolations: () => void;
  getViolationsByComponent: (componentName: string) => UIViolation[];
  getViolationsByType: (type: UIViolation['type']) => UIViolation[];
  isComponentExcluded: (componentName: string) => boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const UIGuardContext = createContext<UIGuardContextValue | null>(null);

export const useUIGuards = () => {
  const context = useContext(UIGuardContext);
  if (!context) {
    throw new Error('useUIGuards must be used within a UIGuardProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface UIGuardProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<UIGuardConfig>;
}

const defaultConfig: UIGuardConfig = {
  enabled: process.env.NODE_ENV === 'development',
  strictMode: false,
  showViolationIndicators: true,
  logViolations: true,
  auditOnMount: true,
  maxViolations: 100,
  excludeComponents: [],
};

export const UIGuardProvider: React.FC<UIGuardProviderProps> = ({
  children,
  initialConfig = {},
}) => {
  const [config, setConfig] = useState<UIGuardConfig>({
    ...defaultConfig,
    ...initialConfig,
  });
  
  const [violations, setViolations] = useState<UIViolation[]>([]);
  
  // Update configuration
  const updateConfig = useCallback((updates: Partial<UIGuardConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Report a new violation
  const reportViolation = useCallback((violation: Omit<UIViolation, 'id' | 'timestamp'>) => {
    if (!config.enabled || config.excludeComponents.includes(violation.componentName)) {
      return;
    }
    
    const newViolation: UIViolation = {
      ...violation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    setViolations(prev => {
      const updated = [...prev, newViolation];
      
      // Limit violations to prevent memory issues
      if (updated.length > config.maxViolations) {
        return updated.slice(-config.maxViolations);
      }
      
      return updated;
    });
    
    // Log violation if enabled
    if (config.logViolations) {
      const emoji = violation.severity === 'error' ? '🚨' : violation.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.warn(`${emoji} UI Guard [${violation.type}]:`, violation.message);
      
      if (violation.element) {
        console.warn('Element:', violation.element);
      }
    }
    
    // In strict mode, throw errors for violations
    if (config.strictMode && violation.severity === 'error') {
      throw new Error(`UI Guard Violation: ${violation.message}`);
    }
  }, [config]);
  
  // Clear all violations
  const clearViolations = useCallback(() => {
    setViolations([]);
  }, []);
  
  // Get violations by component
  const getViolationsByComponent = useCallback((componentName: string) => {
    return violations.filter(v => v.componentName === componentName);
  }, [violations]);
  
  // Get violations by type
  const getViolationsByType = useCallback((type: UIViolation['type']) => {
    return violations.filter(v => v.type === type);
  }, [violations]);
  
  // Check if component is excluded
  const isComponentExcluded = useCallback((componentName: string) => {
    return config.excludeComponents.includes(componentName);
  }, [config.excludeComponents]);
  
  // Initialize global guards
  useEffect(() => {
    if (config.enabled) {
      enableGlobalUIGuards();
      
      if (config.auditOnMount) {
        // Delay audit to allow components to mount
        setTimeout(() => {
          auditCurrentUI();
        }, 1000);
      }
    }
  }, [config.enabled, config.auditOnMount]);
  
  // Monitor for DOM mutations and report violations
  useEffect(() => {
    if (!config.enabled) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              
              // Check for common violations
              checkElementViolations(element);
            }
          });
        }
        
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const element = mutation.target as HTMLElement;
          checkClassViolations(element);
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    
    return () => {
      observer.disconnect();
    };
  }, [config.enabled, reportViolation]);
  
  // Check element for violations
  const checkElementViolations = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    // Check minimum touch target size for interactive elements
    if (element.matches('button, a, input, select, textarea, [role="button"]')) {
      if (rect.width < UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN || 
          rect.height < UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN) {
        reportViolation({
          componentName: element.tagName.toLowerCase(),
          type: 'accessibility',
          severity: 'warning',
          message: `Interactive element has insufficient touch target size: ${rect.width}x${rect.height}px (minimum: ${UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN}px)`,
          element,
        });
      }
    }
    
    // Check for missing focus indicators on interactive elements
    if (element.matches('button, a, input, select, textarea, [tabindex]')) {
      const focusStyle = window.getComputedStyle(element, ':focus');
      const hasOutline = focusStyle.outline !== 'none' && focusStyle.outline !== '';
      const hasBoxShadow = focusStyle.boxShadow !== 'none';
      
      if (!hasOutline && !hasBoxShadow) {
        reportViolation({
          componentName: element.tagName.toLowerCase(),
          type: 'accessibility',
          severity: 'error',
          message: 'Interactive element lacks focus indicator',
          element,
        });
      }
    }
    
    // Check for excessive nesting
    const depth = getElementDepth(element);
    if (depth > 10) {
      reportViolation({
        componentName: element.tagName.toLowerCase(),
        type: 'performance',
        severity: 'warning',
        message: `Element has excessive nesting depth: ${depth} levels`,
        element,
      });
    }
  };
  
  // Check class violations
  const checkClassViolations = (element: HTMLElement) => {
    const classes = element.className.split(' ').filter(Boolean);
    
    // Check for inline styles when classes should be used
    if (element.style.length > 0) {
      reportViolation({
        componentName: element.tagName.toLowerCase(),
        type: 'layout',
        severity: 'info',
        message: 'Element uses inline styles instead of classes',
        element,
      });
    }
    
    // Check for deprecated or non-standard classes
    const deprecatedClasses = ['float-left', 'float-right', 'clearfix'];
    const foundDeprecated = classes.filter(cls => deprecatedClasses.includes(cls));
    
    if (foundDeprecated.length > 0) {
      reportViolation({
        componentName: element.tagName.toLowerCase(),
        type: 'layout',
        severity: 'warning',
        message: `Element uses deprecated classes: ${foundDeprecated.join(', ')}`,
        element,
      });
    }
  };
  
  // Helper function to get element depth
  const getElementDepth = (element: HTMLElement): number => {
    let depth = 0;
    let current = element.parentElement;
    
    while (current && current !== document.body) {
      depth++;
      current = current.parentElement;
    }
    
    return depth;
  };
  
  const contextValue: UIGuardContextValue = {
    config,
    violations,
    updateConfig,
    reportViolation,
    clearViolations,
    getViolationsByComponent,
    getViolationsByType,
    isComponentExcluded,
  };
  
  return (
    <UIGuardContext.Provider value={contextValue}>
      {children}
      {config.enabled && config.showViolationIndicators && (
        <UIViolationIndicator violations={violations} />
      )}
    </UIGuardContext.Provider>
  );
};

// ============================================================================
// VIOLATION INDICATOR COMPONENT
// ============================================================================

interface UIViolationIndicatorProps {
  violations: UIViolation[];
}

const UIViolationIndicator: React.FC<UIViolationIndicatorProps> = ({ violations }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (violations.length === 0) return null;
  
  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;
  const infoCount = violations.filter(v => v.severity === 'info').length;
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-red-500 text-white rounded-lg shadow-lg">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 w-full text-left"
        >
          <span className="text-lg">🚨</span>
          <span className="font-medium">
            {errorCount > 0 && `${errorCount} errors`}
            {warningCount > 0 && `${errorCount > 0 ? ', ' : ''}${warningCount} warnings`}
            {infoCount > 0 && `${errorCount > 0 || warningCount > 0 ? ', ' : ''}${infoCount} info`}
          </span>
          <span className="ml-auto">{isExpanded ? '▼' : '▶'}</span>
        </button>
        
        {isExpanded && (
          <div className="border-t border-red-400 max-h-60 overflow-y-auto">
            {violations.slice(-10).map((violation) => (
              <div
                key={violation.id}
                className="px-4 py-2 border-b border-red-400 last:border-b-0 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span>
                    {violation.severity === 'error' ? '🚨' : 
                     violation.severity === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <span className="font-medium">{violation.componentName}</span>
                  <span className="text-red-200 text-xs">{violation.type}</span>
                </div>
                <div className="text-red-100 mt-1">{violation.message}</div>
              </div>
            ))}
            
            {violations.length > 10 && (
              <div className="px-4 py-2 text-center text-red-200 text-xs">
                ... and {violations.length - 10} more violations
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};