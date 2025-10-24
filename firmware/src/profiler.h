#pragma once

#include <Arduino.h>

// Simplified profiler - ONLY FPS monitoring
// No cycle counting, no complex profiling

float FPS_CPU = 0;
float FPS_CPU_SAMPLES[16] = {0};

void watch_cpu_fps() {
    uint32_t us_now = micros();
    static uint32_t last_call = 0;
    static uint8_t average_index = 0;

    if (last_call > 0) {
        uint32_t elapsed_us = us_now - last_call;
        FPS_CPU_SAMPLES[average_index % 16] = 1000000.0 / float(elapsed_us);
        average_index++;

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
        Serial.print("FPS: ");
        Serial.println(FPS_CPU, 1);
        last_print = now;
    }
}