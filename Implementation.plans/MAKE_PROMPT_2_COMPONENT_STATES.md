---
title: Figma Make Agent Prompt 2: Component States & Interactions
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# Figma Make Agent Prompt 2: Component States & Interactions

**Priority**: 🥈 HIGH - Execute Second (depends on Prompt 1 tokens)
**Complexity**: High
**Execution Time**: 2-3 hours
**Input**: Design tokens from Prompt 1
**Output**: Complete component state specifications + interaction matrix + Figma component updates

---

## EXECUTIVE BRIEF

You are defining interaction and state behavior for all components in the K1 Control Dashboard. Each interactive component must have a COMPLETE state matrix: default, hover, focus, active/pressed, disabled, error, loading, and selected states.

**Key Requirement**: States must work identically on web and iOS while respecting platform conventions (iOS has no hover, uses alternative interactions).

---

## PART 1: COMPONENT STATE MATRIX (All Interactive Components)

### 1.1 Button Components

#### Primary Button

```json
{
  "button-primary": {
    "states": {
      "default": {
        "background": "var(--k1-accent)",
        "text": "var(--k1-bg)",
        "border": "none",
        "shadow": "var(--elevation-2)",
        "scale": "1.0",
        "cursor": "pointer"
      },
      "hover": {
        "background": "var(--k1-accent-hover)",
        "text": "var(--k1-bg)",
        "border": "none",
        "shadow": "var(--elevation-3)",
        "scale": "1.02",
        "transition": "all 120ms ease-out",
        "web-only": true
      },
      "focus": {
        "background": "var(--k1-accent)",
        "text": "var(--k1-bg)",
        "outline": "var(--k1-accent) solid 2px",
        "outline-offset": "2px",
        "box-shadow": "var(--glow-accent)",
        "scale": "1.0",
        "transition": "outline 180ms ease-out, box-shadow 180ms ease-out"
      },
      "active-pressed": {
        "background": "var(--k1-accent-pressed)",
        "text": "var(--k1-bg)",
        "shadow": "var(--elevation-1)",
        "scale": "0.98",
        "transition": "all 100ms ease-out"
      },
      "disabled": {
        "background": "rgba(110, 231, 243, 0.3)",
        "text": "rgba(231, 233, 239, 0.5)",
        "shadow": "none",
        "scale": "1.0",
        "cursor": "not-allowed",
        "opacity": "0.6"
      },
      "error": {
        "background": "var(--k1-error)",
        "text": "var(--k1-bg)",
        "shadow": "var(--glow-error)",
        "scale": "1.0"
      },
      "loading": {
        "background": "var(--k1-accent)",
        "text": "transparent",
        "opacity": "0.7",
        "pointer-events": "none",
        "spinner-overlay": "LoadingSpinner centered"
      }
    },
    "size-variants": {
      "sm": "32px height, 12px padding horizontal",
      "md": "40px height, 16px padding horizontal",
      "lg": "48px height, 20px padding horizontal"
    },
    "ios-specific": {
      "note": "No hover state on iOS (no mouse). Use active/press visual instead",
      "active": "background dim to 0.8, scale 0.97 for touch feedback",
      "minimum-size": "44px × 44px"
    }
  }
}
```

#### Secondary Button

