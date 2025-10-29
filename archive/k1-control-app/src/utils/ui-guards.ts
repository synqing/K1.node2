/**
 * K1 Control Dashboard - UI Guard System
 * 
 * Comprehensive system to prevent UI deviations and ensure consistent layouts.
 * Provides validation, constraints, and guards for components and layouts.
 */

import { useEffect, useRef, useState } from 'react';

// ============================================================================
// DESIGN SYSTEM CONSTANTS
// ============================================================================

export const UI_CONSTANTS = {
  // Spacing constraints (from design tokens)
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 12,
    LG: 16,
    XL: 24,
    XXL: 32,
    XXXL: 48,
  },
  
  // Component size constraints
  COMPONENTS: {
    BUTTON_HEIGHT: 40,
    INPUT_HEIGHT: 40,
    TOGGLE_HEIGHT: 24,
    NAV_BAR_DESKTOP: 56,
    NAV_BAR_MOBILE: 48,
    TOUCH_TARGET_MIN: 44,
    TOUCH_SPACING_MIN: 8,
  },
  
  // Layout constraints
  LAYOUT: {
    SIDEBAR_MIN_WIDTH: 280,
    SIDEBAR_MAX_WIDTH: 400,
    MAIN_CONTENT_MIN_WIDTH: 600,
    CARD_MIN_HEIGHT: 120,
    CARD_MAX_HEIGHT: 800,
    PANEL_PADDING: 24, // p-6 in Tailwind
  },
  
  // Typography constraints
  TYPOGRAPHY: {
    MIN_FONT_SIZE: 10,
    MAX_FONT_SIZE: 48,
    MIN_LINE_HEIGHT: 1.1,
    MAX_LINE_HEIGHT: 2.0,
  },
  
  // Border radius constraints
  RADIUS: {
    SM: 4,
    MD: 8,
    LG: 12,
    XL: 16,
    FULL: 9999,
  },
  
  // Z-index layers
  Z_INDEX: {
    BASE: 0,
    DROPDOWN: 10,
    STICKY: 20,
    FIXED: 30,
    MODAL_BACKDROP: 40,
    MODAL: 50,
    POPOVER: 60,
    TOOLTIP: 70,
    TOAST: 80,
  },
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a spacing value conforms to the design system
 */
export function validateSpacing(value: number): boolean {
  const validSpacings = Object.values(UI_CONSTANTS.SPACING);
  return validSpacings.includes(value);
}

/**
 * Validates if a component size is within acceptable bounds
 */
