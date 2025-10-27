# K1 Component State Matrix

**Complete state specifications for all interactive components**  
**Platform Support:** Web + iOS  
**Quality Target:** 99/100

---

## Table of Contents

1. [Button Components](#button-components)
2. [Form Input Components](#form-input-components)
3. [Navigation & Selection](#navigation--selection)
4. [Dialog & Modal Components](#dialog--modal-components)
5. [Toggle & Switch Components](#toggle--switch-components)
6. [Card & Grid Components](#card--grid-components)
7. [State Transition Timing](#state-transition-timing)

---

## Button Components

### Primary Button

Complete state matrix for primary action buttons:

| State | Background | Text Color | Border | Shadow | Scale | Cursor | Transition |
|-------|-----------|------------|--------|--------|-------|--------|------------|
| **Default** | `var(--k1-accent)` | `var(--k1-text-inverse)` | none | `elevation-2` | 1.0 | pointer | - |
| **Hover** (Web) | `var(--k1-accent-hover)` | `var(--k1-text-inverse)` | none | `elevation-3` | 1.02 | pointer | 120ms ease-out |
| **Focus** | `var(--k1-accent)` | `var(--k1-text-inverse)` | none | `glow-accent` | 1.0 | pointer | 180ms ease-out |
| **Active/Pressed** | `var(--k1-accent-pressed)` | `var(--k1-text-inverse)` | none | `elevation-1` | 0.98 | pointer | 100ms ease-out |
| **Disabled** | `rgba(110, 231, 243, 0.3)` | `rgba(230, 233, 239, 0.5)` | none | none | 1.0 | not-allowed | - |
| **Error** | `var(--k1-error)` | `var(--k1-text-inverse)` | none | `glow-error` | 1.0 | pointer | - |
| **Loading** | `var(--k1-accent)` | transparent | none | `elevation-2` | 1.0 | wait | - |

#### Focus State Details
```css
.k1-button-primary:focus-visible {
  outline: 2px solid var(--k1-accent);
  outline-offset: 2px;
  box-shadow: var(--glow-accent);
}
```

#### Loading State Details
```tsx
// Loading state shows spinner overlay
<button className="k1-button-primary loading">
  <span className="button-text" style={{ opacity: 0 }}>Submit</span>
  <span className="spinner-overlay">
    <LoadingSpinner size="sm" />
  </span>
</button>
```

#### iOS Adaptations
- **No Hover State:** iOS doesn't support hover (no mouse)
- **Touch Feedback:** Use active state with scale 0.97 and opacity 0.8
- **Minimum Size:** 44px × 44px (HIG requirement)
- **Haptic Feedback:** Impact feedback on button press

---

### Secondary Button

| State | Background | Text Color | Border | Shadow | Scale | Transition |
|-------|-----------|------------|--------|--------|-------|------------|
| **Default** | `var(--k1-surface-raised)` | `var(--k1-text)` | 1px `k1-border` | `elevation-1` | 1.0 | - |
| **Hover** (Web) | `var(--k1-surface-raised)` | `var(--k1-text)` | 1px `k1-accent` | `elevation-2` + `glow-accent` | 1.02 | 120ms ease-out |
| **Focus** | `var(--k1-surface-raised)` | `var(--k1-text)` | 2px `k1-accent` | `glow-accent` | 1.0 | 180ms ease-out |
| **Active/Pressed** | `var(--k1-surface)` | `var(--k1-accent)` | 2px `k1-accent` | inset `elevation-1` | 0.98 | 100ms ease-out |
| **Disabled** | `var(--k1-surface-raised)` | `var(--k1-text-disabled)` | 1px `k1-border` | none | 1.0 | - |

#### Visual Example
```css
/* Default */
.k1-button-secondary {
  background: var(--k1-surface-raised);
  border: 1px solid var(--k1-border);
  color: var(--k1-text);
  box-shadow: var(--elevation-1);
}

/* Hover (Web only) */
.k1-button-secondary:hover {
  border-color: var(--k1-accent);
  box-shadow: var(--elevation-2), var(--glow-accent);
  transform: scale(1.02);
  transition: all 120ms ease-out;
}

/* Active/Pressed */
.k1-button-secondary:active {
  background: var(--k1-surface);
  color: var(--k1-accent);
  border: 2px solid var(--k1-accent);
  transform: scale(0.98);
}
```

---

### Tertiary/Ghost Button

| State | Background | Text Color | Border | Transition |
|-------|-----------|------------|--------|------------|
| **Default** | transparent | `var(--k1-accent)` | none | - |
| **Hover** (Web) | `rgba(110, 231, 243, 0.1)` | `var(--k1-accent)` | none | 120ms ease-out |
| **Focus** | transparent | `var(--k1-accent)` | none | 180ms ease-out |
| **Active/Pressed** | `rgba(110, 231, 243, 0.2)` | `var(--k1-accent-pressed)` | none | 100ms ease-out |
| **Disabled** | transparent | `var(--k1-text-disabled)` | none | - |

#### Focus Ring
```css
.k1-button-tertiary:focus-visible {
  outline: 2px solid var(--k1-accent);
  outline-offset: 2px;
}
```

---

### Icon Button

| State | Background | Icon Color | Border Radius | Shadow |
|-------|-----------|------------|---------------|--------|
| **Default** | transparent | `var(--k1-text-secondary)` | `var(--radius-md)` | none |
| **Hover** (Web) | `rgba(110, 231, 243, 0.1)` | `var(--k1-accent)` | `var(--radius-md)` | none |
| **Focus** | transparent | `var(--k1-accent)` | `var(--radius-md)` | `glow-accent` |
| **Active/Pressed** | `rgba(110, 231, 243, 0.2)` | `var(--k1-accent-pressed)` | `var(--radius-md)` | none |

#### Size Variants
```css
.k1-icon-button-sm { width: 32px; height: 32px; }
.k1-icon-button-md { width: 40px; height: 40px; }
.k1-icon-button-lg { width: 48px; height: 48px; }
```

---

## Form Input Components

### Text Input

| State | Background | Border | Text Color | Placeholder | Shadow |
|-------|-----------|--------|------------|-------------|--------|
| **Default** | `var(--k1-surface-sunken)` | 1px `k1-border` | `var(--k1-text)` | `var(--k1-text-secondary)` | none |
| **Hover** (Web) | `var(--k1-surface-sunken)` | 1px `k1-text-secondary` | `var(--k1-text)` | `var(--k1-text-secondary)` | none |
| **Focus** | `var(--k1-surface-sunken)` | 2px `k1-accent` | `var(--k1-text)` | `var(--k1-text-secondary)` | `glow-accent` |
| **Filled** | `var(--k1-surface-sunken)` | 1px `k1-text-secondary` | `var(--k1-text)` | - | none |
| **Error** | `var(--k1-surface-sunken)` | 2px `k1-error` | `var(--k1-text)` | `var(--k1-text-secondary)` | `glow-error` |
| **Disabled** | `rgba(122, 129, 148, 0.1)` | 1px `k1-border` | `var(--k1-text-disabled)` | `var(--k1-text-disabled)` | none |

#### Implementation
```css
.k1-input {
  background: var(--k1-surface-sunken);
  border: 1px solid var(--k1-border);
  color: var(--k1-text);
  height: 40px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  transition: border 120ms ease-out, box-shadow 120ms ease-out;
}

.k1-input:hover {
  border-color: var(--k1-text-secondary);
}

.k1-input:focus {
  border: 2px solid var(--k1-accent);
  outline: none;
  box-shadow: var(--glow-accent);
}

.k1-input.error {
  border: 2px solid var(--k1-error);
  box-shadow: var(--glow-error);
}

.k1-input:disabled {
  background: rgba(122, 129, 148, 0.1);
  color: var(--k1-text-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}
```

#### Error State with Message
```tsx
<div className="k1-input-wrapper">
  <input 
    className="k1-input error" 
    aria-invalid="true"
    aria-describedby="input-error"
  />
  <span id="input-error" className="k1-input-error">
    This field is required
  </span>
</div>
```

---

### Textarea

Inherits all text input states with these additions:

| Property | Value |
|----------|-------|
| **Min Height** | 80px |
| **Resize** | vertical |
| **Padding** | 12px |
| **Line Height** | 1.5 |

---

### Slider/Range Input

| State | Track BG | Track Fill | Thumb BG | Thumb Size | Shadow |
|-------|---------|-----------|----------|-----------|--------|
| **Default** | `var(--k1-surface-raised)` | `var(--k1-accent)` | `var(--k1-accent)` | 20px | `elevation-2` |
| **Hover** (Web) | `var(--k1-surface-raised)` | `var(--k1-accent)` | `var(--k1-accent-hover)` | 23px (scale 1.15) | `elevation-3` + `glow-accent` |
| **Focus** | `var(--k1-surface-raised)` | `var(--k1-accent)` | `var(--k1-accent)` | 20px | `glow-accent` |
| **Active/Dragging** | `var(--k1-surface-raised)` | `var(--k1-accent-pressed)` | `var(--k1-accent-pressed)` | 25px (scale 1.25) | `elevation-1` |
| **Disabled** | `var(--k1-surface)` | `rgba(110, 231, 243, 0.3)` | `rgba(110, 231, 243, 0.3)` | 20px | none |

#### Implementation
```css
.k1-slider {
  -webkit-appearance: none;
  height: 4px;
  background: var(--k1-surface-raised);
  border-radius: var(--radius-full);
}

.k1-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: var(--k1-accent);
  border-radius: 50%;
  box-shadow: var(--elevation-2);
  cursor: grab;
  transition: all 120ms ease-out;
}

.k1-slider:hover::-webkit-slider-thumb {
  background: var(--k1-accent-hover);
  transform: scale(1.15);
  box-shadow: var(--elevation-3), var(--glow-accent);
}

.k1-slider:active::-webkit-slider-thumb {
  background: var(--k1-accent-pressed);
  transform: scale(1.25);
  cursor: grabbing;
  box-shadow: var(--elevation-1);
}
```

#### iOS Specifics
- **Thumb Size:** 27px (iOS standard)
- **Track Height:** 4px
- **Haptic Feedback:** Selection feedback on drag

---

### Checkbox

| State | Border | Background | Check Color | Shadow |
|-------|--------|-----------|-------------|--------|
| **Unchecked** | 2px `k1-border` | transparent | - | none |
| **Checked** | 2px `k1-accent` | `var(--k1-accent)` | `var(--k1-text-inverse)` | none |
| **Hover** (Web) | 2px `k1-accent` | `rgba(110, 231, 243, 0.1)` | - | none |
| **Focus** | 2px `k1-accent` | transparent/`k1-accent` | `var(--k1-text-inverse)` | `glow-accent` |
| **Disabled** | 2px `k1-border` | `var(--k1-surface)` | `var(--k1-text-disabled)` | none |
| **Indeterminate** | 2px `k1-accent` | `var(--k1-accent)` | `var(--k1-text-inverse)` (dash) | none |

---

### Radio Button

| State | Border | Background | Dot Color | Size |
|-------|--------|-----------|-----------|------|
| **Unselected** | 2px `k1-border` | transparent | - | 20px |
| **Selected** | 2px `k1-accent` | `var(--k1-accent)` | `var(--k1-text-inverse)` (8px dot) | 20px |
| **Hover** (Web) | 2px `k1-accent` | `rgba(110, 231, 243, 0.1)` | - | 20px |
| **Focus** | 2px `k1-accent` | transparent/`k1-accent` | `var(--k1-text-inverse)` | 20px |
| **Disabled** | 2px `k1-border` | `var(--k1-surface)` | `var(--k1-text-disabled)` | 20px |

---

## Navigation & Selection

### Navigation Tab (Horizontal)

| State | Background | Text Color | Border Bottom | Font Weight |
|-------|-----------|------------|---------------|-------------|
| **Default** | transparent | `var(--k1-text-secondary)` | 2px transparent | 400 |
| **Hover** (Web) | `rgba(110, 231, 243, 0.05)` | `var(--k1-text)` | 2px transparent | 400 |
| **Focus** | transparent | `var(--k1-text)` | 2px transparent | 400 |
| **Selected** | transparent | `var(--k1-accent)` | 2px `k1-accent` | 600 |
| **Disabled** | transparent | `var(--k1-text-disabled)` | 2px transparent | 400 |

#### Implementation
```css
.k1-nav-tab {
  padding: 12px 16px;
  background: transparent;
  color: var(--k1-text-secondary);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 120ms ease-out;
}

.k1-nav-tab:hover {
  background: rgba(110, 231, 243, 0.05);
  color: var(--k1-text);
}

.k1-nav-tab.selected {
  color: var(--k1-accent);
  border-bottom-color: var(--k1-accent);
  font-weight: 600;
}

.k1-nav-tab:focus-visible {
  outline: 2px solid var(--k1-accent);
  outline-offset: 2px;
}
```

---

### Dropdown Menu Item

| State | Background | Text Color | Icon Color |
|-------|-----------|------------|------------|
| **Default** | transparent | `var(--k1-text)` | `var(--k1-text-secondary)` |
| **Hover** (Web) | `rgba(110, 231, 243, 0.1)` | `var(--k1-text)` | `var(--k1-accent)` |
| **Focus** | `rgba(110, 231, 243, 0.1)` | `var(--k1-text)` | `var(--k1-accent)` |
| **Active** | `rgba(110, 231, 243, 0.15)` | `var(--k1-accent)` | `var(--k1-accent)` |
| **Disabled** | transparent | `var(--k1-text-disabled)` | `var(--k1-text-disabled)` |

---

## Dialog & Modal Components

### Modal/Dialog

| State | Background | Border | Border Radius | Shadow | Scale | Opacity |
|-------|-----------|--------|---------------|--------|-------|---------|
| **Default** | `var(--k1-surface)` | 1px `k1-border` | `var(--radius-lg)` | `elevation-4` | 1.0 | 1.0 |
| **Entrance** | `var(--k1-surface)` | 1px `k1-border` | `var(--radius-lg)` | `elevation-4` | 0.3→1.0 | 0→1.0 |
| **Exit** | `var(--k1-surface)` | 1px `k1-border` | `var(--radius-lg)` | `elevation-4` | 1.0→0.95 | 1.0→0 |

#### Backdrop
```css
.k1-modal-backdrop {
  background: rgba(0, 0, 0, 0.5);
  animation: fadeIn 300ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

#### Entrance Animation
```css
@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
  to {
    opacity: 1;
    transform: scale(1.0);
  }
}

.k1-modal {
  animation: modalEnter 300ms ease-out;
}
```

#### iOS Sheet Presentation
- **Style:** Bottom sheet (not centered modal)
- **Corner Radius:** 20px (top corners only)
- **Dismissal:** Swipe down gesture
- **Safe Area:** Respects bottom inset

---

### Toast/Notification

| State | Background | Text Color | Icon Color | Border | Position |
|-------|-----------|------------|------------|--------|----------|
| **Info** | `var(--k1-surface-raised)` | `var(--k1-text)` | `var(--k1-info)` | 1px `k1-info-border` | top-right |
| **Success** | `var(--k1-surface-raised)` | `var(--k1-text)` | `var(--k1-success)` | 1px `k1-success-border` | top-right |
| **Warning** | `var(--k1-surface-raised)` | `var(--k1-text)` | `var(--k1-warning)` | 1px `k1-warning-border` | top-right |
| **Error** | `var(--k1-surface-raised)` | `var(--k1-text)` | `var(--k1-error)` | 1px `k1-error-border` | top-right |

#### Entrance/Exit
```css
.k1-toast {
  animation: slideInRight 300ms ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

## Toggle & Switch Components

### Toggle Switch

| State | Background | Thumb BG | Thumb Position | Width | Height |
|-------|-----------|----------|----------------|-------|--------|
| **Off** | `var(--k1-surface-raised)` | `var(--k1-text-secondary)` | left | 44px | 24px |
| **On** | `var(--k1-accent)` | white | right | 44px | 24px |
| **Hover Off** (Web) | `var(--k1-surface-raised)` | `var(--k1-text)` | left | 44px | 24px |
| **Hover On** (Web) | `var(--k1-accent-hover)` | white | right | 44px | 24px |
| **Focus** | outline `k1-accent` 2px | - | - | 44px | 24px |
| **Disabled** | `var(--k1-surface)` | `var(--k1-text-disabled)` | - | 44px | 24px |

#### Animation
```css
.k1-toggle-switch {
  transition: background 100ms ease-out;
}

.k1-toggle-thumb {
  transition: transform 100ms ease-out;
}

/* On state */
.k1-toggle-switch.on .k1-toggle-thumb {
  transform: translateX(20px);
}
```

#### iOS Specifics
- **Height:** 31px (iOS UISwitch standard)
- **Haptic Feedback:** Toggle feedback on state change

---

## Card & Grid Components

### Card

| State | Background | Border | Border Radius | Shadow | Scale |
|-------|-----------|--------|---------------|--------|-------|
| **Default** | `var(--k1-surface)` | 1px `k1-border` | `var(--radius-lg)` | `elevation-1` | 1.0 |
| **Hover** (Web) | `var(--k1-surface-raised)` | 1px `k1-border` | `var(--radius-lg)` | `elevation-2` | 1.0 |
| **Interactive Hover** | `var(--k1-surface-raised)` | 1px `k1-accent` | `var(--radius-lg)` | `elevation-2` + `glow-accent` | 1.02 |
| **Selected** | `var(--k1-surface-raised)` | 2px `k1-accent` | `var(--radius-lg)` | `glow-accent` | 1.0 |
| **Disabled** | `var(--k1-surface)` | 1px `k1-border` | `var(--radius-lg)` | none | 1.0 |

---

### Grid Item / Effect Card

| State | Background | Border | Shadow | Scale | Cursor |
|-------|-----------|--------|--------|-------|--------|
| **Default** | `var(--k1-surface)` | 1px `k1-border` | `elevation-1` | 1.0 | default |
| **Hover** (Web) | `var(--k1-surface-raised)` | 1px `k1-accent` | `elevation-2` + `glow-accent` | 1.05 | pointer |
| **Focus** | `var(--k1-surface)` | 2px `k1-accent` | `glow-accent` | 1.0 | pointer |
| **Selected** | `var(--k1-surface-raised)` | 2px `k1-accent` | `elevation-2` + `glow-accent` | 1.0 | pointer |
| **Disabled** | `var(--k1-surface)` | 1px `k1-border` | none | 1.0 | not-allowed |

#### iOS Touch Feedback
```swift
// SwiftUI implementation
.scaleEffect(isPressed ? 0.98 : 1.0)
.opacity(isPressed ? 0.9 : 1.0)
```

---

## State Transition Timing

### Standard Transitions

| Interaction | Duration | Easing | Property |
|------------|----------|--------|----------|
| **Hover** | 120ms | ease-out | all |
| **Focus** | 180ms | ease-out | outline, box-shadow |
| **Active/Press** | 100ms | ease-out | transform, background |
| **Disabled** | 0ms | - | opacity |
| **Modal Enter** | 300ms | ease-out | opacity, scale |
| **Modal Exit** | 200ms | ease-in | opacity, scale |
| **Toast Enter** | 300ms | ease-out | transform, opacity |
| **Toast Exit** | 200ms | ease-in | transform, opacity |

### Reduced Motion

For users with `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

---

## Component State Priority

When multiple states apply simultaneously:

1. **Disabled** (highest priority - overrides all)
2. **Error** (overrides focus, hover)
3. **Loading** (overrides hover, focus)
4. **Focus** (overrides hover)
5. **Active/Pressed** (overrides hover)
6. **Hover** (lowest priority)

### Example
```tsx
// Button is disabled + has error
// Disabled state takes precedence
<button disabled className="error">
  // Rendered as disabled (error styling hidden)
</button>
```

---

**Last Updated:** October 27, 2025  
**Version:** 2.0.0  
**Status:** Production Ready ✅