```json
{
  "button-secondary": {
    "states": {
      "default": {
        "background": "var(--k1-surface-raised)",
        "text": "var(--k1-text)",
        "border": "1px solid var(--k1-border)",
        "shadow": "var(--elevation-1)",
        "scale": "1.0"
      },
      "hover": {
        "background": "var(--k1-surface-raised)",
        "text": "var(--k1-text)",
        "border": "1px solid var(--k1-accent)",
        "shadow": "var(--elevation-2), var(--glow-accent)",
        "scale": "1.02",
        "transition": "all 120ms ease-out",
        "web-only": true
      },
      "focus": {
        "background": "var(--k1-surface-raised)",
        "text": "var(--k1-text)",
        "border": "2px solid var(--k1-accent)",
        "outline": "none",
        "shadow": "var(--glow-accent)",
        "scale": "1.0"
      },
      "active-pressed": {
        "background": "var(--k1-surface)",
        "text": "var(--k1-accent)",
        "border": "2px solid var(--k1-accent)",
        "shadow": "var(--elevation-1) inset",
        "scale": "0.98"
      },
      "disabled": {
        "background": "var(--k1-surface-raised)",
        "text": "var(--k1-text-disabled)",
        "border": "1px solid var(--k1-border)",
        "shadow": "none",
        "opacity": "0.5",
        "cursor": "not-allowed"
      }
    }
  }
}
```

#### Tertiary/Ghost Button

```json
{
  "button-tertiary": {
    "states": {
      "default": {
        "background": "transparent",
        "text": "var(--k1-accent)",
        "border": "none",
        "shadow": "none"
      },
      "hover": {
        "background": "rgba(110, 231, 243, 0.1)",
        "text": "var(--k1-accent)",
        "border": "none",
        "transition": "background 120ms ease-out"
      },
      "focus": {
        "background": "transparent",
        "text": "var(--k1-accent)",
        "outline": "2px solid var(--k1-accent)",
        "outline-offset": "2px"
      },
      "active-pressed": {
        "background": "rgba(110, 231, 243, 0.2)",
        "text": "var(--k1-accent-pressed)"
      },
      "disabled": {
        "background": "transparent",
        "text": "var(--k1-text-disabled)",
        "opacity": "0.4",
        "cursor": "not-allowed"
      }
    }
  }
}
```

---

### 1.2 Form Input Components

#### Text Input

```json
{
  "input-text": {
    "states": {
      "default": {
        "background": "var(--k1-surface-sunken)",
        "border": "1px solid var(--k1-border)",
        "text": "var(--k1-text)",
        "placeholder": "var(--k1-text-secondary)",
        "height": "40px",
        "padding": "8px 12px",
        "border-radius": "var(--radius-md)"
      },
      "hover": {
        "background": "var(--k1-surface-sunken)",
        "border": "1px solid var(--k1-text-secondary)",
        "transition": "border-color 120ms ease-out",
        "web-only": true
      },
      "focus": {
        "background": "var(--k1-surface-sunken)",
        "border": "2px solid var(--k1-accent)",
        "outline": "none",
        "box-shadow": "var(--glow-accent)",
        "transition": "border 120ms ease-out, box-shadow 120ms ease-out"
      },
      "disabled": {
        "background": "rgba(122, 129, 148, 0.1)",
        "border": "1px solid var(--k1-border)",
        "text": "var(--k1-text-disabled)",
        "opacity": "0.6",
        "cursor": "not-allowed"
      },
      "error": {
        "background": "var(--k1-surface-sunken)",
        "border": "2px solid var(--k1-error)",
        "box-shadow": "var(--glow-error)"
      },
      "filled": {
        "background": "var(--k1-surface-sunken)",
        "border": "1px solid var(--k1-text-secondary)",
        "text": "var(--k1-text)"
      }
    }
  }
}
```

#### Slider/Range Input

