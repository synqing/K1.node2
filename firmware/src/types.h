#pragma once

// Phase A: Minimal types only
// Future phases (B, C, D) will add: command, freq, fx_dot, lightshow_mode,
// slider, toggle, menu_toggle, profiler_function, tempo, websocket_client,
// CRGB8, touch_pin, config

struct CRGBF {	// Floating point color channels (0.0-1.0)
				// Quantized to 8 bits with dithering in led_driver.h
	float r;
	float g;
	float b;
};