/**
 * UI Validation Hooks
 * 
 * Custom React hooks for enforcing UI consistency and preventing deviations.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  UI_CONSTANTS, 
  validateComponentSize, 
  validateSpacing, 
  validateTailwindClasses,
  LayoutGuard 
} from '../utils/ui-guards';

// ============================================================================
// LAYOUT VALIDATION HOOKS
// ============================================================================

/**
 * Hook to enforce consistent component dimensions
 */
export function useComponentDimensions(
  constraints: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: number;
  }
) {
  const elementRef = useRef<HTMLElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [violations, setViolations] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  
  const validateDimensions = useCallback((width: number, height: number) => {
    const sizeValidation = validateComponentSize(width, height, constraints);
    const newViolations = [...sizeValidation.violations];
    
    // Check aspect ratio if specified
    if (constraints.aspectRatio && width > 0 && height > 0) {
      const currentRatio = width / height;
      const tolerance = 0.1; // 10% tolerance
      
      if (Math.abs(currentRatio - constraints.aspectRatio) > tolerance) {
        newViolations.push(
          `Aspect ratio ${currentRatio.toFixed(2)} deviates from expected ${constraints.aspectRatio}`
        );
      }
    }
    
    setViolations(newViolations);
    setIsValid(newViolations.length === 0);
    
    return {
      valid: newViolations.length === 0,
      violations: newViolations,
    };
  }, [constraints]);
  
  useEffect(() => {
    if (!elementRef.current) return;
    
    const element = elementRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
        validateDimensions(width, height);
      }
    });
    
    resizeObserver.observe(element);
    
    // Initial validation
    const rect = element.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });
    validateDimensions(rect.width, rect.height);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [validateDimensions]);
  
  return {
    elementRef,
    dimensions,
    isValid,
    violations,
  };
}

/**
 * Hook to enforce design system spacing
 */
export function useDesignSystemSpacing(spacing: {
  padding?: number;
  margin?: number;
  gap?: number;
}) {
  const [violations, setViolations] = useState<string[]>([]);
  
  useEffect(() => {
    const newViolations: string[] = [];
    
    if (spacing.padding !== undefined && !validateSpacing(spacing.padding)) {
      newViolations.push(`Padding ${spacing.padding}px is not from design system spacing scale`);
    }
    
    if (spacing.margin !== undefined && !validateSpacing(spacing.margin)) {
      newViolations.push(`Margin ${spacing.margin}px is not from design system spacing scale`);
    }
    
    if (spacing.gap !== undefined && !validateSpacing(spacing.gap)) {
      newViolations.push(`Gap ${spacing.gap}px is not from design system spacing scale`);
    }
    
    setViolations(newViolations);
    
    if (newViolations.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('🚨 Spacing violations:', newViolations);
      console.warn('Valid spacings:', Object.values(UI_CONSTANTS.SPACING));
    }
  }, [spacing]);
  
  return {
    isValid: violations.length === 0,
    violations,
    validSpacings: Object.values(UI_CONSTANTS.SPACING),
  };
}

/**
 * Hook to validate and enforce Tailwind class usage
 */
export function useTailwindValidation(className: string) {
  const [violations, setViolations] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  
  useEffect(() => {
    if (!className) {
      setViolations([]);
      setIsValid(true);
      return;
    }
    
    const validation = validateTailwindClasses(className);
    setViolations(validation.violations);
    setIsValid(validation.valid);
    
    if (!validation.valid && process.env.NODE_ENV === 'development') {
      console.warn('🚨 Tailwind class violations:', validation.violations);
    }
  }, [className]);
  
  return {
    isValid,
    violations,
  };
}

// ============================================================================
// RESPONSIVE VALIDATION HOOKS
// ============================================================================

/**
 * Hook to ensure components remain usable across different screen sizes
 */
export function useResponsiveValidation(
  breakpoints: {
    mobile?: { minWidth: number; maxWidth?: number };
    tablet?: { minWidth: number; maxWidth?: number };
    desktop?: { minWidth: number; maxWidth?: number };
  }
) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('desktop');
  const [violations, setViolations] = useState<string[]>([]);
  const elementRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const checkResponsiveness = () => {
      if (!elementRef.current) return;
      
      const element = elementRef.current;
      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      let currentBp = 'desktop';
      const newViolations: string[] = [];
      
      // Determine current breakpoint
      if (viewportWidth < 768) {
        currentBp = 'mobile';
      } else if (viewportWidth < 1024) {
        currentBp = 'tablet';
      }
      
      setCurrentBreakpoint(currentBp);
      
      // Validate against breakpoint constraints
      const constraints = breakpoints[currentBp as keyof typeof breakpoints];
      if (constraints) {
        if (rect.width < constraints.minWidth) {
          newViolations.push(
            `Component width ${rect.width}px is below minimum ${constraints.minWidth}px for ${currentBp}`
          );
        }
        
        if (constraints.maxWidth && rect.width > constraints.maxWidth) {
          newViolations.push(
            `Component width ${rect.width}px exceeds maximum ${constraints.maxWidth}px for ${currentBp}`
          );
        }
      }
      
      // Check touch target size on mobile
      if (currentBp === 'mobile' && rect.height < UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN) {
        newViolations.push(
          `Touch target height ${rect.height}px is below minimum ${UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN}px for mobile`
        );
      }
      
      setViolations(newViolations);
    };
    
    checkResponsiveness();
    window.addEventListener('resize', checkResponsiveness);
    
    return () => {
      window.removeEventListener('resize', checkResponsiveness);
    };
  }, [breakpoints]);
  
  return {
    elementRef,
    currentBreakpoint,
    violations,
    isValid: violations.length === 0,
  };
}