```json
{
  "slider": {
    "states": {
      "default": {
        "track-background": "var(--k1-surface-raised)",
        "track-fill": "var(--k1-accent)",
        "thumb": {
          "width": "20px",
          "height": "20px",
          "background": "var(--k1-accent)",
          "border-radius": "var(--radius-full)",
          "shadow": "var(--elevation-2)",
          "cursor": "grab"
        }
      },
      "hover": {
        "thumb": {
          "background": "var(--k1-accent-hover)",
          "shadow": "var(--elevation-3), var(--glow-accent)",
          "scale": "1.15",
          "transition": "all 120ms ease-out",
          "cursor": "grab"
        },
        "web-only": true
      },
      "focus": {
        "thumb": {
          "outline": "2px solid var(--k1-accent)",
          "outline-offset": "2px",
          "box-shadow": "var(--glow-accent)"
        }
      },
      "active-dragging": {
        "thumb": {
          "background": "var(--k1-accent-pressed)",
          "scale": "1.25",
          "cursor": "grabbing",
          "shadow": "var(--elevation-1)"
        },
        "track-fill": "var(--k1-accent-pressed)"
      },
      "disabled": {
        "track-background": "var(--k1-surface)",
        "track-fill": "rgba(110, 231, 243, 0.3)",
        "thumb": {
          "background": "rgba(110, 231, 243, 0.3)",
          "shadow": "none",
          "cursor": "not-allowed",
          "opacity": "0.6"
        }
      }
    },
    "ios-specific": {
      "thumb-size": "27px (iOS standard slider thumb)",
      "track-height": "4px",
      "haptic-feedback": "Selection feedback on drag"
    }
  }
}
```

---

### 1.3 Navigation & Selection Components

#### Navigation Tab

```json
{
  "nav-tab": {
    "states": {
      "default": {
        "background": "transparent",
        "text": "var(--k1-text-secondary)",
        "border-bottom": "2px solid transparent",
        "padding": "12px 16px",
        "cursor": "pointer"
      },
      "hover": {
        "background": "rgba(110, 231, 243, 0.05)",
        "text": "var(--k1-text)",
        "transition": "all 120ms ease-out",
        "web-only": true
      },
      "focus": {
        "outline": "2px solid var(--k1-accent) offset 2px",
        "text": "var(--k1-text)"
      },
      "active-selected": {
        "background": "transparent",
        "text": "var(--k1-accent)",
        "border-bottom": "2px solid var(--k1-accent)",
        "font-weight": "600"
      },
      "disabled": {
        "text": "var(--k1-text-disabled)",
        "cursor": "not-allowed",
        "opacity": "0.5"
      }
    },
    "ios-specific": {
      "pattern": "iOS uses tab bar, not horizontal tabs",
      "minimum-size": "44px × 44px tap target"
    }
  }
}
```

#### Grid Item / Effect Card

```json
{
  "grid-item": {
    "states": {
      "default": {
        "background": "var(--k1-surface)",
        "border": "1px solid var(--k1-border)",
        "border-radius": "var(--radius-md)",
        "shadow": "var(--elevation-1)",
        "scale": "1.0",
        "padding": "12px"
      },
      "hover": {
        "background": "var(--k1-surface-raised)",
        "border": "1px solid var(--k1-accent)",
        "shadow": "var(--elevation-2), var(--glow-accent)",
        "scale": "1.05",
        "transition": "all 120ms ease-out",
        "cursor": "pointer",
        "web-only": true
      },
      "focus": {
        "border": "2px solid var(--k1-accent)",
        "outline": "none",
        "shadow": "var(--glow-accent)"
      },
      "active-selected": {
        "background": "var(--k1-surface-raised)",
        "border": "2px solid var(--k1-accent)",
        "shadow": "var(--elevation-2), var(--glow-accent)",
        "outline": "none"
      },
      "disabled": {
        "background": "var(--k1-surface)",
        "border": "1px solid var(--k1-border)",
        "opacity": "0.5",
        "cursor": "not-allowed"
      }
    },
    "ios-specific": {
      "active-touch": "background dim to 0.9, scale 0.98 on touch",
      "minimum-size": "44px (content + padding)"
    }
  }
}
```

---

### 1.4 Dialog & Modal Components

#### Modal/Dialog

