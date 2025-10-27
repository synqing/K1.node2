# Figma Make Agent Prompt 3: Advanced Refinements & iOS Adaptation

**Priority**: 🥉 FINAL - Execute Third (depends on Prompts 1-2 completion)
**Complexity**: High-Complex
**Execution Time**: 2-3 hours
**Input**: Design tokens from Prompt 1 + Component states from Prompt 2
**Output**: iOS adaptation guide + Animation choreography + Comprehensive design documentation

---

## EXECUTIVE BRIEF

You are performing final polish and platform-specific refinement on the K1 Control Dashboard design system. This prompt takes the completed token system and component states from Prompts 1-2 and adds:

1. **iOS Navigation Transformation** — Replace hamburger menu with iOS tab bar, sheet presentations, and gesture patterns
2. **Safe Area Integration** — Precise specifications for notch, Dynamic Island, home indicator across all layouts
3. **Animation Choreography** — Page transitions, component entrance/exit animations, stagger patterns, micro-interaction timing
4. **Dark Theme Polish** — Subtle gradient overlays, surface elevation variations, glass-morphism effects
5. **Responsive Design Refinement** — Mobile-first visual hierarchy, thumb zones, tablet multi-column layouts
6. **Accessibility Advanced Patterns** — Screen reader optimization, keyboard shortcut patterns, high contrast refinements
7. **Comprehensive Design Documentation** — System overview, component guidelines, platform-specific implementation guides

**Target**: Achieve 99/100 design system perfection by addressing every detail, edge case, and platform-specific consideration.

---

## PART 1: iOS NAVIGATION ADAPTATION

### 1.1 Navigation Architecture Change: Hamburger → Tab Bar

**Web Navigation (Current):**
- Hamburger menu in top-left (mobile/tablet)
- Sidebar drawer on left (desktop)
- NavTabs horizontal (desktop)

**iOS Navigation (New):**
- Tab bar at bottom (iOS standard pattern, respects safe-area-inset-bottom)
- Replace hamburger menu entirely
- Use sheet presentations instead of modals

**Tab Bar Specification:**

```json
{
  "ios-tab-bar": {
    "position": "bottom-fixed",
    "height": "50px + safe-area-inset-bottom (typically 50-68px total)",
    "background": "var(--k1-surface)",
    "border-top": "1px solid var(--k1-border)",
    "shadow": "elevation-4 (upward shadow)",
    "tabs": [
      {
        "name": "Control",
        "icon": "slider-h",
        "label": "Control",
        "badge": "optional count"
      },
      {
        "name": "Effects",
        "icon": "sparkles",
        "label": "Effects"
      },
      {
        "name": "Profiling",
        "icon": "waveform",
        "label": "Profiling"
      },
      {
        "name": "Terminal",
        "icon": "terminal",
        "label": "Terminal"
      },
      {
        "name": "Settings",
        "icon": "settings",
        "label": "Settings"
      }
    ]
  },
  "tab-item-specs": {
    "width": "100% / number-of-tabs",
    "height": "50px (excluding safe area)",
    "padding": "6px 0 8px 0 (icon and label inside)",
    "icon-size": "24px",
    "label-size": "10px",
    "label-weight": "600",
    "states": {
      "inactive": {
        "icon-color": "var(--k1-text-secondary)",
        "label-color": "var(--k1-text-secondary)",
        "background": "transparent"
      },
      "active": {
        "icon-color": "var(--k1-accent)",
        "label-color": "var(--k1-accent)",
        "background": "rgba(110, 231, 243, 0.05)",
        "top-border": "2px solid var(--k1-accent)"
      },
      "badge": {
        "background": "var(--k1-error)",
        "color": "white",
        "border-radius": "9px",
        "padding": "2px 6px",
        "font-size": "10px",
        "font-weight": "700",
        "position": "absolute top-right of icon"
      }
    }
  }
}
```

### 1.2 iOS Sheet Presentations (Replace Modals)

**Pattern:**
On iOS, avoid modal overlays. Use sheet presentations that slide up from the bottom.

```json
{
  "ios-sheet-presentation": {
    "sheet-types": {
      "standard": {
        "presentation": "Slides up from bottom",
        "corner-radius": "20px (top corners only, iOS standard)",
        "safe-area": "respects safe-area-inset-bottom + 8px padding",
        "drag-handle": "Optional drag handle at top (recommended)",
        "dismissal": "Swipe down to dismiss, or tap outside (with caution)"
      },
      "full-screen": {
        "presentation": "Covers full screen (tabs, settings)",
        "corner-radius": "none (full screen)",
        "close-button": "Top-right X button (system style)"
      },
      "half-sheet": {
        "presentation": "Stops at middle of screen",
        "corner-radius": "20px",
        "resizable": "false (use standard or full-screen instead)"
      }
    },
    "sheet-content-padding": {
      "horizontal": "16px or max(16px, safe-area-inset-left/right)",
      "vertical": "16px top, max(16px, safe-area-inset-bottom) bottom",
      "safe-area": "All content inside safe area"
    },
    "animation": {
      "entrance": "Slide up with spring animation (damping 0.8, mass 1, stiffness 100)",
      "exit": "Slide down with spring animation"
    }
  },
  "use-cases": {
    "parameter-adjustment": "Standard sheet (device orientation portrait)",
    "effect-selection": "Full-screen sheet (grid scrollable)",
    "settings": "Full-screen sheet with tab bar",
    "device-connection": "Standard sheet with connection form",
    "error-message": "Use toast notification instead, not sheet"
  }
}
```

