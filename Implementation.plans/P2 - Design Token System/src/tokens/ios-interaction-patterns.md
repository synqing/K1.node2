# K1 iOS-Specific Interaction Patterns

**Platform:** iOS Native (SwiftUI/UIKit)  
**Purpose:** Adapt web interactions for iOS platform conventions

---

## Table of Contents

1. [Touch vs Hover](#touch-vs-hover)
2. [iOS Gesture Patterns](#ios-gesture-patterns)
3. [Sheet Presentations](#sheet-presentations)
4. [Haptic Feedback](#haptic-feedback)
5. [Safe Area Handling](#safe-area-handling)
6. [iOS-Specific Components](#ios-specific-components)

---

## Touch vs Hover

### Problem: iOS Has No Hover State

Web interfaces rely heavily on hover states (`:hover` pseudo-class) to indicate interactivity. iOS devices don't have a mouse cursor, so hover is impossible.

### Solution: Use Active/Pressed States

Replace hover with visual feedback on touch:

| Web Interaction | iOS Alternative |
|----------------|-----------------|
| **Hover** (scale 1.02, shadow) | **Not available** |
| **Active/Pressed** (scale 0.98) | **Touch Down** (opacity 0.8, scale 0.97) |
| **Focus** (outline ring) | **Touch Down** + **VoiceOver highlight** |

### Implementation

#### SwiftUI Touch Feedback
```swift
struct K1Button: View {
    let title: String
    let action: () -> Void
    @State private var isPressed = false
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.k1Button)
                .foregroundColor(Color(hex: "0F1115"))
                .frame(height: K1Sizing.buttonHeight)
                .frame(maxWidth: .infinity)
                .background(Color.k1Accent)
                .cornerRadius(K1Radius.md)
        }
        .buttonStyle(K1ButtonStyle(isPressed: $isPressed))
        .scaleEffect(isPressed ? 0.97 : 1.0)
        .opacity(isPressed ? 0.8 : 1.0)
        .animation(.easeOut(duration: 0.1), value: isPressed)
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

#### UIKit Touch Feedback
```swift
class K1Button: UIButton {
    override var isHighlighted: Bool {
        didSet {
            UIView.animate(withDuration: 0.1) {
                self.transform = self.isHighlighted ? 
                    CGAffineTransform(scaleX: 0.97, y: 0.97) : .identity
                self.alpha = self.isHighlighted ? 0.8 : 1.0
            }
        }
    }
}
```

---

## iOS Gesture Patterns

### Swipe Gestures

**Use Case:** Navigate, delete, or perform actions on list items

#### Swipe Actions on List Items
```swift
List {
    ForEach(items) { item in
        Text(item.title)
            .swipeActions(edge: .trailing) {
                Button(role: .destructive) {
                    deleteItem(item)
                } label: {
                    Label("Delete", systemImage: "trash")
                }
                
                Button {
                    archiveItem(item)
                } label: {
                    Label("Archive", systemImage: "archivebox")
                }
                .tint(Color.k1Accent2)
            }
    }
}
```

#### Custom Swipe Detection
```swift
struct SwipeableCard: View {
    @State private var offset: CGFloat = 0
    
    var body: some View {
        K1Card {
            Text("Swipe me!")
        }
        .offset(x: offset)
        .gesture(
            DragGesture()
                .onChanged { value in
                    offset = value.translation.width
                }
                .onEnded { value in
                    if value.translation.width < -100 {
                        // Swiped left
                        handleSwipeLeft()
                    } else if value.translation.width > 100 {
                        // Swiped right
                        handleSwipeRight()
                    }
                    
                    withAnimation(.spring()) {
                        offset = 0
                    }
                }
        )
    }
}
```

---

### Long Press Gesture

**Use Case:** Show context menus, enable selection mode, preview content

#### Context Menu (iOS 14+)
```swift
K1Card {
    VStack(alignment: .leading) {
        Text("Long Press Me")
            .font(.k1H3)
        Text("Press and hold for options")
            .font(.k1Small)
            .foregroundColor(.k1TextSecondary)
    }
}
.contextMenu {
    Button {
        editItem()
    } label: {
        Label("Edit", systemImage: "pencil")
    }
    
    Button {
        shareItem()
    } label: {
        Label("Share", systemImage: "square.and.arrow.up")
    }
    
    Divider()
    
    Button(role: .destructive) {
        deleteItem()
    } label: {
        Label("Delete", systemImage: "trash")
    }
}
```

#### Custom Long Press
```swift
struct LongPressCard: View {
    @State private var isLongPressing = false
    
    var body: some View {
        K1Card {
            Text("Item")
        }
        .scaleEffect(isLongPressing ? 1.05 : 1.0)
        .animation(.easeOut(duration: 0.2), value: isLongPressing)
        .onLongPressGesture(minimumDuration: 0.5) {
            // Haptic feedback
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            
            // Show options
            showActionSheet()
        } onPressingChanged: { pressing in
            isLongPressing = pressing
        }
    }
}
```

---

### Pinch to Zoom

**Use Case:** Zoom images, maps, or canvas content

```swift
struct ZoomableImage: View {
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    
    var body: some View {
        Image("example")
            .resizable()
            .scaledToFit()
            .scaleEffect(scale)
            .gesture(
                MagnificationGesture()
                    .onChanged { value in
                        scale = lastScale * value
                    }
                    .onEnded { value in
                        lastScale = scale
                        
                        // Limit zoom range
                        if scale < 1.0 {
                            withAnimation(.spring()) {
                                scale = 1.0
                                lastScale = 1.0
                            }
                        } else if scale > 4.0 {
                            withAnimation(.spring()) {
                                scale = 4.0
                                lastScale = 4.0
                            }
                        }
                    }
            )
    }
}
```

---

### Pull to Refresh

**Use Case:** Refresh list content

```swift
struct K1RefreshableList: View {
    @State private var items: [Item] = []
    
    var body: some View {
        List(items) { item in
            K1Card {
                Text(item.title)
            }
        }
        .refreshable {
            await refreshData()
        }
    }
    
    func refreshData() async {
        // Fetch new data
        items = await fetchItems()
    }
}
```

---

## Sheet Presentations

### Problem: Web Modals Don't Feel Native on iOS

Centered modals that dim the entire screen feel unnatural on iOS. Native iOS uses sheet presentations that slide up from the bottom.

### Solution: Use iOS Sheet Presentations

#### Bottom Sheet (SwiftUI)
```swift
struct ContentView: View {
    @State private var showSheet = false
    
    var body: some View {
        K1Button(title: "Show Options") {
            showSheet = true
        }
        .sheet(isPresented: $showSheet) {
            K1SheetContent()
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
    }
}

struct K1SheetContent: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: K1Spacing.lg) {
                Text("Sheet Title")
                    .font(.k1H2)
                
                // Content
                Text("Sheet content goes here")
                
                Spacer()
                
                K1Button(title: "Done") {
                    dismiss()
                }
            }
            .padding(K1Spacing.lg)
            .k1SafePadding([.bottom])
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
```

#### Sheet Sizes
```swift
// Small (1/4 screen)
.presentationDetents([.fraction(0.25)])

// Medium (1/2 screen)
.presentationDetents([.medium])

// Large (full screen)
.presentationDetents([.large])

// Multiple sizes (user can drag between)
.presentationDetents([.medium, .large])
```

#### Custom Sheet Corner Radius
```swift
.presentationCornerRadius(K1Radius.iosSheet) // 20px
```

---

## Haptic Feedback

### When to Use Haptic Feedback

| Action | Haptic Type | When to Use |
|--------|-------------|-------------|
| **Button Tap** | Impact (Light) | Any button press |
| **Toggle Switch** | Selection | State change on/off |
| **Success** | Notification (Success) | Form submitted, action completed |
| **Error** | Notification (Error) | Validation error, API failure |
| **Warning** | Notification (Warning) | Non-critical alert |
| **Slider Drag** | Selection | Each detent/step while dragging |
| **Delete/Destructive** | Impact (Heavy) | Destructive action confirmed |

### Implementation

#### Impact Feedback
```swift
// Light impact (button taps)
let generator = UIImpactFeedbackGenerator(style: .light)
generator.impactOccurred()

// Medium impact (medium actions)
let generator = UIImpactFeedbackGenerator(style: .medium)
generator.impactOccurred()

// Heavy impact (destructive actions)
let generator = UIImpactFeedbackGenerator(style: .heavy)
generator.impactOccurred()
```

#### Selection Feedback
```swift
// For toggles, sliders, steppers
let generator = UISelectionFeedbackGenerator()
generator.selectionChanged()
```

#### Notification Feedback
```swift
// Success
let generator = UINotificationFeedbackGenerator()
generator.notificationOccurred(.success)

// Warning
generator.notificationOccurred(.warning)

// Error
generator.notificationOccurred(.error)
```

### SwiftUI Integration
```swift
struct K1ButtonWithHaptics: View {
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            // Haptic feedback
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            
            // Action
            action()
        }) {
            Text(title)
        }
    }
}
```

---

## Safe Area Handling

### Safe Area Insets

iOS devices have notches, Dynamic Islands, and home indicators that create unsafe areas for content. Always respect safe area insets.

#### Automatic Safe Area (Default)
```swift
VStack {
    Text("Content")
}
// Automatically respects safe area
```

#### Ignore Safe Area
```swift
VStack {
    Text("Full Bleed Content")
}
.ignoresSafeArea(.container, edges: .all)
```

#### Custom Safe Area Padding
```swift
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

---

## iOS-Specific Components

### Tab Bar (Bottom Navigation)

iOS uses bottom tab bars instead of top navigation tabs.

```swift
struct K1TabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)
            
            StatsView()
                .tabItem {
                    Label("Stats", systemImage: "chart.bar.fill")
                }
                .tag(1)
            
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(2)
        }
        .accentColor(Color.k1Accent)
    }
}
```

#### Tab Bar Customization
```swift
init() {
    // Customize tab bar appearance
    let appearance = UITabBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = UIColor(Color.k1Surface)
    
    UITabBar.appearance().standardAppearance = appearance
    UITabBar.appearance().scrollEdgeAppearance = appearance
}
```

---

### Navigation Bar

```swift
struct K1NavigationView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                // Content
            }
            .navigationTitle("K1 Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        // Action
                    } label: {
                        Image(systemName: "plus")
                            .foregroundColor(Color.k1Accent)
                    }
                }
            }
        }
    }
}
```

#### Custom Navigation Bar
```swift
init() {
    let appearance = UINavigationBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = UIColor(Color.k1Surface)
    appearance.titleTextAttributes = [
        .foregroundColor: UIColor(Color.k1Text),
        .font: UIFont.k1H2()
    ]
    
    UINavigationBar.appearance().standardAppearance = appearance
    UINavigationBar.appearance().scrollEdgeAppearance = appearance
}
```

---

### Search Bar

```swift
struct K1SearchableList: View {
    @State private var searchText = ""
    @State private var items: [Item] = sampleItems
    
    var filteredItems: [Item] {
        if searchText.isEmpty {
            return items
        }
        return items.filter { $0.title.contains(searchText) }
    }
    
    var body: some View {
        NavigationView {
            List(filteredItems) { item in
                Text(item.title)
            }
            .searchable(text: $searchText, prompt: "Search items")
            .navigationTitle("Items")
        }
    }
}
```

---

### Action Sheet / Alert

```swift
struct K1ActionSheetExample: View {
    @State private var showActionSheet = false
    
    var body: some View {
        K1Button(title: "Show Options") {
            showActionSheet = true
        }
        .confirmationDialog("Choose an option", isPresented: $showActionSheet) {
            Button("Edit") {
                editItem()
            }
            
            Button("Share") {
                shareItem()
            }
            
            Button("Delete", role: .destructive) {
                deleteItem()
            }
            
            Button("Cancel", role: .cancel) {}
        }
    }
}
```

---

## Platform Detection

Detect iOS in SwiftUI to conditionally apply platform-specific behavior:

```swift
#if os(iOS)
// iOS-specific code
let buttonHeight = K1Sizing.buttonHeight // 44px
#else
// Non-iOS code
let buttonHeight: CGFloat = 40
#endif
```

### Device Detection
```swift
extension UIDevice {
    static var isIPhone: Bool {
        current.userInterfaceIdiom == .phone
    }
    
    static var isIPad: Bool {
        current.userInterfaceIdiom == .pad
    }
    
    static var hasNotch: Bool {
        // Devices with notch/Dynamic Island
        let window = UIApplication.shared.windows.first
        return (window?.safeAreaInsets.top ?? 0) > 20
    }
}
```

---

## Migration Checklist

When adapting web components to iOS:

- [ ] Remove all hover states (no mouse on iOS)
- [ ] Add touch feedback (opacity/scale on press)
- [ ] Replace centered modals with bottom sheets
- [ ] Add haptic feedback to interactions
- [ ] Respect safe area insets (notch, home indicator)
- [ ] Use 44px minimum touch targets
- [ ] Replace horizontal tabs with bottom tab bar
- [ ] Add swipe gestures where appropriate
- [ ] Add long-press context menus
- [ ] Test with VoiceOver enabled
- [ ] Support Dynamic Type (text scaling)
- [ ] Test on iPhone and iPad
- [ ] Test in light and dark mode

---

**Last Updated:** October 27, 2025  
**iOS Version:** iOS 15.0+  
**SwiftUI Version:** 3.0+  
**Status:** Production Ready ✅
