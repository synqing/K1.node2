# K1 Control Dashboard - UI Guard System

A comprehensive system to prevent UI deviations and ensure consistent layouts throughout the K1 Control Dashboard application.

## Overview

The UI Guard System provides:
- **Layout Constraints**: Enforce minimum/maximum dimensions and spacing
- **Design System Compliance**: Validate colors, typography, and spacing against design tokens
- **Component Guards**: Prevent invalid prop combinations and configurations
- **Accessibility Validation**: Ensure components meet accessibility standards
- **Performance Monitoring**: Track render performance and detect issues
- **Real-time Monitoring**: Detect violations as they occur during development

## Quick Start

### 1. Basic Usage

The UI Guard System is automatically enabled in development mode. Simply wrap your app with the `UIGuardProvider`:

```tsx
import { UIGuardProvider } from './components/guards';

function App() {
  return (
    <UIGuardProvider>
      <YourApp />
    </UIGuardProvider>
  );
}
```

### 2. Using Guarded Components

Replace standard components with guarded versions:

```tsx
import { GuardedCard, GuardedButton, GuardedInput } from './components/guards';

function MyComponent() {
  return (
    <GuardedCard padding="md">
      <GuardedInput placeholder="Enter value" />
      <GuardedButton variant="primary">Submit</GuardedButton>
    </GuardedCard>
  );
}
```

### 3. Custom Validation Hooks

Use validation hooks for custom components:

```tsx
import { useComprehensiveValidation } from './hooks/useUIValidation';

function CustomComponent({ className }) {
  const { elementRef, isValid, violations } = useComprehensiveValidation({
    dimensions: { minWidth: 200, minHeight: 100 },
    className,
    componentName: 'CustomComponent',
  });

  return (
    <div ref={elementRef} className={className}>
      {/* Your content */}
    </div>
  );
}
```

## Core Concepts

### Design System Constants

All UI constraints are defined in `UI_CONSTANTS`:

```tsx
import { UI_CONSTANTS } from './utils/ui-guards';

// Approved spacing values
UI_CONSTANTS.SPACING.XS   // 4px
UI_CONSTANTS.SPACING.SM   // 8px
UI_CONSTANTS.SPACING.MD   // 12px
UI_CONSTANTS.SPACING.LG   // 16px
UI_CONSTANTS.SPACING.XL   // 24px
UI_CONSTANTS.SPACING.XXL  // 32px
UI_CONSTANTS.SPACING.XXXL // 48px

// Component constraints
UI_CONSTANTS.COMPONENTS.BUTTON_HEIGHT      // 40px
UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN   // 44px
UI_CONSTANTS.LAYOUT.SIDEBAR_MIN_WIDTH      // 280px
```

### Validation Types

The system validates multiple aspects of UI components:

1. **Layout Validation**: Dimensions, aspect ratios, positioning
2. **Spacing Validation**: Padding, margins, gaps against design system
3. **Color Validation**: Ensures only approved K1 colors are used
4. **Typography Validation**: Font sizes, line heights, weights
5. **Accessibility Validation**: Touch targets, focus indicators, labels
6. **Performance Validation**: Render times, re-render counts

## Components

### GuardedComponent

Base component that wraps any element with validation:

```tsx
<GuardedComponent
  guard={{
    layout: { minWidth: 200, maxWidth: 400 },
    spacing: { padding: 16 },
    componentName: 'MyComponent',
    showViolations: true,
  }}
  className="p-4 bg-[var(--k1-bg)]"
>
  <YourContent />
</GuardedComponent>
```

### Pre-built Guarded Components

#### GuardedCard
```tsx
<GuardedCard padding="md" className="custom-styles">
  Card content with automatic validation
</GuardedCard>
```

#### GuardedButton
```tsx
<GuardedButton 
  variant="primary" 
  size="md" 
  onClick={handleClick}
>
  Click me
</GuardedButton>
```

#### GuardedInput
```tsx
<GuardedInput
  type="text"
  placeholder="Enter value"
  value={value}
  onChange={handleChange}
/>
```

