# K1 iOS Navigation System

**Complete iOS-native navigation architecture**  
**Quality Target:** 99/100  
**Platform:** iOS 15.0+

---

## Table of Contents

1. [Tab Bar Navigation](#tab-bar-navigation)
2. [Sheet Presentations](#sheet-presentations)
3. [Safe Area Integration](#safe-area-integration)
4. [Navigation Patterns](#navigation-patterns)
5. [Implementation Guide](#implementation-guide)

---

## Tab Bar Navigation

### Overview

iOS uses bottom tab bar navigation instead of web's hamburger menu or sidebar. This is the primary navigation pattern for iOS applications.

### Tab Bar Specifications

#### Dimensions & Layout

```json
{
  "tab-bar": {
    "position": "fixed bottom",
    "height": "50px",
    "safe-area-height": "50px + env(safe-area-inset-bottom)",
    "total-height-range": "50px - 84px (depending on device)",
    "background": "var(--k1-surface)",
    "border-top": "1px solid var(--k1-border)",
    "shadow": "0 -2px 8px rgba(0, 0, 0, 0.15)",
    "blur": "backdrop-filter: blur(10px) saturate(180%)",
    "z-index": "1000"
  }
}
```

#### Tab Configuration

```json
{
  "tabs": [
    {
      "id": "control",
      "label": "Control",
      "icon": "sliders",
      "screen": "ControlScreen",
      "badge": null
    },
    {
      "id": "effects",
      "label": "Effects",
      "icon": "sparkles",
      "screen": "EffectsScreen",
      "badge": null
    },
    {
      "id": "profiling",
      "label": "Profiling",
      "icon": "activity",
      "screen": "ProfilingScreen",
      "badge": null
    },
    {
      "id": "terminal",
      "label": "Terminal",
      "icon": "terminal",
      "screen": "TerminalScreen",
      "badge": 3
    },
    {
      "id": "settings",
      "label": "Settings",
      "icon": "settings",
      "screen": "SettingsScreen",
      "badge": null
    }
  ]
}
```

### Tab Item Specifications

#### Visual Design

| State | Icon Color | Label Color | Background | Top Border |
|-------|-----------|-------------|------------|------------|
| **Inactive** | `var(--k1-text-secondary)` #7A8194 | `var(--k1-text-secondary)` | transparent | none |
| **Active** | `var(--k1-accent)` #6EE7F3 | `var(--k1-accent)` | `rgba(110, 231, 243, 0.05)` | 2px solid `var(--k1-accent)` |
| **Pressed** | `var(--k1-accent-pressed)` | `var(--k1-accent-pressed)` | `rgba(110, 231, 243, 0.15)` | 2px solid `var(--k1-accent)` |

#### Dimensions

```css
.k1-tab-item {
  width: calc(100% / 5); /* 5 tabs */
  height: 50px;
  padding: 6px 0 8px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.k1-tab-icon {
  width: 24px;
  height: 24px;
  position: relative;
}

.k1-tab-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
}

.k1-tab-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  background: var(--k1-error);
  color: white;
  border-radius: 9px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}
```

### SwiftUI Implementation

```swift
struct K1TabBar: View {
    @State private var selectedTab: Tab = .control
    
    enum Tab {
        case control, effects, profiling, terminal, settings
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            ControlView()
                .tabItem {
                    Label("Control", systemImage: "slider.horizontal.3")
                }
                .tag(Tab.control)
            
            EffectsView()
                .tabItem {
                    Label("Effects", systemImage: "sparkles")
                }
                .tag(Tab.effects)
            
            ProfilingView()
                .tabItem {
                    Label("Profiling", systemImage: "waveform")
                }
                .tag(Tab.profiling)
            
            TerminalView()
                .tabItem {
                    Label("Terminal", systemImage: "terminal")
                }
                .badge(3)
                .tag(Tab.terminal)
            
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
                .tag(Tab.settings)
        }
        .accentColor(Color.k1Accent)
        .onAppear {
            configureTabBarAppearance()
        }
    }
    
    private func configureTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.k1Surface)
        
        // Border
        appearance.shadowColor = UIColor(Color.k1Border)
        
        // Inactive item
        appearance.stackedLayoutAppearance.normal.iconColor = UIColor(Color.k1TextSecondary)
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: UIColor(Color.k1TextSecondary),
            .font: UIFont.systemFont(ofSize: 10, weight: .semibold)
        ]
        
        // Active item
        appearance.stackedLayoutAppearance.selected.iconColor = UIColor(Color.k1Accent)
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: UIColor(Color.k1Accent),
            .font: UIFont.systemFont(ofSize: 10, weight: .semibold)
        ]
        
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}
```

---

## Sheet Presentations

### Sheet Types

#### Standard Sheet (Half-Height)

**Use Case:** Forms, settings, quick actions

```json
{
  "standard-sheet": {
    "presentation": "Slides up from bottom, stops at ~50% screen height",
    "corner-radius": "20px (top corners only)",
    "drag-handle": "Visible at top center (6px wide, 4px tall, rounded)",
    "dismissal": "Swipe down or tap outside (if dismissible)",
    "resize": "User can drag to medium or large detent",
    "background": "var(--k1-surface)",
    "border": "1px solid var(--k1-border) (top only)",
    "shadow": "0 -4px 16px rgba(0, 0, 0, 0.2)"
  }
}
```

#### Large Sheet (Full-Height)

**Use Case:** Complex forms, full content views

```json
{
  "large-sheet": {
    "presentation": "Slides up from bottom, nearly full screen",
    "corner-radius": "20px (top corners only)",
    "drag-handle": "Visible at top center",
    "dismissal": "Swipe down or close button",
    "resize": "User can drag to medium detent",
    "safe-area": "Respects top safe area (notch/Dynamic Island)",
    "background": "var(--k1-surface)",
    "shadow": "0 -4px 16px rgba(0, 0, 0, 0.2)"
  }
}
```

#### Full-Screen Modal

**Use Case:** Major workflows, settings, immersive experiences

```json
{
  "full-screen-modal": {
    "presentation": "Covers entire screen",
    "corner-radius": "0 (full screen)",
    "drag-handle": "None",
    "dismissal": "Close button (top-right or top-left)",
    "navigation-bar": "Usually includes navigation bar at top",
    "safe-area": "Respects all safe area insets",
    "background": "var(--k1-bg) or var(--k1-surface)"
  }
}
```

### Sheet Content Padding

```css
.k1-sheet-content {
  padding-top: 16px;
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}
```

### SwiftUI Sheet Implementation

```swift
struct ContentView: View {
    @State private var showStandardSheet = false
    @State private var showLargeSheet = false
    @State private var showFullScreen = false
    
    var body: some View {
        VStack {
            // Trigger buttons
            K1Button(title: "Show Standard Sheet") {
                showStandardSheet = true
            }
            
            K1Button(title: "Show Large Sheet") {
                showLargeSheet = true
            }
            
            K1Button(title: "Show Full Screen") {
                showFullScreen = true
            }
        }
        
        // Standard Sheet (Medium height)
        .sheet(isPresented: $showStandardSheet) {
            K1SheetContent(title: "Standard Sheet") {
                Text("Sheet content goes here")
            }
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
        
        // Large Sheet (Medium or Large)
        .sheet(isPresented: $showLargeSheet) {
            K1SheetContent(title: "Large Sheet") {
                ScrollView {
                    Text("Scrollable content")
                }
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        
        // Full Screen Modal
        .fullScreenCover(isPresented: $showFullScreen) {
            NavigationView {
                K1SheetContent(title: "Full Screen") {
                    Text("Full screen content")
                }
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") {
                            showFullScreen = false
                        }
                    }
                }
            }
        }
    }
}

struct K1SheetContent<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(spacing: 0) {
            // Drag Handle (automatic with presentationDragIndicator)
            
            // Header
            HStack {
                Text(title)
                    .font(.k1H3)
                    .foregroundColor(.k1Text)
                
                Spacer()
                
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.k1TextSecondary)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 16)
            
            Divider()
                .background(Color.k1Border)
            
            // Content
            content
                .padding(16)
            
            Spacer()
        }
        .background(Color.k1Surface)
        .k1SafePadding([.bottom])
    }
}
```

### Sheet Animation

```json
{
  "sheet-animation": {
    "entrance": {
      "type": "Spring animation",
      "damping": "0.8",
      "mass": "1.0",
      "stiffness": "100",
      "initial-velocity": "0",
      "duration": "~300-400ms",
      "transform": "translateY(100%) → translateY(0)"
    },
    "exit": {
      "type": "Spring animation",
      "damping": "0.8",
      "mass": "1.0",
      "stiffness": "100",
      "duration": "~300-400ms",
      "transform": "translateY(0) → translateY(100%)"
    },
    "backdrop": {
      "entrance": "opacity 0 → 0.5 over 300ms",
      "exit": "opacity 0.5 → 0 over 300ms"
    }
  }
}
```

---

## Safe Area Integration

### Safe Area Insets Explained

iOS devices have screen cutouts that reduce usable space:

| Device | Top Inset | Bottom Inset | Notes |
|--------|-----------|--------------|-------|
| **iPhone 14 Pro/Max** | 59px | 34px | Dynamic Island + Home indicator |
| **iPhone 13/14** | 47px | 34px | Notch + Home indicator |
| **iPhone SE** | 20px | 0px | No notch, no home indicator |
| **iPad Pro** | 24px | 20px | Varies by orientation |

### CSS Safe Area Implementation

```css
/* Viewport meta tag (required) */
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

/* Safe area CSS variables */
:root {
  --safe-area-top: env(safe-area-inset-top);
  --safe-area-bottom: env(safe-area-inset-bottom);
  --safe-area-left: env(safe-area-inset-left);
  --safe-area-right: env(safe-area-inset-right);
}

/* Header with safe area */
.k1-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  padding-top: max(8px, var(--safe-area-top));
  background: var(--k1-surface);
  z-index: 100;
}

/* Content area with safe area */
.k1-content {
  margin-top: calc(56px + max(8px, var(--safe-area-top)));
  margin-bottom: calc(50px + var(--safe-area-bottom));
  padding-left: max(12px, var(--safe-area-left));
  padding-right: max(12px, var(--safe-area-right));
}

/* Tab bar with safe area */
.k1-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  padding-bottom: var(--safe-area-bottom);
  background: var(--k1-surface);
  z-index: 1000;
}

/* Floating button with safe area */
.k1-fab {
  position: fixed;
  bottom: calc(16px + var(--safe-area-bottom) + 50px + 16px);
  right: max(16px, var(--safe-area-right));
}
```

### SwiftUI Safe Area Handling

```swift
// Automatic safe area (default)
VStack {
    Text("Content")
}
// SwiftUI automatically respects safe area

// Ignore safe area for background
ZStack {
    Color.k1Background
        .ignoresSafeArea()
    
    VStack {
        Text("Content respects safe area")
    }
}

// Custom safe area padding
extension View {
    func k1SafePadding(_ edges: Edge.Set = .all) -> some View {
        self.modifier(K1SafeAreaPaddingModifier(edges: edges))
    }
}

struct K1SafeAreaPaddingModifier: ViewModifier {
    let edges: Edge.Set
    
    func body(content: Content) -> some View {
        GeometryReader { geometry in
            content
                .padding(.top, edges.contains(.top) ? 
                    max(16, geometry.safeAreaInsets.top) : 0)
                .padding(.bottom, edges.contains(.bottom) ? 
                    max(16, geometry.safeAreaInsets.bottom) : 0)
                .padding(.leading, edges.contains(.leading) ? 
                    max(12, geometry.safeAreaInsets.leading) : 0)
                .padding(.trailing, edges.contains(.trailing) ? 
                    max(12, geometry.safeAreaInsets.trailing) : 0)
        }
    }
}

// Usage
VStack {
    Text("Content")
}
.k1SafePadding([.top, .bottom])
```

### Layout Examples with Safe Area

#### Full-Screen Layout

```
┌─────────────────────────────┐
│ ▓▓▓ Dynamic Island ▓▓▓      │ ← safe-area-inset-top (59px)
├─────────────────────────────┤
│ Header (56px)               │ ← Header starts after safe area
├─────────────────────────────┤
│                             │
│                             │
│ Content Area                │
│ (scrollable)                │
│                             │
│                             │
├─────────────────────────────┤
│ Tab Bar (50px)              │
├─────────────────────────────┤
│ ▬▬▬ Home Indicator ▬▬▬      │ ← safe-area-inset-bottom (34px)
└─────────────────────────────┘
```

#### Sheet Presentation Layout

```
┌─────────────────────────────┐
│ Dimmed Background           │
│ (backdrop)                  │
│                             │
│ ┌───────────────────────┐   │
│ │ ═══ Drag Handle ═══   │   │ ← 20px corner radius
│ ├───────────────────────┤   │
│ │ Sheet Header          │   │
│ ├───────────────────────┤   │
│ │                       │   │
│ │ Sheet Content         │   │
│ │ (respects safe area)  │   │
│ │                       │   │
│ └───────────────────────┘   │
│ ▬▬▬ Home Indicator ▬▬▬      │ ← safe-area-inset-bottom
└─────────────────────────────┘
```

---

## Navigation Patterns

### Push Navigation (Detail View)

**Pattern:** Navigate from list to detail view

```swift
NavigationView {
    List(items) { item in
        NavigationLink(destination: DetailView(item: item)) {
            K1Card {
                Text(item.title)
            }
        }
    }
    .navigationTitle("Items")
}
```

**Animation:** Slide from right (push), slide to right (pop)

### Tab Switching

**Pattern:** Switch between main sections

**Animation:** Cross-fade (no slide)

### Modal Presentation

**Pattern:** Present temporary content

```swift
.sheet(isPresented: $showSheet) {
    SheetContent()
}
```

**Animation:** Slide up from bottom

### Alert/Action Sheet

**Pattern:** Critical decision or destructive action

```swift
.confirmationDialog("Delete item?", isPresented: $showAlert) {
    Button("Delete", role: .destructive) {
        deleteItem()
    }
    Button("Cancel", role: .cancel) {}
}
```

---

## Implementation Guide

### Web to iOS Navigation Migration

| Web Pattern | iOS Pattern | Implementation |
|-------------|-------------|----------------|
| Hamburger menu | Tab bar | Replace with bottom tab bar |
| Sidebar | Tab bar | Convert to tabs or settings sheet |
| Top nav tabs | Tab bar | Move to bottom |
| Centered modal | Bottom sheet | Use sheet presentation |
| Dropdown menu | Action sheet | Use confirmationDialog |
| Hover menu | Long-press menu | Use contextMenu |

### Responsive Breakpoints

```css
/* iOS Mobile (default) */
@media (max-width: 767px) {
  /* Tab bar navigation */
  .k1-tab-bar { display: flex; }
  .k1-sidebar { display: none; }
}

/* iPad / Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Can use tab bar OR sidebar */
  .k1-tab-bar { display: flex; }
  .k1-sidebar { display: block; width: 280px; }
}

/* Desktop (Web) */
@media (min-width: 1024px) {
  /* Sidebar navigation */
  .k1-tab-bar { display: none; }
  .k1-sidebar { display: block; width: 280px; }
}
```

### Testing Checklist

- [ ] Tab bar visible on iOS mobile
- [ ] All 5 tabs functional and accessible
- [ ] Active tab highlighted with accent color
- [ ] Tab badges display correctly
- [ ] Sheets slide up from bottom with drag handle
- [ ] Swipe down dismisses sheets
- [ ] Safe area respected on all devices
- [ ] Content not hidden behind notch/Dynamic Island
- [ ] Tab bar not hidden behind home indicator
- [ ] Navigation animations smooth (60fps)

---

**Last Updated:** October 27, 2025  
**iOS Version:** iOS 15.0+  
**Status:** Production Ready ✅
