---
title: K1 Dark Theme Polish
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# K1 Dark Theme Polish

**Advanced dark theme refinements for visual sophistication**  
**Quality Target:** 99/100

---

## Table of Contents

1. [Gradient System](#gradient-system)
2. [Surface Elevation](#surface-elevation)
3. [Color Refinements](#color-refinements)
4. [Glass-Morphism Effects](#glass-morphism-effects)
5. [Subtle Details](#subtle-details)

---

## Gradient System

### Surface Gradients

**Purpose:** Add depth and visual interest to flat surfaces

#### Surface Raised Gradient

```css
.k1-surface-raised-gradient {
  background: linear-gradient(
    180deg,
    hsl(230, 25%, 20%) 0%,    /* Slightly lighter at top */
    hsl(230, 25%, 18%) 100%   /* Base color at bottom */
  );
}
```

**Use Case:** Elevated cards, panels, navigation bars

#### Accent Gradient Overlay

```css
.k1-accent-gradient {
  position: relative;
}

.k1-accent-gradient::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 50%;
  height: 50%;
  background: radial-gradient(
    circle at top right,
    rgba(110, 231, 243, 0.05) 0%,
    transparent 70%
  );
  pointer-events: none;
}
```

**Use Case:** Hero sections, featured cards, highlighted areas

#### Subtle Glow Gradient

```css
.k1-glow-gradient {
  background: radial-gradient(
    ellipse at center,
    rgba(110, 231, 243, 0.03) 0%,
    transparent 50%
  );
}
```

**Use Case:** Backgrounds behind important CTAs, modal centers

### Implementation Examples

#### Card with Gradient

```tsx
function K1CardWithGradient({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, hsl(230, 25%, 20%) 0%, hsl(230, 25%, 18%) 100%)',
        border: '1px solid var(--k1-border)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--spacing-lg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle at top right, rgba(110, 231, 243, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
```

#### Hero Section with Glow

```tsx
function K1HeroSection({ title, description }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        padding: 'var(--spacing-3xl) var(--spacing-xl)',
        background: 'var(--k1-bg)',
        overflow: 'hidden',
      }}
    >
      {/* Glow background */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          height: '200%',
          background: 'radial-gradient(ellipse at center, rgba(110, 231, 243, 0.08) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
```

---

## Surface Elevation

### Elevation Levels (0-5)

Refined elevation system with subtle color variations:

#### Level 0: Page Background

```css
.k1-elevation-0 {
  background: var(--k1-bg); /* #0F1115 */
  box-shadow: none;
}
```

**Use Case:** Page background, canvas

#### Level 1: Standard Surface

```css
.k1-elevation-1 {
  background: linear-gradient(
    180deg,
    hsl(230, 20%, 12%) 0%,
    hsl(230, 20%, 11%) 100%
  );
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
```

**Use Case:** Cards, panels, list items

#### Level 2: Raised Surface

```css
.k1-elevation-2 {
  background: linear-gradient(
    180deg,
    hsl(230, 25%, 20%) 0%,
    hsl(230, 25%, 18%) 100%
  );
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
```

**Use Case:** Selected cards, active items, navigation bar

#### Level 3: Floating Elements

```css
.k1-elevation-3 {
  background: linear-gradient(
    180deg,
    hsl(230, 25%, 22%) 0%,
    hsl(230, 25%, 20%) 100%
  );
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.20),
    0 0 24px rgba(110, 231, 243, 0.1); /* Subtle accent glow */
}
```

**Use Case:** Important cards, floating action buttons, highlighted elements

#### Level 4: Modal/Dialog

```css
.k1-elevation-4 {
  background: linear-gradient(
    180deg,
    hsl(230, 25%, 24%) 0%,
    hsl(230, 25%, 22%) 100%
  );
  box-shadow: 
    0 12px 24px rgba(0, 0, 0, 0.25),
    0 0 32px rgba(110, 231, 243, 0.15); /* Accent glow */
}
```

**Use Case:** Modals, dialogs, overlays

#### Level 5: Tooltips/Popovers

```css
.k1-elevation-5 {
  background: linear-gradient(
    180deg,
    hsl(230, 25%, 26%) 0%,
    hsl(230, 25%, 24%) 100%
  );
  box-shadow: 
    0 16px 32px rgba(0, 0, 0, 0.30),
    0 0 40px rgba(110, 231, 243, 0.2); /* Stronger accent glow */
}
```

**Use Case:** Tooltips, popovers, context menus (highest prominence)

### Visual Comparison

```
Level 0: #0F1115 (bg)           Shadow: none
Level 1: #1A1F2B → #1A1C26     Shadow: 1px, 0.12 opacity
Level 2: #242C40 → #242733     Shadow: 4px, 0.15 opacity + subtle glow
Level 3: #282F45 → #262C3D     Shadow: 8px, 0.20 opacity + glow 10%
Level 4: #2D3449 → #2A3042     Shadow: 12px, 0.25 opacity + glow 15%
Level 5: #323A4F → #2E3547     Shadow: 16px, 0.30 opacity + glow 20%
```

### Implementation

```tsx
type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

interface K1ElevatedCardProps {
  elevation?: ElevationLevel;
  children: React.ReactNode;
}

function K1ElevatedCard({ elevation = 1, children }: K1ElevatedCardProps) {
  const elevationStyles = {
    0: {
      background: 'var(--k1-bg)',
      boxShadow: 'none',
    },
    1: {
      background: 'linear-gradient(180deg, hsl(230, 20%, 12%) 0%, hsl(230, 20%, 11%) 100%)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
    },
    2: {
      background: 'linear-gradient(180deg, hsl(230, 25%, 20%) 0%, hsl(230, 25%, 18%) 100%)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    },
    3: {
      background: 'linear-gradient(180deg, hsl(230, 25%, 22%) 0%, hsl(230, 25%, 20%) 100%)',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.20), 0 0 24px rgba(110, 231, 243, 0.1)',
    },
    4: {
      background: 'linear-gradient(180deg, hsl(230, 25%, 24%) 0%, hsl(230, 25%, 22%) 100%)',
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.25), 0 0 32px rgba(110, 231, 243, 0.15)',
    },
    5: {
      background: 'linear-gradient(180deg, hsl(230, 25%, 26%) 0%, hsl(230, 25%, 24%) 100%)',
      boxShadow: '0 16px 32px rgba(0, 0, 0, 0.30), 0 0 40px rgba(110, 231, 243, 0.2)',
    },
  };

  return (
    <div
      style={{
        ...elevationStyles[elevation],
        border: '1px solid var(--k1-border)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--spacing-lg)',
        transition: 'all var(--duration-normal) var(--ease-out)',
      }}
    >
      {children}
    </div>
  );
}
```

---

## Color Refinements

### Text Hierarchy with Brightness

```css
:root {
  /* Primary text - 85% brightness */
  --k1-text: #E6E9EF;
  
  /* Secondary text - 70% brightness */
  --k1-text-secondary: #B5BDCA;
  
  /* Tertiary text - 48% brightness */
  --k1-text-disabled: #7A8194;
  
  /* Inverse text - for light backgrounds */
  --k1-text-inverse: #0F1115;
}
```

### Accent Color Brightness Scale

```css
:root {
  /* Base - 100% brightness */
  --k1-accent: #6EE7F3;
  
  /* Hover - 90% brightness, more saturated */
  --k1-accent-hover: #5BC9D1;
  
  /* Pressed - 70% brightness, high contrast */
  --k1-accent-pressed: #4AAAB0;
  
  /* Disabled - 30% opacity */
  --k1-accent-disabled: rgba(110, 231, 243, 0.3);
  
  /* Subtle background - 5% opacity */
  --k1-accent-bg: rgba(110, 231, 243, 0.05);
  
  /* Border - 30% opacity */
  --k1-accent-border: rgba(110, 231, 243, 0.3);
}
```

### Surface Color Tints

**Purpose:** Add subtle color variation to surfaces

```css
:root {
  /* Background - neutral cool blue */
  --k1-bg: #0F1115;
  
  /* Surface - slight purple tint */
  --k1-surface: #1A1F2B;
  
  /* Surface raised - slightly warmer */
  --k1-surface-raised: #242C40;
  
  /* Surface sunken - slightly cooler */
  --k1-surface-sunken: #151923;
}
```

**Color Breakdown:**
- **Background:** Pure dark (slight blue undertone)
- **Surface:** Cool blue-purple tint
- **Surface Raised:** Warmer purple-blue tint
- **Surface Sunken:** Cooler blue tint

---

## Glass-Morphism Effects

### Frosted Glass Panel

**Use Case:** Overlay panels, floating navigation, modals

```css
.k1-glass-panel {
  background: rgba(26, 31, 43, 0.8); /* 80% opacity surface */
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 1px solid rgba(110, 231, 243, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border-radius: var(--radius-lg);
}
```

**Browser Support:** 
- ✅ Safari (full support)
- ✅ Chrome/Edge (full support)
- ⚠️ Firefox (partial support, enable flag)

### Glass Card

```tsx
function K1GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(26, 31, 43, 0.8)',
        backdropFilter: 'blur(10px) saturate(180%)',
        WebkitBackdropFilter: 'blur(10px) saturate(180%)',
        border: '1px solid rgba(110, 231, 243, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--spacing-lg)',
      }}
    >
      {children}
    </div>
  );
}
```

### Glass Navigation Bar

```css
.k1-glass-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(26, 31, 43, 0.85);
  backdrop-filter: blur(10px) saturate(180%);
  border-bottom: 1px solid rgba(110, 231, 243, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}
```

### Fallback for Non-Supporting Browsers

```css
.k1-glass-panel {
  background: rgba(26, 31, 43, 0.8);
  backdrop-filter: blur(10px) saturate(180%);
  
  /* Fallback for browsers without backdrop-filter */
  @supports not (backdrop-filter: blur(10px)) {
    background: rgba(26, 31, 43, 0.95); /* More opaque */
  }
}
```

---

## Subtle Details

### Border Refinements

#### Subtle Inner Glow

```css
.k1-card-glow {
  border: 1px solid var(--k1-border);
  box-shadow: inset 0 0 20px rgba(110, 231, 243, 0.02);
}
```

**Use Case:** Add subtle glow inside cards

#### Accent Border on Hover

```css
.k1-card-interactive {
  border: 1px solid var(--k1-border);
  transition: border-color 120ms ease-out, box-shadow 120ms ease-out;
}

.k1-card-interactive:hover {
  border-color: rgba(110, 231, 243, 0.5);
  box-shadow: 
    var(--elevation-2),
    0 0 20px rgba(110, 231, 243, 0.15);
}
```

### Text Shadows for Depth

#### Subtle Text Shadow (Headers)

```css
.k1-header-text {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
```

**Use Case:** Hero titles, large headings

#### Glow Text (Accent)

```css
.k1-accent-text-glow {
  color: var(--k1-accent);
  text-shadow: 0 0 20px rgba(110, 231, 243, 0.5);
}
```

**Use Case:** Highlighted numbers, status text

### Subtle Animations

#### Breathing Glow

```css
@keyframes breathingGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(110, 231, 243, 0.1);
  }
  50% {
    box-shadow: 0 0 30px rgba(110, 231, 243, 0.2);
  }
}

.k1-breathing-glow {
  animation: breathingGlow 3000ms ease-in-out infinite;
}
```

**Use Case:** Live indicators, active connections, recording status

#### Shimmer Effect

```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.k1-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(110, 231, 243, 0.1) 50%,
    transparent 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2000ms linear infinite;
}
```

**Use Case:** Loading states, skeleton screens

### Noise Texture Overlay

**Purpose:** Add grain to reduce color banding

```css
.k1-noise-overlay {
  position: relative;
}

.k1-noise-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('data:image/svg+xml;base64,...'); /* SVG noise pattern */
  opacity: 0.02;
  mix-blend-mode: overlay;
  pointer-events: none;
}
```

**SVG Noise Pattern:**

```svg
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
  </filter>
  <rect width="100%" height="100%" filter="url(#noise)" opacity="0.05"/>
</svg>
```

---

## Complete Example

### Polished Card Component

```tsx
function K1PolishedCard({ children, interactive = false }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, hsl(230, 25%, 20%) 0%, hsl(230, 25%, 18%) 100%)',
        border: isHovered && interactive
          ? '1px solid rgba(110, 231, 243, 0.5)'
          : '1px solid var(--k1-border)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--spacing-lg)',
        boxShadow: isHovered && interactive
          ? '0 8px 16px rgba(0, 0, 0, 0.20), 0 0 24px rgba(110, 231, 243, 0.15)'
          : '0 4px 8px rgba(0, 0, 0, 0.15)',
        transition: 'all var(--duration-fast) var(--ease-out)',
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      {/* Accent gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle at top right, rgba(110, 231, 243, 0.05) 0%, transparent 70%)',
          opacity: isHovered && interactive ? 1 : 0.5,
          transition: 'opacity var(--duration-fast) var(--ease-out)',
          pointerEvents: 'none',
        }}
      />
      
      {/* Noise texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(...)', // SVG noise
          opacity: 0.02,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
```

---

**Last Updated:** October 27, 2025  
**Version:** 2.0.0  
**Status:** Production Ready ✅
