/**
 * UI Guards - Index
 * 
 * Centralized exports for all UI guard components, hooks, and utilities.
 */

// Core utilities
export * from '../../utils/ui-guards';

// React hooks
export * from '../../hooks/useUIValidation';

// Components
export * from './GuardedComponent';
export * from './UIGuardProvider';

// Re-export commonly used items for convenience
export { 
  UI_CONSTANTS,
  validateSpacing,
  validateComponentSize,
  validateColor,
  validateTailwindClasses,
  LayoutGuard,
  clampToSpacing,
  getZIndex,
} from '../../utils/ui-guards';

export {
  useComponentDimensions,
  useDesignSystemSpacing,
  useTailwindValidation,
  useResponsiveValidation,
  useAccessibilityValidation,
  usePerformanceValidation,
  useComprehensiveValidation,
} from '../../hooks/useUIValidation';

export {
  GuardedComponent,
  GuardedCard,
  GuardedButton,
  GuardedInput,
  GuardedSidebar,
  GuardedMainContent,
  withUIGuards,
} from './GuardedComponent';

export {
  UIGuardProvider,
  useUIGuards,
} from './UIGuardProvider';