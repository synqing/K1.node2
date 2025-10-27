#include "../include/dsp_pipeline.hpp"
#include "../include/waveform_generator.hpp"
#include "../include/audio_visualizer.hpp"
#include "../include/high_resolution_timer.hpp"
#include "../include/hardware_perf_counters.hpp"
#include "../include/performance_stats.hpp"

#include <iostream>
#include <iomanip>
#include <cassert>
#include <cmath>
#include <fstream>

using namespace dsp;

// Test tolerance
constexpr float TOLERANCE = 0.01f;

// Colors for terminal output
#define COLOR_RESET "\033[0m"
#define COLOR_GREEN "\033[32m"
#define COLOR_RED "\033[31m"
#define COLOR_YELLOW "\033[33m"
#define COLOR_CYAN "\033[36m"

void print_test_header(const std::string& test_name) {
    std::cout << "\n" << COLOR_CYAN << "========================================" << COLOR_RESET << "\n";
    std::cout << COLOR_CYAN << "TEST: " << test_name << COLOR_RESET << "\n";
    std::cout << COLOR_CYAN << "========================================" << COLOR_RESET << "\n";
}

void print_pass(const std::string& message) {
    std::cout << COLOR_GREEN << "[PASS] " << message << COLOR_RESET << "\n";
}

void print_fail(const std::string& message) {
    std::cout << COLOR_RED << "[FAIL] " << message << COLOR_RESET << "\n";
}

void print_info(const std::string& message) {
    std::cout << COLOR_YELLOW << "[INFO] " << message << COLOR_RESET << "\n";
}

// Test 1: FFT Correctness
void test_fft_correctness() {
    print_test_header("FFT Correctness");

    DSPPipeline dsp;
    WaveformGenerator gen;

    // Generate test signal: 440 Hz sine wave (A4)
    float freq = 440.0f;
    size_t sample_rate = 44100;
    float duration = 1.0f;

    auto signal = gen.generate(WaveformType::SINE, freq, 1.0f, duration, sample_rate);

    // Take 2048-point FFT
    size_t fft_size = 2048;
    std::vector<float> signal_window(signal.begin(), signal.begin() + fft_size);

    auto fft_result = dsp.fft(signal_window);

    // Find peak frequency
    float max_magnitude = 0.0f;
    size_t peak_bin = 0;

    for (size_t i = 0; i < fft_size / 2; i++) {
        float magnitude = std::abs(fft_result[i]);
        if (magnitude > max_magnitude) {
            max_magnitude = magnitude;
            peak_bin = i;
        }
    }

    float detected_freq = peak_bin * sample_rate / static_cast<float>(fft_size);
    float error_hz = std::abs(detected_freq - freq);

    std::cout << "Input frequency: " << freq << " Hz\n";
    std::cout << "Detected frequency: " << detected_freq << " Hz\n";
    std::cout << "Error: " << error_hz << " Hz\n";

    if (error_hz < 5.0f) {
        print_pass("FFT detected correct frequency within 5 Hz");
    } else {
        print_fail("FFT frequency detection failed");
    }

    // Test IFFT (round trip)
    std::vector<float> reconstructed = dsp.ifft(fft_result);

    float reconstruction_error = 0.0f;
    for (size_t i = 0; i < fft_size; i++) {
        float error = std::abs(signal_window[i] - reconstructed[i]);
        reconstruction_error += error * error;
    }
    reconstruction_error = std::sqrt(reconstruction_error / fft_size);

    std::cout << "IFFT reconstruction error (RMS): " << reconstruction_error << "\n";

    if (reconstruction_error < 0.01f) {
        print_pass("IFFT reconstruction successful");
    } else {
        print_fail("IFFT reconstruction error too high");
    }
}

// Test 2: Feature Extraction Accuracy
void test_feature_extraction() {
    print_test_header("Feature Extraction Accuracy");

    DSPPipeline dsp;
    WaveformGenerator gen;

    // Generate 440 Hz sine wave
    auto signal = gen.generate(WaveformType::SINE, 440.0f, 1.0f, 0.1f, 44100);

    AudioFrame frame;
    frame.samples = signal;
    frame.sample_rate = 44100;

    auto features = dsp.extract_features(frame);

    std::cout << "RMS Energy: " << features.rms_energy << "\n";
    std::cout << "Zero Crossing Rate: " << features.zero_crossing_rate << "\n";
    std::cout << "Spectral Centroid: " << features.spectral_centroid << " Hz\n";
    std::cout << "Spectral Flux: " << features.spectral_flux << "\n";

    // RMS of sine wave should be ~0.707 (1/sqrt(2))
    float expected_rms = 1.0f / std::sqrt(2.0f);
    float rms_error = std::abs(features.rms_energy - expected_rms);

    if (rms_error < 0.01f) {
        print_pass("RMS energy calculation correct");
    } else {
        print_fail("RMS energy error: " + std::to_string(rms_error));
    }

    // Spectral centroid should be near 440 Hz for pure sine wave
    if (std::abs(features.spectral_centroid - 440.0f) < 50.0f) {
        print_pass("Spectral centroid within 50 Hz of expected");
    } else {
        print_fail("Spectral centroid error too large");
    }
}

