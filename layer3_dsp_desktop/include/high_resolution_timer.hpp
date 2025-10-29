#ifndef HIGH_RESOLUTION_TIMER_HPP
#define HIGH_RESOLUTION_TIMER_HPP

#include <chrono>
#include <cstdint>
#include <functional>
#include <vector>
#include <numeric>
#include <algorithm>
#include <thread>

#ifdef __APPLE__
#include <mach/mach_time.h>
#elif defined(__x86_64__) || defined(_M_X64)
#include <x86intrin.h>
#endif

namespace dsp {

struct TimingResult {
    std::chrono::nanoseconds duration;
    uint64_t cpu_cycles;
    double nanoseconds_per_cycle;

    double ns() const { return duration.count(); }
    double us() const { return duration.count() / 1000.0; }
    double ms() const { return duration.count() / 1000000.0; }
};

class HighResolutionTimer {
public:
    HighResolutionTimer() {
        calibrate_cpu_frequency();
        measure_overhead();
    }

    // Measure a function execution with nanosecond precision
    template<typename Func>
    TimingResult measure(Func&& op, int iterations = 1000) {
        // Warmup to stabilize CPU frequency
        for (int i = 0; i < 100; i++) {
            op();
        }

        std::vector<uint64_t> cycle_measurements;
        std::vector<int64_t> time_measurements;
        cycle_measurements.reserve(iterations);
        time_measurements.reserve(iterations);

        for (int i = 0; i < iterations; i++) {
            uint64_t cycles_start = read_cpu_cycles();
            auto time_start = std::chrono::high_resolution_clock::now();

            op();

            auto time_end = std::chrono::high_resolution_clock::now();
            uint64_t cycles_end = read_cpu_cycles();

            cycle_measurements.push_back(cycles_end - cycles_start);
            time_measurements.push_back(
                std::chrono::duration_cast<std::chrono::nanoseconds>(
                    time_end - time_start).count()
            );
        }

        // Use median to filter outliers
        std::sort(cycle_measurements.begin(), cycle_measurements.end());
        std::sort(time_measurements.begin(), time_measurements.end());

        uint64_t median_cycles = cycle_measurements[iterations / 2];
        int64_t median_ns = time_measurements[iterations / 2];

        // Subtract overhead
        median_cycles = (median_cycles > overhead_cycles_) ?
            median_cycles - overhead_cycles_ : 0;
        median_ns = (median_ns > overhead_ns_) ?
            median_ns - overhead_ns_ : 0;

        TimingResult result;
        result.cpu_cycles = median_cycles;
        result.duration = std::chrono::nanoseconds(median_ns);
        result.nanoseconds_per_cycle = ns_per_cycle_;

        return result;
    }

    // Get CPU frequency in Hz
    double get_cpu_frequency_hz() const {
        return cpu_freq_hz_;
    }

    // Get measurement overhead in nanoseconds
    int64_t get_overhead_ns() const {
        return overhead_ns_;
    }

    // Get measurement overhead in cycles
    uint64_t get_overhead_cycles() const {
        return overhead_cycles_;
    }

private:
    double cpu_freq_hz_ = 0.0;
    double ns_per_cycle_ = 0.0;
    int64_t overhead_ns_ = 0;
    uint64_t overhead_cycles_ = 0;

    uint64_t read_cpu_cycles() const {
#ifdef __APPLE__
        // macOS ARM64: Use mach_absolute_time()
        return mach_absolute_time();
#elif defined(__x86_64__) || defined(_M_X64)
        // x86-64: Use rdtsc
        unsigned int low, high;
        __asm__ volatile("rdtsc" : "=a"(low), "=d"(high));
        return ((uint64_t)high << 32) | low;
#elif defined(__aarch64__) || defined(_M_ARM64)
        // Generic ARM64: Use PMCCNTR_EL0 (requires kernel support)
        uint64_t val;
        __asm__ volatile("mrs %0, cntvct_el0" : "=r"(val));
        return val;
#else
        #error "Unsupported architecture for cycle counter"
#endif
    }

    void calibrate_cpu_frequency() {
#ifdef __APPLE__
        // macOS: Use mach_timebase_info for conversion
        mach_timebase_info_data_t timebase;
        mach_timebase_info(&timebase);

        // Measure actual frequency by timing 1 second
        auto start_time = std::chrono::high_resolution_clock::now();
        uint64_t start_cycles = read_cpu_cycles();

        // Sleep for 100ms to get accurate measurement
        std::this_thread::sleep_for(std::chrono::milliseconds(100));

        auto end_time = std::chrono::high_resolution_clock::now();
        uint64_t end_cycles = read_cpu_cycles();

        double elapsed_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(
            end_time - start_time).count();
        uint64_t elapsed_cycles = end_cycles - start_cycles;

        ns_per_cycle_ = elapsed_ns / elapsed_cycles;
        cpu_freq_hz_ = 1e9 / ns_per_cycle_;
#else
        // x86-64 or generic: Measure over 100ms
        auto start_time = std::chrono::high_resolution_clock::now();
        uint64_t start_cycles = read_cpu_cycles();

        std::this_thread::sleep_for(std::chrono::milliseconds(100));

        auto end_time = std::chrono::high_resolution_clock::now();
        uint64_t end_cycles = read_cpu_cycles();

        double elapsed_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(
            end_time - start_time).count();
        uint64_t elapsed_cycles = end_cycles - start_cycles;

        ns_per_cycle_ = elapsed_ns / elapsed_cycles;
        cpu_freq_hz_ = 1e9 / ns_per_cycle_;
#endif
    }

    void measure_overhead() {
        // Measure timing overhead by timing empty operations
        const int iterations = 10000;
        std::vector<uint64_t> cycle_measurements;
        std::vector<int64_t> time_measurements;

        for (int i = 0; i < iterations; i++) {
            uint64_t cycles_start = read_cpu_cycles();
            auto time_start = std::chrono::high_resolution_clock::now();

            // Empty operation
            __asm__ volatile("" ::: "memory");

            auto time_end = std::chrono::high_resolution_clock::now();
            uint64_t cycles_end = read_cpu_cycles();

            cycle_measurements.push_back(cycles_end - cycles_start);
            time_measurements.push_back(
                std::chrono::duration_cast<std::chrono::nanoseconds>(
                    time_end - time_start).count()
            );
        }

        // Use median
        std::sort(cycle_measurements.begin(), cycle_measurements.end());
        std::sort(time_measurements.begin(), time_measurements.end());

        overhead_cycles_ = cycle_measurements[iterations / 2];
        overhead_ns_ = time_measurements[iterations / 2];
    }
};

} // namespace dsp

#endif // HIGH_RESOLUTION_TIMER_HPP
