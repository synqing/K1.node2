#include "logger.h"
#include <cstdio>
#include <cstring>

// ============================================================================
// STATIC STATE - All logging state in one place, <2KB RAM
// ============================================================================

namespace Logger {

// Mutex for thread-safe serial access
static SemaphoreHandle_t log_mutex = nullptr;

// Static buffers - no dynamic allocation
static char message_buffer[LOG_MESSAGE_BUFFER_SIZE];
static char format_buffer[LOG_FORMAT_BUFFER_SIZE];
static char timestamp_buffer[LOG_MAX_TIMESTAMP_LEN];

// Last flush time for batching (if enabled)
static uint32_t last_flush_ms = 0;

// Tag filtering table (only if enabled)
#if LOG_ENABLE_TAG_FILTERING
static struct {
    char tag;
    bool enabled;
} tag_filter[] = {
    {TAG_AUDIO,   true},
    {TAG_I2S,     true},
    {TAG_LED,     true},
    {TAG_GPU,     true},
    {TAG_TEMPO,   true},
    {TAG_BEAT,    true},
    {TAG_SYNC,    true},
    {TAG_WIFI,    true},
    {TAG_WEB,     true},
    {TAG_CORE0,   true},
    {TAG_CORE1,   true},
    {TAG_MEMORY,  true},
    {TAG_PROFILE, true},
};
static const size_t tag_filter_count = sizeof(tag_filter) / sizeof(tag_filter[0]);
#endif

// ============================================================================
// IMPLEMENTATION
// ============================================================================

void init() {
    // Create mutex for thread-safe logging
    if (log_mutex == nullptr) {
        log_mutex = xSemaphoreCreateMutex();
        if (log_mutex == nullptr) {
            // Fallback: continue without mutex (degraded mode)
            // This should never happen on ESP32 with normal memory
        }
    }

    // Initialize Serial at configured baud rate
    Serial.begin(LOG_SERIAL_BAUD);

    // Give Serial time to initialize
    delay(100);

    // Print initialization message
    Serial.println("\n========================================");
    Serial.println("K1.reinvented Logging System Initialized");
    Serial.println("========================================\n");
}

// ============================================================================
// TIMESTAMP GENERATION
// ============================================================================

const char* get_timestamp() {
    uint32_t ms = millis();
    uint32_t total_seconds = ms / 1000;
    uint32_t milliseconds = ms % 1000;

    // Convert total seconds to HH:MM:SS
    // Since millis() rolls over every ~49 days, we just use modulo per day
    uint32_t seconds_per_day = 86400;
    uint32_t seconds_in_day = total_seconds % seconds_per_day;

    uint32_t hours = seconds_in_day / 3600;
    uint32_t minutes = (seconds_in_day % 3600) / 60;
    uint32_t seconds = seconds_in_day % 60;

    snprintf(timestamp_buffer, LOG_MAX_TIMESTAMP_LEN, "%02lu:%02lu:%02lu.%03lu",
             hours, minutes, seconds, milliseconds);

    return timestamp_buffer;
}

// ============================================================================
// TAG FILTERING
// ============================================================================

static bool is_tag_enabled(char tag) {
#if LOG_ENABLE_TAG_FILTERING
    for (size_t i = 0; i < tag_filter_count; i++) {
        if (tag_filter[i].tag == tag) {
            return tag_filter[i].enabled;
        }
    }
    // Unknown tag - allow by default
    return true;
#else
    // Tag filtering disabled at compile time
    (void)tag;  // Suppress unused parameter warning
    return true;
#endif
}

// ============================================================================
// SEVERITY LEVEL UTILITIES
// ============================================================================

static const char* severity_to_string(uint8_t severity) {
    switch (severity) {
        case LOG_LEVEL_ERROR: return "ERROR";
        case LOG_LEVEL_WARN:  return "WARN ";
        case LOG_LEVEL_INFO:  return "INFO ";
        case LOG_LEVEL_DEBUG: return "DEBUG";
        default:              return "???? ";
    }
}

static const char* severity_to_color(uint8_t severity) {
    switch (severity) {
        case LOG_LEVEL_ERROR: return COLOR_ERROR;
        case LOG_LEVEL_WARN:  return COLOR_WARN;
        case LOG_LEVEL_INFO:  return COLOR_INFO;
        case LOG_LEVEL_DEBUG: return COLOR_DEBUG;
        default:              return COLOR_RESET;
    }
}

// ============================================================================
// CORE LOGGING FUNCTIONS
// ============================================================================

void log_printf(char tag, uint8_t severity, const char* format, ...) {
	va_list args;
	va_start(args, format);
	log_internal(tag, severity, format, args);
	va_end(args);
}

void log_internal(char tag, uint8_t severity, const char* format, va_list args) {
    // Quick-exit if tag is disabled
    if (!is_tag_enabled(tag)) {
        return;
    }

    // Format the user's message into format_buffer first
    // This prevents vsnprintf from walking off the end if format is malicious
    int format_len = vsnprintf(format_buffer, LOG_FORMAT_BUFFER_SIZE, format, args);
    if (format_len < 0) {
        format_len = 0;
    }
    if (format_len >= LOG_FORMAT_BUFFER_SIZE) {
        format_len = LOG_FORMAT_BUFFER_SIZE - 1;
    }
    format_buffer[format_len] = '\0';

    // Now construct the full log message
    // Format: [TIME] [SEV] [TAG] message
    const char* time_str = get_timestamp();
    const char* sev_str = severity_to_string(severity);
    const char* color_sev = severity_to_color(severity);
    const char* color_tag = COLOR_TAG;
    const char* color_time = COLOR_TIME;
    const char* color_reset = COLOR_RESET;

    // Build the message in message_buffer
    int msg_len = snprintf(
        message_buffer,
        LOG_MESSAGE_BUFFER_SIZE,
        "%s[%s]%s %s%s%s [%c] %s%s\n",
        color_time,
        time_str,
        color_reset,
        color_sev,
        sev_str,
        color_reset,
        tag,
        format_buffer,
        color_reset
    );

    if (msg_len < 0 || msg_len >= LOG_MESSAGE_BUFFER_SIZE) {
        // Truncation occurred - this is acceptable, we'll output what we have
        msg_len = LOG_MESSAGE_BUFFER_SIZE - 1;
        message_buffer[msg_len] = '\0';
    }

    // ========================================================================
    // THREAD-SAFE SERIAL OUTPUT
    // ========================================================================
    // Acquire mutex to ensure atomic message transmission
    // This prevents multiple threads from interleaving log output

    if (log_mutex != nullptr) {
        if (xSemaphoreTake(log_mutex, pdMS_TO_TICKS(LOG_MUTEX_WAIT_MS)) == pdTRUE) {
            // Mutex acquired - safe to write to Serial
            Serial.write((const uint8_t*)message_buffer, strlen(message_buffer));
            Serial.flush();
            xSemaphoreGive(log_mutex);
        } else {
            // Mutex timeout - log in degraded mode without synchronization
            // This prevents deadlock if logging is called from ISR or during boot
            Serial.write((const uint8_t*)message_buffer, strlen(message_buffer));
        }
    } else {
        // Mutex not initialized - output directly (degraded mode)
        Serial.write((const uint8_t*)message_buffer, strlen(message_buffer));
    }
}

// ============================================================================
// FLUSH OPERATION
// ============================================================================

void flush() {
    if (log_mutex != nullptr) {
        if (xSemaphoreTake(log_mutex, pdMS_TO_TICKS(LOG_MUTEX_WAIT_MS)) == pdTRUE) {
            Serial.flush();
            xSemaphoreGive(log_mutex);
        }
    } else {
        Serial.flush();
    }
}

} // namespace Logger
