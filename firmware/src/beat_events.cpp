#include "beat_events.h"
#include <Arduino.h>
#include <string.h>

// Simple ring buffer for beat events
static BeatEvent* s_buffer = nullptr;
static uint16_t s_capacity = 0;
static volatile uint16_t s_head = 0;  // write index
static volatile uint16_t s_tail = 0;  // read index
static volatile uint16_t s_count = 0;

// Latency probe
static volatile uint32_t s_probe_start_us = 0;
static volatile bool s_probe_logging_enabled = false;
static volatile uint32_t s_probe_last_print_ms = 0;
static volatile uint32_t s_probe_print_interval_ms = 5000; // default: 5s

// Last probe snapshot
static volatile uint32_t s_last_latency_us = 0;
static volatile uint32_t s_last_probe_timestamp_us = 0;
static char s_last_probe_label[32] = {0};

void beat_events_init(uint16_t capacity) {
    if (s_buffer) {
        delete[] s_buffer;
    }
    s_capacity = capacity ? capacity : 64;
    s_buffer = new BeatEvent[s_capacity];
    s_head = s_tail = s_count = 0;
    s_probe_start_us = 0;
}

bool beat_events_push(uint32_t timestamp_us, uint16_t confidence) {
    if (!s_buffer || s_capacity == 0) return false;

    BeatEvent ev = { timestamp_us, confidence };
    s_buffer[s_head] = ev;
    s_head = (s_head + 1) % s_capacity;

    if (s_count < s_capacity) {
        s_count++;
        return true;
    } else {
        // Overwrite oldest when full
        s_tail = (s_tail + 1) % s_capacity;
        return false; // indicate overwrite
    }
}

bool beat_events_pop(BeatEvent* out) {
    if (!out || s_count == 0) return false;
    *out = s_buffer[s_tail];
    s_tail = (s_tail + 1) % s_capacity;
    s_count--;
    return true;
}

uint16_t beat_events_count() {
    return s_count;
}

uint16_t beat_events_capacity() {
    return s_capacity;
}

uint16_t beat_events_peek(BeatEvent* out, uint16_t max) {
    if (!out || max == 0 || s_count == 0) return 0;
    // Snapshot tail and count to avoid inconsistent traversal
    uint16_t local_tail = s_tail;
    uint16_t local_count = s_count;
    uint16_t to_copy = (local_count < max) ? local_count : max;
    for (uint16_t i = 0; i < to_copy; ++i) {
        uint16_t idx = (local_tail + i) % s_capacity;
        out[i] = s_buffer[idx];
    }
    return to_copy;
}

void beat_events_probe_start() {
    s_probe_start_us = (uint32_t)esp_timer_get_time();
}

void beat_events_probe_end(const char* label) {
    if (s_probe_start_us == 0) return;
    uint32_t now = (uint32_t)esp_timer_get_time();
    uint32_t delta_us = now - s_probe_start_us;
    float delta_ms = delta_us / 1000.0f;
    // Update last probe snapshot
    s_last_latency_us = delta_us;
    s_last_probe_timestamp_us = now;
    if (label) {
        strncpy(s_last_probe_label, label, sizeof(s_last_probe_label) - 1);
        s_last_probe_label[sizeof(s_last_probe_label) - 1] = '\0';
    } else {
        s_last_probe_label[0] = '\0';
    }
    // Rate-limit probe printing
    if (s_probe_logging_enabled) {
        uint32_t now_ms = millis();
        if ((now_ms - s_probe_last_print_ms) >= s_probe_print_interval_ms) {
            Serial.printf("[latency] %s: %.2f ms (events=%u)\n", label ? label : "probe", delta_ms, (unsigned)beat_events_count());
            s_probe_last_print_ms = now_ms;
        }
    }
    s_probe_start_us = 0;
}

void beat_events_set_probe_logging(bool enabled) {
    s_probe_logging_enabled = enabled;
}

void beat_events_set_probe_interval_ms(uint32_t interval_ms) {
    s_probe_print_interval_ms = interval_ms ? interval_ms : 5000;
}

bool beat_events_probe_active() {
    return s_probe_start_us != 0;
}

uint32_t beat_events_last_latency_us() {
    return s_last_latency_us;
}

uint32_t beat_events_last_probe_timestamp_us() {
    return s_last_probe_timestamp_us;
}

const char* beat_events_last_probe_label() {
    return s_last_probe_label;
}
