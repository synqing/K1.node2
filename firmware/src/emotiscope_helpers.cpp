// ============================================================================
// EMOTISCOPE HELPER FUNCTIONS - Implementation
// ============================================================================

#include "emotiscope_helpers.h"

#include "audio/goertzel.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstring>

namespace {

constexpr std::size_t kMaxFxDots = 192;

struct FxDotState {
	float position = 0.5f;
	bool initialized = false;
};

std::array<FxDotState, kMaxFxDots> g_fx_dots{};

inline std::size_t resolve_dot_index(uint16_t slot) {
	if (g_fx_dots.empty()) {
		return 0;
	}
	return std::min<std::size_t>(slot, g_fx_dots.size() - 1);
}

inline void draw_line(CRGBF* layer, float start_pos, float end_pos, const CRGBF& color, float opacity) {
	if (layer == nullptr || opacity <= 0.0f) {
		return;
	}

	float x1 = clip_float(start_pos) * static_cast<float>(NUM_LEDS - 1);
	float x2 = clip_float(end_pos) * static_cast<float>(NUM_LEDS - 1);

	if (x1 > x2) {
		std::swap(x1, x2);
	}

	int ix1 = static_cast<int>(std::floor(x1));
	int ix2 = static_cast<int>(std::ceil(x2));
	float start_coverage = 1.0f - (x1 - static_cast<float>(ix1));
	float end_coverage = x2 - std::floor(x2);

	bool lighten = !(color.r == 0.0f && color.g == 0.0f && color.b == 0.0f);

	for (int i = ix1; i <= ix2; ++i) {
		if (i < 0 || i >= NUM_LEDS) {
			continue;
		}

		float mix = opacity;
		if (i == ix1) {
			mix *= start_coverage;
		} else if (i == ix2) {
			mix *= end_coverage;
		}

		mix = std::sqrt(std::max(0.0f, mix));

		if (lighten) {
			layer[i].r += color.r * mix;
			layer[i].g += color.g * mix;
			layer[i].b += color.b * mix;
		} else {
			layer[i].r = layer[i].r * (1.0f - mix) + color.r * mix;
			layer[i].g = layer[i].g * (1.0f - mix) + color.g * mix;
			layer[i].b = layer[i].b * (1.0f - mix) + color.b * mix;
		}
	}
}

}  // namespace

void draw_dot(CRGBF* leds, uint16_t dot_index, CRGBF color, float position, float opacity) {
	if (leds == nullptr) {
		return;
	}

	float clamped_position = clip_float(position);
	opacity = clip_float(opacity);
	if (opacity <= 0.0f) {
		return;
	}

	const std::size_t idx = resolve_dot_index(dot_index);
	FxDotState& state = g_fx_dots[idx];

	if (!state.initialized) {
		state.position = clamped_position;
		state.initialized = true;
	}

	draw_line(leds, state.position, clamped_position, color, opacity);

	state.position = clamped_position;
}

float get_color_range_hue(float progress) {
	progress = clip_float(progress);
	return progress * 0.66f;
}

CRGBF hsv_enhanced(float h, float s, float v) {
	h = std::fmod(h, 1.0f);
	if (h < 0.0f) {
		h += 1.0f;
	}

	s = clip_float(s);
	v = clip_float(v);

	if (s < 0.001f) {
		return CRGBF(v, v, v);
	}

	float h_sector = h * 6.0f;
	int sector = static_cast<int>(h_sector);
	float f = h_sector - static_cast<float>(sector);

	float p = v * (1.0f - s);
	float q = v * (1.0f - s * f);
	float t = v * (1.0f - s * (1.0f - f));

	switch (sector % 6) {
		case 0: return CRGBF(v, t, p);
		case 1: return CRGBF(q, v, p);
		case 2: return CRGBF(p, v, t);
		case 3: return CRGBF(p, q, v);
		case 4: return CRGBF(t, p, v);
		case 5: return CRGBF(v, p, q);
		default: return CRGBF(0.0f, 0.0f, 0.0f);
	}
}

void draw_sprite(CRGBF* target, CRGBF* source, int target_size,
                 int source_size, float position, float alpha) {
	if (target == nullptr || source == nullptr ||
	    target_size <= 0 || source_size <= 0 || alpha <= 0.0f) {
		return;
	}

	float position_whole_f = std::floor(position);
	int position_whole = static_cast<int>(position_whole_f);
	float position_fract = position - position_whole_f;

	for (int i = 0; i < source_size; ++i) {
		int pos_left = i + position_whole;
		int pos_right = pos_left + 1;

		float mix_right = position_fract;
		float mix_left = 1.0f - mix_right;

		if (pos_left >= 0 && pos_left < target_size) {
			target[pos_left].r += source[i].r * mix_left * alpha;
			target[pos_left].g += source[i].g * mix_left * alpha;
			target[pos_left].b += source[i].b * mix_left * alpha;
		}

		if (pos_right >= 0 && pos_right < target_size) {
			target[pos_right].r += source[i].r * mix_right * alpha;
			target[pos_right].g += source[i].g * mix_right * alpha;
			target[pos_right].b += source[i].b * mix_right * alpha;
		}
	}
}

void draw_sprite_float(float* target, const float* source, int target_size,
                       int source_size, float position, float alpha) {
	if (target == nullptr || source == nullptr ||
	    target_size <= 0 || source_size <= 0 || alpha <= 0.0f) {
		return;
	}

	std::memset(target, 0, static_cast<std::size_t>(target_size) * sizeof(float));

	float position_whole_f = std::floor(position);
	int position_whole = static_cast<int>(position_whole_f);
	float position_fract = position - position_whole_f;

	for (int i = 0; i < source_size; ++i) {
		float sample = source[i] * alpha;
		int dst_idx = i + position_whole;

		if (dst_idx >= 0 && dst_idx < target_size) {
			target[dst_idx] += sample * (1.0f - position_fract);
		}

		int dst_idx_right = dst_idx + 1;
		if (dst_idx_right >= 0 && dst_idx_right < target_size) {
			target[dst_idx_right] += sample * position_fract;
		}
	}
}