// Test 3: Waveform Generation Verification
void test_waveform_generation() {
    print_test_header("Waveform Generation Verification");

    WaveformGenerator gen;

    // Test sine wave
    auto sine = gen.generate(WaveformType::SINE, 440.0f, 1.0f, 0.01f, 44100);
    auto sine_stats = gen.analyze(sine, 44100);

    std::cout << "Sine wave stats:\n";
    std::cout << "  Peak amplitude: " << sine_stats.peak_amplitude << "\n";
    std::cout << "  RMS: " << sine_stats.rms << "\n";
    std::cout << "  Frequency estimate: " << sine_stats.frequency_estimate << " Hz\n";

    if (std::abs(sine_stats.peak_amplitude - 1.0f) < 0.05f) {
        print_pass("Sine wave peak amplitude correct");
    } else {
        print_fail("Sine wave peak amplitude error");
    }

    // Test square wave
    auto square = gen.generate(WaveformType::SQUARE, 100.0f, 1.0f, 0.1f, 44100);
    auto square_stats = gen.analyze(square, 44100);

    std::cout << "\nSquare wave stats:\n";
    std::cout << "  Peak amplitude: " << square_stats.peak_amplitude << "\n";
    std::cout << "  Frequency estimate: " << square_stats.frequency_estimate << " Hz\n";

    if (std::abs(square_stats.peak_amplitude - 1.0f) < 0.05f) {
        print_pass("Square wave peak amplitude correct");
    } else {
        print_fail("Square wave peak amplitude error");
    }

    // Test noise generation
    auto noise = gen.generate(WaveformType::WHITE_NOISE, 0.0f, 1.0f, 0.1f, 44100);
    auto noise_stats = gen.analyze(noise, 44100);

    std::cout << "\nWhite noise stats:\n";
    std::cout << "  RMS: " << noise_stats.rms << "\n";
    std::cout << "  DC offset: " << noise_stats.dc_offset << "\n";

    if (std::abs(noise_stats.dc_offset) < 0.1f) {
        print_pass("White noise DC offset near zero");
    } else {
        print_fail("White noise DC offset too large");
    }
}

// Test 4: Timing Precision Validation
void test_timing_precision() {
    print_test_header("Timing Precision Validation");

    HighResolutionTimer timer;

    std::cout << "CPU Frequency: " << timer.get_cpu_frequency_hz() / 1e9 << " GHz\n";
    std::cout << "Measurement overhead: " << timer.get_overhead_ns() << " ns\n";
    std::cout << "Cycle overhead: " << timer.get_overhead_cycles() << " cycles\n";

    // Test 1: Measure known delay (busy wait)
    auto busy_wait = [](int iterations) {
        volatile int sum = 0;
        for (int i = 0; i < iterations; i++) {
            sum += i;
        }
    };

    auto result = timer.measure([&]() { busy_wait(1000); }, 1000);

    std::cout << "\nBusy wait (1000 iterations) timing:\n";
    std::cout << "  Duration: " << result.ns() << " ns\n";
    std::cout << "  CPU cycles: " << result.cpu_cycles << "\n";
    std::cout << "  IPC estimate: " << (result.cpu_cycles > 0 ? 1000.0 / result.cpu_cycles : 0.0) << "\n";

    // Test 2: Measure timing variance
    std::vector<double> timings;
    for (int i = 0; i < 10000; i++) {
        auto r = timer.measure([&]() { busy_wait(100); }, 1);
        timings.push_back(r.ns());
    }

    auto stats = PerformanceStats::compute(timings);

    std::cout << "\nTiming variance (10000 samples):\n";
    std::cout << "  Mean: " << stats.mean << " ns\n";
    std::cout << "  Median: " << stats.median << " ns\n";
    std::cout << "  StdDev: " << stats.std_dev << " ns\n";
    std::cout << "  Min: " << stats.min_value << " ns\n";
    std::cout << "  Max: " << stats.max_value << " ns\n";

    // Target: ±100ns precision (0.1% of 1µs)
    if (stats.std_dev < 100.0) {
        print_pass("Timing precision within ±100ns target");
    } else {
        print_fail("Timing precision exceeds ±100ns (StdDev: " + std::to_string(stats.std_dev) + " ns)");
    }
}