```json
{
  "modal": {
    "states": {
      "default": {
        "background": "var(--k1-surface)",
        "border": "1px solid var(--k1-border)",
        "border-radius": "var(--radius-lg)",
        "shadow": "var(--elevation-4)",
        "scale": "1.0",
        "opacity": "1.0"
      },
      "entrance": {
        "animation": "scale 0.3→1 and opacity 0→1 for 300ms ease-out",
        "origin": "center"
      },
      "exit": {
        "animation": "scale 1→0.95 and opacity 1→0 for 200ms ease-in"
      },
      "hover-close-button": {
        "button-state": "button-tertiary hover",
        "web-only": true
      }
    },
    "backdrop": {
      "background": "rgba(0, 0, 0, 0.5)",
      "animation": "opacity 0→1 for 300ms ease-out",
      "dismissal": "click backdrop to close (if not required)"
    },
    "ios-specific": {
      "sheet-style": "Use iOS sheet presentation (not modal overlay)",
      "corner-radius": "20px (iOS standard sheet corners)",
      "safe-area": "respects safe-area-inset-bottom"
    }
  }
}
```

---

### 1.5 Toggle/Switch Components

#### Toggle Switch

```json
{
  "toggle-switch": {
    "states": {
      "default-off": {
        "background": "var(--k1-surface-raised)",
        "thumb": {
          "position": "left",
          "background": "var(--k1-text-secondary)",
          "shadow": "var(--elevation-1)"
        },
        "height": "24px",
        "width": "44px"
      },
      "default-on": {
        "background": "var(--k1-accent)",
        "thumb": {
          "position": "right",
          "background": "white",
          "shadow": "var(--elevation-2)"
        }
      },
      "hover": {
        "shadow": "var(--elevation-2), var(--glow-accent) on ON state",
        "transition": "all 120ms ease-out",
        "web-only": true
      },
      "focus": {
        "outline": "2px solid var(--k1-accent) offset 2px"
      },
      "active-toggling": {
        "animation": "thumb slide 100ms ease-out, background fade 100ms ease-out"
      },
      "disabled": {
        "background": "var(--k1-surface)",
        "opacity": "0.5",
        "cursor": "not-allowed"
      }
    },
    "ios-specific": {
      "height": "31px (iOS standard switch height)",
      "haptic-feedback": "Toggle feedback on state change"
    }
  }
}
```

---

## PART 2: WEB-SPECIFIC MICRO-INTERACTIONS

### 2.1 Ripple Effect (Touch Feedback on Desktop)

```json
{
  "ripple-effect": {
    "trigger": "click on interactive element",
    "animation": {
      "radius": "0px → element-width/2",
      "opacity": "1.0 → 0.0",
      "duration": "300ms",
      "easing": "ease-out"
    },
    "color": "rgba(110, 231, 243, 0.3)",
    "origin": "click point"
  }
}
```

### 2.2 Hover Lift (Card Elevation on Hover)

```json
{
  "hover-lift": {
    "trigger": "hover on card/clickable element",
    "animation": {
      "shadow": "var(--elevation-2) → var(--elevation-3)",
      "scale": "1.0 → 1.02",
      "duration": "120ms",
      "easing": "ease-out"
    }
  }
}
```

### 2.3 Focus Ring Glow

```json
{
  "focus-ring-glow": {
    "trigger": "keyboard focus on interactive element",
    "animation": {
      "box-shadow": "transparent → var(--glow-accent)",
      "duration": "180ms",
      "easing": "ease-out"
    },
    "outline": "2px solid var(--k1-accent) offset 2px"
  }
}
```

---

## PART 3: iOS-SPECIFIC INTERACTION PATTERNS

### 3.1 iOS Touch Feedback (No Hover, Use Active State)

```json
{
  "ios-touch-feedback": {
    "pattern": "iOS lacks mouse hover. Use active/pressed state instead",
    "implementation": {
      "on-tap": "Element shows active state (background change, scale reduction)",
      "duration": "100ms",
      "visual-feedback": "opacity 1.0 → 0.8, scale 1.0 → 0.97",
      "haptic-feedback": "Selection feedback generator"
    }
  }
}
```

