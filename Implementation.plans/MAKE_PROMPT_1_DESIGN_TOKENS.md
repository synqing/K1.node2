# Figma Make Agent Prompt 1: Design Token System + Platform Variants

**Priority**: 🥇 FOUNDATIONAL - Execute First
**Complexity**: Medium-High
**Execution Time**: 2-3 hours
**Output**: Design tokens specification + Figma tokens + iOS SwiftUI mapping

---

## EXECUTIVE BRIEF

You are enhancing an existing K1 Control Dashboard design system from 92/100 quality to 99/100 by creating a comprehensive, platform-aware token system.

**Current State**: Basic dark theme with 11 color tokens, 4 typography scales, 6 spacing values
**Target State**: Complete token system with web AND iOS variants, supporting 99/100 design perfection

**Key Requirement**: Tokens must work identically across platforms while respecting platform conventions (iOS safe areas, iOS typography scales, iOS gesture affordances)

---

## PART 1: CORE DESIGN TOKENS (Web Primary)

### 1.1 Color Token System - Complete Definition

**Primary Accent Colors:**
```json
{
  "k1-accent": {
    "value": "#6EE7F3",
    "name": "Cyan Primary",
    "usage": "Interactive elements, primary actions, focus states",
    "variants": {
      "hover": "#5BC9D1",
      "pressed": "#4AAAB0",
      "focus-ring": "rgba(110, 231, 243, 0.2)",
      "disabled": "rgba(110, 231, 243, 0.3)",
      "light-bg": "rgba(110, 231, 243, 0.1)"
    }
  },
  "k1-accent-2": {
    "value": "#A78BFA",
    "name": "Purple Secondary",
    "usage": "Secondary accents, decorative elements",
    "variants": {
      "hover": "#9370E8",
      "pressed": "#8156D6",
      "focus-ring": "rgba(167, 139, 250, 0.15)",
      "disabled": "rgba(167, 139, 250, 0.3)"
    }
  },
  "k1-accent-warm": {
    "value": "#FF8844",
    "name": "Warm Accent",
    "usage": "Warmth balance, alternative emphasis",
    "variants": {
      "hover": "#E67030",
      "pressed": "#CC5C1F",
      "focus-ring": "rgba(255, 136, 68, 0.15)",
      "disabled": "rgba(255, 136, 68, 0.3)"
    }
  }
}
```

**Background & Surface Colors:**
```json
{
  "k1-bg": {
    "value": "#0F1115",
    "name": "Main Background",
    "usage": "Page background, full-screen fills"
  },
  "k1-surface": {
    "value": "#1A1F2B",
    "name": "Default Surface",
    "usage": "Cards, panels, content containers"
  },
  "k1-surface-raised": {
    "value": "#242C40",
    "name": "Elevated Surface",
    "usage": "Cards above default surface, hovered states"
  },
  "k1-surface-sunken": {
    "value": "#151923",
    "name": "Depressed Surface",
    "usage": "Nested/grouped content, wells, input backgrounds"
  },
  "k1-border": {
    "value": "rgba(42, 50, 66, 0.2)",
    "name": "Border Color",
    "usage": "Dividing lines, component borders"
  }
}
```

**Text Colors:**
```json
{
  "k1-text": {
    "value": "#E6E9EF",
    "name": "Primary Text",
    "usage": "Main body text, headings",
    "wcag-contrast": "18.5:1 against k1-bg"
  },
  "k1-text-secondary": {
    "value": "#B5BDCA",
    "name": "Secondary Text",
    "usage": "Helper text, descriptions, meta information",
    "wcag-contrast": "7.2:1 against k1-bg"
  },
  "k1-text-disabled": {
    "value": "#7A8194",
    "name": "Disabled Text",
    "usage": "Disabled form fields, inactive states",
    "wcag-contrast": "4.8:1 against k1-bg"
  },
  "k1-text-inverse": {
    "value": "#0F1115",
    "name": "Inverse Text",
    "usage": "Text on light/accent backgrounds"
  }
}
```

