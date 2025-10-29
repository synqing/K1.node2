---
title: K1 Interaction Specification
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# K1 Interaction Specification

**Complete micro-interaction and state flow definitions**  
**Platform Support:** Web + iOS  

---

## Table of Contents

1. [Micro-Interactions](#micro-interactions)
2. [State Flow Diagrams](#state-flow-diagrams)
3. [Animation Specifications](#animation-specifications)
4. [Gesture Patterns](#gesture-patterns)
5. [Feedback Systems](#feedback-systems)

---

## Micro-Interactions

### Ripple Effect (Material Design Touch Feedback)

**Trigger:** Click/tap on interactive element  
**Platform:** Web primary, iOS optional  
**Purpose:** Visual confirmation of user interaction

```css
@keyframes ripple {
  from {
    width: 0;
    height: 0;
    opacity: 1;
  }
  to {
    width: 100%;
    height: 100%;
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

#### Implementation
```tsx
function useRipple() {
  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
    circle.classList.add('k1-ripple');

    button.appendChild(circle);
    setTimeout(() => circle.remove(), 300);
  };

  return createRipple;
}
```

---

### Hover Lift (Card Elevation on Hover)

**Trigger:** Mouse hover on card/clickable element  
**Platform:** Web only (no hover on iOS)  
**Purpose:** Indicate interactivity and draw attention

```css
.k1-hover-lift {
  transition: transform 120ms ease-out, box-shadow 120ms ease-out;
}

.k1-hover-lift:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: var(--elevation-3);
}
```

#### Specifications

| Property | Default | Hover | Transition |
|----------|---------|-------|------------|
| **Transform** | none | `translateY(-2px) scale(1.02)` | 120ms ease-out |
| **Shadow** | `elevation-1` | `elevation-3` | 120ms ease-out |

---

### Focus Ring Glow

**Trigger:** Keyboard focus on interactive element  
**Platform:** Web + iOS  
**Purpose:** Accessibility - indicate keyboard focus

```css
.k1-focus-glow:focus-visible {
  outline: 2px solid var(--k1-accent);
  outline-offset: 2px;
  box-shadow: var(--glow-accent);
  animation: focusGlow 180ms ease-out;
}

@keyframes focusGlow {
  from {
    outline-color: transparent;
    box-shadow: 0 0 0 rgba(110, 231, 243, 0);
  }
  to {
    outline-color: var(--k1-accent);
    box-shadow: var(--glow-accent);
  }
}
```

#### Accessibility Notes
- Always use `:focus-visible` not `:focus` to avoid showing ring on mouse clicks
- Never use `outline: none` without alternative focus indicator
- Ring must have minimum 2px width and 4.5:1 contrast ratio

---

### Button Press Feedback

**Trigger:** Click/tap on button  
**Platform:** Web + iOS  
**Purpose:** Tactile feedback confirming interaction

```css
.k1-button-press {
  transition: transform 100ms ease-out;
}

.k1-button-press:active {
  transform: scale(0.98);
}
```

#### iOS Haptic Feedback
```swift
// SwiftUI implementation
.simultaneousGesture(
    DragGesture(minimumDistance: 0)
        .onChanged { _ in
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        }
)
```

---

### Loading Spinner Animation

**Trigger:** Async operation in progress  
**Platform:** Web + iOS  
**Purpose:** Indicate system is working

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

#### Reduced Motion Alternative
```css
@media (prefers-reduced-motion: reduce) {
  .k1-spinner {
    animation: pulse 1000ms ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
}
```

---

### Success Checkmark Animation

**Trigger:** Successful form submission or action completion  
**Platform:** Web + iOS  
**Purpose:** Positive feedback confirmation

```css
@keyframes checkmarkScale {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes checkmarkDraw {
  0% { stroke-dashoffset: 50; }
  100% { stroke-dashoffset: 0; }
}

.k1-checkmark {
  animation: checkmarkScale 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.k1-checkmark-path {
  stroke-dasharray: 50;
  animation: checkmarkDraw 300ms ease-out 100ms forwards;
}
```

#### Implementation
```tsx
function SuccessCheckmark() {
  return (
    <svg className="k1-checkmark" width="24" height="24" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="var(--k1-success)"
        opacity="0.1"
      />
      <path
        className="k1-checkmark-path"
        d="M7 12l3 3 7-7"
        stroke="var(--k1-success)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

---

### Skeleton Pulse Loading

**Trigger:** Initial page/content load  
**Platform:** Web + iOS  
**Purpose:** Indicate content is loading without blocking UI

```css
@keyframes skeletonPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.k1-skeleton {
  background: var(--k1-surface-raised);
  border-radius: var(--radius-md);
  animation: skeletonPulse 1500ms ease-in-out infinite;
}
```

#### Usage
```tsx
function SkeletonCard() {
  return (
    <div className="k1-card">
      <div className="k1-skeleton" style={{ height: '20px', width: '60%', marginBottom: '12px' }} />
      <div className="k1-skeleton" style={{ height: '16px', width: '100%', marginBottom: '8px' }} />
      <div className="k1-skeleton" style={{ height: '16px', width: '80%' }} />
    </div>
  );
}
```

---

## State Flow Diagrams

### Form Submission Flow

```
[Default State]
     ↓ (User clicks submit)
[Validate Client-Side]
     ↓ (Valid)
[Loading State] → Show spinner, disable button
     ↓
[API Request]
     ↓
     ├─ Success → [Success State] → Show checkmark (2s) → Reset/Navigate
     └─ Error → [Error State] → Show error message → Return to default
```

#### Implementation Details

**1. Default State**
- Button enabled, normal appearance
- Form fields active and editable

**2. Loading State**
```tsx
<button disabled className="loading">
  <span style={{ opacity: 0 }}>Submit</span>
  <LoadingSpinner className="absolute inset-0 m-auto" />
</button>
```

**3. Success State**
```tsx
<button className="success">
  <SuccessCheckmark />
  <span>Submitted!</span>
</button>

// After 2000ms
setTimeout(() => {
  // Reset form or navigate away
}, 2000);
```

**4. Error State**
```tsx
<div className="form-error" role="alert" aria-live="polite">
  <AlertCircle color="var(--k1-error)" />
  <span>{errorMessage}</span>
</div>
```

---

### Loading State Flow

```
[Initial Empty State]
     ↓
[Show Skeleton Screens]
     ↓ (API request)
[Data Loaded]
     ↓
[Fade Out Skeleton] (200ms)
     ↓
[Fade In Content] (200ms)
     ↓
[Content Fully Visible]
```

#### Cross-Fade Implementation
```css
.k1-content-enter {
  opacity: 0;
}

.k1-content-enter-active {
  opacity: 1;
  transition: opacity 200ms ease-out;
}

.k1-skeleton-exit {
  opacity: 1;
}

.k1-skeleton-exit-active {
  opacity: 0;
  transition: opacity 200ms ease-out;
}
```

---

### Error Recovery Flow

```
[Error Occurs]
     ↓
[Show Error Toast/Alert] → Auto-dismiss after 5s
     ↓
[User Actions Available]
     ├─ Dismiss → Hide error
     ├─ Retry → Return to Loading State
     └─ Ignore → Error remains visible
```

#### Error Toast Behavior
- **Entrance:** Slide in from top-right (300ms)
- **Display:** Remain visible for 5000ms
- **Exit:** Slide out to right (200ms) OR fade out on manual dismiss

```tsx
function ErrorToast({ message, onRetry, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="k1-toast error" role="alert">
      <AlertCircle color="var(--k1-error)" />
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
      <button onClick={onDismiss}>×</button>
    </div>
  );
}
```

---

### Modal/Dialog Interaction Flow

```
[Trigger Opens Modal]
     ↓
[Backdrop Fades In] (300ms)
     ↓
[Modal Scales In] (300ms)
     ↓
[Focus Trapped Inside Modal]
     ↓
[User Interacts]
     ↓
[User Closes Modal]
     ↓
[Modal Scales Out] (200ms)
     ↓
[Backdrop Fades Out] (200ms)
     ↓
[Focus Restored to Trigger]
```

#### Focus Trap Implementation
```tsx
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea'
    );

    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // ... render modal
}
```

---

## Animation Specifications

### Duration Standards

| Animation Type | Duration | Easing | Use Case |
|---------------|----------|--------|----------|
| **Micro** | 100ms | ease-out | Button press, toggle switch |
| **Fast** | 120ms | ease-out | Hover states, color changes |
| **Normal** | 180ms | ease-out | Focus rings, scale changes |
| **Slow** | 300ms | ease-out | Modal entrance, page transitions |
| **Success** | 400ms | bounce | Success checkmark scale |
| **Continuous** | 1000ms+ | linear/ease-in-out | Loading spinners, pulse |

### Easing Function Reference

```css
/* Available easing functions */
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0.0, 1.0, 1.0);
--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1.0);
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1.0);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1.0);
```

#### When to Use Each

- **Linear:** Continuous animations (spinners, progress bars)
- **Ease-in:** Exit animations (modal closing, toast dismissing)
- **Ease-out:** Entrance animations (modal opening, hover states)
- **Ease-in-out:** Bi-directional animations (tabs switching)
- **Bounce:** Celebratory animations (success checkmark)

---

### Transform Specifications

| Interaction | Transform | Duration | Easing |
|------------|-----------|----------|--------|
| **Hover Lift** | `translateY(-2px) scale(1.02)` | 120ms | ease-out |
| **Button Press** | `scale(0.98)` | 100ms | ease-out |
| **Card Select** | `scale(1.05)` | 120ms | ease-out |
| **Modal Enter** | `scale(0.3→1.0)` | 300ms | ease-out |
| **Modal Exit** | `scale(1.0→0.95)` | 200ms | ease-in |

---

### Opacity Specifications

| Interaction | Opacity | Duration | Easing |
|------------|---------|----------|--------|
| **Fade In** | `0→1` | 300ms | ease-out |
| **Fade Out** | `1→0` | 200ms | ease-in |
| **Hover Dim** | `1→0.8` | 120ms | ease-out |
| **Disabled** | `1→0.6` | 0ms | - |
| **Skeleton Pulse** | `0.5↔1` | 1500ms | ease-in-out |

---

## Gesture Patterns

### Web Gestures

#### Click/Tap
```tsx
onClick={(e) => {
  // Standard click behavior
  handleClick(e);
}}
```

#### Double Click
```tsx
onDoubleClick={(e) => {
  // Used for: Zoom, full screen, quick actions
  handleDoubleClick(e);
}}
```

#### Right Click (Context Menu)
```tsx
onContextMenu={(e) => {
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY);
}}
```

#### Drag and Drop
```tsx
onDragStart={(e) => {
  e.dataTransfer.setData('text/plain', dragData);
}}

onDrop={(e) => {
  e.preventDefault();
  const data = e.dataTransfer.getData('text/plain');
  handleDrop(data);
}}
```

---

### iOS Gestures (SwiftUI)

#### Tap
```swift
.onTapGesture {
    // Standard tap action
    handleTap()
}
```

#### Long Press
```swift
.onLongPressGesture(minimumDuration: 0.5) {
    // Show context menu or detail view
    showContextMenu()
}
```

#### Swipe
```swift
.gesture(
    DragGesture()
        .onEnded { value in
            if value.translation.width < -50 {
                // Swipe left
                swipeLeft()
            } else if value.translation.width > 50 {
                // Swipe right
                swipeRight()
            }
        }
)
```

#### Pinch to Zoom
```swift
.gesture(
    MagnificationGesture()
        .onChanged { value in
            currentZoom = value
        }
        .onEnded { value in
            finalZoom = currentZoom
        }
)
```

---

## Feedback Systems

### Visual Feedback

| Action | Visual Response | Duration |
|--------|----------------|----------|
| **Button Click** | Scale to 0.98 | 100ms |
| **Input Focus** | Border color change + glow | 180ms |
| **Form Submit** | Spinner appears | Immediate |
| **Success** | Checkmark animation | 400ms |
| **Error** | Shake + red border | 300ms |
| **Loading** | Skeleton pulse | Continuous |

---

### Haptic Feedback (iOS)

| Action | Haptic Type | Intensity |
|--------|-------------|-----------|
| **Button Tap** | Impact | Light |
| **Toggle Switch** | Selection | - |
| **Success** | Notification | Success |
| **Error** | Notification | Error |
| **Warning** | Notification | Warning |
| **Slider Drag** | Selection | - |
| **Delete Action** | Impact | Heavy |

#### Implementation
```swift
// Impact Feedback
let generator = UIImpactFeedbackGenerator(style: .light)
generator.impactOccurred()

// Selection Feedback
let generator = UISelectionFeedbackGenerator()
generator.selectionChanged()

// Notification Feedback
let generator = UINotificationFeedbackGenerator()
generator.notificationOccurred(.success)
```

---

### Audio Feedback

Generally avoided in modern UI design, but when used:

| Action | Sound | Volume |
|--------|-------|--------|
| **Success** | Subtle chime | Low (20%) |
| **Error** | Alert tone | Low (20%) |
| **Message Received** | Notification pop | Low (20%) |

**Best Practice:** Always provide visual alternative. Never rely solely on audio.

---

### Screen Reader Announcements

| Action | Announcement | Priority |
|--------|--------------|----------|
| **Form Submit** | "Submitting form..." | Polite |
| **Success** | "Form submitted successfully" | Polite |
| **Error** | "Error: [message]" | Assertive |
| **Loading** | "Loading content..." | Polite |
| **Page Change** | "Navigated to [page]" | Polite |

#### Implementation
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

<div role="alert" aria-live="assertive" aria-atomic="true">
  {errorMessage}
</div>
```

---

## Platform-Specific Patterns

### Web-Only Interactions

- **Hover states** on all interactive elements
- **Tooltips** appearing on hover
- **Right-click context menus**
- **Drag and drop** for file uploads and reordering
- **Keyboard shortcuts** (Ctrl+S, Ctrl+C, etc.)

### iOS-Only Interactions

- **Pull to refresh** on scrollable lists
- **Swipe actions** on list items (delete, archive)
- **Bottom sheet** modals instead of centered dialogs
- **3D Touch** (for supported devices)
- **Haptic feedback** on all interactions
- **Safe area** inset handling

---

## Performance Considerations

### Animation Performance

✅ **Good for Performance:**
- `transform` (translate, scale, rotate)
- `opacity`
- CSS animations with GPU acceleration

❌ **Bad for Performance:**
- `width`, `height` (causes layout recalculation)
- `margin`, `padding` (causes layout recalculation)
- `top`, `left`, `right`, `bottom` without `position: absolute`

### Best Practices

```css
/* Good: Uses transform */
.animated {
  transform: translateX(100px);
  transition: transform 300ms ease-out;
}

/* Bad: Animates left */
.animated-bad {
  left: 100px;
  transition: left 300ms ease-out;
}

/* Enable GPU acceleration */
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}
```

---

**Last Updated:** October 27, 2025  
**Version:** 2.0.0  
**Status:** Production Ready ✅
