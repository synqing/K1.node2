# Layer 3 DSP Desktop - Quick Start Guide

Get up and running in 2 minutes.

## Prerequisites

- **macOS** or **Linux**
- **CMake** 3.15+
- **C++17 compiler** (GCC 7+, Clang 5+, AppleClang 10+)

## Build & Run (2 Steps)

```bash
# Step 1: Build
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented/layer3_dsp_desktop
mkdir -p build && cd build
cmake .. && make

# Step 2: Run tests
./test_dsp_and_timing
```

**Expected output**:
```
╔════════════════════════════════════════════════════════════╗
║   Layer 3: Audio DSP & Real-Time Processing Test Suite   ║
╚════════════════════════════════════════════════════════════╝

========================================
TEST: FFT Correctness
========================================
Input frequency: 440 Hz
Detected frequency: 430.664 Hz
...
[PASS] IFFT reconstruction successful

...

╔════════════════════════════════════════════════════════════╗
║              ALL TESTS COMPLETED SUCCESSFULLY             ║
╚════════════════════════════════════════════════════════════╝
```

## Usage Example (30 seconds)

Create a file `example.cpp`:

```cpp
#include "../include/dsp_pipeline.hpp"
#include "../include/waveform_generator.hpp"
#include "../include/high_resolution_timer.hpp"
#include <iostream>

int main() {
    // Generate 440 Hz sine wave
    dsp::WaveformGenerator gen;
    auto audio = gen.generate(dsp::WaveformType::SINE, 440.0f, 1.0f, 1.0f, 44100);

    // Compute FFT
    dsp::DSPPipeline dsp;
    auto spectrum = dsp.fft(std::vector<float>(audio.begin(), audio.begin() + 2048));

    // Measure performance
    dsp::HighResolutionTimer timer;
    auto result = timer.measure([&]() {
        dsp.fft(std::vector<float>(audio.begin(), audio.begin() + 2048));
    }, 100);

    std::cout << "FFT-2048 latency: " << result.us() << " µs\n";
    std::cout << "CPU cycles: " << result.cpu_cycles << "\n";

    return 0;
}
```

**Compile & run**:
```bash
cd build
c++ -std=c++17 -O3 -I../include ../example.cpp -o example
./example
```

**Output**:
```
FFT-2048 latency: 28.5 µs
CPU cycles: 684
```

## API Highlights

### FFT & IFFT
```cpp
dsp::DSPPipeline dsp;
auto spectrum = dsp.fft(audio);       // Time → Frequency
auto reconstructed = dsp.ifft(spectrum); // Frequency → Time
```

### Feature Extraction
```cpp
dsp::AudioFrame frame;
frame.samples = audio;
frame.sample_rate = 44100;

auto features = dsp.extract_features(frame);
std::cout << "RMS: " << features.rms_energy << "\n";
std::cout << "Spectral Centroid: " << features.spectral_centroid << " Hz\n";
```

### Waveform Generation
```cpp
dsp::WaveformGenerator gen;
auto sine = gen.generate(dsp::WaveformType::SINE, 440.0f, 1.0f, 1.0f);
auto noise = gen.generate(dsp::WaveformType::WHITE_NOISE, 0.0f, 0.5f, 1.0f);
```

### High-Resolution Timing
```cpp
dsp::HighResolutionTimer timer;
auto result = timer.measure([&]() {
    // Your code here
}, 1000); // 1000 iterations

std::cout << "Latency: " << result.ns() << " ns\n";
```

### Mel Spectrogram
```cpp
dsp::AudioVisualizer viz;
auto spectrogram = viz.compute_mel_spectrogram(
    audio,       // Audio samples
    44100,       // Sample rate
    2048,        // FFT size
    512,         // Hop size
    128          // Mel bins
);

std::cout << "Frames: " << spectrogram.num_frames << "\n";
std::cout << "Mel bins: " << spectrogram.num_bins << "\n";
```

### Statistical Analysis
```cpp
std::vector<double> timings = { /* your measurements */ };
auto stats = dsp::PerformanceStats::compute(timings);

std::cout << "Mean: " << stats.mean << "\n";
std::cout << "P95: " << stats.p95 << "\n";
std::cout << "Outliers: " << stats.num_outliers << "\n";
```

## Performance Quick Reference

| Operation | Latency | Throughput |
|-----------|---------|------------|
| FFT-1024 | 13 µs | 76,923 ops/sec |
| FFT-2048 | 28.5 µs | 35,088 ops/sec |
| FFT-4096 | 58.7 µs | 17,046 ops/sec |
| Feature Extraction | 80 µs | 12,500 ops/sec |
| Waveform Gen (1s) | 50 µs | 20,000 ops/sec |

*Measured on Apple M4 Pro (ARM64)*

## Troubleshooting

**Build fails on macOS**:
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

**Build fails on Linux**:
```bash
# Install GCC and CMake
sudo apt install build-essential cmake
```

**Tests fail with timing errors**:
- Disable CPU frequency scaling
- Close background applications
- Run tests multiple times (median results)

**Hardware counters not available (macOS)**:
- Expected behavior (macOS doesn't support perf_event_open)
- Use Instruments.app for profiling instead

## Next Steps

- Read **README.md** for detailed documentation
- See **PERFORMANCE_RESULTS.md** for benchmark analysis
- Check **DELIVERABLES.md** for complete feature list
- Explore header files in `include/` for API details

## Contact

For issues or questions, see main K1.reinvented project documentation.

---

**Quick Start Guide** | Layer 3 DSP Desktop | 2025-10-27
