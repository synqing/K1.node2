---
title: K1 Animation Choreography System
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# K1 Animation Choreography System

**Complete animation timing, sequencing, and orchestration guide**  
**Quality Target:** 99/100  
**60fps Performance**

---

## Table of Contents

1. [Animation Principles](#animation-principles)
2. [Page Transitions](#page-transitions)
3. [Component Animations](#component-animations)
4. [Micro-Interactions](#micro-interactions)
5. [Stagger Patterns](#stagger-patterns)
6. [Loading States](#loading-states)
7. [Performance Guidelines](#performance-guidelines)

---

## Animation Principles

### Disney's 12 Principles (Applied to UI)

| Principle | UI Application | K1 Implementation |
|-----------|---------------|-------------------|
| **Squash & Stretch** | Button press feedback | Scale 0.98 on press |
| **Anticipation** | Loading states before action | Spinner before content |
| **Staging** | Focus attention | Fade background, highlight foreground |
| **Straight Ahead & Pose-to-Pose** | Keyframe animations | CSS transitions (pose-to-pose) |
| **Follow Through** | Easing curves | ease-out for natural deceleration |
| **Slow In/Slow Out** | Smooth starts/stops | cubic-bezier easing |
| **Arcs** | Natural movement paths | Curved motion for floating elements |
| **Secondary Action** | Layered animations | Ripple + scale on button press |
| **Timing** | Duration control | 100-300ms for most interactions |
| **Exaggeration** | Emphasis | Scale 1.05 on hover (subtle exaggeration) |
| **Solid Drawing** | GPU acceleration | Use transform, opacity only |
| **Appeal** | Delight users | Bounce easing for success states |

### K1 Animation Values

```json
{
  "durations": {
    "instant": "0ms",
    "micro": "50ms",
    "fast": "100ms",
    "normal": "120ms",
    "comfortable": "180ms",
    "slow": "300ms",
    "slower": "400ms",
    "slowest": "500ms"
  },
  "easing": {
    "linear": "linear",
    "ease-in": "cubic-bezier(0.4, 0.0, 1.0, 1.0)",
    "ease-out": "cubic-bezier(0.0, 0.0, 0.2, 1.0)",
    "ease-in-out": "cubic-bezier(0.4, 0.0, 0.2, 1.0)",
    "bounce": "cubic-bezier(0.34, 1.56, 0.64, 1.0)",
    "sharp": "cubic-bezier(0.4, 0.0, 0.6, 1.0)"
  }
}
```

---

## Page Transitions

### Push Transition (Navigate Forward)

**Use Case:** Navigate to detail page, sub-page, or next step

```css
/* New page entering from right */
@keyframes pushEnter {
  from {
    transform: translateX(100%);
    opacity: 0.8;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Old page exiting to left */
@keyframes pushExit {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-30%);
    opacity: 0.5;
  }
}

.page-push-enter {
  animation: pushEnter 300ms cubic-bezier(0.0, 0.0, 0.2, 1.0);
}

.page-push-exit {
  animation: pushExit 300ms cubic-bezier(0.0, 0.0, 0.2, 1.0);
}
```

**Specifications:**
- **Duration:** 300ms
- **Easing:** ease-out
- **New page:** Slides in from right (100% → 0), opacity 0.8 → 1
- **Old page:** Slides out to left (0 → -30%), opacity 1 → 0.5
- **Simultaneous:** Both animations run at the same time

### Pop Transition (Navigate Back)

**Use Case:** Go back to previous page

```css
/* Current page exiting to right */
@keyframes popExit {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0.8;
  }
}

/* Previous page entering from left */
@keyframes popEnter {
  from {
    transform: translateX(-30%);
    opacity: 0.5;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.page-pop-exit {
  animation: popExit 300ms cubic-bezier(0.0, 0.0, 0.2, 1.0);
}

.page-pop-enter {
  animation: popEnter 300ms cubic-bezier(0.0, 0.0, 0.2, 1.0);
}
```

### Fade Transition (Tab Switch)

**Use Case:** Switch between tabs or replace current view

```css
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.page-fade-exit {
  animation: fadeOut 200ms cubic-bezier(0.4, 0.0, 0.2, 1.0);
}

.page-fade-enter {
  animation: fadeIn 200ms cubic-bezier(0.4, 0.0, 0.2, 1.0);
  animation-delay: 100ms; /* Start fade in halfway through fade out */
}
```

**Specifications:**
- **Duration:** 200ms total (100ms overlap)
- **Easing:** ease-in-out
- **Old page:** Fade out 0 → 100ms
- **New page:** Fade in 100ms → 200ms
- **Overlap:** 100ms crossfade

---

## Component Animations

### Card Entrance

**Use Case:** Card appears when loaded or revealed

```css
@keyframes cardEnter {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.k1-card-enter {
  animation: cardEnter 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**Specifications:**
- **Duration:** 250ms
- **Easing:** bounce (slight overshoot)
- **Transform:** Scale 0.95 → 1.0
- **Opacity:** 0 → 1
- **Origin:** center

### Modal/Sheet Entrance

**Use Case:** Modal or sheet appears

```css
/* Backdrop */
@keyframes backdropFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Modal (centered) */
@keyframes modalEnter {
  from {
    transform: scale(0.3);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Sheet (bottom) */
@keyframes sheetSlideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.k1-backdrop-enter {
  animation: backdropFadeIn 300ms ease-out;
}

.k1-modal-enter {
  animation: modalEnter 300ms cubic-bezier(0.0, 0.0, 0.2, 1.0);
}

.k1-sheet-enter {
  animation: sheetSlideUp 300ms cubic-bezier(0.0, 0.0, 0.2, 1.0);
}
```

### Dropdown Expand

**Use Case:** Dropdown menu opens

```css
@keyframes dropdownExpand {
  from {
    transform: scaleY(0.8);
    opacity: 0;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

.k1-dropdown-enter {
  animation: dropdownExpand 150ms cubic-bezier(0.0, 0.0, 0.2, 1.0);
  transform-origin: top;
}
```

**Specifications:**
- **Duration:** 150ms
- **Easing:** ease-out
- **Transform:** ScaleY 0.8 → 1.0
- **Opacity:** 0 → 1
- **Origin:** top

### Drawer Slide

**Use Case:** Sidebar or drawer opens

```css
@keyframes drawerSlideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

.k1-drawer-enter {
  animation: drawerSlideIn 300ms cubic-bezier(0.0, 0.0, 0.2, 1.0);
}
```

---

## Micro-Interactions

### Button Press Choreography

**Complete sequence from press to release**

```json
{
  "button-press-sequence": {
    "step-1-press-down": {
      "trigger": "mousedown or touchstart",
      "duration": "50ms",
      "easing": "ease-out",
      "actions": [
        "transform: scale(1.0 → 0.98)",
        "box-shadow: elevation-2 → elevation-1"
      ]
    },
    "step-2-press-hold": {
      "duration": "variable (while pressed)",
      "actions": [
        "ripple effect expands (300ms total)",
        "haptic feedback (iOS: selection)"
      ]
    },
    "step-3-release": {
      "trigger": "mouseup or touchend",
      "duration": "100ms",
      "easing": "ease-out",
      "actions": [
        "transform: scale(0.98 → 1.0)",
        "box-shadow: elevation-1 → elevation-2"
      ]
    },
    "total-interaction": "150ms + hold time"
  }
}
```

**CSS Implementation:**

```css
.k1-button {
  transition: transform 100ms ease-out, box-shadow 100ms ease-out;
}

.k1-button:active {
  transform: scale(0.98);
  box-shadow: var(--elevation-1);
  transition-duration: 50ms;
}

.k1-button:not(:active) {
  transform: scale(1);
  box-shadow: var(--elevation-2);
  transition-duration: 100ms;
}
```

### Hover and Click Choreography

**Web-specific hover → click sequence**

```json
{
  "hover-click-sequence": {
    "on-hover-enter": {
      "duration": "120ms",
      "easing": "ease-out",
      "actions": [
        "transform: scale(1.0 → 1.02)",
        "box-shadow: elevation-2 → elevation-3",
        "border-color: border → accent (if applicable)"
      ]
    },
    "on-click": {
      "duration": "300ms",
      "actions": [
        "ripple effect from click point",
        "maintain hover state (scale 1.02)"
      ]
    },
    "on-hover-exit": {
      "duration": "120ms",
      "easing": "ease-out",
      "actions": [
        "transform: scale(1.02 → 1.0)",
        "box-shadow: elevation-3 → elevation-2"
      ]
    }
  }
}
```

### Touch Feedback (iOS)

**iOS-specific touch sequence**

```json
{
  "touch-sequence": {
    "on-touch-start": {
      "duration": "100ms",
      "easing": "ease-out",
      "actions": [
        "opacity: 1.0 → 0.7",
        "transform: scale(1.0 → 0.97)",
        "haptic: UIImpactFeedbackGenerator(style: .light)"
      ]
    },
    "on-touch-end": {
      "duration": "100ms",
      "easing": "ease-out",
      "actions": [
        "opacity: 0.7 → 1.0",
        "transform: scale(0.97 → 1.0)"
      ]
    }
  }
}
```

### Ripple Effect

**Material Design ripple on click**

```css
@keyframes ripple {
  from {
    width: 0;
    height: 0;
    opacity: 1;
  }
  to {
    width: var(--ripple-size);
    height: var(--ripple-size);
    opacity: 0;
  }
}

.k1-ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(110, 231, 243, 0.3);
  animation: ripple 300ms ease-out;
  pointer-events: none;
}
```

**JavaScript Implementation:**

```typescript
function createRipple(event: React.MouseEvent<HTMLElement>) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
  circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
  circle.classList.add('k1-ripple');
  circle.style.setProperty('--ripple-size', `${diameter}px`);

  const existingRipple = button.querySelector('.k1-ripple');
  if (existingRipple) existingRipple.remove();

  button.appendChild(circle);
  setTimeout(() => circle.remove(), 300);
}
```

---

## Stagger Patterns

### List Item Stagger

**Use Case:** List items animate in sequentially

```css
@keyframes listItemEnter {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.k1-list-item {
  animation: listItemEnter 300ms cubic-bezier(0.0, 0.0, 0.2, 1.0);
  animation-fill-mode: both;
}

.k1-list-item:nth-child(1) { animation-delay: 0ms; }
.k1-list-item:nth-child(2) { animation-delay: 30ms; }
.k1-list-item:nth-child(3) { animation-delay: 60ms; }
.k1-list-item:nth-child(4) { animation-delay: 90ms; }
.k1-list-item:nth-child(5) { animation-delay: 120ms; }
/* Continue up to 15 items, max 450ms total */
```

**Specifications:**
- **Duration:** 300ms per item
- **Stagger Delay:** 30ms between items
- **Max Items:** 15 (450ms total stagger)
- **Easing:** ease-out
- **Transform:** translateY(20px) → 0
- **Opacity:** 0 → 1

**React Implementation:**

```tsx
function StaggeredList({ items }: { items: Item[] }) {
  return (
    <div>
      {items.slice(0, 15).map((item, index) => (
        <div
          key={item.id}
          className="k1-list-item"
          style={{
            animationDelay: `${index * 30}ms`,
          }}
        >
          {item.content}
        </div>
      ))}
      {/* Items beyond 15 appear instantly */}
      {items.slice(15).map((item) => (
        <div key={item.id}>{item.content}</div>
      ))}
    </div>
  );
}
```

### Grid Item Stagger

**Use Case:** Grid items animate in with stagger

```css
@keyframes gridItemEnter {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.k1-grid-item {
  animation: gridItemEnter 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
  animation-fill-mode: both;
}

/* Stagger based on grid position */
.k1-grid-item:nth-child(1) { animation-delay: 0ms; }
.k1-grid-item:nth-child(2) { animation-delay: 40ms; }
.k1-grid-item:nth-child(3) { animation-delay: 80ms; }
.k1-grid-item:nth-child(4) { animation-delay: 120ms; }
.k1-grid-item:nth-child(5) { animation-delay: 160ms; }
.k1-grid-item:nth-child(6) { animation-delay: 200ms; }
/* Max 12 items, 480ms total */
```

---

## Loading States

### Skeleton Pulse

**Use Case:** Placeholder while content loads

```css
@keyframes skeletonPulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.k1-skeleton {
  background: var(--k1-surface-raised);
  border-radius: var(--radius-md);
  animation: skeletonPulse 1500ms ease-in-out infinite;
}
```

**Specifications:**
- **Duration:** 1500ms (infinite loop)
- **Easing:** ease-in-out
- **Opacity:** 0.5 ↔ 1.0

### Skeleton to Content Transition

**Use Case:** Replace skeleton with actual content

```json
{
  "skeleton-transition-sequence": {
    "step-1-skeleton-pulse": {
      "state": "Loading",
      "animation": "Pulse 1500ms infinite"
    },
    "step-2-skeleton-exit": {
      "trigger": "Data loaded",
      "duration": "200ms",
      "animation": "opacity 1 → 0"
    },
    "step-3-content-enter": {
      "trigger": "After skeleton exits",
      "duration": "200ms",
      "animation": "opacity 0 → 1, translateY(8px → 0)"
    },
    "total-transition": "400ms (200ms overlap possible)"
  }
}
```

**React Implementation:**

```tsx
function ContentWithSkeleton({ isLoading, content }: Props) {
  return (
    <>
      {isLoading && (
        <div className="k1-skeleton animate-pulse" style={{ height: '100px' }} />
      )}
      {!isLoading && (
        <div
          className="animate-fadeInUp"
          style={{
            animation: 'fadeInUp 200ms ease-out',
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}

/* CSS */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Spinner Animation

**Use Case:** Indeterminate loading indicator

```css
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.k1-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(110, 231, 243, 0.2);
  border-top-color: var(--k1-accent);
  border-radius: 50%;
  animation: spin 1000ms linear infinite;
}
```

**With Pulse (Optional):**

```css
@keyframes spinPulse {
  0%, 100% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.05);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}

.k1-spinner-pulse {
  animation: spinPulse 2000ms ease-in-out infinite;
}
```

### Progress Bar

**Use Case:** Determinate loading indicator

```css
@keyframes progressFill {
  from {
    width: 0%;
  }
  to {
    width: var(--progress-value);
  }
}

.k1-progress-bar {
  width: 100%;
  height: 4px;
  background: var(--k1-surface-raised);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.k1-progress-fill {
  height: 100%;
  background: var(--k1-accent);
  animation: progressFill 300ms ease-out;
  transition: width 300ms ease-out;
}
```

---

## Performance Guidelines

### GPU-Accelerated Properties

**✅ Use These (60fps):**
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (blur, brightness, etc.)

**❌ Avoid These (causes reflow/repaint):**
- `width`, `height`
- `margin`, `padding`
- `top`, `left`, `right`, `bottom` (without position: absolute)
- `border-width`

### Force GPU Acceleration

```css
.k1-animated {
  transform: translateZ(0); /* Force GPU layer */
  will-change: transform; /* Hint browser to optimize */
}
```

**⚠️ Warning:** Don't overuse `will-change`. Only use on elements that will actually animate.

### Reduced Motion

**Respect user preference:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Loading spinners still allowed */
  .k1-spinner {
    animation-duration: 1000ms !important;
  }
}
```

### Animation Budget

**Target:** 60fps (16.67ms per frame)

| Animation Type | Max Concurrent | Budget Per Item |
|----------------|----------------|-----------------|
| **Page transition** | 1 | Full budget (16ms) |
| **Component entrance** | 5-10 | 3-5ms each |
| **Micro-interaction** | 1-2 | 8ms each |
| **Loading spinner** | 1-3 | 2ms each |

**Rule:** Never animate more than 10 elements simultaneously.

### Performance Testing

```typescript
// Measure animation performance
function measureAnimation(element: HTMLElement, callback: () => void) {
  const startTime = performance.now();
  
  callback();
  
  requestAnimationFrame(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Animation took ${duration.toFixed(2)}ms`);
    
    if (duration > 16.67) {
      console.warn('Animation dropped frames!');
    }
  });
}
```

---

## Animation Timing Reference

### Quick Reference Table

| Interaction | Duration | Easing | Use Case |
|------------|----------|--------|----------|
| **Button press** | 50-100ms | ease-out | Immediate feedback |
| **Hover** | 120ms | ease-out | Smooth hover effects |
| **Focus** | 180ms | ease-out | Focus ring appearance |
| **Page transition** | 300ms | ease-out | Navigate between pages |
| **Modal open** | 300ms | ease-out | Modal appears |
| **Modal close** | 200ms | ease-in | Modal disappears |
| **Sheet slide** | 300ms | spring | iOS bottom sheet |
| **Dropdown** | 150ms | ease-out | Dropdown menu |
| **Toast enter** | 300ms | ease-out | Notification appears |
| **Toast exit** | 200ms | ease-in | Notification dismisses |
| **Card entrance** | 250ms | bounce | Card appears with bounce |
| **List stagger** | 300ms + 30ms/item | ease-out | Staggered list items |
| **Skeleton pulse** | 1500ms | ease-in-out | Loading placeholder |
| **Spinner** | 1000ms | linear | Continuous loading |

---

**Last Updated:** October 27, 2025  
**Version:** 2.0.0  
**Status:** Production Ready ✅  
**Target:** 60fps Performance