### 1.3 Web Navigation Remains (Desktop/Tablet Desktop Experience)

For web (≥640px), keep existing navigation:
- Desktop (≥1024px): Sidebar + NavTabs
- Tablet (640-1023px): Sidebar (collapsible) + NavTabs

But on iOS mobile (web view): Use tab bar pattern.

---

## PART 2: iOS SAFE AREA INTEGRATION (Comprehensive)

### 2.1 Safe Area Insets and Dynamic Island Handling

```json
{
  "safe-area-specification": {
    "what-is-safe-area": "iOS devices have notches, Dynamic Island, and home indicator that reduce usable space",
    "affected-devices": {
      "iPhone 13 Pro Max": "notch at top (47px), home indicator (34px bottom)",
      "iPhone 14-15": "Dynamic Island (38px top), home indicator (34px bottom)",
      "iPhone SE": "no notch/island, standard home indicator",
      "iPad": "notch (top) or none, various safe area configurations"
    },
    "safe-area-insets": {
      "top": "var(env(safe-area-inset-top)) — typically 0-47px",
      "bottom": "var(env(safe-area-inset-bottom)) — typically 0-34px",
      "left": "var(env(safe-area-inset-left)) — typically 0",
      "right": "var(env(safe-area-inset-right)) — typically 0"
    }
  },
  "safe-area-layout-guide": {
    "rule": "All content must stay within safe area insets",
    "implementation": "Use viewport-fit=cover in viewport meta tag, then apply safe-area insets",
    "code": "padding: max(16px, var(env(safe-area-inset-top))) max(16px, var(env(safe-area-inset-right))) max(16px, var(env(safe-area-inset-bottom))) max(16px, var(env(safe-area-inset-left)))"
  }
}
```

### 2.2 Layout Specifications for Each Screen with Safe Area

```json
{
  "screen-layouts": {
    "header-bar": {
      "position": "fixed top",
      "height": "56px",
      "padding-top": "max(8px, var(env(safe-area-inset-top)))",
      "total-height": "56px + safe-area-inset-top",
      "content-starts-at": "safe-area-inset-top + 56px",
      "note": "On iPhone 14+ with Dynamic Island, notch takes ~47px, safe area inset 47px"
    },
    "content-area": {
      "margin-top": "header-height",
      "margin-bottom": "tab-bar-height",
      "padding-horizontal": "max(12px, var(env(safe-area-inset-left/right)))",
      "padding-bottom": "16px (additional to tab-bar safe area)"
    },
    "tab-bar": {
      "position": "fixed bottom",
      "height": "50px",
      "padding-bottom": "var(env(safe-area-inset-bottom))",
      "total-height": "50px + safe-area-inset-bottom",
      "background-extends-below": "true (extends to edge, content doesn't)"
    },
    "floating-action-button": {
      "position": "fixed bottom-right",
      "margin-right": "max(16px, var(env(safe-area-inset-right)))",
      "margin-bottom": "max(16px, var(env(safe-area-inset-bottom))) + tab-bar-height + 16px"
    }
  }
}
```

### 2.3 Modal/Sheet Safe Area Handling

```json
{
  "sheet-safe-area": {
    "sheet-content": "Padding inside sheet respects safe area",
    "example": {
      "padding-top": "16px (not additional safe area, sheet is inside safe area)",
      "padding-left": "max(16px, var(env(safe-area-inset-left)))",
      "padding-right": "max(16px, var(env(safe-area-inset-right)))",
      "padding-bottom": "max(16px, var(env(safe-area-inset-bottom)))"
    },
    "sheet-corner-radius": "20px (top corners only, iOS standard)"
  }
}
```

---

## PART 3: ANIMATION CHOREOGRAPHY SYSTEM

### 3.1 Page/Route Transitions

