#pragma once

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <cstdarg>
#include "log_config.h"

// ============================================================================
// K1.reinvented Logger - Thread-safe, tag-based, severity-filtered logging
// ============================================================================
//
// DESIGN PRINCIPLES:
// - Minimal RAM footprint (<2KB total)
// - No dynamic memory allocation
// - Thread-safe via FreeRTOS mutex
// - Compile-time verbosity level = zero overhead for disabled messages
// - Printf-style formatting with vsnprintf
// - Atomic serial transmission
// - Tag-based filtering and color formatting
//
// USAGE:
//   LOG_ERROR(TAG_AUDIO, "Failed to init: %d", error_code);
//   LOG_WARN(TAG_I2S, "Sample rate: %lu Hz", sample_rate);
//   LOG_INFO(TAG_BEAT, "BPM detected: %.1f", bpm_value);
//   LOG_DEBUG(TAG_SYNC, "Frame %u ready", frame_count);
//

namespace Logger {

// ============================================================================
// INITIALIZATION
// ============================================================================
/// Initialize the logging system. Call once from setup().
/// Sets up Serial at configured baud rate and creates the output mutex.
void init();

// ============================================================================
// LOW-LEVEL LOGGING FUNCTIONS
// ============================================================================
/// Internal logging function. Used by macros below. Not called directly.
/// Tag: single character identifying the subsystem (TAG_AUDIO, etc.)
/// Severity: LOG_LEVEL_ERROR, LOG_LEVEL_WARN, LOG_LEVEL_INFO, LOG_LEVEL_DEBUG
/// Format: printf-style format string
/// ...: variable arguments
void log_internal(char tag, uint8_t severity, const char* format, va_list args);

/// Printf-style logging function (supports 0+ variadic arguments)
/// This is a wrapper that handles variadic arguments correctly
void log_printf(char tag, uint8_t severity, const char* format, ...) __attribute__((format(printf, 3, 4)));

// ============================================================================
// TIMESTAMP AND FORMATTING UTILITIES
// ============================================================================
/// Generate a timestamp string in format HH:MM:SS.mmm
/// Returns static buffer (valid until next call to this function)
const char* get_timestamp();

/// Flush any pending serial data (for batched output)
void flush();

} // namespace Logger

// ============================================================================
// LOGGING MACROS - Call these from your code
// ============================================================================
// Each macro includes:
// - Compile-time severity check (elimination of disabled messages)
// - Tag parameter for subsystem identification
// - Printf-style format and arguments
// - Automatic thread synchronization

#if LOG_LEVEL >= LOG_LEVEL_ERROR
#define LOG_ERROR(tag, fmt, ...) Logger::log_printf(tag, LOG_LEVEL_ERROR, fmt, ##__VA_ARGS__)
#else
#define LOG_ERROR(tag, fmt, ...) do {} while(0)
#endif

#if LOG_LEVEL >= LOG_LEVEL_WARN
#define LOG_WARN(tag, fmt, ...) Logger::log_printf(tag, LOG_LEVEL_WARN, fmt, ##__VA_ARGS__)
#else
#define LOG_WARN(tag, fmt, ...) do {} while(0)
#endif

#if LOG_LEVEL >= LOG_LEVEL_INFO
#define LOG_INFO(tag, fmt, ...) Logger::log_printf(tag, LOG_LEVEL_INFO, fmt, ##__VA_ARGS__)
#else
#define LOG_INFO(tag, fmt, ...) do {} while(0)
#endif

#if LOG_LEVEL >= LOG_LEVEL_DEBUG
#define LOG_DEBUG(tag, fmt, ...) Logger::log_printf(tag, LOG_LEVEL_DEBUG, fmt, ##__VA_ARGS__)
#else
#define LOG_DEBUG(tag, fmt, ...) do {} while(0)
#endif

// ============================================================================
// CONVENIENCE MACROS - Omit tag parameter when not needed
// ============================================================================
#define LOG_ERR(fmt, ...) LOG_ERROR(TAG_CORE0, fmt, ##__VA_ARGS__)
#define LOG_WRN(fmt, ...) LOG_WARN(TAG_CORE0, fmt, ##__VA_ARGS__)
#define LOG_INF(fmt, ...) LOG_INFO(TAG_CORE0, fmt, ##__VA_ARGS__)
#define LOG_DBG(fmt, ...) LOG_DEBUG(TAG_CORE0, fmt, ##__VA_ARGS__)
