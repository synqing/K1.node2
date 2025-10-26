#pragma once

#include <Arduino.h>

// Simplified profiler - FPS monitoring + micro-timings

extern float FPS_CPU;
extern float FPS_CPU_SAMPLES[16];

// Micro-timing accumulators (us)
// Reset once per print cycle
extern volatile uint64_t ACCUM_RENDER_US;
extern volatile uint64_t ACCUM_QUANTIZE_US;
extern volatile uint64_t ACCUM_RMT_WAIT_US;
extern volatile uint64_t ACCUM_RMT_TRANSMIT_US;
extern volatile uint32_t FRAMES_COUNTED;

void watch_cpu_fps();
void print_fps();