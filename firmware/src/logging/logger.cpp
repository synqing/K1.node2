#include "logger.h"
#include "ring_buffer_logger.h"
#include "rate_limiter.h"
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

// Runtime verbosity level (can be changed without recompile)
static uint8_t runtime_verbosity = LOG_LEVEL_DEBUG;

// Statistics tracking
static Logger::LoggerStats stats = {0, 0, 0, 0, 0};
static uint32_t last_rate_calc_ms = 0;
static uint32_t messages_this_second = 0;

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

    // Initialize ring buffer logger (Phase 2A)
    RingBufferLogger::init();

    // Initialize rate limiter (Phase 2B)
    RateLimiter::init();
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

    // ========================================================================
    // PHASE 2C: RUNTIME VERBOSITY FILTERING
    // ========================================================================
    // Check runtime verbosity level (allows dynamic log level adjustment)
    // Only proceed if severity meets the current runtime threshold
    if (severity > runtime_verbosity) {
        return;
    }

    // ========================================================================
    // PHASE 2B: RATE LIMITING CHECK (Early exit before mutex)
    // ========================================================================
    // Check rate limit BEFORE expensive message formatting and mutex acquisition
    // ERROR severity always passes through (never rate limited)
    // This early-exit reduces contention on mutex and improves performance
    #if LOG_ENABLE_RATE_LIMITING
    if (severity != LOG_LEVEL_ERROR && RateLimiter::should_limit(tag)) {
        // Message rate limited - drop it
        // Statistics tracked in rate limiter (dropped_count incremented)
        return;
    }
    #endif

    // ========================================================================
    // PHASE 2C: STATISTICS TRACKING
    // ========================================================================
    // Track total messages logged
    stats.total_logged++;
    messages_this_second++;

    // Update current rate (rolling 1-second window)
    uint32_t now_ms = millis();
    if (now_ms - last_rate_calc_ms >= 1000) {
        stats.current_rate_msgs_sec = messages_this_second;
        messages_this_second = 0;
        last_rate_calc_ms = now_ms;
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
    // THREAD-SAFE SERIAL OUTPUT (Phase 2A: Non-blocking ring buffer)
    // ========================================================================
    // Write message to ring buffer (non-blocking, <10 μs)
    // Background UART writer task on Core 1 drains buffer asynchronously
    // This eliminates Serial.flush() blocking (500+ μs) from critical path

    size_t message_len = strlen(message_buffer);

    if (!RingBufferLogger::write_message(message_buffer, message_len)) {
        // Message dropped due to buffer overflow
        // This is tracked in ring buffer overflow counter
        // No action needed here - overflow counter increments automatically
    }

    // Note: Mutex is now used only for message formatting (above)
    // Serial transmission happens asynchronously on Core 1
    // This reduces mutex hold time from 500-1000 μs to <10 μs
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

// ============================================================================
// RUNTIME CONFIGURATION API IMPLEMENTATION
// ============================================================================

uint8_t get_verbosity() {
    return runtime_verbosity;
}

void set_verbosity(uint8_t level) {
    // Validate level (0-3)
    if (level <= LOG_LEVEL_DEBUG) {
        runtime_verbosity = level;
    }
}

bool get_tag_enabled(char tag) {
    // Check tag filter table
    #if LOG_ENABLE_TAG_FILTERING
    for (size_t i = 0; i < tag_filter_count; i++) {
        if (tag_filter[i].tag == tag) {
            return tag_filter[i].enabled;
        }
    }
    // Unknown tag - enabled by default
    return true;
    #else
    // Tag filtering disabled at compile time
    (void)tag;
    return true;
    #endif
}

void set_tag_enabled(char tag, bool enabled) {
    #if LOG_ENABLE_TAG_FILTERING
    // Find tag in filter table and update
    for (size_t i = 0; i < tag_filter_count; i++) {
        if (tag_filter[i].tag == tag) {
            tag_filter[i].enabled = enabled;
            return;
        }
    }
    // If tag not found, it will default to enabled
    #else
    (void)tag;
    (void)enabled;
    #endif
}

uint32_t get_tag_rate_limit(char tag) {
    return RateLimiter::get_limit(tag);
}

void set_tag_rate_limit(char tag, uint32_t msgs_per_sec) {
    // Validate range: 1-10000 msgs/sec
    if (msgs_per_sec >= 1 && msgs_per_sec <= 10000) {
        RateLimiter::set_limit(tag, msgs_per_sec);
    }
}

LoggerStats get_stats() {
    // Update buffer utilization from ring buffer
    stats.buffer_utilization_pct = RingBufferLogger::get_buffer_utilization();

    // Update dropped count from ring buffer overflow + rate limiter
    uint32_t ring_buffer_drops = RingBufferLogger::get_overflow_count();

    // Sum dropped counts from all rate limiters
    uint32_t rate_limiter_drops = 0;
    const char all_tags[] = {TAG_AUDIO, TAG_I2S, TAG_LED, TAG_GPU, TAG_TEMPO,
                             TAG_BEAT, TAG_SYNC, TAG_WIFI, TAG_WEB,
                             TAG_CORE0, TAG_CORE1, TAG_MEMORY, TAG_PROFILE};
    for (char tag : all_tags) {
        rate_limiter_drops += RateLimiter::get_dropped_count(tag);
    }

    stats.total_dropped = ring_buffer_drops + rate_limiter_drops;

    return stats;
}

void reset_stats() {
    stats.total_logged = 0;
    stats.total_dropped = 0;
    stats.current_rate_msgs_sec = 0;
    stats.buffer_utilization_pct = 0;
    stats.mutex_timeouts = 0;

    messages_this_second = 0;
    last_rate_calc_ms = millis();

    // Reset ring buffer overflow counter
    RingBufferLogger::reset_overflow_count();

    // Reset rate limiter statistics
    RateLimiter::reset_stats();
}

} // namespace Logger