export function validateComponentSize(
  width: number,
  height: number,
  constraints: { minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number }
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  if (constraints.minWidth && width < constraints.minWidth) {
    violations.push(`Width ${width}px is below minimum ${constraints.minWidth}px`);
  }
  
  if (constraints.maxWidth && width > constraints.maxWidth) {
    violations.push(`Width ${width}px exceeds maximum ${constraints.maxWidth}px`);
  }
  
  if (constraints.minHeight && height < constraints.minHeight) {
    violations.push(`Height ${height}px is below minimum ${constraints.minHeight}px`);
  }
  
  if (constraints.maxHeight && height > constraints.maxHeight) {
    violations.push(`Height ${height}px exceeds maximum ${constraints.maxHeight}px`);
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Validates if a color value is from the approved design system palette
 */
export function validateColor(color: string): boolean {
  const approvedColors = [
    // K1 accent colors
    '#6EE7F3', '#5BC9D1', '#4AAAB0',
    '#A78BFA', '#9370E8', '#8156D6',
    '#FF8844', '#E67030', '#CC5C1F',
    
    // Background colors
    '#0F1115', '#1A1F2B', '#242C40', '#151923',
    
    // Text colors
    '#E6E9EF', '#B5BDCA', '#7A8194',
    
    // Status colors
    '#22DD88', '#F59E0B', '#EF4444', '#6EE7F3',
    
    // Port colors
    '#F59E0B', '#22D3EE', '#F472B6', '#34D399',
  ];
  
  return approvedColors.includes(color.toUpperCase());
}

// ============================================================================
// LAYOUT GUARDS
// ============================================================================

/**
 * Guards against invalid layout configurations
 */
export class LayoutGuard {
  private static violations: string[] = [];
  
  static validateLayout(config: {
    sidebarWidth?: number;
    mainContentWidth?: number;
    cardHeight?: number;
    padding?: number;
  }): { valid: boolean; violations: string[] } {
    this.violations = [];
    
    if (config.sidebarWidth) {
      if (config.sidebarWidth < UI_CONSTANTS.LAYOUT.SIDEBAR_MIN_WIDTH) {
        this.violations.push(`Sidebar width ${config.sidebarWidth}px is below minimum ${UI_CONSTANTS.LAYOUT.SIDEBAR_MIN_WIDTH}px`);
      }
      if (config.sidebarWidth > UI_CONSTANTS.LAYOUT.SIDEBAR_MAX_WIDTH) {
        this.violations.push(`Sidebar width ${config.sidebarWidth}px exceeds maximum ${UI_CONSTANTS.LAYOUT.SIDEBAR_MAX_WIDTH}px`);
      }
    }
    
    if (config.mainContentWidth && config.mainContentWidth < UI_CONSTANTS.LAYOUT.MAIN_CONTENT_MIN_WIDTH) {
      this.violations.push(`Main content width ${config.mainContentWidth}px is below minimum ${UI_CONSTANTS.LAYOUT.MAIN_CONTENT_MIN_WIDTH}px`);
    }
    
    if (config.cardHeight) {
      if (config.cardHeight < UI_CONSTANTS.LAYOUT.CARD_MIN_HEIGHT) {
        this.violations.push(`Card height ${config.cardHeight}px is below minimum ${UI_CONSTANTS.LAYOUT.CARD_MIN_HEIGHT}px`);
      }
      if (config.cardHeight > UI_CONSTANTS.LAYOUT.CARD_MAX_HEIGHT) {
        this.violations.push(`Card height ${config.cardHeight}px exceeds maximum ${UI_CONSTANTS.LAYOUT.CARD_MAX_HEIGHT}px`);
      }
    }
    
    if (config.padding && !validateSpacing(config.padding)) {
      this.violations.push(`Padding ${config.padding}px is not from approved spacing scale`);
    }
    
    return {
      valid: this.violations.length === 0,
      violations: [...this.violations],
    };
  }
  
  static logViolations(): void {
    if (this.violations.length > 0) {
      console.warn('🚨 Layout Guard Violations:', this.violations);
    }
  }
}

// ============================================================================
// COMPONENT GUARDS
// ============================================================================

/**
 * Props validation for components to prevent invalid configurations
 */
export function validateComponentProps<T extends Record<string, any>>(
  props: T,
  constraints: {
    required?: (keyof T)[];
    forbidden?: (keyof T)[];
    mutuallyExclusive?: (keyof T)[][];
    conditionalRequired?: { if: keyof T; then: (keyof T)[] }[];
  }
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  // Check required props
  if (constraints.required) {
    for (const prop of constraints.required) {
      if (props[prop] === undefined || props[prop] === null) {
        violations.push(`Required prop '${String(prop)}' is missing`);
      }
    }
  }
  
  // Check forbidden props
  if (constraints.forbidden) {
    for (const prop of constraints.forbidden) {
      if (props[prop] !== undefined) {
        violations.push(`Forbidden prop '${String(prop)}' is present`);
      }
    }
  }
  
  // Check mutually exclusive props
  if (constraints.mutuallyExclusive) {
    for (const group of constraints.mutuallyExclusive) {
      const presentProps = group.filter(prop => props[prop] !== undefined);
      if (presentProps.length > 1) {
        violations.push(`Mutually exclusive props found: ${presentProps.map(String).join(', ')}`);
      }
    }
  }
  
  // Check conditional requirements
  if (constraints.conditionalRequired) {
    for (const rule of constraints.conditionalRequired) {
      if (props[rule.if] !== undefined) {
        for (const requiredProp of rule.then) {
          if (props[requiredProp] === undefined) {
            violations.push(`Prop '${String(requiredProp)}' is required when '${String(rule.if)}' is present`);
          }
        }
      }
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

// ============================================================================
// REACT HOOKS FOR GUARDS
// ============================================================================

/**
 * Hook to validate and monitor component dimensions
 */
export function useLayoutGuard(
  elementRef: React.RefObject<HTMLElement>,
  constraints: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  }
) {
  const [violations, setViolations] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  
  useEffect(() => {
    if (!elementRef.current) return;
    
    const element = elementRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const validation = validateComponentSize(width, height, constraints);
        
        setViolations(validation.violations);
        setIsValid(validation.valid);
        
        if (!validation.valid && process.env.NODE_ENV === 'development') {
          console.warn('🚨 Layout Guard Violation:', validation.violations);
        }
      }
    });
    
    resizeObserver.observe(element);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [elementRef, constraints]);
  
  return { isValid, violations };
}

/**
 * Hook to enforce design system spacing
 */
export function useSpacingGuard(spacing: number) {
  useEffect(() => {
    if (!validateSpacing(spacing) && process.env.NODE_ENV === 'development') {
      console.warn(`🚨 Spacing Guard Violation: ${spacing}px is not from approved spacing scale`);
      console.warn('Approved spacings:', Object.values(UI_CONSTANTS.SPACING));
    }
  }, [spacing]);
  
  return validateSpacing(spacing);
}

/**
 * Hook to validate component props at runtime
 */
export function usePropsGuard<T extends Record<string, any>>(
  props: T,
  constraints: Parameters<typeof validateComponentProps>[1]
) {
  useEffect(() => {
    const validation = validateComponentProps(props, constraints);
    
    if (!validation.valid && process.env.NODE_ENV === 'development') {
      console.warn('🚨 Props Guard Violation:', validation.violations);
    }
  }, [props, constraints]);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clamps a value to the nearest valid spacing value
 */
export function clampToSpacing(value: number): number {
  const spacings = Object.values(UI_CONSTANTS.SPACING);
  return spacings.reduce((prev, curr) => 
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

/**
 * Gets the appropriate z-index for a component type
 */
export function getZIndex(type: keyof typeof UI_CONSTANTS.Z_INDEX): number {
  return UI_CONSTANTS.Z_INDEX[type];
}

/**
 * Validates if a className contains only approved Tailwind classes
 */
export function validateTailwindClasses(className: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const classes = className.split(' ').filter(Boolean);
  
  // Define patterns for approved classes
  const approvedPatterns = [
    /^p-[0-9]+$/, // padding
    /^m-[0-9]+$/, // margin
    /^w-[0-9]+$/, // width
    /^h-[0-9]+$/, // height
    /^text-(xs|sm|base|lg|xl|2xl|3xl)$/, // text sizes
    /^bg-\[var\(--k1-[a-z-]+\)\]$/, // K1 background colors
    /^text-\[var\(--k1-[a-z-]+\)\]$/, // K1 text colors
    /^border-\[var\(--k1-[a-z-]+\)\]$/, // K1 border colors
    /^rounded-(none|sm|md|lg|xl|full)$/, // border radius
    /^flex$/, /^grid$/, /^block$/, /^inline$/, // display
    /^items-(start|center|end|stretch)$/, // align items
    /^justify-(start|center|end|between|around|evenly)$/, // justify content
    /^gap-[0-9]+$/, // gap
    /^space-[xy]-[0-9]+$/, // space between
  ];
  
  for (const cls of classes) {
    const isApproved = approvedPatterns.some(pattern => pattern.test(cls));
    if (!isApproved) {
      violations.push(`Unapproved Tailwind class: ${cls}`);
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/**
 * Development-only function to log all current UI violations
 */
export function auditCurrentUI(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('🔍 UI Guard Audit');
  
  // Check all elements with custom spacing
  const elementsWithPadding = document.querySelectorAll('[class*="p-"]');
  elementsWithPadding.forEach((el, index) => {
    const classes = el.className.split(' ');
    const paddingClasses = classes.filter(cls => cls.startsWith('p-'));
    console.log(`Element ${index}:`, paddingClasses);
  });
  
  console.groupEnd();
}

/**
 * Global guard that can be enabled in development
 */
export function enableGlobalUIGuards(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  // Monitor DOM mutations for unapproved classes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const element = mutation.target as HTMLElement;
        const validation = validateTailwindClasses(element.className);
        
        if (!validation.valid) {
          console.warn('🚨 Global UI Guard:', validation.violations);
        }
      }
    });
  });
  
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
  });
  
  console.log('🛡️ Global UI Guards enabled');
}