**Status & Semantic Colors:**
```json
{
  "k1-success": {
    "value": "#22DD88",
    "name": "Success Green",
    "usage": "Success states, positive feedback, checkmarks",
    "note": "Softened from neon (#44FF44) for professional polish",
    "wcag-contrast": "7.1:1 against k1-bg"
  },
  "k1-warning": {
    "value": "#F59E0B",
    "name": "Warning Orange",
    "usage": "Warnings, cautions, alerts",
    "wcag-contrast": "5.3:1 against k1-bg"
  },
  "k1-error": {
    "value": "#EF4444",
    "name": "Error Red",
    "usage": "Errors, destructive actions, validation failures",
    "wcag-contrast": "6.8:1 against k1-bg"
  },
  "k1-info": {
    "value": "#6EE7F3",
    "name": "Info Cyan",
    "usage": "Informational messages, tips",
    "wcag-contrast": "9.2:1 against k1-bg"
  }
}
```

**Port/Wire Type Colors (for audio/control visualization):**
```json
{
  "port-scalar": {
    "value": "#F59E0B",
    "name": "Scalar Port",
    "usage": "Numeric/scalar value connections"
  },
  "port-field": {
    "value": "#22D3EE",
    "name": "Field Port",
    "usage": "Vector/field value connections"
  },
  "port-color": {
    "value": "#F472B6",
    "name": "Color Port",
    "usage": "Color value connections"
  },
  "port-output": {
    "value": "#34D399",
    "name": "Output Port",
    "usage": "Output/result connections"
  }
}
```

---

### 1.2 Interactive State Colors (Complete Matrix)

For each interactive element, define ALL states:

```json
{
  "button-primary": {
    "default": "var(--k1-accent)",
    "hover": "var(--k1-accent-hover)",
    "active-pressed": "var(--k1-accent-pressed)",
    "focus": "var(--k1-accent) with focus-ring",
    "disabled": "rgba(110, 231, 243, 0.3)",
    "loading": "var(--k1-accent) with 50% opacity"
  },
  "button-secondary": {
    "default": "var(--k1-surface-raised)",
    "hover": "var(--k1-surface-raised) + elevation-1",
    "active-pressed": "var(--k1-surface) with border var(--k1-accent)",
    "focus": "border var(--k1-accent), shadow var(--k1-accent-focus-ring)",
    "disabled": "var(--k1-surface) with 50% opacity",
    "loading": "var(--k1-surface-raised) with 50% opacity"
  },
  "button-tertiary": {
    "default": "transparent",
    "hover": "rgba(110, 231, 243, 0.1)",
    "active-pressed": "rgba(110, 231, 243, 0.2)",
    "focus": "transparent with focus-ring",
    "disabled": "transparent with 30% opacity",
    "loading": "rgba(110, 231, 243, 0.05)"
  }
}
```

---

### 1.3 Focus & Accessibility Color Tokens

```json
{
  "focus-ring": {
    "color": "var(--k1-accent)",
    "width": "2px",
    "offset": "2px",
    "animation": "glow 200ms ease-out"
  },
  "focus-ring-error": {
    "color": "var(--k1-error)",
    "width": "2px",
    "offset": "2px",
    "animation": "glow 200ms ease-out"
  },
  "high-contrast-border": {
    "color": "var(--k1-text)",
    "width": "3px",
    "for": "@media (prefers-contrast: more)"
  },
  "reduced-motion": {
    "disable-animations": true,
    "simplify-transitions": true,
    "for": "@media (prefers-reduced-motion: reduce)"
  }
}
```

---

## PART 2: iOS-SPECIFIC COLOR VARIANTS

### 2.1 Light Mode Color System (iOS)

iOS apps support both dark and light mode. Since our web primary is dark theme, iOS needs complete light mode variants:

```json
{
  "ios-light-mode": {
    "k1-bg": "#F9F9FB",
    "k1-surface": "#F2F2F7",
    "k1-surface-raised": "#FFFFFF",
    "k1-text": "#000000",
    "k1-text-secondary": "#666666",
    "k1-text-disabled": "#A0A0A0",
    "k1-accent": "#0084FF",
    "k1-accent-2": "#7C3AED",
    "k1-accent-warm": "#FF9500",
    "k1-success": "#34C759",
    "k1-warning": "#FF9500",
    "k1-error": "#FF3B30",
    "k1-info": "#0084FF"
  }
}
```

### 2.2 iOS Safe Area Tokens

