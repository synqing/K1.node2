---
title: K1 Design Token Platform Usage Guide
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# K1 Design Token Platform Usage Guide

**Comprehensive guide for implementing K1 design tokens across web and iOS platforms**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Web Implementation](#web-implementation)
3. [iOS Implementation](#ios-implementation)
4. [Responsive Design](#responsive-design)
5. [Accessibility](#accessibility)
6. [Component Examples](#component-examples)
7. [Best Practices](#best-practices)

---

## Quick Start

### Installation

#### Web (React/Tailwind)
The tokens are already integrated via `styles/globals.css`. Import globally in your app:

```tsx
import './styles/globals.css';
```

#### iOS (SwiftUI)
1. Copy `K1Colors.swift` and `K1Typography.swift` to your Xcode project
2. Import in your SwiftUI views:

```swift
import SwiftUI
// K1 colors and typography are now available
```

---

## Web Implementation

### Basic Token Usage

#### Direct CSS Variable Access

```css
.my-component {
  /* Colors */
  color: var(--k1-text);
  background-color: var(--k1-surface);
  border: 1px solid var(--k1-border);
  
  /* Typography */
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  line-height: var(--leading-base);
  
  /* Spacing */
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  
  /* Border Radius */
  border-radius: var(--radius-md);
  
  /* Shadows */
  box-shadow: var(--elevation-2);
}
```

#### Tailwind Class Usage

Since tokens are integrated with Tailwind, you can use them directly:

```tsx
<div className="bg-[var(--k1-surface)] text-[var(--k1-text)] p-[var(--spacing-lg)] rounded-[var(--radius-md)]">
  Content
</div>
```

### Component Examples

#### Primary Button

```tsx
function K1Button({ children, onClick, variant = 'primary' }) {
  const styles = {
    primary: {
      backgroundColor: 'var(--button-primary-default)',
      color: 'var(--button-primary-text)',
    },
    secondary: {
      backgroundColor: 'var(--button-secondary-default)',
      color: 'var(--button-secondary-text)',
    },
    tertiary: {
      backgroundColor: 'var(--button-tertiary-default)',
      color: 'var(--button-tertiary-text)',
    },
  };

  return (
    <button
      onClick={onClick}
      className="transition-all duration-[var(--duration-normal)] hover:shadow-[var(--elevation-2)] active:scale-[0.98] focus:outline focus:outline-2 focus:outline-[var(--focus-ring-color)] focus:outline-offset-[var(--focus-ring-offset)]"
      style={{
        ...styles[variant],
        height: 'var(--button-height)',
        paddingLeft: 'var(--spacing-xl)',
        paddingRight: 'var(--spacing-xl)',
        borderRadius: 'var(--radius-button)',
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--font-weight-semibold)',
      }}
    >
      {children}
    </button>
  );
}

// Usage
<K1Button variant="primary" onClick={handleClick}>
  Submit
</K1Button>
```

#### Card Component

```tsx
function K1Card({ children, elevated = false, className = '' }) {
  return (
    <div
      className={`transition-shadow duration-[var(--duration-normal)] ${className}`}
      style={{
        backgroundColor: elevated ? 'var(--k1-surface-raised)' : 'var(--k1-surface)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--spacing-lg)',
        boxShadow: elevated ? 'var(--elevation-2)' : 'var(--elevation-1)',
      }}
    >
      {children}
    </div>
  );
}

// Usage
<K1Card elevated>
  <h3 style={{ color: 'var(--k1-text)', fontSize: 'var(--text-h3)' }}>
    Card Title
  </h3>
  <p style={{ color: 'var(--k1-text-secondary)', fontSize: 'var(--text-base)' }}>
    Card description
  </p>
</K1Card>
```

#### Input Field

```tsx
function K1Input({ placeholder, value, onChange, error = false }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full transition-all duration-[var(--duration-normal)] focus:outline focus:outline-2 focus:outline-offset-[var(--focus-ring-offset)]"
      style={{
        height: 'var(--input-height)',
        paddingLeft: 'var(--spacing-lg)',
        paddingRight: 'var(--spacing-lg)',
        backgroundColor: 'var(--k1-surface-sunken)',
        border: '1px solid var(--k1-border)',
        borderRadius: 'var(--radius-input)',
        color: 'var(--k1-text)',
        fontSize: 'var(--text-base)',
        outlineColor: error ? 'var(--focus-ring-error-color)' : 'var(--focus-ring-color)',
      }}
    />
  );
}
```

#### Status Badge

```tsx
function K1Badge({ children, status = 'info' }) {
  const statusColors = {
    success: {
      color: 'var(--k1-success)',
      backgroundColor: 'var(--k1-success-bg)',
      borderColor: 'var(--k1-success-border)',
    },
    warning: {
      color: 'var(--k1-warning)',
      backgroundColor: 'var(--k1-warning-bg)',
      borderColor: 'var(--k1-warning-border)',
    },
    error: {
      color: 'var(--k1-error)',
      backgroundColor: 'var(--k1-error-bg)',
      borderColor: 'var(--k1-error-border)',
    },
    info: {
      color: 'var(--k1-info)',
      backgroundColor: 'var(--k1-info-bg)',
      borderColor: 'var(--k1-info-border)',
    },
  };

  return (
    <span
      style={{
        ...statusColors[status],
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-weight-medium)',
        padding: 'var(--spacing-xs) var(--spacing-sm)',
        borderRadius: 'var(--radius-badge)',
        border: '1px solid',
      }}
    >
      {children}
    </span>
  );
}
```

### Interactive States

#### Hover Effects

```css
.k1-hover-card {
  background-color: var(--k1-surface);
  box-shadow: var(--elevation-1);
  transition: all var(--duration-normal) var(--ease-out);
}

.k1-hover-card:hover {
  background-color: var(--k1-surface-raised);
  box-shadow: var(--elevation-2);
  transform: translateY(-2px);
}
```

#### Focus States

```css
.k1-focusable:focus {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  box-shadow: var(--glow-accent);
}

.k1-focusable.error:focus {
  outline-color: var(--focus-ring-error-color);
  box-shadow: var(--glow-error);
}
```

#### Loading States

```tsx
function K1LoadingButton({ children, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="relative"
      style={{
        backgroundColor: 'var(--button-primary-default)',
        color: 'var(--button-primary-text)',
        height: 'var(--button-height)',
        paddingLeft: 'var(--spacing-xl)',
        paddingRight: 'var(--spacing-xl)',
        borderRadius: 'var(--radius-button)',
        opacity: loading ? 0.7 : 1,
        cursor: loading ? 'wait' : 'pointer',
      }}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
          </svg>
        </span>
      )}
      <span style={{ opacity: loading ? 0 : 1 }}>{children}</span>
    </button>
  );
}
```

---

## iOS Implementation

### Basic SwiftUI Usage

#### Colors

```swift
// Direct color usage
Text("Hello World")
    .foregroundColor(.k1Text)
    .background(Color.k1Surface)

// Adaptive colors (dark/light mode)
Rectangle()
    .fill(Color.k1Bg) // Automatically adapts to light/dark mode
```

#### Typography

```swift
// K1 Typography Scale
Text("Display Heading")
    .font(.k1Display)
    .foregroundColor(.k1Text)

Text("Section Title")
    .font(.k1H2)
    .foregroundColor(.k1Text)

Text("Body text content")
    .font(.k1Base)
    .foregroundColor(.k1TextSecondary)

// iOS Native Typography
Text("Native Large Title")
    .font(.k1LargeTitle)
```

#### Spacing & Layout

```swift
VStack(spacing: K1Spacing.md) {
    Text("Title")
    Text("Subtitle")
}
.padding(K1Spacing.lg)

HStack(spacing: K1Spacing.sm) {
    Image(systemName: "star.fill")
        .frame(width: K1Sizing.iconSM, height: K1Sizing.iconSM)
    Text("Favorite")
}
```

### Complete Component Examples

#### K1 Primary Button

```swift
struct K1PrimaryButton: View {
    let title: String
    let action: () -> Void
    @State private var isPressed = false
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.k1Button)
                .foregroundColor(Color(hex: "0F1115"))
                .frame(height: K1Sizing.buttonHeight)
                .frame(maxWidth: .infinity)
                .background(Color.k1Accent)
                .cornerRadius(K1Radius.md)
        }
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.easeOut(duration: 0.1), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}

// Usage
K1PrimaryButton(title: "Submit") {
    print("Button tapped")
}
```

#### K1 Card with Safe Area

```swift
struct K1Card<Content: View>: View {
    let content: Content
    var elevated: Bool = false
    
    init(elevated: Bool = false, @ViewBuilder content: () -> Content) {
        self.elevated = elevated
        self.content = content()
    }
    
    var body: some View {
        content
            .padding(K1Spacing.lg)
            .background(elevated ? Color.k1SurfaceRaised : Color.k1Surface)
            .cornerRadius(K1Radius.lg)
            .shadow(
                color: Color.black.opacity(elevated ? 0.15 : 0.12),
                radius: elevated ? 8 : 3,
                x: 0,
                y: elevated ? 4 : 1
            )
    }
}

// Usage
ScrollView {
    VStack(spacing: K1Spacing.lg) {
        K1Card(elevated: true) {
            VStack(alignment: .leading, spacing: K1Spacing.md) {
                Text("Card Title")
                    .font(.k1H3)
                    .foregroundColor(.k1Text)
                
                Text("Card description")
                    .font(.k1Base)
                    .foregroundColor(.k1TextSecondary)
            }
        }
    }
    .padding(K1Spacing.lg)
}
.background(Color.k1Bg)
```

#### K1 Text Field

```swift
struct K1TextField: View {
    let placeholder: String
    @Binding var text: String
    @FocusState private var isFocused: Bool
    var hasError: Bool = false
    
    var body: some View {
        TextField(placeholder, text: $text)
            .font(.k1Base)
            .foregroundColor(.k1Text)
            .frame(height: K1Sizing.inputHeight)
            .padding(.horizontal, K1Spacing.lg)
            .background(Color.k1SurfaceSunken)
            .cornerRadius(K1Radius.md)
            .overlay(
                RoundedRectangle(cornerRadius: K1Radius.md)
                    .stroke(
                        isFocused ? 
                            (hasError ? Color.k1Error : Color.k1Accent) : 
                            Color.clear,
                        lineWidth: 2
                    )
            )
            .focused($isFocused)
    }
}

// Usage
@State private var username = ""
@State private var hasError = false

K1TextField(placeholder: "Username", text: $username, hasError: hasError)
```

#### K1 Status Badge

```swift
struct K1Badge: View {
    enum Status {
        case success, warning, error, info
        
        var color: Color {
            switch self {
            case .success: return .k1Success
            case .warning: return .k1Warning
            case .error: return .k1Error
            case .info: return .k1Info
            }
        }
        
        var backgroundColor: Color {
            color.opacity(0.1)
        }
    }
    
    let text: String
    let status: Status
    
    var body: some View {
        Text(text)
            .font(.k1XSmall)
            .foregroundColor(status.color)
            .padding(.horizontal, K1Spacing.sm)
            .padding(.vertical, K1Spacing.xs)
            .background(status.backgroundColor)
            .cornerRadius(K1Radius.sm)
    }
}

// Usage
K1Badge(text: "Active", status: .success)
```

### Safe Area Implementation

```swift
struct K1SafeAreaView: View {
    var body: some View {
        VStack(spacing: 0) {
            // Top navigation with safe area
            HStack {
                Text("K1 Dashboard")
                    .font(.k1H2)
                    .foregroundColor(.k1Text)
                Spacer()
            }
            .frame(height: K1Sizing.navBarHeight)
            .padding(.horizontal, K1Spacing.lg)
            .background(Color.k1Surface)
            .k1SafePadding([.top]) // Adds safe area padding
            
            // Main content
            ScrollView {
                VStack(spacing: K1Spacing.lg) {
                    // Content here
                }
                .padding(K1Spacing.lg)
            }
            .background(Color.k1Bg)
            
            // Bottom tab bar with safe area
            HStack(spacing: K1Spacing.xl) {
                TabButton(icon: "house.fill", label: "Home")
                TabButton(icon: "chart.bar.fill", label: "Stats")
                TabButton(icon: "gearshape.fill", label: "Settings")
            }
            .frame(height: K1Sizing.tabBarHeight)
            .background(Color.k1Surface)
            .k1SafePadding([.bottom]) // Adds safe area padding
        }
        .ignoresSafeArea(.container, edges: .all)
    }
}
```

---

## Responsive Design

### Breakpoint System

```css
/* Mobile: < 768px */
@media (max-width: 767px) {
  :root {
    --text-h1: 24px;
    --text-h2: 20px;
    --nav-bar-desktop: var(--nav-bar-mobile);
  }
}

/* Tablet: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  :root {
    --text-h1: 28px;
    --text-h2: 22px;
  }
}

/* Desktop: ≥ 1024px */
@media (min-width: 1024px) {
  :root {
    --text-h1: 32px;
    --text-h2: 24px;
  }
}
```

### Responsive Components

```tsx
function K1ResponsiveGrid({ children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--spacing-lg)',
      }}
    >
      {children}
    </div>
  );
}

// Usage
<K1ResponsiveGrid>
  <K1Card>Card 1</K1Card>
  <K1Card>Card 2</K1Card>
  <K1Card>Card 3</K1Card>
</K1ResponsiveGrid>
```

### SwiftUI Responsive Layout

```swift
struct K1ResponsiveLayout: View {
    @Environment(\.horizontalSizeClass) var sizeClass
    
    var body: some View {
        if sizeClass == .compact {
            // iPhone / Narrow layout
            VStack(spacing: K1Spacing.lg) {
                ContentCards()
            }
        } else {
            // iPad / Wide layout
            HStack(spacing: K1Spacing.lg) {
                ContentCards()
            }
        }
    }
}
```

---

## Accessibility

### WCAG Compliance

All K1 text colors meet WCAG contrast requirements:

| Color | Contrast Ratio | WCAG Level |
|-------|----------------|------------|
| `--k1-text` | 18.5:1 | AAA |
| `--k1-text-secondary` | 7.2:1 | AA |
| `--k1-text-disabled` | 4.8:1 | AA |
| `--k1-success` | 7.1:1 | AA |
| `--k1-error` | 6.8:1 | AA |

### Focus Indicators

```css
/* Always show focus for keyboard navigation */
.k1-interactive:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  box-shadow: var(--glow-accent);
}

/* Remove default focus for mouse/touch */
.k1-interactive:focus:not(:focus-visible) {
  outline: none;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Screen Reader Support (Web)

```tsx
<button
  aria-label="Close dialog"
  aria-pressed={isActive}
  aria-disabled={isDisabled}
>
  <X size={24} />
</button>
```

### VoiceOver Support (iOS)

```swift
Button(action: {}) {
    Image(systemName: "star.fill")
}
.accessibilityLabel("Add to favorites")
.accessibilityHint("Double tap to mark this item as favorite")
.accessibilityAddTraits(.isButton)
```

### Dynamic Type (iOS)

```swift
Text("Dynamic Text")
    .font(.k1BodyDynamic) // Scales with user's text size preference

// Limit scaling if needed
Text("Fixed Size Text")
    .font(.k1Body)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
```

---

## Component Examples

### Dashboard Layout (Web)

```tsx
function K1Dashboard() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--k1-bg)',
        color: 'var(--k1-text)',
      }}
    >
      {/* Navigation */}
      <nav
        style={{
          height: 'var(--nav-bar-desktop)',
          backgroundColor: 'var(--k1-surface)',
          borderBottom: '1px solid var(--k1-border)',
          padding: '0 var(--spacing-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-lg)',
        }}
      >
        <h1 style={{ fontSize: 'var(--text-h3)' }}>K1 Dashboard</h1>
      </nav>

      {/* Main Content */}
      <main
        style={{
          padding: 'var(--spacing-xl)',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--spacing-lg)',
          }}
        >
          <K1Card elevated>
            <h3>Total Users</h3>
            <p style={{ fontSize: 'var(--text-display)' }}>1,234</p>
            <K1Badge status="success">+12%</K1Badge>
          </K1Card>
          
          <K1Card elevated>
            <h3>Active Sessions</h3>
            <p style={{ fontSize: 'var(--text-display)' }}>567</p>
            <K1Badge status="info">Live</K1Badge>
          </K1Card>
        </div>
      </main>
    </div>
  );
}
```

### Dashboard Layout (iOS)

```swift
struct K1DashboardView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: K1Spacing.lg) {
                    // Stats Grid
                    LazyVGrid(
                        columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ],
                        spacing: K1Spacing.lg
                    ) {
                        K1StatCard(
                            title: "Total Users",
                            value: "1,234",
                            badge: K1Badge(text: "+12%", status: .success)
                        )
                        
                        K1StatCard(
                            title: "Active Sessions",
                            value: "567",
                            badge: K1Badge(text: "Live", status: .info)
                        )
                    }
                }
                .padding(K1Spacing.lg)
            }
            .background(Color.k1Bg)
            .navigationTitle("K1 Dashboard")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct K1StatCard: View {
    let title: String
    let value: String
    let badge: K1Badge
    
    var body: some View {
        K1Card(elevated: true) {
            VStack(alignment: .leading, spacing: K1Spacing.md) {
                Text(title)
                    .font(.k1Small)
                    .foregroundColor(.k1TextSecondary)
                
                Text(value)
                    .font(.k1Display)
                    .foregroundColor(.k1Text)
                
                badge
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
```

---

## Best Practices

### Token Usage Guidelines

✅ **DO:**
- Always use design tokens instead of hardcoded values
- Use semantic tokens (e.g., `--k1-text`) over raw tokens (e.g., `#E6E9EF`)
- Provide fallback values: `var(--k1-accent, #6EE7F3)`
- Test in both light and dark modes (iOS)
- Verify WCAG contrast ratios for custom colors
- Use appropriate font scales for each platform

❌ **DON'T:**
- Hardcode color values (`#6EE7F3`) - always use tokens
- Mix web and iOS sizing (44px on web, 40px on iOS)
- Ignore safe area insets on iOS
- Use web font sizes on iOS (14px vs 17px)
- Override system fonts on iOS unnecessarily
- Forget to test reduced motion preferences

### Performance Optimization

#### Web
```css
/* Use CSS custom properties for dynamic theming */
.component {
  --local-accent: var(--k1-accent);
  background-color: var(--local-accent);
}

/* Use will-change sparingly */
.animated-card {
  will-change: transform, box-shadow;
}
```

#### iOS
```swift
// Use @State for local UI updates
@State private var isExpanded = false

// Use LazyVStack for long lists
LazyVStack(spacing: K1Spacing.md) {
    ForEach(items) { item in
        K1Card { /* content */ }
    }
}

// Cache expensive color calculations
extension Color {
    static let k1AccentCached = Color.k1Accent
}
```

### Debugging Token Issues

#### Web
```javascript
// Log all K1 tokens
const tokens = Object.entries(getComputedStyle(document.documentElement))
  .filter(([key]) => key.startsWith('--k1-'))
  .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

console.table(tokens);
```

#### iOS
```swift
// Print color values
print("K1 Accent:", Color.k1Accent)
print("K1 Background:", Color.k1Bg)

// Test light/dark mode
#Preview("Light Mode") {
    ContentView()
        .preferredColorScheme(.light)
}

#Preview("Dark Mode") {
    ContentView()
        .preferredColorScheme(.dark)
}
```

---

## Migration Guide

### From Old System to K1 v2.0

#### Web Migration

```css
/* OLD */
.component {
  background: #1A1F2B;
  color: #E6E9EF;
  padding: 16px;
  border-radius: 8px;
}

/* NEW */
.component {
  background: var(--k1-surface);
  color: var(--k1-text);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
}
```

#### iOS Migration

```swift
// OLD
.background(Color(hex: "1A1F2B"))
.foregroundColor(Color(hex: "E6E9EF"))
.padding(16)
.cornerRadius(8)

// NEW
.background(Color.k1Surface)
.foregroundColor(Color.k1Text)
.padding(K1Spacing.lg)
.cornerRadius(K1Radius.md)
```

---

## Troubleshooting

### Common Issues

**Issue:** Colors not displaying correctly
- **Solution:** Ensure `globals.css` is imported in your root component
- **iOS:** Verify color extensions are added to your project

**Issue:** Typography too small on iOS
- **Solution:** Use iOS-specific font scales (`--text-base` = 17px on iOS, 14px on web)

**Issue:** Focus ring not visible
- **Solution:** Check `:focus-visible` pseudo-class is supported, add polyfill if needed

**Issue:** Safe area not working on iOS
- **Solution:** Use `.k1SafePadding()` modifier or manually add safe area insets

---

**Last Updated:** October 27, 2025  
**Version:** K1 Design Tokens v2.0  
**Support:** design-systems@k1.dev