```json
{
  "page-transitions": {
    "push-transition": {
      "description": "Navigate to detail/sub-page",
      "animation": "Slide in from right (new page) and slide out left (old page)",
      "duration": "300ms",
      "easing": "ease-out cubic-bezier(0.0, 0.0, 0.2, 1.0)",
      "new-page": "transform translateX(100%) → translateX(0), opacity 1",
      "old-page": "transform translateX(0) → translateX(-30%), opacity 1 → 0.5"
    },
    "pop-transition": {
      "description": "Navigate back to previous page",
      "animation": "Slide out to right (current page) and slide in from left (previous page)",
      "duration": "300ms",
      "easing": "ease-out",
      "current-page": "transform translateX(0) → translateX(100%), opacity 1 → 0.5",
      "previous-page": "transform translateX(-30%) → translateX(0), opacity 0.5 → 1"
    },
    "fade-transition": {
      "description": "Tab switch or replace current view",
      "animation": "Cross-fade between pages",
      "duration": "200ms",
      "easing": "ease-in-out",
      "old-page": "opacity 1 → 0",
      "new-page": "opacity 0 → 1",
      "overlap": "true (simultaneous fade)"
    }
  }
}
```

### 3.2 Component Entrance/Exit Animations

```json
{
  "component-animations": {
    "list-item-stagger": {
      "description": "When list first loads, items animate in sequentially",
      "animation": "Slide up 20px + fade in",
      "duration": "300ms",
      "stagger-delay": "30ms between items (max 15 items staggered)",
      "easing": "ease-out",
      "example": "Item 1 starts at 0ms, Item 2 at 30ms, Item 3 at 60ms"
    },
    "card-entrance": {
      "description": "Card appears when loaded/revealed",
      "animation": "Scale 0.95 + opacity 0 → 1.0 + opacity 1",
      "duration": "250ms",
      "easing": "ease-out cubic-bezier(0.34, 1.56, 0.64, 1)",
      "origin": "center"
    },
    "drawer-slide": {
      "description": "Drawer/sidebar opens",
      "animation": "Slide in from left edge",
      "duration": "300ms",
      "easing": "ease-out",
      "transform": "translateX(-100%) → translateX(0)",
      "backdrop": "opacity 0 → 0.5 (simultaneous)"
    },
    "dropdown-expand": {
      "description": "Dropdown menu opens",
      "animation": "ScaleY 0.8 + opacity 0 → 1.0 + opacity 1",
      "duration": "150ms",
      "easing": "ease-out",
      "origin": "top"
    }
  }
}
```

### 3.3 Micro-Interaction Choreography (Orchestrated Animations)

```json
{
  "micro-interaction-sequences": {
    "button-press-choreography": {
      "step-1-press-down": {
        "duration": "50ms",
        "action": "scale 1.0 → 0.98, shadow elevation-2 → 1"
      },
      "step-2-press-hold": {
        "duration": "100ms",
        "action": "ripple effect expands (if on touch screen animation)"
      },
      "step-3-release": {
        "duration": "100ms",
        "action": "scale 0.98 → 1.0, shadow 1 → 2"
      },
      "total-sequence": "250ms"
    },
    "hover-and-click-choreography": {
      "on-hover-web": {
        "step-1": "shadow elevation-2 → 3, scale 1.0 → 1.02 (120ms ease-out)",
        "step-2": "glow fade in (ripple of light around element)"
      },
      "on-click-web": {
        "step-1": "ripple effect from click point (300ms)",
        "step-2": "element returns to hover state if still hovering"
      }
    },
    "touch-feedback-ios": {
      "on-touch-start": {
        "duration": "100ms",
        "action": "opacity 1.0 → 0.7, scale 1.0 → 0.97",
        "haptic": "Selection feedback generator"
      },
      "on-touch-end": {
        "duration": "100ms",
        "action": "opacity 0.7 → 1.0, scale 0.97 → 1.0"
      }
    }
  }
}
```

### 3.4 Loading and Transition States

```json
{
  "loading-sequences": {
    "skeleton-to-content": {
      "step-1-skeleton-load": "Skeleton placeholders pulse at 1500ms, opacity 0.5 ↔ 1.0",
      "step-2-skeleton-exit": "Fade out skeleton over 200ms (opacity 1 → 0)",
      "step-3-content-enter": "Fade in actual content over 200ms (opacity 0 → 1), slight slide up 8px",
      "total-timing": "skeleton pulse → (when ready) → exit and enter content"
    },
    "spinner-animation": {
      "rotation": "Continuous 360° rotation, 1000ms linear infinite",
      "scale-pulse": "Optional: scale 1.0 ↔ 1.05 at 2000ms interval",
      "color": "var(--k1-accent) with glow effect"
    },
    "progress-bar": {
      "animation": "Width 0% → 100% over duration",
      "easing": "ease-out (slower at end)",
      "color": "var(--k1-accent)"
    }
  }
}
```

---

## PART 4: DARK THEME ADVANCED POLISH

### 4.1 Gradient Overlays and Depth

```json
{
  "gradient-system": {
    "surface-gradients": {
      "surface-raised-subtle": "Linear gradient from var(--k1-surface-raised) to var(--k1-surface-raised) + 3% lighter (top to bottom)",
      "accent-gradient": "Radial gradient cyan #6EE7F3 (5%) to transparent (50%, positioned top-right of card)",
      "glass-morphism": "Background-color var(--k1-surface) + backdrop-filter blur(10px) + border 1px var(--k1-border) + transparent background"
    },
    "application": {
      "hero-section": "Use accent gradient overlay on hero image",
      "elevated-card": "Use surface gradient for visual depth",
      "glass-panels": "Use glass-morphism for floating UI over images"
    }
  }
}
```