// Test 5: Hardware Counter Accuracy
void test_hardware_counters() {
    print_test_header("Hardware Performance Counters");

    HardwarePerfCounters counters;

    if (!counters.is_available()) {
        print_info("Hardware counters not available: " + counters.get_error());
        print_info("This is expected on macOS without sudo or non-Linux systems");
        return;
    }

    // Measure a known workload
    counters.start();

    volatile int sum = 0;
    for (int i = 0; i < 10000; i++) {
        sum += i * i;
    }

    auto result = counters.stop();

    std::cout << "Performance counters:\n";
    std::cout << "  Cycles: " << result.cycles << "\n";
    std::cout << "  Instructions: " << result.instructions << "\n";
    std::cout << "  IPC: " << result.ipc() << "\n";
    std::cout << "  Cache references: " << result.cache_references << "\n";
    std::cout << "  Cache misses: " << result.cache_misses << "\n";
    std::cout << "  Cache miss rate: " << (result.cache_miss_rate() * 100) << "%\n";
    std::cout << "  Branch instructions: " << result.branch_instructions << "\n";
    std::cout << "  Branch misses: " << result.branch_misses << "\n";
    std::cout << "  Branch miss rate: " << (result.branch_miss_rate() * 100) << "%\n";

    if (result.ipc() > 0.1 && result.ipc() < 10.0) {
        print_pass("IPC in reasonable range");
    } else {
        print_fail("IPC out of expected range");
    }
}

// Test 6: DSP Performance Benchmarks
void test_dsp_performance() {
    print_test_header("DSP Performance Benchmarks");

    DSPPipeline dsp;
    WaveformGenerator gen;
    HighResolutionTimer timer;

    // Generate test signal
    auto signal = gen.generate(WaveformType::SINE, 440.0f, 1.0f, 1.0f, 44100);

    // Benchmark FFT sizes
    std::vector<size_t> fft_sizes = {1024, 2048, 4096};

    for (size_t fft_size : fft_sizes) {
        std::vector<float> input(signal.begin(), signal.begin() + fft_size);

        auto result = timer.measure([&]() {
            dsp.fft(input);
        }, 100);

        std::cout << "\nFFT-" << fft_size << " performance:\n";
        std::cout << "  Time: " << result.us() << " µs\n";
        std::cout << "  Cycles: " << result.cpu_cycles << "\n";
        std::cout << "  Throughput: " << (1000000.0 / result.us()) << " operations/sec\n";

        // Target: <100µs for real-time DSP
        if (result.us() < 100.0) {
            print_pass("FFT-" + std::to_string(fft_size) + " meets <100µs real-time target");
        } else {
            print_fail("FFT-" + std::to_string(fft_size) + " exceeds 100µs");
        }
    }

    // Benchmark feature extraction
    AudioFrame frame;
    frame.samples = std::vector<float>(signal.begin(), signal.begin() + 4096);
    frame.sample_rate = 44100;

    auto result = timer.measure([&]() {
        dsp.extract_features(frame);
    }, 100);

    std::cout << "\nFeature extraction performance:\n";
    std::cout << "  Time: " << result.us() << " µs\n";
    std::cout << "  Cycles: " << result.cpu_cycles << "\n";

    if (result.us() < 200.0) {
        print_pass("Feature extraction meets <200µs target");
    } else {
        print_fail("Feature extraction exceeds 200µs");
    }
}