```json
{
  "safe-area-insets": {
    "description": "iOS device safe area insets for notch, Dynamic Island, home indicator",
    "top": "var(env(safe-area-inset-top))",
    "bottom": "var(env(safe-area-inset-bottom))",
    "left": "var(env(safe-area-inset-left))",
    "right": "var(env(safe-area-inset-right))"
  },
  "ios-safe-padding": {
    "vertical-top": "max(16px, var(env(safe-area-inset-top)))",
    "vertical-bottom": "max(16px, var(env(safe-area-inset-bottom)))",
    "horizontal": "max(12px, var(env(safe-area-inset-left/right)))"
  },
  "ios-min-touch-size": "44px × 44px",
  "ios-min-touch-spacing": "8px between targets"
}
```

### 2.3 iOS Semantic Colors (SwiftUI/Native iOS)

```json
{
  "ios-semantic": {
    "primary": "maps to k1-accent in dark, k1-accent in light",
    "secondary": "maps to k1-text-secondary in both modes",
    "background": "maps to k1-bg in dark, k1-bg-light in light",
    "label": "maps to k1-text in dark, k1-text-light in light",
    "systemBackground": "k1-surface in both modes",
    "secondarySystemBackground": "k1-surface-raised in both modes"
  }
}
```

---

## PART 3: TYPOGRAPHY SYSTEM (Complete)

### 3.1 Font Families

```json
{
  "font-sans": {
    "value": "\"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
    "usage": "All body text, UI text"
  },
  "font-mono": {
    "value": "\"JetBrains Mono\", \"Monaco\", \"Menlo\", monospace",
    "usage": "Code blocks, technical content, parameter values"
  }
}
```

### 3.2 Semantic Typography Scales (Web)

```json
{
  "display": {
    "size": "48px",
    "weight": "700",
    "line-height": "1.1",
    "letter-spacing": "-0.02em",
    "usage": "Hero titles, page banners"
  },
  "h1": {
    "size": "32px",
    "weight": "700",
    "line-height": "1.2",
    "letter-spacing": "-0.01em",
    "usage": "Page titles, main headings"
  },
  "h2": {
    "size": "24px",
    "weight": "600",
    "line-height": "1.3",
    "usage": "Section titles"
  },
  "h3": {
    "size": "20px",
    "weight": "600",
    "line-height": "1.4",
    "usage": "Subsection titles, card titles"
  },
  "h4": {
    "size": "16px",
    "weight": "600",
    "line-height": "1.4",
    "usage": "Component titles, dialog headers"
  },
  "lg": {
    "size": "16px",
    "weight": "400",
    "line-height": "1.6",
    "usage": "Large body text, emphasis text"
  },
  "base": {
    "size": "14px",
    "weight": "400",
    "line-height": "1.5",
    "usage": "Standard body text"
  },
  "sm": {
    "size": "12px",
    "weight": "400",
    "line-height": "1.4",
    "usage": "Secondary text, captions, helper text"
  },
  "xs": {
    "size": "10px",
    "weight": "500",
    "line-height": "1.2",
    "usage": "Tags, labels, very small text"
  },
  "button": {
    "size": "14px",
    "weight": "600",
    "line-height": "1.4",
    "usage": "Button text"
  },
  "code": {
    "size": "12px",
    "weight": "400",
    "line-height": "1.5",
    "font-family": "var(--font-mono)",
    "usage": "Inline code, code blocks"
  }
}
```

### 3.3 iOS-Specific Typography Scales

```json
{
  "ios-typography": {
    "note": "iOS uses different semantic scales. Map as follows:",
    "ios-largeTitle": {
      "size": "28px",
      "weight": "700",
      "line-height": "1.2",
      "usage": "iOS navigation titles"
    },
    "ios-title": {
      "size": "22px",
      "weight": "700",
      "line-height": "1.2",
      "usage": "iOS screen titles"
    },
    "ios-headline": {
      "size": "17px",
      "weight": "600",
      "line-height": "1.3",
      "usage": "iOS section headers"
    },
    "ios-body": {
      "size": "17px",
      "weight": "400",
      "line-height": "1.6",
      "note": "iOS standard body (larger than web 14px for touch readability)"
    },
    "ios-callout": {
      "size": "16px",
      "weight": "400",
      "line-height": "1.5",
      "usage": "Emphasized body text"
    },
    "ios-subheadline": {
      "size": "15px",
      "weight": "400",
      "line-height": "1.4",
      "usage": "Secondary headings"
    },
    "ios-caption": {
      "size": "13px",
      "weight": "400",
      "line-height": "1.3",
      "usage": "iOS captions, secondary info"
    }
  }
}
```