### 4.2 Surface Elevation Variations (Advanced)

```json
{
  "elevation-refinement": {
    "level-0": {
      "shadow": "none",
      "background": "var(--k1-bg)",
      "use-case": "Page background"
    },
    "level-1": {
      "shadow": "0 1px 3px rgba(0, 0, 0, 0.12)",
      "background": "var(--k1-surface)",
      "subtle-gradient": "top-bottom slight lightening"
    },
    "level-2": {
      "shadow": "0 4px 8px rgba(0, 0, 0, 0.15)",
      "background": "var(--k1-surface-raised)",
      "subtle-gradient": "2% lighter top to bottom"
    },
    "level-3": {
      "shadow": "0 8px 16px rgba(0, 0, 0, 0.20)",
      "background": "var(--k1-surface-raised) + 2% lightening + accent glow 20%",
      "use-case": "Floating dialogs, important cards"
    },
    "level-4": {
      "shadow": "0 12px 24px rgba(0, 0, 0, 0.25)",
      "background": "var(--k1-surface-raised) + 3% lightening + accent glow 30%",
      "use-case": "Modals, overlays"
    },
    "level-5": {
      "shadow": "0 16px 32px rgba(0, 0, 0, 0.30)",
      "background": "var(--k1-surface-raised) + 5% lightening + accent glow 40%",
      "use-case": "Tooltips, popovers, highest prominence"
    }
  }
}
```

### 4.3 Color Brightness and Saturation Adjustments

```json
{
  "dark-theme-polish": {
    "text-hierarchy": {
      "primary-text": "var(--k1-text) #E6E9EF (85% brightness, full saturation)",
      "secondary-text": "var(--k1-text-secondary) #B5BDCA (70% brightness)",
      "tertiary-text": "var(--k1-text-disabled) #7A8194 (48% brightness)",
      "inverse": "var(--k1-text-inverse) #0F1115 (for light backgrounds)"
    },
    "accent-brightness": {
      "base": "#6EE7F3 (bright cyan)",
      "hover": "#5BC9D1 (slightly darker, more saturated)",
      "pressed": "#4AAAB0 (much darker, high contrast)",
      "disabled": "rgba(110, 231, 243, 0.3) (faded, 30% opacity)"
    },
    "surface-tones": {
      "description": "Slight color tint to surfaces for visual sophistication",
      "surface": "Cool blue undertone (slight purple tint #1A1F2B)",
      "surface-raised": "Slightly warmer (#242C40)",
      "surface-sunken": "Slightly cooler (#151923)"
    }
  }
}
```

---

## PART 5: RESPONSIVE DESIGN REFINEMENT (Mobile-First Visual Hierarchy)

### 5.1 Mobile (<640px) Layout Strategy

```json
{
  "mobile-layout": {
    "viewport-design": {
      "width": "100vw with safe area padding",
      "padding": "12-16px sides (inside safe-area-inset-left/right)",
      "header": "Compact, single-line navigation with icon-only buttons",
      "content": "Single column, stacked vertically"
    },
    "visual-hierarchy-mobile": {
      "typography": {
        "h1": "24px / 700 (was 32px on desktop)",
        "h2": "20px / 600 (was 24px)",
        "body": "14px / 400 (unchanged)"
      },
      "spacing": {
        "vertical-gaps": "12px (cards/sections, was 16px)",
        "horizontal-padding": "12px (card padding, was 16px)"
      },
      "component-sizing": {
        "button-height": "40px",
        "button-padding": "12px horizontal (larger touch target)",
        "input-height": "40px",
        "touch-target-minimum": "44px × 44px (iOS standard)"
      }
    },
    "grid-layout": {
      "effect-grid": "1 column (single-column list on mobile)",
      "parameter-grid": "1 column (full-width sliders)",
      "content-grid": "Single column, 100% width"
    },
    "thumb-zone-optimization": {
      "description": "Optimized touch targets for thumb reach on phone",
      "bottom-action-buttons": "Positioned at thumb-friendly height (bottom 1/3 of screen)",
      "frequent-actions": "Duplicate critical buttons (both top and bottom) or use persistent floating button",
      "far-reach": "Important but less frequent actions placed at top, require intentional reaching"
    }
  }
}
```

### 5.2 Tablet (640-1023px) Layout Strategy

