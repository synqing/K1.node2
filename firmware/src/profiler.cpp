#include "profiler.h"
#include "logging/logger.h"

// Definitions
float FPS_CPU = 0;
float FPS_CPU_SAMPLES[16] = {0};

volatile uint64_t ACCUM_RENDER_US = 0;
volatile uint64_t ACCUM_QUANTIZE_US = 0;
volatile uint64_t ACCUM_RMT_WAIT_US = 0;
volatile uint64_t ACCUM_RMT_TRANSMIT_US = 0;
volatile uint32_t FRAMES_COUNTED = 0;

void watch_cpu_fps() {
    uint32_t us_now = micros();
    static uint32_t last_call = 0;
    static uint8_t average_index = 0;

    if (last_call > 0) {
        uint32_t elapsed_us = us_now - last_call;
        FPS_CPU_SAMPLES[average_index % 16] = 1000000.0 / float(elapsed_us);
        average_index++;
        FRAMES_COUNTED++;

        // Calculate rolling average
        float sum = 0;
        for (int i = 0; i < 16; i++) {
            sum += FPS_CPU_SAMPLES[i];
        }
        FPS_CPU = sum / 16.0;
    }

    last_call = us_now;
}

void print_fps() {
    static uint32_t last_print = 0;
    uint32_t now = millis();

    if (now - last_print > 1000) {  // Print every second
        // Calculate per-frame averages
        float frames = FRAMES_COUNTED > 0 ? (float)FRAMES_COUNTED : 1.0f;
        float avg_render_ms = (float)ACCUM_RENDER_US / frames / 1000.0f;
        float avg_quantize_ms = (float)ACCUM_QUANTIZE_US / frames / 1000.0f;
        float avg_rmt_wait_ms = (float)ACCUM_RMT_WAIT_US / frames / 1000.0f;
        float avg_rmt_tx_ms = (float)ACCUM_RMT_TRANSMIT_US / frames / 1000.0f;

        LOG_DEBUG(TAG_PROFILE, "FPS: %.1f", FPS_CPU);
        LOG_DEBUG(TAG_PROFILE, "avg_ms render/quantize/wait/tx: %.2f / %.2f / %.2f / %.2f", avg_render_ms, avg_quantize_ms, avg_rmt_wait_ms, avg_rmt_tx_ms);

        // Reset accumulators
        ACCUM_RENDER_US = 0;
        ACCUM_QUANTIZE_US = 0;
        ACCUM_RMT_WAIT_US = 0;
        ACCUM_RMT_TRANSMIT_US = 0;
        FRAMES_COUNTED = 0;

        last_print = now;
    }
}