#### GuardedSidebar
```tsx
<GuardedSidebar width={320}>
  Sidebar content with width validation
</GuardedSidebar>
```

### Higher-Order Component

Wrap existing components with guards:

```tsx
import { withUIGuards } from './components/guards';

const GuardedMyComponent = withUIGuards(MyComponent, {
  layout: { minWidth: 200 },
  componentName: 'MyComponent',
});
```

## Hooks

### useComprehensiveValidation

Complete validation for custom components:

```tsx
const { elementRef, isValid, violations, details } = useComprehensiveValidation({
  dimensions: { minWidth: 200, maxWidth: 800, aspectRatio: 16/9 },
  spacing: { padding: 16, margin: 8 },
  className: 'p-4 m-2',
  responsive: {
    mobile: { minWidth: 280 },
    tablet: { minWidth: 400 },
    desktop: { minWidth: 600 },
  },
  accessibility: {
    requiresLabel: true,
    minTouchTarget: true,
  },
  performance: {
    maxRenderTime: 16,
    maxReRenders: 10,
  },
  componentName: 'MyComponent',
});
```

### Individual Validation Hooks

For specific validation needs:

```tsx
// Dimension validation
const { elementRef, isValid, violations } = useComponentDimensions({
  minWidth: 200,
  maxWidth: 800,
  aspectRatio: 16/9,
});

// Spacing validation
const { isValid, violations } = useDesignSystemSpacing({
  padding: 16,
  margin: 8,
  gap: 12,
});

// Tailwind class validation
const { isValid, violations } = useTailwindValidation('p-4 m-2 bg-blue-500');

// Responsive validation
const { elementRef, currentBreakpoint, isValid } = useResponsiveValidation({
  mobile: { minWidth: 280 },
  tablet: { minWidth: 400 },
  desktop: { minWidth: 600 },
});

// Accessibility validation
const { elementRef, isValid, violations } = useAccessibilityValidation({
  requiresLabel: true,
  requiresFocusIndicator: true,
  minTouchTarget: true,
});
```

## Configuration

### UIGuardProvider Configuration

```tsx
<UIGuardProvider
  initialConfig={{
    enabled: true,                    // Enable/disable guards
    strictMode: false,                // Throw errors on violations
    showViolationIndicators: true,    // Show visual indicators
    logViolations: true,              // Log to console
    auditOnMount: true,               // Audit existing DOM on mount
    maxViolations: 100,               // Max violations to track
    excludeComponents: ['TestComponent'], // Components to skip
  }}
>
  <App />
</UIGuardProvider>
```

### Runtime Configuration

```tsx
import { useUIGuards } from './components/guards';

function SettingsPanel() {
  const { config, updateConfig } = useUIGuards();

  return (
    <div>
      <button onClick={() => updateConfig({ strictMode: !config.strictMode })}>
        Toggle Strict Mode
      </button>
    </div>
  );
}
```

## Utilities

### Validation Functions

```tsx
import { 
  validateSpacing, 
  validateComponentSize, 
  validateColor,
  validateTailwindClasses 
} from './utils/ui-guards';

// Check if spacing is approved
const isValidSpacing = validateSpacing(16); // true

// Validate component dimensions
const sizeValidation = validateComponentSize(300, 200, {
  minWidth: 200,
  maxWidth: 400,
});

// Check color approval
const isValidColor = validateColor('#6EE7F3'); // true for K1 colors

// Validate Tailwind classes
const classValidation = validateTailwindClasses('p-4 m-2 bg-[var(--k1-bg)]');
```

### Layout Guards

```tsx
import { LayoutGuard } from './utils/ui-guards';

const validation = LayoutGuard.validateLayout({
  sidebarWidth: 320,
  mainContentWidth: 800,
  cardHeight: 200,
  padding: 16,
});

if (!validation.valid) {
  console.warn('Layout violations:', validation.violations);
}
```

### Utility Functions