```json
{
  "tablet-layout": {
    "viewport-design": {
      "width": "100vw",
      "max-width": "800px (optional center constraint)",
      "padding": "16-20px sides",
      "header": "Single line, icon and text labels"
    },
    "visual-hierarchy-tablet": {
      "typography": {
        "h1": "28px / 700",
        "h2": "22px / 600",
        "body": "14px / 400"
      },
      "spacing": {
        "vertical-gaps": "16px",
        "horizontal-padding": "16px"
      }
    },
    "grid-layout": {
      "effect-grid": "2 columns (2-column grid on tablet)",
      "parameter-grid": "Can use 2-column layout for parameter sliders",
      "sidebar": "Optional collapsible sidebar (if applicable)"
    },
    "landscape-mode": {
      "handling": "On tablet landscape, might expand to 2-3 column layouts",
      "safe-area": "Respect safe-area-inset-left/right on landscape with Dynamic Island"
    }
  }
}
```

### 5.3 Desktop (≥1024px) Layout Strategy

```json
{
  "desktop-layout": {
    "viewport-design": {
      "width": "Full screen or max-width container",
      "padding": "20-24px",
      "sidebar": "Fixed/collapsible sidebar on left",
      "header": "Multi-line, full labels visible"
    },
    "visual-hierarchy-desktop": {
      "typography": {
        "h1": "32px / 700",
        "h2": "24px / 600",
        "body": "14px / 400"
      },
      "spacing": {
        "vertical-gaps": "16px (consistent with tablet+)",
        "horizontal-padding": "20px"
      }
    },
    "grid-layout": {
      "effect-grid": "3-4 columns (wide grid on desktop)",
      "parameter-grid": "2-3 columns",
      "sidebar-width": "280px (collapsible to 60px)"
    }
  }
}
```

### 5.4 Responsive Typography (Fluid Sizing)

```json
{
  "fluid-typography": {
    "method": "CSS clamp() for smooth scaling without media query breakpoints",
    "h1": "clamp(24px, 5vw, 32px) [Mobile 24px → Desktop 32px]",
    "h2": "clamp(20px, 4vw, 24px) [Mobile 20px → Desktop 24px]",
    "base": "clamp(12px, 2vw, 14px) [Mobile 12px → Desktop 14px]",
    "advantages": "Smooth scaling between breakpoints without jarring jumps"
  }
}
```

---

## PART 6: ACCESSIBILITY ADVANCED PATTERNS

### 6.1 Screen Reader Optimization

```json
{
  "screen-reader-optimization": {
    "landmark-structure": {
      "header": "<header> landmark for navigation",
      "main": "<main> landmark for main content",
      "nav": "<nav> landmark for navigation sections",
      "footer": "<footer> landmark (if applicable)"
    },
    "heading-hierarchy": {
      "rule": "H1 → H2 → H3 (no skipping levels)",
      "h1": "One per page, main title",
      "h2": "Section titles",
      "h3": "Subsection titles",
      "no-skip": "Never jump from H1 to H3 (confusing for screen readers)"
    },
    "image-alt-text": {
      "requirement": "Every non-decorative image must have descriptive alt text",
      "icon-buttons": "If icon-only, must have aria-label",
      "example": "aria-label='Toggle dark mode' for icon-only button",
      "decorative-images": "aria-hidden='true' or alt='' (empty)"
    },
    "form-labels": {
      "requirement": "Every input must have associated label",
      "method": "<label for='input-id'>Label text</label> <input id='input-id' />",
      "alternative": "aria-label='Label text' on input if visual label not possible"
    },
    "aria-live-regions": {
      "toast-notifications": "aria-live='polite' aria-atomic='true' (announcements)",
      "error-messages": "aria-live='assertive' (important/urgent messages)",
      "loading-status": "aria-live='polite' (loading indicator announcements)"
    }
  }
}
```

### 6.2 Keyboard Shortcut Patterns

```json
{
  "keyboard-shortcuts": {
    "global-shortcuts": {
      "cmd/ctrl-s": "Save or submit form (if applicable)",
      "cmd/ctrl-p": "Print or preview",
      "cmd/ctrl-k": "Search or command palette (modern pattern)",
      "escape": "Close modal, drawer, or popup"
    },
    "navigation-shortcuts": {
      "arrow-left-right": "Navigate between tabs or menu items",
      "arrow-up-down": "Navigate up/down in lists or sliders",
      "home-end": "Jump to first/last item in list",
      "page-up-page-down": "Scroll content up/down"
    },
    "interaction-shortcuts": {
      "space": "Toggle switch or checkbox, activate button",
      "enter": "Activate button or submit form",
      "tab-shift-tab": "Move focus forward/backward"
    },
    "documentation": {
      "availability": "Display shortcut hints in UI (e.g., '⌘S' next to save button)",
      "help": "Provide keyboard shortcut reference page (? key triggers)"
    }
  }
}
```

### 6.3 High Contrast Mode Refinement

