#ifndef HARDWARE_PERF_COUNTERS_HPP
#define HARDWARE_PERF_COUNTERS_HPP

#include <cstdint>
#include <vector>
#include <string>
#include <stdexcept>
#include <cstring>

#ifdef __linux__
#include <linux/perf_event.h>
#include <linux/hw_breakpoint.h>
#include <sys/syscall.h>
#include <unistd.h>
#include <sys/ioctl.h>
#endif

namespace dsp {

enum class PerfEvent {
    CYCLES,              // Total CPU cycles
    INSTRUCTIONS,        // Total instructions retired
    CACHE_REFERENCES,    // Cache accesses
    CACHE_MISSES,        // Cache misses
    BRANCH_INSTRUCTIONS, // Branch instructions
    BRANCH_MISSES,       // Branch mispredictions
    L1D_READ_MISSES,     // L1 data cache read misses
    L1I_READ_MISSES,     // L1 instruction cache misses
    LLC_READ_MISSES,     // Last level cache read misses
    LLC_WRITE_MISSES     // Last level cache write misses
};

struct PerfCounters {
    uint64_t cycles;
    uint64_t instructions;
    uint64_t cache_references;
    uint64_t cache_misses;
    uint64_t branch_instructions;
    uint64_t branch_misses;

    double ipc() const {
        return (cycles > 0) ? static_cast<double>(instructions) / cycles : 0.0;
    }

    double cache_miss_rate() const {
        return (cache_references > 0) ?
            static_cast<double>(cache_misses) / cache_references : 0.0;
    }

    double branch_miss_rate() const {
        return (branch_instructions > 0) ?
            static_cast<double>(branch_misses) / branch_instructions : 0.0;
    }
};

class HardwarePerfCounters {
public:
    HardwarePerfCounters() {
#ifdef __linux__
        init_linux_perf();
#elif defined(__APPLE__)
        // macOS doesn't support perf_event_open - use dtrace or no-op
        use_fallback_ = true;
#else
        use_fallback_ = true;
#endif
    }

    ~HardwarePerfCounters() {
#ifdef __linux__
        for (int fd : event_fds_) {
            if (fd >= 0) {
                close(fd);
            }
        }
#endif
    }

    // Start counting performance events
    void start() {
#ifdef __linux__
        if (!use_fallback_) {
            for (int fd : event_fds_) {
                if (fd >= 0) {
                    ioctl(fd, PERF_EVENT_IOC_RESET, 0);
                    ioctl(fd, PERF_EVENT_IOC_ENABLE, 0);
                }
            }
        }
#endif
    }

    // Stop counting and read results
    PerfCounters stop() {
        PerfCounters counters = {};

#ifdef __linux__
        if (!use_fallback_) {
            for (size_t i = 0; i < event_fds_.size(); i++) {
                int fd = event_fds_[i];
                if (fd >= 0) {
                    ioctl(fd, PERF_EVENT_IOC_DISABLE, 0);

                    uint64_t count;
                    if (read(fd, &count, sizeof(count)) == sizeof(count)) {
                        switch (i) {
                            case 0: counters.cycles = count; break;
                            case 1: counters.instructions = count; break;
                            case 2: counters.cache_references = count; break;
                            case 3: counters.cache_misses = count; break;
                            case 4: counters.branch_instructions = count; break;
                            case 5: counters.branch_misses = count; break;
                        }
                    }
                }
            }
        }
#endif

        return counters;
    }

    // Check if hardware counters are available
    bool is_available() const {
        return !use_fallback_;
    }

    // Get last error message
    std::string get_error() const {
        return error_msg_;
    }

private:
    bool use_fallback_ = false;
    std::string error_msg_;
    std::vector<int> event_fds_;

#ifdef __linux__
    void init_linux_perf() {
        // Try to open perf_event file descriptors
        event_fds_.resize(6, -1);

        // PERF_TYPE_HARDWARE events
        std::vector<uint64_t> hw_events = {
            PERF_COUNT_HW_CPU_CYCLES,
            PERF_COUNT_HW_INSTRUCTIONS,
            PERF_COUNT_HW_CACHE_REFERENCES,
            PERF_COUNT_HW_CACHE_MISSES,
            PERF_COUNT_HW_BRANCH_INSTRUCTIONS,
            PERF_COUNT_HW_BRANCH_MISSES
        };

        for (size_t i = 0; i < hw_events.size(); i++) {
            struct perf_event_attr pe;
            memset(&pe, 0, sizeof(pe));
            pe.type = PERF_TYPE_HARDWARE;
            pe.size = sizeof(pe);
            pe.config = hw_events[i];
            pe.disabled = 1;
            pe.exclude_kernel = 1;
            pe.exclude_hv = 1;

            int fd = static_cast<int>(syscall(__NR_perf_event_open, &pe, 0, -1, -1, 0));
            if (fd < 0) {
                error_msg_ = "Failed to open perf event (may need CAP_PERFMON capability)";
                use_fallback_ = true;
                return;
            }

            event_fds_[i] = fd;
        }
    }
#endif
};

} // namespace dsp

#endif // HARDWARE_PERF_COUNTERS_HPP