### 3.4 Responsive Typography (Mobile, Tablet, Desktop)

```json
{
  "responsive-typography": {
    "mobile": {
      "h1": "24px / 700 / 1.2",
      "h2": "20px / 600 / 1.3",
      "base": "14px / 400 / 1.5"
    },
    "tablet": {
      "h1": "28px / 700 / 1.2",
      "h2": "22px / 600 / 1.3",
      "base": "14px / 400 / 1.5"
    },
    "desktop": {
      "h1": "32px / 700 / 1.2",
      "h2": "24px / 600 / 1.3",
      "base": "14px / 400 / 1.5"
    }
  }
}
```

---

## PART 4: ICON SYSTEM SPECIFICATION

```json
{
  "icon-system": {
    "sizes": {
      "xs": "16px",
      "sm": "24px",
      "md": "32px",
      "lg": "48px",
      "xl": "80px"
    },
    "stroke-width": "2px",
    "style": "outlined (filled icons only for specific cases)",
    "line-cap": "round",
    "line-join": "round"
  },
  "icon-colors": {
    "primary": "var(--k1-text)",
    "secondary": "var(--k1-text-secondary)",
    "accent": "var(--k1-accent)",
    "success": "var(--k1-success)",
    "error": "var(--k1-error)",
    "disabled": "var(--k1-text-disabled)"
  },
  "icon-naming-convention": "lowercase-with-dashes (e.g., close-x, arrow-right, check-circle)",
  "ios-specific": "Use SF Symbols where available, with 1.5x-2x weight scale"
}
```

---

## PART 5: SPACING & SIZING SYSTEM

```json
{
  "spacing-scale": {
    "xs": "4px",
    "sm": "8px",
    "md": "12px",
    "lg": "16px",
    "xl": "24px",
    "2xl": "32px",
    "3xl": "48px"
  },
  "component-sizing": {
    "button-height": {
      "web": "40px",
      "ios": "44px (HIG requirement)"
    },
    "input-height": {
      "web": "40px",
      "ios": "44px"
    },
    "toggle-height": {
      "web": "24px",
      "ios": "31px (iOS switch standard)"
    },
    "navigation-bar": {
      "web-desktop": "56px",
      "web-mobile": "48px",
      "ios": "44px (+ safe-area-top)"
    },
    "tab-bar-height": {
      "web": "N/A (use NavTabs component)",
      "ios": "50px (+ safe-area-bottom)"
    }
  },
  "touch-target-specs": {
    "minimum-size": "44px × 44px (iOS)",
    "minimum-spacing": "8px between targets",
    "safe-areas": "12px from edges (+ safe-area insets on iOS)"
  }
}
```

---

## PART 6: SHADOWS & ELEVATION SYSTEM

```json
{
  "elevation": {
    "0": "none",
    "1": "0 1px 3px rgba(0, 0, 0, 0.12)",
    "2": "0 4px 8px rgba(0, 0, 0, 0.15)",
    "3": "0 8px 16px rgba(0, 0, 0, 0.20)",
    "4": "0 12px 24px rgba(0, 0, 0, 0.25)",
    "5": "0 16px 32px rgba(0, 0, 0, 0.30)"
  },
  "glow-effects": {
    "accent": "0 0 20px rgba(110, 231, 243, 0.3)",
    "accent-2": "0 0 16px rgba(167, 139, 250, 0.2)",
    "success": "0 0 16px rgba(34, 221, 136, 0.2)",
    "error": "0 0 16px rgba(239, 68, 68, 0.2)"
  },
  "ios-shadow-mapping": {
    "note": "iOS uses CALayer shadows (different from CSS)",
    "default": "offset(0, 2) blur(4) opacity(0.15)",
    "elevated": "offset(0, 8) blur(16) opacity(0.20)"
  }
}
```

---

## PART 7: ANIMATION & MOTION TOKENS