```json
{
  "high-contrast-enhancements": {
    "media-query": "@media (prefers-contrast: more)",
    "adjustments": {
      "borders": "Increase from 1px to 2px, use brighter border color",
      "focus-ring": "Increase from 2px to 3px width",
      "text-weight": "Increase font-weight by 100 (400 → 500, 600 → 700)",
      "shadows": "Reduce opacity or remove (can reduce clarity)",
      "color-contrast": "Ensure all text meets 7:1 contrast minimum (vs 4.5:1 standard)"
    },
    "example": {
      "normal": "text #B5BDCA on bg #0F1115 (7.2:1 contrast)",
      "high-contrast": "text #FFFFFF on bg #0F1115 (17:1 contrast)"
    }
  }
}
```

### 6.4 Reduced Motion Enhancements

```json
{
  "reduced-motion-refinement": {
    "media-query": "@media (prefers-reduced-motion: reduce)",
    "animations-to-remove": [
      "Page transitions (instant instead of slide)",
      "Hover effects (reduce or remove)",
      "Entrance animations (instant or very fast <100ms)",
      "Micro-interactions (instant feedback)"
    ],
    "animations-to-keep": [
      "Loading spinners (continuous motion allowed)",
      "Progress bars (continuous allowed)",
      "Animated icons (brief animations ok)"
    ],
    "timing-guide": {
      "transitions": "120/180/300ms → 0ms or 100ms max",
      "animations": "0ms or very fast (50-100ms)",
      "entrance": "instant or 100ms max"
    },
    "implementation": {
      "css": "@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }",
      "or-custom": "Define reduced-motion variable and apply conditional timing"
    }
  }
}
```

---

## PART 7: COMPREHENSIVE DESIGN DOCUMENTATION

### 7.1 Design System Overview Document

**This document should include:**

- **System Name & Vision**: "K1 Control Dashboard Design System v2.0 — 99/100 Quality"
- **Guiding Principles**:
  - Clarity (transparent communication)
  - Accessibility (WCAG 2.1 AA minimum)
  - Performance (fast, responsive)
  - Platform Parity (web and iOS treated equally)
  - Consistency (tokens drive all design)

- **Token Architecture**: How tokens flow from design → CSS → iOS
- **Component Hierarchy**: Base components → Composite components → Templates
- **Responsive Strategy**: Mobile-first, fluid scaling, platform-specific adaptations
- **Accessibility Commitment**: WCAG 2.1 AA, keyboard navigation, screen reader support
- **Performance Targets**: FPS smoothness, animation durations, interaction responsiveness

### 7.2 Component Usage Guidelines

**For each component category:**

```json
{
  "component-guidelines": {
    "buttons": {
      "when-to-use": {
        "primary": "Main action, submit, proceed",
        "secondary": "Alternative action, less emphasis",
        "tertiary": "Tertiary action, lowest emphasis"
      },
      "dos": [
        "Keep button text short and action-oriented (max 2 words)",
        "Use proper button states (disabled, loading, error)",
        "Ensure 44px minimum height on touch targets",
        "Maintain consistent spacing around buttons"
      ],
      "donts": [
        "Don't use inconsistent button styles in same context",
        "Don't skip focus states (Tab navigation must work)",
        "Don't use disabled buttons without explaining why",
        "Don't make buttons smaller than 40px height"
      ],
      "accessibility": {
        "aria-label": "Required if no visible text",
        "aria-pressed": "Required for toggle buttons",
        "keyboard": "Must be keyboard accessible (Tab, Enter, Space)"
      }
    },
    "form-inputs": {
      "when-to-use": {
        "text": "Short text input (names, emails, search)",
        "textarea": "Long-form text input",
        "slider": "Numeric value selection with range",
        "toggle": "On/off binary selection"
      },
      "dos": [
        "Always include associated labels",
        "Provide clear placeholder text",
        "Show validation errors immediately",
        "Use 40px minimum height on inputs"
      ],
      "donts": [
        "Don't use placeholders as labels",
        "Don't submit on Enter without confirmation",
        "Don't ignore error states",
        "Don't make required fields unclear"
      ]
    }
  }
}
```

### 7.3 Do's and Don'ts Reference

```json
{
  "design-dos-and-donts": {
    "color": {
      "do": [
        "Use tokens for all colors (no hardcoded values)",
        "Maintain WCAG AA contrast (4.5:1 minimum for text)",
        "Test colors in light/dark modes",
        "Use semantic colors for status (success, error, warning)"
      ],
      "dont": [
        "Hardcode colors that vary by theme",
        "Use low-contrast text on backgrounds",
        "Rely on color alone to convey meaning (use icons/text too)",
        "Use more than 3-4 accent colors in single view"
      ]
    },
    "typography": {
      "do": [
        "Use semantic scale (h1, h2, h3, body, sm, xs)",
        "Maintain 1.5+ line-height for readability",
        "Use max 80 characters per line for body text",
        "Pair heading weights with intentional hierarchy"
      ],
      "dont": [
        "Mix multiple font families (max 2: sans + mono)",
        "Use font sizes smaller than 12px for body text",
        "Use all-caps for long passages (only headings)",
        "Ignore responsive typography on mobile"
      ]
    },
    "spacing": {
      "do": [
        "Use spacing scale (4px, 8px, 12px, 16px, etc.)",
        "Apply consistent padding inside containers",
        "Use generous whitespace to reduce cognitive load",
        "Align elements to 4px grid"
      ],
      "dont": [
        "Hardcode random spacing values",
        "Crowd too many elements without gaps",
        "Ignore mobile touch target spacing requirements",
        "Use different spacing for similar components"
      ]
    },
    "interaction": {
      "do": [
        "Provide clear visual feedback on interaction",
        "Use appropriate animation durations (120-300ms)",
        "Support keyboard navigation fully",
        "Indicate disabled/loading states clearly"
      ],
      "dont": [
        "Remove focus indicators (never!)",
        "Use animations longer than 500ms (jarring)",
        "Make interactions require mouse-only (test with keyboard)",
        "Hide state changes (loading, error, success)"
      ]
    }
  }
}
```

