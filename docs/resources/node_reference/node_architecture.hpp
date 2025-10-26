// K1.reinvented Node Architecture
// Zero-overhead compile-time graph system
#pragma once

#include <cstdint>
#include <type_traits>

// Forward declarations
struct CRGBF {
    float r, g, b;
    constexpr CRGBF(float r, float g, float b) : r(r), g(g), b(b) {}
};

namespace nodes {

// ============================================================================
// Core Node Concept - Everything is a compile-time type
// ============================================================================

template<typename T>
struct NodeTraits {
    using output_type = typename T::output_type;
    static constexpr bool is_generator = T::is_generator;
    static constexpr int input_count = T::input_count;
};

// ============================================================================
// Value Containers - Hold compile-time or runtime values
// ============================================================================

template<typename T>
struct Value {
    T value;
    constexpr Value(T v) : value(v) {}
    constexpr operator T() const { return value; }
};

template<auto V>
struct Literal {
    using output_type = decltype(V);
    static constexpr output_type value = V;
    static constexpr bool is_generator = true;
    static constexpr int input_count = 0;
    
    template<typename Context>
    static constexpr output_type compute(Context&) {
        return value;
    }
};

// ============================================================================
// Context - Runtime state passed through graph
// ============================================================================

struct Context {
    int led_index;
    int total_leds;
    float time;
    
    constexpr float position() const {
        return float(led_index) / float(total_leds);
    }
};

// ============================================================================
// Generator Nodes - No inputs, produce values from context
// ============================================================================

struct Position {
    using output_type = float;
    static constexpr bool is_generator = true;
    static constexpr int input_count = 0;
    
    template<typename Context>
    static inline float compute(Context& ctx) {
        return ctx.position();
    }
};

struct Time {
    using output_type = float;
    static constexpr bool is_generator = true;
    static constexpr int input_count = 0;
    
    template<typename Context>
    static inline float compute(Context& ctx) {
        return ctx.time;
    }
};

struct Index {
    using output_type = int;
    static constexpr bool is_generator = true;
    static constexpr int input_count = 0;
    
    template<typename Context>
    static inline int compute(Context& ctx) {
        return ctx.led_index;
    }
};

// ============================================================================
// Transform Nodes - Take inputs, produce outputs
// ============================================================================

template<typename In1, typename In2>
struct Add {
    using output_type = decltype(std::declval<typename In1::output_type>() + 
                                 std::declval<typename In2::output_type>());
    static constexpr bool is_generator = false;
    static constexpr int input_count = 2;
    
    template<typename Context>
    static inline output_type compute(Context& ctx) {
        return In1::compute(ctx) + In2::compute(ctx);
    }
};

template<typename In1, typename In2>
struct Multiply {
    using output_type = decltype(std::declval<typename In1::output_type>() * 
                                 std::declval<typename In2::output_type>());
    static constexpr bool is_generator = false;
    static constexpr int input_count = 2;
    
    template<typename Context>
    static inline output_type compute(Context& ctx) {
        return In1::compute(ctx) * In2::compute(ctx);
    }
};

template<typename Input>
struct Sin {
    using output_type = float;
    static constexpr bool is_generator = false;
    static constexpr int input_count = 1;
    
    template<typename Context>
    static inline float compute(Context& ctx) {
        // FastLED optimization: convert to uint8 phase
        float input = Input::compute(ctx);
        uint8_t phase = uint8_t(input * 255.0f);
        // Use lookup table (would be sin8() in FastLED)
        return float(phase) / 255.0f; // Simplified - use actual sin8
    }
};

template<typename Value, typename Min, typename Max>
struct Clamp {
    using output_type = typename Value::output_type;
    static constexpr bool is_generator = false;
    static constexpr int input_count = 3;
    
    template<typename Context>
    static inline output_type compute(Context& ctx) {
        auto v = Value::compute(ctx);
        auto min = Min::compute(ctx);
        auto max = Max::compute(ctx);
        return v < min ? min : (v > max ? max : v);
    }
};

// ============================================================================
// Color Nodes - Generate and transform colors
// ============================================================================

template<typename H, typename S, typename V>
struct HSVToRGB {
    using output_type = CRGBF;
    static constexpr bool is_generator = false;
    static constexpr int input_count = 3;
    