// ============================================================================
// ACCESSIBILITY VALIDATION HOOKS
// ============================================================================

/**
 * Hook to ensure components meet accessibility standards
 */
export function useAccessibilityValidation(
  requirements: {
    minContrastRatio?: number;
    requiresLabel?: boolean;
    requiresFocusIndicator?: boolean;
    minTouchTarget?: boolean;
  }
) {
  const elementRef = useRef<HTMLElement>(null);
  const [violations, setViolations] = useState<string[]>([]);
  
  useEffect(() => {
    if (!elementRef.current) return;
    
    const element = elementRef.current;
    const newViolations: string[] = [];
    
    // Check for required label
    if (requirements.requiresLabel) {
      const hasLabel = element.getAttribute('aria-label') || 
                      element.getAttribute('aria-labelledby') ||
                      element.querySelector('label');
      
      if (!hasLabel) {
        newViolations.push('Element requires accessible label');
      }
    }
    
    // Check focus indicator
    if (requirements.requiresFocusIndicator) {
      const computedStyle = window.getComputedStyle(element, ':focus');
      const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '';
      const hasBoxShadow = computedStyle.boxShadow !== 'none';
      
      if (!hasOutline && !hasBoxShadow) {
        newViolations.push('Interactive element lacks focus indicator');
      }
    }
    
    // Check minimum touch target size
    if (requirements.minTouchTarget) {
      const rect = element.getBoundingClientRect();
      if (rect.width < UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN || 
          rect.height < UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN) {
        newViolations.push(
          `Touch target size ${rect.width}x${rect.height}px is below minimum ${UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN}px`
        );
      }
    }
    
    setViolations(newViolations);
    
    if (newViolations.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('🚨 Accessibility violations:', newViolations);
    }
  }, [requirements]);
  
  return {
    elementRef,
    violations,
    isValid: violations.length === 0,
  };
}

// ============================================================================
// PERFORMANCE VALIDATION HOOKS
// ============================================================================

/**
 * Hook to monitor component render performance
 */
export function usePerformanceValidation(
  thresholds: {
    maxRenderTime?: number;
    maxReRenders?: number;
  }
) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const [violations, setViolations] = useState<string[]>([]);
  
  useEffect(() => {
    renderCount.current += 1;
    const renderStart = performance.now();
    
    return () => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      renderTimes.current.push(renderTime);
      
      const newViolations: string[] = [];
      
      // Check render time
      if (thresholds.maxRenderTime && renderTime > thresholds.maxRenderTime) {
        newViolations.push(`Render time ${renderTime.toFixed(2)}ms exceeds threshold ${thresholds.maxRenderTime}ms`);
      }
      
      // Check re-render count
      if (thresholds.maxReRenders && renderCount.current > thresholds.maxReRenders) {
        newViolations.push(`Render count ${renderCount.current} exceeds threshold ${thresholds.maxReRenders}`);
      }
      
      setViolations(newViolations);
      
      if (newViolations.length > 0 && process.env.NODE_ENV === 'development') {
        console.warn('🚨 Performance violations:', newViolations);
      }
    };
  });
  
  const averageRenderTime = useMemo(() => {
    if (renderTimes.current.length === 0) return 0;
    return renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length;
  }, [renderTimes.current.length]);
  
  return {
    renderCount: renderCount.current,
    averageRenderTime,
    violations,
    isValid: violations.length === 0,
  };
}

// ============================================================================
// COMPOSITE VALIDATION HOOK
// ============================================================================

/**
 * Comprehensive hook that combines multiple validation types
 */
export function useComprehensiveValidation(config: {
  dimensions?: Parameters<typeof useComponentDimensions>[0];
  spacing?: Parameters<typeof useDesignSystemSpacing>[0];
  className?: string;
  responsive?: Parameters<typeof useResponsiveValidation>[0];
  accessibility?: Parameters<typeof useAccessibilityValidation>[0];
  performance?: Parameters<typeof usePerformanceValidation>[0];
  componentName?: string;
}) {
  const dimensionsValidation = useComponentDimensions(config.dimensions || {});
  const spacingValidation = useDesignSystemSpacing(config.spacing || {});
  const tailwindValidation = useTailwindValidation(config.className || '');
  const responsiveValidation = useResponsiveValidation(config.responsive || {});
  const accessibilityValidation = useAccessibilityValidation(config.accessibility || {});
  const performanceValidation = usePerformanceValidation(config.performance || {});
  
  // Combine all violations
  const allViolations = useMemo(() => [
    ...dimensionsValidation.violations,
    ...spacingValidation.violations,
    ...tailwindValidation.violations,
    ...responsiveValidation.violations,
    ...accessibilityValidation.violations,
    ...performanceValidation.violations,
  ], [
    dimensionsValidation.violations,
    spacingValidation.violations,
    tailwindValidation.violations,
    responsiveValidation.violations,
    accessibilityValidation.violations,
    performanceValidation.violations,
  ]);
  
  const isValid = useMemo(() => allViolations.length === 0, [allViolations]);
  
  // Log comprehensive violations
  useEffect(() => {
    if (allViolations.length > 0 && process.env.NODE_ENV === 'development') {
      console.group(`🚨 Comprehensive UI Violations - ${config.componentName || 'Component'}`);
      allViolations.forEach(violation => console.warn(violation));
      console.groupEnd();
    }
  }, [allViolations, config.componentName]);
  
  return {
    elementRef: dimensionsValidation.elementRef,
    isValid,
    violations: allViolations,
    details: {
      dimensions: dimensionsValidation,
      spacing: spacingValidation,
      tailwind: tailwindValidation,
      responsive: responsiveValidation,
      accessibility: accessibilityValidation,
      performance: performanceValidation,
    },
  };
}