### 7.4 Accessibility Checklist

```json
{
  "accessibility-checklist": {
    "color-contrast": {
      "requirement": "WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large)",
      "test": "Use WebAIM contrast checker or Lighthouse",
      "check-list": [
        "Text on background: 4.5:1 minimum",
        "Large text (18px+): 3:1 minimum",
        "UI components (buttons, inputs): 3:1 on borders"
      ]
    },
    "keyboard-navigation": {
      "requirement": "All interactive elements must be keyboard accessible",
      "test": "Tab through page, confirm all elements reachable",
      "check-list": [
        "Tab order logical (left→right, top→bottom)",
        "Focus visible on all focusable elements",
        "Enter/Space activates buttons",
        "Escape closes modals",
        "No keyboard traps (stuck focus)"
      ]
    },
    "screen-reader": {
      "requirement": "Announce content clearly to screen reader users",
      "test": "Use NVDA (Windows) or VoiceOver (Mac/iOS)",
      "check-list": [
        "Headings announce properly",
        "Images have alt text",
        "Form inputs have labels",
        "Links describe destination",
        "Buttons describe action"
      ]
    },
    "motion": {
      "requirement": "Respect prefers-reduced-motion preference",
      "test": "Enable 'Reduce motion' in OS settings, verify no jarring animations",
      "check-list": [
        "Transitions < 100ms in reduced motion mode",
        "No auto-play animations",
        "Spinners still animate (OK in reduced motion)"
      ]
    },
    "touch-targets": {
      "requirement": "Minimum 44px × 44px interactive targets on touch devices",
      "test": "Measure interactive elements, ensure 44px minimum",
      "check-list": [
        "Buttons minimum 44px height",
        "Touch targets spaced 8px apart minimum",
        "No sub-44px interactive elements"
      ]
    }
  }
}
```

---

## PART 8: OUTPUT REQUIREMENTS

### Generate the following artifacts:

**8.1 iOS Navigation Adaptation Specification**
- Tab bar design system with dimensions, spacing, states
- Sheet presentation patterns (standard, full-screen, half-sheet)
- Safe area integration guide for all layouts
- Gesture pattern specifications (swipe, long-press, pinch)

**8.2 Animation Choreography Guide**
- Page transition specifications with easing curves
- Component entrance/exit animation library
- Micro-interaction timing specifications
- Stagger delay patterns for list animations
- iOS spring animation specifications

**8.3 Dark Theme Polish Specification**
- Gradient overlay system with usage guidelines
- Surface elevation refinements with subtle color variations
- Accent color brightness scale (base, hover, pressed, disabled)
- Glass-morphism effect specifications

**8.4 Responsive Design Reference**
- Mobile layout grid (1 column, safe area padding)
- Tablet layout grid (2 columns, sidebar options)
- Desktop layout grid (3-4 columns, sidebar fixed)
- Thumb zone optimization diagram and guidelines
- Fluid typography clamp() values for all scales

**8.5 Accessibility Advanced Implementation Guide**
- Screen reader landmark structure template
- Keyboard shortcut specification with symbol reference
- High contrast mode CSS specifications
- Reduced motion implementation guide
- ARIA attribute requirements matrix

**8.6 Complete Design System Documentation**
- Overview document (principles, token architecture, component hierarchy)
- Component usage guidelines (buttons, inputs, modals, etc.)
- Do's and Don'ts reference card
- Accessibility compliance checklist
- Performance targets and measurement guidelines

**8.7 Platform-Specific Implementation Guides**
- Web (React) implementation guide (using CSS variables, Tailwind, Radix UI)
- iOS (SwiftUI) implementation guide (token mapping, safe area, gestures)
- Cross-platform consistency validation
- Testing protocols (visual, functional, accessibility)

**8.8 Figma Documentation Updates**
- Add all animation choreography to component documentation
- Update safe area specifications in layout guides
- Add iOS sheet presentation variants
- Document responsive breakpoint specifications
- Add accessibility annotations to components

---

## PART 9: VALIDATION CHECKLIST FOR EXECUTION

