/**
 * GuardedComponent - Higher-Order Component for UI Guards
 * 
 * Wraps components with comprehensive UI validation and guards to prevent deviations.
 */

import React, { useRef, useEffect, useState } from 'react';
import { 
  useLayoutGuard, 
  useSpacingGuard, 
  usePropsGuard,
  validateComponentProps,
  validateTailwindClasses,
  UI_CONSTANTS 
} from '../../utils/ui-guards';

// ============================================================================
// TYPES
// ============================================================================

interface GuardConfig {
  // Layout constraints
  layout?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  
  // Props validation
  props?: {
    required?: string[];
    forbidden?: string[];
    mutuallyExclusive?: string[][];
    conditionalRequired?: { if: string; then: string[] }[];
  };
  
  // Spacing validation
  spacing?: {
    padding?: number;
    margin?: number;
  };
  
  // Visual indicators for violations
  showViolations?: boolean;
  
  // Component identification
  componentName?: string;
}

interface GuardedComponentProps {
  children: React.ReactNode;
  className?: string;
  guard?: GuardConfig;
  [key: string]: any;
}

// ============================================================================
// GUARDED COMPONENT
// ============================================================================

export const GuardedComponent: React.FC<GuardedComponentProps> = ({
  children,
  className = '',
  guard = {},
  ...props
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [violations, setViolations] = useState<string[]>([]);
  
  // Layout guard
  const { isValid: isLayoutValid, violations: layoutViolations } = useLayoutGuard(
    elementRef,
    guard.layout || {}
  );
  
  // Spacing guard
  const isSpacingValid = useSpacingGuard(guard.spacing?.padding || 0);
  
  // Props guard
  usePropsGuard(props, guard.props || {});
  
  // Validate Tailwind classes
  useEffect(() => {
    if (className) {
      const validation = validateTailwindClasses(className);
      if (!validation.valid) {
        setViolations(prev => [...prev, ...validation.violations]);
      }
    }
  }, [className]);
  
  // Combine all violations
  useEffect(() => {
    const allViolations = [
      ...layoutViolations,
      ...(isSpacingValid ? [] : ['Invalid spacing detected']),
      ...violations,
    ];
    
    if (allViolations.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn(
        `🚨 UI Guard Violations in ${guard.componentName || 'GuardedComponent'}:`,
        allViolations
      );
    }
  }, [layoutViolations, isSpacingValid, violations, guard.componentName]);
  
  // Development-only violation indicator
  const showViolationIndicator = 
    process.env.NODE_ENV === 'development' && 
    guard.showViolations && 
    (!isLayoutValid || !isSpacingValid || violations.length > 0);
  
  return (
    <div
      ref={elementRef}
      className={`${className} ${showViolationIndicator ? 'relative' : ''}`}
      {...props}
    >
      {children}
      
      {/* Development-only violation indicator */}
      {showViolationIndicator && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl z-50">
          ⚠️ UI Violations
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HIGHER-ORDER COMPONENT
// ============================================================================

export function withUIGuards<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  guardConfig: GuardConfig
) {
  const GuardedWrappedComponent = (props: P) => {
    return (
      <GuardedComponent guard={guardConfig}>
        <WrappedComponent {...props} />
      </GuardedComponent>
    );
  };
  
  GuardedWrappedComponent.displayName = `withUIGuards(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return GuardedWrappedComponent;
}

// ============================================================================
// SPECIFIC COMPONENT GUARDS
// ============================================================================

/**
 * Card component with built-in guards
 */
interface GuardedCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  [key: string]: any;
}

export const GuardedCard: React.FC<GuardedCardProps> = ({
  children,
  className = '',
  padding = 'md',
  ...props
}) => {
  const paddingMap = {
    sm: UI_CONSTANTS.SPACING.MD,
    md: UI_CONSTANTS.SPACING.LG,
    lg: UI_CONSTANTS.SPACING.XL,
  };
  
  const guardConfig: GuardConfig = {
    layout: {
      minHeight: UI_CONSTANTS.LAYOUT.CARD_MIN_HEIGHT,
      maxHeight: UI_CONSTANTS.LAYOUT.CARD_MAX_HEIGHT,
    },
    spacing: {
      padding: paddingMap[padding],
    },
    componentName: 'GuardedCard',
    showViolations: true,
  };
  
  return (
    <GuardedComponent 
      guard={guardConfig}
      className={`bg-[var(--k1-bg-secondary)] border border-[var(--k1-border)] rounded-lg p-${padding === 'sm' ? '3' : padding === 'md' ? '4' : '6'} ${className}`}
      {...props}
    >
      {children}
    </GuardedComponent>
  );
};

/**
 * Button component with built-in guards
 */
interface GuardedButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}

export const GuardedButton: React.FC<GuardedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  onClick,
  ...props
}) => {
  const guardConfig: GuardConfig = {
    layout: {
      minHeight: UI_CONSTANTS.COMPONENTS.BUTTON_HEIGHT,
      minWidth: UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN,
    },
    props: {
      required: ['children'],
      mutuallyExclusive: [['disabled', 'onClick']],
    },
    componentName: 'GuardedButton',
    showViolations: true,
  };
  
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-[var(--k1-accent)] text-[var(--k1-text-inverse)] hover:bg-[var(--k1-accent-hover)]',
    secondary: 'bg-[var(--k1-bg-secondary)] text-[var(--k1-text)] border border-[var(--k1-border)] hover:bg-[var(--k1-bg-tertiary)]',
    ghost: 'text-[var(--k1-text)] hover:bg-[var(--k1-bg-secondary)]',
  };
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg',
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <GuardedComponent 
      guard={guardConfig}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </GuardedComponent>
  );
};

/**
 * Input component with built-in guards
 */
interface GuardedInputProps {
  type?: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}

export const GuardedInput: React.FC<GuardedInputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  className = '',
  ...props
}) => {
  const guardConfig: GuardConfig = {
    layout: {
      minHeight: UI_CONSTANTS.COMPONENTS.INPUT_HEIGHT,
    },
    componentName: 'GuardedInput',
    showViolations: true,
  };
  
  const baseClasses = 'w-full px-3 py-2 bg-[var(--k1-bg-secondary)] border border-[var(--k1-border)] rounded-md text-[var(--k1-text)] placeholder-[var(--k1-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--k1-accent)] focus:border-transparent';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <GuardedComponent 
      guard={guardConfig}
      className={`${baseClasses} ${disabledClasses} ${className}`}
      as="input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      {...props}
    />
  );
};

// ============================================================================
// LAYOUT GUARDS
// ============================================================================

/**
 * Sidebar component with layout guards
 */
interface GuardedSidebarProps {
  children: React.ReactNode;
  width?: number;
  className?: string;
  [key: string]: any;
}

export const GuardedSidebar: React.FC<GuardedSidebarProps> = ({
  children,
  width = UI_CONSTANTS.LAYOUT.SIDEBAR_MIN_WIDTH,
  className = '',
  ...props
}) => {
  const guardConfig: GuardConfig = {
    layout: {
      minWidth: UI_CONSTANTS.LAYOUT.SIDEBAR_MIN_WIDTH,
      maxWidth: UI_CONSTANTS.LAYOUT.SIDEBAR_MAX_WIDTH,
    },
    componentName: 'GuardedSidebar',
    showViolations: true,
  };
  
  return (
    <GuardedComponent 
      guard={guardConfig}
      className={`bg-[var(--k1-bg-secondary)] border-r border-[var(--k1-border)] ${className}`}
      style={{ width }}
      {...props}
    >
      {children}
    </GuardedComponent>
  );
};

/**
 * Main content area with layout guards
 */
interface GuardedMainContentProps {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export const GuardedMainContent: React.FC<GuardedMainContentProps> = ({
  children,
  className = '',
  ...props
}) => {
  const guardConfig: GuardConfig = {
    layout: {
      minWidth: UI_CONSTANTS.LAYOUT.MAIN_CONTENT_MIN_WIDTH,
    },
    componentName: 'GuardedMainContent',
    showViolations: true,
  };
  
  return (
    <GuardedComponent 
      guard={guardConfig}
      className={`flex-1 p-6 ${className}`}
      {...props}
    >
      {children}
    </GuardedComponent>
  );
};