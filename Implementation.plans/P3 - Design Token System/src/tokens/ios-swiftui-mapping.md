---
title: iOS/SwiftUI Token Mapping Guide
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# iOS/SwiftUI Token Mapping Guide

**K1 Control Dashboard - iOS Native Implementation**

This guide maps the K1 web design tokens to iOS native SwiftUI/UIKit implementations.

---

## Table of Contents

1. [Color System Mapping](#color-system-mapping)
2. [Typography Mapping](#typography-mapping)
3. [Spacing & Layout](#spacing--layout)
4. [Safe Area Handling](#safe-area-handling)
5. [SwiftUI Implementation Examples](#swiftui-implementation-examples)
6. [UIKit Implementation Examples](#uikit-implementation-examples)

---

## Color System Mapping

### SwiftUI Color Extensions

Create a `K1Colors.swift` file:

```swift
import SwiftUI

extension Color {
    // MARK: - K1 Accent Colors
    static let k1Accent = Color(hex: "6EE7F3")
    static let k1AccentHover = Color(hex: "5BC9D1")
    static let k1AccentPressed = Color(hex: "4AAAB0")
    
    static let k1Accent2 = Color(hex: "A78BFA")
    static let k1Accent2Hover = Color(hex: "9370E8")
    
    static let k1AccentWarm = Color(hex: "FF8844")
    static let k1AccentWarmHover = Color(hex: "E67030")
    
    // MARK: - K1 Background & Surface Colors (Dark Mode)
    static let k1BgDark = Color(hex: "0F1115")
    static let k1SurfaceDark = Color(hex: "1A1F2B")
    static let k1SurfaceRaisedDark = Color(hex: "242C40")
    static let k1SurfaceSunkenDark = Color(hex: "151923")
    static let k1BorderDark = Color(red: 42/255, green: 50/255, blue: 66/255, opacity: 0.2)
    
    // MARK: - K1 Background & Surface Colors (Light Mode)
    static let k1BgLight = Color(hex: "F9F9FB")
    static let k1SurfaceLight = Color(hex: "F2F2F7")
    static let k1SurfaceRaisedLight = Color(hex: "FFFFFF")
    static let k1SurfaceSunkenLight = Color(hex: "E5E5EA")
    static let k1BorderLight = Color.black.opacity(0.1)
    
    // MARK: - K1 Text Colors (Dark Mode)
    static let k1TextDark = Color(hex: "E6E9EF")
    static let k1TextSecondaryDark = Color(hex: "B5BDCA")
    static let k1TextDisabledDark = Color(hex: "7A8194")
    
    // MARK: - K1 Text Colors (Light Mode)
    static let k1TextLight = Color(hex: "000000")
    static let k1TextSecondaryLight = Color(hex: "666666")
    static let k1TextDisabledLight = Color(hex: "A0A0A0")
    
    // MARK: - Adaptive Colors (Dark/Light Mode)
    static let k1Bg = Color(uiColor: UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ? 
            UIColor(Color.k1BgDark) : UIColor(Color.k1BgLight)
    })
    
    static let k1Surface = Color(uiColor: UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ? 
            UIColor(Color.k1SurfaceDark) : UIColor(Color.k1SurfaceLight)
    })
    
    static let k1Text = Color(uiColor: UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ? 
            UIColor(Color.k1TextDark) : UIColor(Color.k1TextLight)
    })
    
    static let k1TextSecondary = Color(uiColor: UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ? 
            UIColor(Color.k1TextSecondaryDark) : UIColor(Color.k1TextSecondaryLight)
    })
    
    // MARK: - Status & Semantic Colors
    static let k1Success = Color(hex: "22DD88")
    static let k1Warning = Color(hex: "F59E0B")
    static let k1Error = Color(hex: "EF4444")
    static let k1Info = Color(hex: "6EE7F3")
    
    // iOS Light Mode Variants
    static let k1SuccessLight = Color(hex: "34C759")
    static let k1WarningLight = Color(hex: "FF9500")
    static let k1ErrorLight = Color(hex: "FF3B30")
    static let k1InfoLight = Color(hex: "0084FF")
    
    // MARK: - Port/Wire Colors
    static let portScalar = Color(hex: "F59E0B")
    static let portField = Color(hex: "22D3EE")
    static let portColor = Color(hex: "F472B6")
    static let portOutput = Color(hex: "34D399")
    
    // MARK: - Helper for Hex Colors
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
```

---

## Typography Mapping

### SwiftUI Font Extensions

Create a `K1Typography.swift` file:

```swift
import SwiftUI

extension Font {
    // MARK: - K1 Font Families
    static func k1Sans(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
    
    static func k1Mono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
    
    // MARK: - K1 Typography Scale
    
    /// Display: 48px / 700 / 1.1 (Web) -> 34px / Bold (iOS)
    static let k1Display = Font.system(size: 34, weight: .bold, design: .default)
    
    /// H1: 32px / 700 / 1.2 (Web) -> 28px / Bold (iOS Large Title)
    static let k1H1 = Font.system(size: 28, weight: .bold, design: .default)
    
    /// H2: 24px / 600 / 1.3 (Web) -> 22px / Bold (iOS Title)
    static let k1H2 = Font.system(size: 22, weight: .bold, design: .default)
    
    /// H3: 20px / 600 / 1.4 (Web) -> 20px / Semibold (iOS Headline)
    static let k1H3 = Font.system(size: 20, weight: .semibold, design: .default)
    
    /// H4: 16px / 600 / 1.4 (Web) -> 17px / Semibold (iOS Headline)
    static let k1H4 = Font.system(size: 17, weight: .semibold, design: .default)
    
    /// Large: 16px / 400 / 1.6 (Web) -> 17px / Regular (iOS Body)
    static let k1Large = Font.system(size: 17, weight: .regular, design: .default)
    
    /// Base: 14px / 400 / 1.5 (Web) -> 17px / Regular (iOS Body)
    /// Note: iOS standard body is larger for better readability on mobile
    static let k1Base = Font.system(size: 17, weight: .regular, design: .default)
    
    /// Small: 12px / 400 / 1.4 (Web) -> 13px / Regular (iOS Caption)
    static let k1Small = Font.system(size: 13, weight: .regular, design: .default)
    
    /// XSmall: 10px / 500 / 1.2 (Web) -> 11px / Medium (iOS Caption2)
    static let k1XSmall = Font.system(size: 11, weight: .medium, design: .default)
    
    /// Button: 14px / 600 / 1.4 (Web) -> 17px / Semibold (iOS)
    static let k1Button = Font.system(size: 17, weight: .semibold, design: .default)
    
    /// Code: 12px / 400 / 1.5 (Web) -> 13px / Regular Monospaced (iOS)
    static let k1Code = Font.system(size: 13, weight: .regular, design: .monospaced)
}

// MARK: - iOS Native Typography (SF Pro)
extension Font {
    /// iOS Large Title (Standard: 34pt)
    static let k1LargeTitle = Font.largeTitle.weight(.bold)
    
    /// iOS Title (Standard: 28pt)
    static let k1Title = Font.title.weight(.bold)
    
    /// iOS Title 2 (Standard: 22pt)
    static let k1Title2 = Font.title2.weight(.bold)
    
    /// iOS Title 3 (Standard: 20pt)
    static let k1Title3 = Font.title3.weight(.semibold)
    
    /// iOS Headline (Standard: 17pt Semibold)
    static let k1Headline = Font.headline
    
    /// iOS Body (Standard: 17pt Regular)
    static let k1Body = Font.body
    
    /// iOS Callout (Standard: 16pt Regular)
    static let k1Callout = Font.callout
    
    /// iOS Subheadline (Standard: 15pt Regular)
    static let k1Subheadline = Font.subheadline
    
    /// iOS Footnote (Standard: 13pt Regular)
    static let k1Footnote = Font.footnote
    
    /// iOS Caption (Standard: 12pt Regular)
    static let k1Caption = Font.caption
    
    /// iOS Caption 2 (Standard: 11pt Regular)
    static let k1Caption2 = Font.caption2
}
```

### Dynamic Type Support

```swift
extension Font {
    /// K1 Body with Dynamic Type
    static let k1BodyDynamic = Font.custom("Inter", size: 17, relativeTo: .body)
    
    /// K1 Headline with Dynamic Type
    static let k1HeadlineDynamic = Font.custom("Inter", size: 20, relativeTo: .headline)
}
```

---

## Spacing & Layout

### SwiftUI Spacing Constants

```swift
struct K1Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}

struct K1Sizing {
    // iOS HIG Compliant Touch Targets
    static let buttonHeight: CGFloat = 44
    static let inputHeight: CGFloat = 44
    static let toggleHeight: CGFloat = 31
    static let minTouchTarget: CGFloat = 44
    static let touchSpacing: CGFloat = 8
    
    // Navigation & Tab Bars
    static let navBarHeight: CGFloat = 44
    static let tabBarHeight: CGFloat = 50
    
    // Icon Sizes
    static let iconXS: CGFloat = 16
    static let iconSM: CGFloat = 24
    static let iconMD: CGFloat = 32
    static let iconLG: CGFloat = 48
    static let iconXL: CGFloat = 80
}

struct K1Radius {
    static let sm: CGFloat = 4
    static let md: CGFloat = 8
    static let lg: CGFloat = 12
    static let xl: CGFloat = 16
    static let full: CGFloat = 9999
    
    // iOS-specific
    static let iosSheet: CGFloat = 20
}
```

---

## Safe Area Handling

### SwiftUI Safe Area Support

```swift
struct K1SafeAreaView<Content: View>: View {
    let content: Content
    let edges: Edge.Set
    
    init(edges: Edge.Set = .all, @ViewBuilder content: () -> Content) {
        self.edges = edges
        self.content = content()
    }
    
    var body: some View {
        content
            .padding(.top, edges.contains(.top) ? K1Spacing.lg : 0)
            .padding(.bottom, edges.contains(.bottom) ? K1Spacing.lg : 0)
            .padding(.horizontal, edges.contains(.horizontal) ? K1Spacing.md : 0)
            .ignoresSafeArea(.container, edges: edges)
    }
}

// Usage
K1SafeAreaView(edges: .top) {
    VStack {
        Text("Content with safe area")
    }
}
```

### Custom Safe Area Insets

```swift
extension View {
    func k1SafePadding(_ edges: Edge.Set = .all) -> some View {
        self.modifier(K1SafeAreaPaddingModifier(edges: edges))
    }
}

struct K1SafeAreaPaddingModifier: ViewModifier {
    let edges: Edge.Set
    @Environment(\.safeAreaInsets) private var safeAreaInsets
    
    func body(content: Content) -> some View {
        content
            .padding(.top, edges.contains(.top) ? max(16, safeAreaInsets.top) : 0)
            .padding(.bottom, edges.contains(.bottom) ? max(16, safeAreaInsets.bottom) : 0)
            .padding(.leading, edges.contains(.leading) ? max(12, safeAreaInsets.leading) : 0)
            .padding(.trailing, edges.contains(.trailing) ? max(12, safeAreaInsets.trailing) : 0)
    }
}
```

---

## SwiftUI Implementation Examples

### K1 Button Component

```swift
struct K1Button: View {
    enum Style {
        case primary, secondary, tertiary
    }
    
    let title: String
    let style: Style
    let action: () -> Void
    
    @State private var isPressed = false
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.k1Button)
                .foregroundColor(textColor)
                .frame(height: K1Sizing.buttonHeight)
                .padding(.horizontal, K1Spacing.xl)
                .background(backgroundColor)
                .cornerRadius(K1Radius.md)
                .shadow(color: shadowColor, radius: shadowRadius, x: 0, y: shadowY)
                .scaleEffect(isPressed ? 0.98 : 1.0)
        }
        .buttonStyle(K1ButtonStyle(isPressed: $isPressed))
    }
    
    private var backgroundColor: Color {
        switch style {
        case .primary: return .k1Accent
        case .secondary: return .k1Surface
        case .tertiary: return .clear
        }
    }
    
    private var textColor: Color {
        switch style {
        case .primary: return Color(hex: "0F1115")
        case .secondary, .tertiary: return .k1Text
        }
    }
    
    private var shadowColor: Color {
        isPressed ? .clear : Color.black.opacity(0.15)
    }
    
    private var shadowRadius: CGFloat {
        isPressed ? 0 : 4
    }
    
    private var shadowY: CGFloat {
        isPressed ? 0 : 2
    }
}

struct K1ButtonStyle: ButtonStyle {
    @Binding var isPressed: Bool
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .onChange(of: configuration.isPressed) { newValue in
                isPressed = newValue
            }
    }
}
```

### K1 Card Component

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
K1Card(elevated: true) {
    VStack(alignment: .leading, spacing: K1Spacing.md) {
        Text("Card Title")
            .font(.k1H3)
            .foregroundColor(.k1Text)
        
        Text("Card description text")
            .font(.k1Base)
            .foregroundColor(.k1TextSecondary)
    }
}
```

### K1 Input Field

```swift
struct K1TextField: View {
    let placeholder: String
    @Binding var text: String
    @FocusState private var isFocused: Bool
    
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
                    .stroke(isFocused ? Color.k1Accent : Color.clear, lineWidth: 2)
            )
            .focused($isFocused)
    }
}
```

### K1 Status Badge

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
```

---

## UIKit Implementation Examples

### UIColor Extensions

```swift
extension UIColor {
    // K1 Accent Colors
    static let k1Accent = UIColor(hex: "6EE7F3")
    static let k1Accent2 = UIColor(hex: "A78BFA")
    static let k1AccentWarm = UIColor(hex: "FF8844")
    
    // K1 Dark Mode
    static let k1BgDark = UIColor(hex: "0F1115")
    static let k1SurfaceDark = UIColor(hex: "1A1F2B")
    static let k1TextDark = UIColor(hex: "E6E9EF")
    
    // K1 Light Mode
    static let k1BgLight = UIColor(hex: "F9F9FB")
    static let k1SurfaceLight = UIColor(hex: "F2F2F7")
    static let k1TextLight = UIColor(hex: "000000")
    
    // Adaptive Colors
    static let k1Bg = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ? 
            .k1BgDark : .k1BgLight
    }
    
    static let k1Surface = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ? 
            .k1SurfaceDark : .k1SurfaceLight
    }
    
    static let k1Text = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ? 
            .k1TextDark : .k1TextLight
    }
    
    // Status Colors
    static let k1Success = UIColor(hex: "22DD88")
    static let k1Warning = UIColor(hex: "F59E0B")
    static let k1Error = UIColor(hex: "EF4444")
    static let k1Info = UIColor(hex: "6EE7F3")
    
    convenience init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            red: CGFloat(r) / 255,
            green: CGFloat(g) / 255,
            blue: CGFloat(b) / 255,
            alpha: CGFloat(a) / 255
        )
    }
}
```

### UIFont Extensions

```swift
extension UIFont {
    static func k1Display() -> UIFont {
        .systemFont(ofSize: 34, weight: .bold)
    }
    
    static func k1H1() -> UIFont {
        .systemFont(ofSize: 28, weight: .bold)
    }
    
    static func k1H2() -> UIFont {
        .systemFont(ofSize: 22, weight: .bold)
    }
    
    static func k1Body() -> UIFont {
        .systemFont(ofSize: 17, weight: .regular)
    }
    
    static func k1Button() -> UIFont {
        .systemFont(ofSize: 17, weight: .semibold)
    }
    
    static func k1Code() -> UIFont {
        .monospacedSystemFont(ofSize: 13, weight: .regular)
    }
}
```

### K1 Button Class (UIKit)

```swift
class K1Button: UIButton {
    enum Style {
        case primary, secondary, tertiary
    }
    
    var style: Style = .primary {
        didSet { updateAppearance() }
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }
    
    private func setup() {
        heightAnchor.constraint(equalToConstant: 44).isActive = true
        layer.cornerRadius = 8
        titleLabel?.font = .k1Button()
        updateAppearance()
        
        addTarget(self, action: #selector(touchDown), for: .touchDown)
        addTarget(self, action: #selector(touchUp), for: [.touchUpInside, .touchUpOutside])
    }
    
    private func updateAppearance() {
        switch style {
        case .primary:
            backgroundColor = .k1Accent
            setTitleColor(UIColor(hex: "0F1115"), for: .normal)
        case .secondary:
            backgroundColor = .k1Surface
            setTitleColor(.k1Text, for: .normal)
        case .tertiary:
            backgroundColor = .clear
            setTitleColor(.k1Accent, for: .normal)
        }
    }
    
    @objc private func touchDown() {
        UIView.animate(withDuration: 0.1) {
            self.transform = CGAffineTransform(scaleX: 0.98, y: 0.98)
        }
    }
    
    @objc private func touchUp() {
        UIView.animate(withDuration: 0.1) {
            self.transform = .identity
        }
    }
}
```

---

## Platform-Specific Considerations

### iOS vs Web Differences

| Aspect | Web | iOS Native |
|--------|-----|------------|
| **Base Font Size** | 14px | 17px (iOS Body) |
| **Touch Targets** | 40px recommended | 44px required (HIG) |
| **Safe Areas** | CSS env() | UIEdgeInsets |
| **Dark Mode** | Primary theme | Adaptive (light/dark) |
| **Typography** | Inter font | SF Pro (system) |
| **Toggle Height** | 24px | 31px (UISwitch) |
| **Navigation Height** | 56px desktop, 48px mobile | 44px + safe area |
| **Border Radius** | 8px standard | 10-20px (more rounded) |

### Performance Optimizations

```swift
// Use @State for local UI state
@State private var isPressed = false

// Use @StateObject for observable objects
@StateObject private var viewModel = K1ViewModel()

// Use LazyVStack for long lists
LazyVStack(spacing: K1Spacing.md) {
    ForEach(items) { item in
        K1Card { ... }
    }
}
```

### Accessibility

```swift
// VoiceOver Support
Text("Important Text")
    .accessibilityLabel("Accessible description")
    .accessibilityHint("Tap to perform action")

// Dynamic Type Support
Text("Body Text")
    .font(.k1BodyDynamic)

// Minimum Touch Targets
Button(action: {}) {
    Image(systemName: "star")
}
.frame(minWidth: 44, minHeight: 44)
```

---

## Testing & Validation

### Color Appearance Testing

```swift
#Preview {
    VStack(spacing: K1Spacing.lg) {
        Text("Light Mode")
            .font(.k1H2)
            .foregroundColor(.k1Text)
        
        HStack(spacing: K1Spacing.md) {
            Color.k1Accent.frame(width: 50, height: 50)
            Color.k1Success.frame(width: 50, height: 50)
            Color.k1Error.frame(width: 50, height: 50)
        }
    }
    .padding()
    .background(Color.k1Bg)
    .preferredColorScheme(.light)
}

#Preview("Dark Mode") {
    VStack(spacing: K1Spacing.lg) {
        Text("Dark Mode")
            .font(.k1H2)
            .foregroundColor(.k1Text)
        
        HStack(spacing: K1Spacing.md) {
            Color.k1Accent.frame(width: 50, height: 50)
            Color.k1Success.frame(width: 50, height: 50)
            Color.k1Error.frame(width: 50, height: 50)
        }
    }
    .padding()
    .background(Color.k1Bg)
    .preferredColorScheme(.dark)
}
```

---

**Last Updated:** October 27, 2025  
**iOS Deployment Target:** iOS 15.0+  
**SwiftUI Version:** 3.0+