```json
{
  "validation-checklist": [
    {
      "section": "iOS Navigation",
      "items": [
        "Tab bar dimensions and spacing specified (50px height, 5 tabs)",
        "Tab bar states documented (inactive, active, badge)",
        "Sheet presentation patterns defined (standard, full-screen, half-sheet)",
        "Gesture patterns documented (swipe, long-press, pinch)",
        "Safe area integration for all layouts"
      ]
    },
    {
      "section": "Safe Area Integration",
      "items": [
        "Safe area inset definitions provided",
        "Layout specifications for header, content, tab bar, floating buttons",
        "Dynamic Island / Notch handling documented",
        "Modal/sheet safe area padding specifications"
      ]
    },
    {
      "section": "Animation Choreography",
      "items": [
        "Page transitions (push, pop, fade) with timing and easing",
        "Component animations (card entrance, drawer slide, dropdown expand)",
        "Micro-interaction sequences (button press, hover, touch)",
        "Loading sequences (skeleton pulse, spinner, progress bar)",
        "iOS spring animation specifications"
      ]
    },
    {
      "section": "Dark Theme Polish",
      "items": [
        "Gradient overlays specified with CSS implementation",
        "Elevation levels 0-5 with subtle color variations",
        "Text hierarchy brightness values (primary, secondary, tertiary, inverse)",
        "Accent color brightness scale (base, hover, pressed, disabled)",
        "Glass-morphism effect specifications"
      ]
    },
    {
      "section": "Responsive Design",
      "items": [
        "Mobile layout grid (1 column, padding, safe areas)",
        "Tablet layout grid (2 columns, sidebar options)",
        "Desktop layout grid (3-4 columns, sidebar width)",
        "Thumb zone optimization guidelines",
        "Fluid typography clamp() values"
      ]
    },
    {
      "section": "Accessibility",
      "items": [
        "Screen reader landmark structure",
        "Keyboard shortcut specifications",
        "High contrast mode CSS rules",
        "Reduced motion implementation",
        "ARIA attribute requirements matrix",
        "Focus management specifications"
      ]
    },
    {
      "section": "Documentation",
      "items": [
        "Design system overview document (principles, architecture, targets)",
        "Component usage guidelines (4+ component categories)",
        "Do's and Don'ts reference (color, typography, spacing, interaction)",
        "Accessibility checklist (contrast, keyboard, screen reader, motion, touch)",
        "Platform implementation guides (web, iOS, cross-platform)"
      ]
    },
    {
      "section": "Deliverables",
      "items": [
        "iOS navigation adaptation specification",
        "Animation choreography guide with timing specifications",
        "Dark theme polish specification",
        "Responsive design reference",
        "Accessibility advanced implementation guide",
        "Complete design system documentation"
      ]
    }
  ]
}
```

---

## PART 10: EXECUTION INSTRUCTIONS FOR MAKE AGENT

### Your Task:

1. **Review Prompt 1 outputs** (design tokens, CSS variables, iOS SwiftUI mapping)
2. **Review Prompt 2 outputs** (component states, interaction specifications, accessibility matrix)
3. **Create iOS Navigation System** per specifications above
4. **Define Animation Choreography** with exact timing, easing, and stagger delays
5. **Polish Dark Theme** with gradient overlays, elevation variations, and color refinements
6. **Specify Responsive Layouts** for mobile, tablet, desktop with responsive typography
7. **Provide Accessibility Advanced Patterns** for screen readers, keyboard shortcuts, high contrast
8. **Generate Comprehensive Documentation** (overview, guidelines, checklists, platform guides)
9. **Update Figma Components** with animation specifications, safe area annotations
10. **Create Platform Implementation Guides** for React and iOS/SwiftUI

### Deliverables (All Required):

- ✅ iOS Navigation Adaptation Specification (500+ lines)
- ✅ Animation Choreography Guide (400+ lines, with CSS/JSON examples)
- ✅ Dark Theme Polish Specification (300+ lines)
- ✅ Responsive Design Reference (400+ lines)
- ✅ Accessibility Advanced Implementation Guide (400+ lines)
- ✅ Complete Design System Documentation (1000+ lines including all guides)
- ✅ Updated Figma annotations and component documentation
- ✅ Web (React) Implementation Guide (500+ lines)
- ✅ iOS (SwiftUI) Implementation Guide (500+ lines)
- ✅ Testing Protocols and Validation Procedures

### Success Criteria:

- 99/100 design system perfection achieved
- All platform considerations (web, iOS, accessibility, responsive) addressed
- Zero gaps in documentation or specifications
- All components have animation choreography defined
- All interactive elements have keyboard navigation specified
- All layouts respect safe areas and responsive design patterns
- Accessibility fully implemented (WCAG 2.1 AA+)
- Platform-specific guides enable accurate implementation in React and iOS

---

**This prompt completes the 3-prompt architecture for 92/100 → 99/100 design system improvement. Ready for execution.**