### 3.2 iOS Sheet Presentation

```json
{
  "ios-sheet": {
    "pattern": "Replace web modals with iOS sheet presentation",
    "behavior": {
      "entry": "sheet slides up from bottom with drag handle",
      "exit": "swipe down to dismiss",
      "corners": "20px radius on top corners (iOS standard)",
      "safe-area": "respects safe-area-inset-bottom"
    }
  }
}
```

### 3.3 iOS Gesture Patterns

```json
{
  "ios-gestures": {
    "swipe": {
      "pattern": "Swipe left/right for navigation or actions",
      "feedback": "Haptic feedback on gesture recognition"
    },
    "long-press": {
      "pattern": "Long-press for context menu (iOS 14+)",
      "menu-style": "UIMenu with actions"
    },
    "pinch": {
      "pattern": "Pinch to zoom on zoomable content (maps, photos)",
      "feedback": "Visual + haptic feedback"
    }
  }
}
```

---

## PART 4: ACCESSIBILITY SPECIFICATIONS

### 4.1 Focus Management

```json
{
  "focus-management": {
    "focus-ring": {
      "width": "2px",
      "color": "var(--k1-accent)",
      "offset": "2px",
      "animation": "glow 180ms ease-out",
      "visible": "always on keyboard navigation",
      "not": "display: none"
    },
    "focus-order": "Logical tab order following visual left→right, top→bottom",
    "skip-links": "Skip to main content link at top of page",
    "focus-trap": "Modals and sidebars trap focus within component"
  }
}
```

### 4.2 Keyboard Navigation

```json
{
  "keyboard-navigation": {
    "tab": "Move focus to next element",
    "shift-tab": "Move focus to previous element",
    "enter": "Activate focused button/link",
    "space": "Toggle checkbox/switch, activate button",
    "escape": "Close modal/dropdown, dismiss drawer",
    "arrow-keys": {
      "menu-items": "Up/down arrow to navigate menu items",
      "slider": "Left/right arrow to adjust value",
      "tabs": "Left/right arrow to switch tabs",
      "role": "Required for custom interactive components"
    }
  }
}
```

### 4.3 ARIA Attributes

```json
{
  "aria-attributes": {
    "button": {
      "aria-label": "Descriptive label (required if no visible text)",
      "aria-pressed": "true/false for toggle buttons",
      "aria-disabled": "true/false for disabled buttons"
    },
    "input": {
      "aria-label": "Descriptive label",
      "aria-describedby": "ID of helper text element",
      "aria-invalid": "true if input has error",
      "aria-required": "true if field is required"
    },
    "custom-component": {
      "role": "button/slider/tabs/etc (required for screen readers)",
      "aria-label": "Descriptive text",
      "aria-controls": "ID of element(s) controlled by this component"
    },
    "live-region": {
      "aria-live": "polite (normal updates) or assertive (important alerts)",
      "aria-atomic": "true (read entire region) or false (read changes only)"
    }
  }
}
```

### 4.4 High Contrast Mode Support

```json
{
  "high-contrast": {
    "rule": "@media (prefers-contrast: more)",
    "adjustments": {
      "borders": "Increase border width from 1px to 2px",
      "focus-ring": "Increase from 2px to 3px width",
      "text": "Increase font weight by 100",
      "shadows": "Reduce shadow opacity (less distraction)"
    }
  }
}
```

### 4.5 Reduced Motion Support

```json
{
  "reduced-motion": {
    "rule": "@media (prefers-reduced-motion: reduce)",
    "adjustments": {
      "animations": "Disable or reduce to instant (0ms) or 50ms",
      "transitions": "Reduce from 120/180/300ms to 0ms or 100ms max",
      "hover-effects": "Keep subtle but reduce motion",
      "spinners": "Allow (continuous motion is different from transition)",
      "example": "Loading spinner remains animated but transitions are instant"
    }
  }
}
```