```tsx
import { clampToSpacing, getZIndex } from './utils/ui-guards';

// Clamp value to nearest approved spacing
const spacing = clampToSpacing(15); // Returns 16 (nearest valid spacing)

// Get appropriate z-index
const zIndex = getZIndex('MODAL'); // Returns 50
```

## Development Tools

### Violation Indicators

In development mode, violations are shown with visual indicators:
- 🚨 Red indicator for errors
- ⚠️ Yellow indicator for warnings  
- ℹ️ Blue indicator for info

### Console Logging

Violations are logged to the console with context:
```
🚨 UI Guard [layout]: Width 150px is below minimum 200px
⚠️ UI Guard [spacing]: Padding 15px is not from approved spacing scale
```

### Audit Tools

```tsx
import { auditCurrentUI, enableGlobalUIGuards } from './utils/ui-guards';

// Enable global monitoring
enableGlobalUIGuards();

// Audit current DOM
auditCurrentUI();
```

## Best Practices

### 1. Use Design System Values

Always use approved spacing, colors, and dimensions:

```tsx
// ✅ Good
<div className="p-4 m-2 bg-[var(--k1-bg)]">

// ❌ Bad  
<div className="p-3 m-1 bg-blue-500">
```

### 2. Validate Custom Components

Wrap custom components with guards:

```tsx
// ✅ Good
const MyCard = withUIGuards(Card, {
  layout: { minHeight: 120 },
  componentName: 'MyCard',
});

// ❌ Bad - no validation
const MyCard = Card;
```

### 3. Handle Violations Gracefully

Don't ignore violations - fix them:

```tsx
// ✅ Good
const { isValid, violations } = useValidation(config);
if (!isValid) {
  console.warn('Fixing violations:', violations);
  // Fix the issues
}

// ❌ Bad - ignoring violations
const { isValid } = useValidation(config);
// Continue without checking
```

### 4. Use Semantic Component Names

Provide meaningful names for better debugging:

```tsx
// ✅ Good
<GuardedComponent 
  guard={{ componentName: 'ProductCard' }}
>

// ❌ Bad
<GuardedComponent>
```

## Testing

The system includes comprehensive tests:

```bash
npm test ui-guards.test.ts
```

Test coverage includes:
- Core validation functions
- Layout constraints
- Component guards
- Edge cases
- Performance benchmarks

## Troubleshooting

### Common Issues

1. **"Component not wrapped with UIGuardProvider"**
   - Ensure your app is wrapped with `<UIGuardProvider>`

2. **Violations not showing**
   - Check that `enabled: true` in configuration
   - Verify you're in development mode

3. **Too many violations**
   - Use `excludeComponents` to skip problematic components
   - Adjust `maxViolations` limit

4. **Performance issues**
   - Disable guards in production
   - Use `strictMode: false` for warnings only

### Debug Mode

Enable detailed logging:

```tsx
<UIGuardProvider
  initialConfig={{
    logViolations: true,
    showViolationIndicators: true,
    auditOnMount: true,
  }}
>
```

## Migration Guide

### From Unguarded Components

1. Import guarded versions:
```tsx
// Before
import { Card, Button } from './components';

// After  
import { GuardedCard as Card, GuardedButton as Button } from './components/guards';
```

2. Add validation to custom components:
```tsx
// Before
function MyComponent({ className }) {
  return <div className={className}>Content</div>;
}

// After
function MyComponent({ className }) {
  const { elementRef } = useComprehensiveValidation({
    className,
    componentName: 'MyComponent',
  });
  
  return <div ref={elementRef} className={className}>Content</div>;
}
```

3. Update spacing values:
```tsx
// Before
<div className="p-3 m-5">

// After (using approved values)
<div className="p-4 m-6"> // or use clampToSpacing(3) -> 4
```

## API Reference

See the TypeScript definitions in the source files for complete API documentation:
- `src/utils/ui-guards.ts` - Core utilities and constants
- `src/hooks/useUIValidation.ts` - React hooks
- `src/components/guards/` - Components and providers