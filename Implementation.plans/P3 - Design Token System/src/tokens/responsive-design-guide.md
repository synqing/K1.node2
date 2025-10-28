---
title: K1 Responsive Design Guide
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# K1 Responsive Design Guide

**Mobile-first, fluid, and platform-aware responsive system**  
**Quality Target:** 99/100

---

## Table of Contents

1. [Breakpoint System](#breakpoint-system)
2. [Mobile Layout (<640px)](#mobile-layout-640px)
3. [Tablet Layout (640-1023px)](#tablet-layout-640-1023px)
4. [Desktop Layout (≥1024px)](#desktop-layout-1024px)
5. [Fluid Typography](#fluid-typography)
6. [Thumb Zone Optimization](#thumb-zone-optimization)
7. [Grid Systems](#grid-systems)

---

## Breakpoint System

### Standard Breakpoints

```css
:root {
  --breakpoint-sm: 640px;   /* Tablet start */
  --breakpoint-md: 768px;   /* Medium tablet */
  --breakpoint-lg: 1024px;  /* Desktop start */
  --breakpoint-xl: 1280px;  /* Large desktop */
  --breakpoint-2xl: 1536px; /* Extra large */
}
```

### Media Query Helpers

```css
/* Mobile first approach */
@media (min-width: 640px) { /* Tablet */ }
@media (min-width: 768px) { /* Medium tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1280px) { /* Large desktop */ }
@media (min-width: 1536px) { /* Extra large */ }

/* Max-width for mobile-specific styles */
@media (max-width: 639px) { /* Mobile only */ }
```

### Container Widths

```css
.k1-container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 12px;
  padding-right: 12px;
}

@media (min-width: 640px) {
  .k1-container {
    max-width: 640px;
    padding-left: 16px;
    padding-right: 16px;
  }
}

@media (min-width: 768px) {
  .k1-container {
    max-width: 768px;
  }
}

@media (min-width: 1024px) {
  .k1-container {
    max-width: 1024px;
    padding-left: 20px;
    padding-right: 20px;
  }
}

@media (min-width: 1280px) {
  .k1-container {
    max-width: 1280px;
  }
}
```

---

## Mobile Layout (<640px)

### Viewport Configuration

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

### Layout Specifications

```json
{
  "mobile-layout": {
    "viewport-width": "100vw",
    "content-padding": "12px sides (inside safe area)",
    "vertical-spacing": "12px between sections",
    "header-height": "56px + safe-area-inset-top",
    "tab-bar-height": "50px + safe-area-inset-bottom",
    "content-area": "Full width, single column"
  }
}
```

### Typography Scale (Mobile)

```css
/* Mobile-specific sizes */
:root {
  --mobile-h1: 24px;
  --mobile-h2: 20px;
  --mobile-h3: 18px;
  --mobile-h4: 16px;
  --mobile-body: 14px;
  --mobile-small: 12px;
}

@media (max-width: 639px) {
  h1 { font-size: var(--mobile-h1); }
  h2 { font-size: var(--mobile-h2); }
  h3 { font-size: var(--mobile-h3); }
  h4 { font-size: var(--mobile-h4); }
  body { font-size: var(--mobile-body); }
  .text-small { font-size: var(--mobile-small); }
}
```

### Component Sizing (Mobile)

```css
/* Mobile component sizes */
@media (max-width: 639px) {
  .k1-button {
    height: 44px; /* iOS minimum */
    padding: 0 16px;
    font-size: 14px;
  }
  
  .k1-input {
    height: 44px;
    padding: 0 12px;
    font-size: 16px; /* Prevents iOS zoom */
  }
  
  .k1-card {
    padding: 12px;
    border-radius: var(--radius-md);
  }
}
```

### Grid Layout (Mobile)

```css
/* Single column on mobile */
@media (max-width: 639px) {
  .k1-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .k1-grid-item {
    width: 100%;
  }
}
```

### Mobile Navigation

```css
/* Tab bar visible on mobile */
@media (max-width: 639px) {
  .k1-tab-bar {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50px;
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .k1-sidebar {
    display: none; /* Hide sidebar on mobile */
  }
}
```

### Mobile Layout Example

```tsx
function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-layout">
      {/* Header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          paddingTop: 'max(8px, env(safe-area-inset-top))',
          background: 'var(--k1-surface)',
          borderBottom: '1px solid var(--k1-border)',
          zIndex: 100,
        }}
      >
        <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', height: '100%' }}>
          {/* Header content */}
        </div>
      </header>
      
      {/* Content */}
      <main
        style={{
          marginTop: 'calc(56px + max(8px, env(safe-area-inset-top)))',
          marginBottom: 'calc(50px + env(safe-area-inset-bottom))',
          padding: '12px',
        }}
      >
        {children}
      </main>
      
      {/* Tab Bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50px',
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: 'var(--k1-surface)',
          borderTop: '1px solid var(--k1-border)',
          zIndex: 100,
        }}
      >
        {/* Tab items */}
      </nav>
    </div>
  );
}
```

---

## Tablet Layout (640-1023px)

### Layout Specifications

```json
{
  "tablet-layout": {
    "viewport-width": "640-1023px",
    "content-padding": "16-20px sides",
    "vertical-spacing": "16px between sections",
    "header-height": "64px",
    "sidebar": "Optional collapsible, 280px width",
    "content-area": "2-column grid possible"
  }
}
```

### Typography Scale (Tablet)

```css
:root {
  --tablet-h1: 28px;
  --tablet-h2: 22px;
  --tablet-h3: 19px;
  --tablet-h4: 17px;
  --tablet-body: 14px;
  --tablet-small: 12px;
}

@media (min-width: 640px) and (max-width: 1023px) {
  h1 { font-size: var(--tablet-h1); }
  h2 { font-size: var(--tablet-h2); }
  h3 { font-size: var(--tablet-h3); }
  h4 { font-size: var(--tablet-h4); }
}
```

### Grid Layout (Tablet)

```css
/* 2-column grid on tablet */
@media (min-width: 640px) {
  .k1-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

/* 2-3 column for wider tablets */
@media (min-width: 768px) {
  .k1-grid-3col {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Tablet Navigation Options

#### Option 1: Keep Tab Bar

```css
@media (min-width: 640px) and (max-width: 1023px) {
  .k1-tab-bar {
    display: flex; /* Keep tab bar on tablet */
  }
  
  .k1-sidebar {
    display: none;
  }
}
```

#### Option 2: Switch to Sidebar

```css
@media (min-width: 768px) and (max-width: 1023px) {
  .k1-tab-bar {
    display: none; /* Hide tab bar */
  }
  
  .k1-sidebar {
    display: block;
    width: 280px;
    position: fixed;
    left: 0;
    top: 64px;
    bottom: 0;
  }
  
  .k1-content {
    margin-left: 280px;
  }
}
```

### Tablet Landscape Mode

```css
/* Landscape orientation on tablet */
@media (min-width: 640px) and (max-width: 1023px) and (orientation: landscape) {
  .k1-grid {
    grid-template-columns: repeat(3, 1fr); /* 3 columns in landscape */
  }
  
  .k1-sidebar {
    display: block; /* Show sidebar in landscape */
  }
}
```

---

## Desktop Layout (≥1024px)

### Layout Specifications

```json
{
  "desktop-layout": {
    "viewport-width": "≥1024px",
    "content-padding": "20-24px sides",
    "vertical-spacing": "16-20px between sections",
    "header-height": "64px",
    "sidebar-width": "280px (fixed)",
    "content-area": "3-4 column grid"
  }
}
```

### Typography Scale (Desktop)

```css
:root {
  --desktop-h1: 32px;
  --desktop-h2: 24px;
  --desktop-h3: 20px;
  --desktop-h4: 18px;
  --desktop-body: 14px;
  --desktop-small: 12px;
}

@media (min-width: 1024px) {
  h1 { font-size: var(--desktop-h1); }
  h2 { font-size: var(--desktop-h2); }
  h3 { font-size: var(--desktop-h3); }
  h4 { font-size: var(--desktop-h4); }
}
```

### Grid Layout (Desktop)

```css
/* 3-4 column grid on desktop */
@media (min-width: 1024px) {
  .k1-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}

@media (min-width: 1280px) {
  .k1-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Desktop Navigation

```css
/* Fixed sidebar on desktop */
@media (min-width: 1024px) {
  .k1-tab-bar {
    display: none; /* Hide tab bar */
  }
  
  .k1-sidebar {
    display: block;
    width: 280px;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    background: var(--k1-surface);
    border-right: 1px solid var(--k1-border);
  }
  
  .k1-content {
    margin-left: 280px;
  }
}
```

### Desktop Layout Example

```tsx
function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="desktop-layout">
      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '280px',
          background: 'var(--k1-surface)',
          borderRight: '1px solid var(--k1-border)',
          zIndex: 100,
        }}
      >
        {/* Sidebar content */}
      </aside>
      
      {/* Main content */}
      <main
        style={{
          marginLeft: '280px',
          minHeight: '100vh',
          padding: '20px',
        }}
      >
        <div className="k1-container" style={{ maxWidth: '1280px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
```

---

## Fluid Typography

### CSS clamp() for Smooth Scaling

**Benefit:** Typography scales smoothly between breakpoints without jarring jumps

```css
:root {
  /* Formula: clamp(min, preferred, max) */
  
  /* Display: 24px mobile → 32px desktop */
  --text-display: clamp(24px, 5vw, 32px);
  
  /* H1: 24px mobile → 32px desktop */
  --text-h1: clamp(24px, 4.5vw, 32px);
  
  /* H2: 20px mobile → 24px desktop */
  --text-h2: clamp(20px, 3.5vw, 24px);
  
  /* H3: 18px mobile → 20px desktop */
  --text-h3: clamp(18px, 3vw, 20px);
  
  /* H4: 16px mobile → 18px desktop */
  --text-h4: clamp(16px, 2.5vw, 18px);
  
  /* Body: 14px (constant) */
  --text-base: 14px;
  
  /* Small: 12px (constant) */
  --text-sm: 12px;
}

h1 { font-size: var(--text-h1); }
h2 { font-size: var(--text-h2); }
h3 { font-size: var(--text-h3); }
h4 { font-size: var(--text-h4); }
```

### Fluid Spacing

```css
:root {
  /* Spacing scales with viewport */
  --spacing-fluid-sm: clamp(8px, 1.5vw, 12px);
  --spacing-fluid-md: clamp(12px, 2vw, 16px);
  --spacing-fluid-lg: clamp(16px, 3vw, 24px);
  --spacing-fluid-xl: clamp(24px, 4vw, 32px);
}
```

---

## Thumb Zone Optimization

### Mobile Thumb Zones

**One-handed phone use:**

```
┌─────────────────────────────┐
│ ❌ Hard to Reach            │ ← Top 1/4 of screen
│                             │
├─────────────────────────────┤
│ ⚠️ Moderate Reach           │ ← Middle 1/2 of screen
│                             │
│                             │
├─────────────────────────────┤
│ ✅ Easy Reach (Thumb Zone)  │ ← Bottom 1/3 of screen
│ [Primary Actions Here]      │
└─────────────────────────────┘
```

### Design Guidelines

#### Primary Actions (Bottom Third)

```css
/* Place primary actions in thumb-friendly zone */
.k1-primary-actions {
  position: fixed;
  bottom: calc(50px + env(safe-area-inset-bottom) + 16px);
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

#### Secondary Actions (Top)

```css
/* Less frequent actions at top (require reach) */
.k1-secondary-actions {
  position: fixed;
  top: calc(56px + max(8px, env(safe-area-inset-top)) + 16px);
  right: 16px;
}
```

### Floating Action Button

```tsx
function K1FloatingActionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 'calc(50px + env(safe-area-inset-bottom) + 16px)',
        right: 'max(16px, env(safe-area-inset-right))',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'var(--k1-accent)',
        color: 'var(--k1-text-inverse)',
        border: 'none',
        boxShadow: 'var(--elevation-3)',
        cursor: 'pointer',
        zIndex: 50,
      }}
    >
      <Plus size={24} />
    </button>
  );
}
```

---

## Grid Systems

### Mobile Grid (1 Column)

```css
@media (max-width: 639px) {
  .k1-responsive-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}
```

### Tablet Grid (2 Columns)

```css
@media (min-width: 640px) and (max-width: 1023px) {
  .k1-responsive-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
```

### Desktop Grid (3-4 Columns)

```css
@media (min-width: 1024px) {
  .k1-responsive-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}

@media (min-width: 1280px) {
  .k1-responsive-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Auto-Fit Grid (Flexible)

```css
.k1-auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

/* Mobile: 1 column (if < 250px)
   Tablet: 2-3 columns
   Desktop: 3-5 columns (depending on width) */
```

---

## Responsive Component Examples

### Responsive Card

```tsx
function ResponsiveCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 'clamp(12px, 2vw, 20px)',
        borderRadius: 'var(--radius-card)',
        background: 'var(--k1-surface)',
        border: '1px solid var(--k1-border)',
      }}
    >
      {children}
    </div>
  );
}
```

### Responsive Stack

```tsx
function ResponsiveStack({
  children,
  direction = 'vertical',
}: {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
}) {
  return (
    <div
      className="responsive-stack"
      style={{
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        gap: 'clamp(12px, 2vw, 20px)',
      }}
    >
      {children}
    </div>
  );
}
```

---

## Testing Checklist

### Mobile Testing (< 640px)
- [ ] Single column layout
- [ ] Tab bar visible at bottom
- [ ] Safe area respected (notch, home indicator)
- [ ] Touch targets minimum 44px
- [ ] Text readable without zoom (16px inputs)
- [ ] Primary actions in thumb zone

### Tablet Testing (640-1023px)
- [ ] 2-column grid layout
- [ ] Tab bar OR sidebar navigation
- [ ] Landscape mode handled
- [ ] Typography scales appropriately
- [ ] Spacing increased from mobile

### Desktop Testing (≥ 1024px)
- [ ] 3-4 column grid layout
- [ ] Fixed sidebar navigation
- [ ] Hover states functional
- [ ] Keyboard navigation complete
- [ ] Typography at desktop scale
- [ ] Wide screen layouts (≥ 1280px)

---

**Last Updated:** October 27, 2025  
**Version:** 2.0.0  
**Status:** Production Ready ✅