```json
{
  "durations": {
    "fast": "120ms",
    "normal": "180ms",
    "slow": "300ms"
  },
  "easing": {
    "linear": "linear",
    "ease-in": "cubic-bezier(0.4, 0.0, 1.0, 1.0)",
    "ease-out": "cubic-bezier(0.0, 0.0, 0.2, 1.0)",
    "ease-in-out": "cubic-bezier(0.4, 0.0, 0.2, 1.0)",
    "ease-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1.0)"
  },
  "micro-interactions": {
    "button-press": "scale(0.98) for 100ms ease-out",
    "hover-lift": "shadow 0→2, scale 1.0→1.02 for 120ms ease-out",
    "focus-ring": "glow 0→1 for 180ms ease-out",
    "ripple-effect": "radius 0→50px, opacity 1→0 for 300ms ease-out"
  },
  "component-animations": {
    "loading-spinner": "continuous 360deg rotation, 1000ms linear infinite",
    "success-checkmark": "scale 0.3→1 for 400ms cubic-bezier(0.34, 1.56, 0.64, 1), checkmark draw 0→1 for 300ms 100ms delay",
    "skeleton-pulse": "opacity 0.5→1 for 1500ms ease-in-out infinite",
    "page-transition": "fade 300ms ease-in-out or slide 300ms ease-out"
  },
  "ios-motion": {
    "prefer-reduced-motion": "disable animations or reduce to 50% speed",
    "motion-durations": "iOS prefers shorter durations (100-200ms typical)",
    "gesture-feedback": "haptic feedback for successful interactions"
  }
}
```

---

## PART 8: BORDER RADIUS SYSTEM

```json
{
  "radius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "full": "9999px"
  },
  "component-radius": {
    "button": "var(--radius-md)",
    "input": "var(--radius-md)",
    "card": "var(--radius-lg)",
    "modal": "var(--radius-lg)",
    "dialog": "var(--radius-lg)",
    "badge": "var(--radius-sm)",
    "avatar": "var(--radius-full)",
    "toggle": "var(--radius-md)",
    "ios-sheet-corners": "20px (iOS Design Guidelines standard)"
  }
}
```

---

## PART 9: OUTPUT REQUIREMENTS

### Generate the following artifacts:

**9.1 Figma Design Tokens**
- Create comprehensive Figma token set with all colors, typography, spacing, shadows
- Organize tokens in logical groups (colors, typography, spacing, shadows, animation)
- Export as Figma tokens file (compatible with Figma Tokens plugin)

**9.2 Design Specification Document**
- Complete token reference document
- Usage guidelines for each token category
- Color palette swatches with hex values and contrast ratios
- Typography scale with rendering examples
- Component-specific token mappings

**9.3 CSS Variables Declaration**
- Create complete CSS variables file (`:root` selector)
- Include all colors, spacing, typography, shadows, animation values
- Include dark theme variables
- Include iOS-specific CSS variables (safe-area, etc.)

**9.4 iOS/SwiftUI Token Mapping**
- Document how web tokens map to iOS native components
- Provide SwiftUI Color/Font definitions
- Safe area token specifications
- Light/Dark mode mapping
- Dynamic Type token support

**9.5 Platform-Specific Documentation**
- Web token usage guide
- iOS native implementation guide (SwiftUI/UIKit)
- Responsive token application guide
- Accessibility (WCAG, ARIA, iOS VoiceOver) token mapping

---

## PART 10: EXECUTION INSTRUCTIONS FOR MAKE AGENT

1. **Create comprehensive token system** as specified above
2. **Generate Figma tokens** ready to import into existing Figma file
3. **Create CSS variables** file with all tokens
4. **Document iOS mappings** for SwiftUI implementation
5. **Validate token coverage**: Ensure 50+ color tokens, complete typography, spacing, shadows, animation
6. **Generate platform documentation**: Separate docs for web/iOS/accessibility usage
7. **Include examples**: Show how tokens are applied in actual components

**Validation Checklist**:
- [ ] All color tokens defined with hover/pressed/focus variants
- [ ] Typography system complete (7+ scales, responsive variants)
- [ ] Icon system fully specified (sizes, colors, naming)
- [ ] Shadow/elevation system complete (6 levels)
- [ ] Animation tokens with easing and durations
- [ ] iOS light mode colors defined
- [ ] iOS safe area specifications included
- [ ] iOS gesture affordances tokenized
- [ ] Figma tokens generated and documented
- [ ] CSS variables file created
- [ ] iOS/SwiftUI mapping provided
- [ ] All values WCAG AA contrast verified
- [ ] Documentation complete with examples

---

**Ready for execution. This prompt should generate 99/100 design token foundation.**