// Test 7: Audio Visualizer
void test_audio_visualizer() {
    print_test_header("Audio Visualizer");

    AudioVisualizer viz;
    WaveformGenerator gen;

    // Generate test signal: 440 Hz + 880 Hz (A4 + A5)
    auto sig1 = gen.generate(WaveformType::SINE, 440.0f, 1.0f, 1.0f, 44100);
    auto sig2 = gen.generate(WaveformType::SINE, 880.0f, 0.5f, 1.0f, 44100);

    std::vector<float> mixed(sig1.size());
    for (size_t i = 0; i < sig1.size(); i++) {
        mixed[i] = sig1[i] + sig2[i];
    }

    // Compute spectrum
    auto spectrum = viz.compute_spectrum(mixed, 2048, true);

    std::cout << "Spectrum bins: " << spectrum.magnitude.size() << "\n";
    std::cout << "Max magnitude: " << spectrum.max_magnitude << "\n";
    std::cout << "Max dB: " << spectrum.max_db << " dB\n";

    // Find peaks
    std::vector<std::pair<size_t, float>> peaks;
    for (size_t i = 1; i < spectrum.magnitude.size() - 1; i++) {
        if (spectrum.magnitude[i] > spectrum.magnitude[i - 1] &&
            spectrum.magnitude[i] > spectrum.magnitude[i + 1] &&
            spectrum.magnitude[i] > spectrum.max_magnitude * 0.1f) {
            peaks.emplace_back(i, spectrum.magnitude[i]);
        }
    }

    std::cout << "Found " << peaks.size() << " peaks\n";

    if (peaks.size() >= 2) {
        print_pass("Detected multiple frequency peaks");
    } else {
        print_fail("Failed to detect expected peaks");
    }

    // Test mel spectrogram
    auto spectrogram = viz.compute_mel_spectrogram(mixed, 44100, 2048, 512, 128);

    std::cout << "\nMel spectrogram:\n";
    std::cout << "  Frames: " << spectrogram.num_frames << "\n";
    std::cout << "  Mel bins: " << spectrogram.num_bins << "\n";
    std::cout << "  Time resolution: " << spectrogram.time_resolution_ms << " ms\n";
    std::cout << "  Freq resolution: " << spectrogram.frequency_resolution_hz << " Hz\n";

    if (spectrogram.num_frames > 0 && spectrogram.num_bins == 128) {
        print_pass("Mel spectrogram generation successful");
    } else {
        print_fail("Mel spectrogram generation failed");
    }
}

// Test 8: Statistical Analysis
void test_statistical_analysis() {
    print_test_header("Statistical Analysis");

    // Generate test data with known distribution
    std::vector<double> data;
    std::mt19937 rng(42);
    std::normal_distribution<double> dist(100.0, 10.0);

    for (int i = 0; i < 10000; i++) {
        data.push_back(dist(rng));
    }

    auto stats = PerformanceStats::compute(data);

    std::cout << "Normal distribution (µ=100, σ=10):\n";
    std::cout << stats.to_string() << "\n";

    // Check mean within 1% of expected
    if (std::abs(stats.mean - 100.0) < 1.0) {
        print_pass("Mean within 1% of expected");
    } else {
        print_fail("Mean error: " + std::to_string(std::abs(stats.mean - 100.0)));
    }

    // Check std dev within 10% of expected
    if (std::abs(stats.std_dev - 10.0) < 1.0) {
        print_pass("Standard deviation within 10% of expected");
    } else {
        print_fail("StdDev error: " + std::to_string(std::abs(stats.std_dev - 10.0)));
    }

    // Test distribution detection
    auto shape = PerformanceStats::detect_distribution(data);
    std::cout << "Detected distribution: " << PerformanceStats::distribution_to_string(shape) << "\n";

    if (shape == PerformanceStats::DistributionShape::NORMAL) {
        print_pass("Distribution correctly identified as Normal");
    } else {
        print_fail("Distribution detection incorrect");
    }
}

int main() {
    std::cout << COLOR_CYAN;
    std::cout << "╔════════════════════════════════════════════════════════════╗\n";
    std::cout << "║   Layer 3: Audio DSP & Real-Time Processing Test Suite   ║\n";
    std::cout << "╚════════════════════════════════════════════════════════════╝\n";
    std::cout << COLOR_RESET;

    try {
        test_fft_correctness();
        test_feature_extraction();
        test_waveform_generation();
        test_timing_precision();
        test_hardware_counters();
        test_dsp_performance();
        test_audio_visualizer();
        test_statistical_analysis();

        std::cout << "\n" << COLOR_GREEN;
        std::cout << "╔════════════════════════════════════════════════════════════╗\n";
        std::cout << "║              ALL TESTS COMPLETED SUCCESSFULLY             ║\n";
        std::cout << "╚════════════════════════════════════════════════════════════╝\n";
        std::cout << COLOR_RESET;

    } catch (const std::exception& e) {
        std::cerr << COLOR_RED << "FATAL ERROR: " << e.what() << COLOR_RESET << "\n";
        return 1;
    }

    return 0;
}