    template<typename Context>
    static inline CRGBF compute(Context& ctx) {
        float h = H::compute(ctx);
        float s = S::compute(ctx);
        float v = V::compute(ctx);
        
        // Fast HSV to RGB conversion
        // This would use FastLED's optimized version
        int i = int(h * 6.0f);
        float f = h * 6.0f - i;
        float p = v * (1.0f - s);
        float q = v * (1.0f - f * s);
        float t = v * (1.0f - (1.0f - f) * s);
        
        switch(i % 6) {
            case 0: return CRGBF(v, t, p);
            case 1: return CRGBF(q, v, p);
            case 2: return CRGBF(p, v, t);
            case 3: return CRGBF(p, q, v);
            case 4: return CRGBF(t, p, v);
            case 5: return CRGBF(v, p, q);
        }
        return CRGBF(0, 0, 0);
    }
};

// Palette node - compile-time color array
template<CRGBF... Colors>
struct Palette {
    static constexpr CRGBF colors[] = { Colors... };
    static constexpr int count = sizeof...(Colors);
};

template<typename PaletteT, typename Position>
struct PaletteMap {
    using output_type = CRGBF;
    static constexpr bool is_generator = false;
    static constexpr int input_count = 1;
    
    template<typename Context>
    static inline CRGBF compute(Context& ctx) {
        float pos = Position::compute(ctx);
        int index = int(pos * (PaletteT::count - 1));
        float fract = (pos * (PaletteT::count - 1)) - index;
        
        if (index >= PaletteT::count - 1) {
            return PaletteT::colors[PaletteT::count - 1];
        }
        
        // Linear interpolation between colors
        const CRGBF& c1 = PaletteT::colors[index];
        const CRGBF& c2 = PaletteT::colors[index + 1];
        
        return CRGBF(
            c1.r + (c2.r - c1.r) * fract,
            c1.g + (c2.g - c1.g) * fract,
            c1.b + (c2.b - c1.b) * fract
        );
    }
};

// ============================================================================
// Graph Composition - Build complex effects from simple nodes
// ============================================================================

// Chain nodes together - the magic of zero-cost abstraction
template<typename... Nodes>
struct Chain;

template<typename First>
struct Chain<First> {
    using output_type = typename First::output_type;
    
    template<typename Context>
    static inline output_type compute(Context& ctx) {
        return First::compute(ctx);
    }
};

template<typename First, typename... Rest>
struct Chain<First, Rest...> {
    using output_type = typename Chain<Rest...>::output_type;
    
    template<typename Context>
    static inline output_type compute(Context& ctx) {
        // This gets completely inlined by the compiler
        auto intermediate = First::compute(ctx);
        return Chain<Rest...>::compute(ctx);
    }
};

// ============================================================================
// Effect Compiler - Turn node graph into render function
// ============================================================================

template<typename Graph>
struct EffectCompiler {
    static inline void render(CRGBF* leds, int count, float time) {
        // This entire loop gets optimized into tight machine code
        for (int i = 0; i < count; i++) {
            Context ctx { i, count, time };
            leds[i] = Graph::compute(ctx);
        }
    }
};

// ============================================================================
// Example Effects Using The Node System
// ============================================================================

// Departure: Transformation gradient with time modulation
using DepartureEffect = PaletteMap<
    Palette<
        CRGBF(0.0f, 0.0f, 0.0f),    // Dark earth
        CRGBF(1.0f, 0.42f, 0.0f),   // Golden light  
        CRGBF(1.0f, 1.0f, 1.0f),    // Pure white
        CRGBF(0.0f, 0.5f, 0.0f)     // Emerald green
    >,
    Add<
        Position,
        Multiply<
            Sin<Multiply<Time, Literal<2.0f>>>,
            Literal<0.1f>
        >
    >
>;

// Lava: Intensity gradient with wave motion
using LavaEffect = PaletteMap<
    Palette<
        CRGBF(0.0f, 0.0f, 0.0f),    // Black
        CRGBF(0.5f, 0.0f, 0.0f),    // Deep red
        CRGBF(1.0f, 0.5f, 0.0f),    // Blazing orange
        CRGBF(1.0f, 1.0f, 1.0f)     // White hot
    >,
    Sin<
        Add<
            Multiply<Position, Literal<3.0f>>,
            Time
        >
    >
>;

// Twilight: Peaceful transition
using TwilightEffect = PaletteMap<
    Palette<
        CRGBF(1.0f, 0.75f, 0.4f),   // Warm amber
        CRGBF(0.5f, 0.0f, 0.5f),    // Deep purple
        CRGBF(0.0f, 0.0f, 0.2f)     // Midnight blue
    >,
    Position  // Simple gradient, no animation
>;

} // namespace nodes

// ============================================================================
// Usage - Everything compiles to optimal machine code
// ============================================================================

/*
void setup() {
    // Node graph is entirely compile-time
    // No allocations, no virtual calls, no overhead
}

void loop() {
    // This compiles to a tight loop with all operations inlined
    nodes::EffectCompiler<nodes::DepartureEffect>::render(
        leds, NUM_LEDS, millis() / 1000.0f
    );
}
*/