---

## PART 5: STATE INTERACTION FLOWS

### 5.1 Form Submission Flow

```json
{
  "form-submission": {
    "default": "Button is clickable, normal appearance",
    "hover": "Button shows hover state (web only)",
    "click": "Button enters loading state with spinner overlay",
    "api-response-success": {
      "button": "Shows SuccessCheckmark animation for 2000ms",
      "form": "Auto-dismiss on success or show confirmation message",
      "reset": "Return to default state or navigate away"
    },
    "api-response-error": {
      "button": "Return to default state",
      "form": "Show error message below submit button",
      "field-errors": "Show error state on individual fields"
    }
  }
}
```

### 5.2 Loading State Flow

```json
{
  "loading-state-flow": {
    "initial": "Content shows placeholder/skeleton screen",
    "skeleton-animation": "Pulse animation at 1500ms duration, opacity 0.5→1",
    "data-loaded": "Fade out skeleton (200ms) and fade in content (200ms)",
    "transition": "Smooth cross-fade with no jarring changes"
  }
}
```

### 5.3 Error State Recovery Flow

```json
{
  "error-recovery": {
    "error-appears": "Error toast notification slides in from top/bottom",
    "error-display": "Red accent color, error icon, descriptive message",
    "duration": "Auto-dismiss after 5000ms or manual close",
    "retry-option": "Retry button if action is retryable",
    "accessibility": "Announce error via aria-live region for screen readers"
  }
}
```

---

## PART 6: OUTPUT REQUIREMENTS

**Generate the following:**

6.1 **Component State Matrix Document**
- Complete specification of all states for all interactive components
- Visual examples showing each state
- Figma component definitions with all state variants

6.2 **Interaction Specification Document**
- Micro-interactions (ripple, hover lift, focus glow)
- State flow diagrams (submission, loading, error recovery)
- Animation timing specifications

6.3 **Accessibility Compliance Document**
- Keyboard navigation guide
- ARIA attribute requirements for each component
- Focus management specifications
- High contrast and reduced motion support

6.4 **iOS-Specific Adaptation Guide**
- iOS gesture patterns (swipe, long-press, pinch)
- iOS sheet vs modal presentation guide
- iOS touch feedback (no hover alternative)
- iOS haptic feedback opportunities

6.5 **Updated Figma Components**
- Create/update all component variants with states
- Organize states as variants in Figma component
- Tag states appropriately (default, hover, focus, active, disabled, error, loading)

---

## PART 7: EXECUTION INSTRUCTIONS FOR MAKE AGENT

1. **Define all component states** as specified (default, hover, focus, active, disabled, error, loading)
2. **Create state variants in Figma** for each interactive component
3. **Document web-specific interactions** (ripple, hover lift, focus glow)
4. **Document iOS-specific patterns** (touch feedback, gestures, sheet presentations)
5. **Specify keyboard navigation** for all interactive components
6. **Add ARIA attributes** for accessibility compliance
7. **Include high contrast and reduced motion** specifications
8. **Generate documentation** with examples and visual specifications

**Validation Checklist**:
- [ ] All interactive components have complete state definitions
- [ ] Hover states defined for web
- [ ] Focus states with focus ring glow
- [ ] Active/pressed states with visual and scale feedback
- [ ] Disabled states with reduced opacity and disabled cursor
- [ ] Error states with error color and messaging
- [ ] Loading states with spinner overlay
- [ ] Selected/active states for navigation and grids
- [ ] iOS touch feedback alternatives to hover
- [ ] iOS gesture patterns documented
- [ ] Keyboard navigation for all interactive elements
- [ ] ARIA attributes specified for all components
- [ ] High contrast mode support defined
- [ ] Reduced motion support defined
- [ ] Figma components created with state variants
- [ ] Documentation includes examples

---

**Ready for execution. This prompt should generate 99/100 component state specifications.**

