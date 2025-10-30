#include "diagnostics.h"
#include <Arduino.h>

// Defaults: disabled, 5000ms interval
static volatile bool s_diag_enabled = false;
static volatile uint32_t s_diag_interval_ms = 5000;

void diag_set_enabled(bool enabled) {
    s_diag_enabled = enabled;
}

bool diag_is_enabled() {
    return s_diag_enabled;
}

void diag_set_interval_ms(uint32_t interval_ms) {
    s_diag_interval_ms = interval_ms ? interval_ms : 5000;
}

uint32_t diag_get_interval_ms() {
    return s_diag_interval_ms;
}

