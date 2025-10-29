---
title: Layer 3: Graph Execution & Measurement - Technical Specification
status: approved
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# Layer 3: Graph Execution & Measurement - Technical Specification

## Overview

Layer 3 executes the analyzed graphs with precision measurement:
1. Parallel execution scheduler with fault tolerance
2. Audio simulation and DSP pipeline
3. Pixel-perfect visual validation
4. Nanosecond-resolution hardware performance measurement

---

## 1. GRAPH EXECUTION ENGINE

### 1.1 Parallel Execution Scheduler

**Goal**: Execute dependency graph nodes in parallel respecting constraints

```cpp
class GraphExecutionScheduler {
  struct ExecutionNode {
    size_t node_id;
    std::function<void()> task;
    std::vector<size_t> dependencies;
    ExecutionStatus status;  // pending, running, completed, failed
  };

  enum class SchedulingPolicy {
    GreedyLevelSync,      // Execute all nodes at same level before advancing
    DynamicLoadBalance,   // Distribute work across available threads
    CriticalPathFirst,    // Prioritize critical path nodes
    UserDefined           // Custom scheduling function
  };

  class Scheduler {
    std::vector<ExecutionNode> nodes;
    SchedulingPolicy policy;
    std::vector<std::thread> worker_threads;
    std::mutex schedule_lock;
    std::condition_variable work_available;

    void execute_graph(size_t num_threads = std::thread::hardware_concurrency()) {
      initialize_workers(num_threads);

      // Topologically sort nodes
      auto sorted = topological_sort(nodes);

      // Process level by level (dependency respecting)
      std::vector<std::vector<size_t>> levels = compute_execution_levels(sorted);

      for (const auto& level : levels) {
        execute_level_parallel(level);  // Execute all nodes at this level
        wait_for_level_completion();
      }

      shutdown_workers();
    }

  private:
    std::vector<std::vector<size_t>> compute_execution_levels(
      const std::vector<size_t>& topo_sorted
    ) {
      std::vector<std::vector<size_t>> levels;
      std::unordered_map<size_t, int> level_map;

      for (size_t node_id : topo_sorted) {
        int max_dep_level = -1;

        // Find maximum level of dependencies
        for (size_t dep : nodes[node_id].dependencies) {
          max_dep_level = std::max(max_dep_level, level_map[dep]);
        }

        int node_level = max_dep_level + 1;
        level_map[node_id] = node_level;

        // Add to appropriate level
        if (levels.size() <= node_level) {
          levels.resize(node_level + 1);
        }
        levels[node_level].push_back(node_id);
      }

      return levels;
    }

    void execute_level_parallel(const std::vector<size_t>& level_nodes) {
      std::vector<std::future<void>> futures;

      for (size_t node_id : level_nodes) {
        futures.push_back(
          std::async(std::launch::async, [this, node_id]() {
            execute_node(node_id);
          })
        );
      }

      // Wait for all nodes at this level to complete
      for (auto& future : futures) {
        future.wait();
      }
    }

    void execute_node(size_t node_id) {
      auto& node = nodes[node_id];
      node.status = ExecutionStatus::Running;

      try {
        node.task();  // Execute actual work
        node.status = ExecutionStatus::Completed;
      } catch (const std::exception& e) {
        handle_node_failure(node_id, e);
      }
    }
  };
};
```

### 1.2 Fault-Tolerant Execution Model

```cpp
class FaultToleranceController {
  struct FaultRecoveryPolicy {
    enum class Strategy { Retry, Skip, Propagate };
    Strategy strategy;
    int max_retries = 3;
    bool rollback_on_failure = false;
  };

  struct ExecutionCheckpoint {
    size_t node_id;
    std::chrono::high_resolution_clock::time_point timestamp;
    std::vector<uint8_t> state_snapshot;
  };

  class FaultHandler {
    FaultRecoveryPolicy policy;
    std::vector<ExecutionCheckpoint> checkpoints;

    void handle_node_failure(size_t node_id, const std::exception& error) {
      log_failure(node_id, error);

      switch (policy.strategy) {
        case FaultRecoveryPolicy::Strategy::Retry: {
          for (int attempt = 0; attempt < policy.max_retries; ++attempt) {
            try {
              retry_node(node_id);
              return;  // Success
            } catch (...) {
              // Continue to next attempt
            }
          }
          propagate_failure(node_id, "Max retries exceeded");
          break;
        }

        case FaultRecoveryPolicy::Strategy::Skip: {
          // Skip this node and continue with dependents
          mark_node_skipped(node_id);
          break;
        }

        case FaultRecoveryPolicy::Strategy::Propagate: {
          propagate_failure(node_id, error.what());
          break;
        }
      }
    }

    void save_checkpoint(size_t node_id) {
      // Save execution state for potential rollback
      auto state = capture_execution_state(node_id);

      checkpoints.push_back({
        .node_id = node_id,
        .timestamp = std::chrono::high_resolution_clock::now(),
        .state_snapshot = state
      });
    }

    void restore_from_checkpoint(size_t node_id) {
      // Find most recent checkpoint
      auto it = std::find_if(
        checkpoints.rbegin(), checkpoints.rend(),
        [node_id](const ExecutionCheckpoint& cp) { return cp.node_id <= node_id; }
      );

      if (it != checkpoints.rend()) {
        restore_execution_state(it->state_snapshot);
      }
    }
  };
};
```

### 1.3 Progress Tracking System

```cpp
class ExecutionProgressTracker {
  struct ProgressMetrics {
    size_t total_nodes;
    size_t completed_nodes;
    size_t failed_nodes;
    size_t in_progress_nodes;
    std::chrono::duration<double> elapsed_time;
    double estimated_remaining_time;
    double progress_percentage;
  };

  class ProgressMonitor {
    std::atomic<size_t> completed_count = 0;
    std::atomic<size_t> failed_count = 0;
    std::atomic<size_t> in_progress_count = 0;
    size_t total_nodes;
    std::chrono::high_resolution_clock::time_point start_time;

    ProgressMetrics get_metrics() {
      auto now = std::chrono::high_resolution_clock::now();
      auto elapsed = std::chrono::duration<double>(now - start_time);

      double progress = (double)completed_count / total_nodes;
      double estimated_remaining = elapsed.count() * (1.0 - progress) / progress;

      return {
        .total_nodes = total_nodes,
        .completed_nodes = completed_count,
        .failed_nodes = failed_count,
        .in_progress_nodes = in_progress_count,
        .elapsed_time = elapsed,
        .estimated_remaining_time = estimated_remaining,
        .progress_percentage = progress * 100.0
      };
    }

    // Visualize as progress bar
    std::string get_progress_bar() {
      auto metrics = get_metrics();
      int bar_width = 50;
      int filled = static_cast<int>(metrics.progress_percentage / 100.0 * bar_width);

      std::stringstream ss;
      ss << "[";
      for (int i = 0; i < bar_width; ++i) {
        ss << (i < filled ? "=" : "-");
      }
      ss << "] " << std::fixed << std::setprecision(1)
         << metrics.progress_percentage << "% "
         << "(" << metrics.completed_nodes << "/" << total_nodes << ") "
         << "ETA: " << std::fixed << std::setprecision(1)
         << metrics.estimated_remaining_time << "s";

      return ss.str();
    }
  };
};
```

---

## 2. AUDIO SIMULATION & DSP PIPELINE

### 2.1 Digital Signal Processing Pipeline

```cpp
class DSPPipeline {
  struct AudioFrame {
    std::vector<float> samples;  // Mono or multi-channel
    size_t sample_rate;
    std::chrono::high_resolution_clock::time_point timestamp;
  };

  class AudioProcessor {
    // Core DSP operations
    std::vector<float> fft(const std::vector<float>& input) {
      // Fast Fourier Transform (using FFTW or KFR)
      // Convert time-domain to frequency-domain
      return compute_fft(input);
    }

    std::vector<float> ifft(const std::vector<float>& input) {
      // Inverse FFT (frequency → time domain)
      return compute_ifft(input);
    }

    std::vector<float> apply_filter(
      const std::vector<float>& input,
      const std::vector<float>& filter_coefficients
    ) {
      // FIR or IIR filter convolution
      return convolve(input, filter_coefficients);
    }

    std::vector<float> resample(
      const std::vector<float>& input,
      size_t original_sample_rate,
      size_t target_sample_rate
    ) {
      // Polyphase resampling (e.g., 44.1kHz → 48kHz)
      return polyphase_resample(input, original_sample_rate, target_sample_rate);
    }
  };

  // Feature extraction pipeline
  struct AudioFeatures {
    float spectral_centroid;    // Brightness
    float spectral_flux;        // Energy change
    float zero_crossing_rate;   // Pitch presence
    float rms_energy;           // Amplitude
    std::vector<float> mfcc;    // Mel-frequency cepstral coefficients
  };

  AudioFeatures extract_features(const AudioFrame& frame) {
    auto spectrum = fft(frame.samples);

    return {
      .spectral_centroid = compute_spectral_centroid(spectrum),
      .spectral_flux = compute_spectral_flux(spectrum, prev_spectrum),
      .zero_crossing_rate = compute_zcr(frame.samples),
      .rms_energy = compute_rms(frame.samples),
      .mfcc = compute_mfcc(spectrum)
    };
  }
};
```

### 2.2 Waveform Generation & Analysis

```cpp
class WaveformGenerator {
  enum class WaveType { Sine, Square, Sawtooth, Triangle, Noise };

  std::vector<float> generate_waveform(
    WaveType type,
    float frequency,
    float amplitude,
    size_t num_samples,
    size_t sample_rate
  ) {
    std::vector<float> output(num_samples);
    float period = static_cast<float>(sample_rate) / frequency;

    for (size_t i = 0; i < num_samples; ++i) {
      float phase = std::fmod(i / period, 1.0f);

      switch (type) {
        case WaveType::Sine:
          output[i] = amplitude * std::sin(2.0f * M_PI * phase);
          break;

        case WaveType::Square:
          output[i] = amplitude * (phase < 0.5f ? 1.0f : -1.0f);
          break;

        case WaveType::Sawtooth:
          output[i] = amplitude * (2.0f * phase - 1.0f);
          break;

        case WaveType::Triangle:
          output[i] = amplitude * (phase < 0.5f
            ? 4.0f * phase - 1.0f
            : 3.0f - 4.0f * phase);
          break;

        case WaveType::Noise: {
          // White noise (random samples)
          static std::mt19937 rng(std::random_device{}());
          static std::uniform_real_distribution<float> dist(-1.0f, 1.0f);
          output[i] = amplitude * dist(rng);
          break;
        }
      }
    }

    return output;
  }

  // Real-time visualization
  class Oscilloscope {
    std::vector<float> display_buffer;
    size_t display_width = 512;
    size_t display_height = 256;

    std::vector<std::pair<int, int>> render_waveform(
      const std::vector<float>& samples,
      size_t start_index = 0
    ) {
      std::vector<std::pair<int, int>> points;

      size_t step = std::max(1UL, samples.size() / display_width);

      for (size_t i = 0; i < display_width && start_index + i * step < samples.size(); ++i) {
        float sample = samples[start_index + i * step];
        // Normalize to display coordinates
        int x = i;
        int y = static_cast<int>((1.0f - (sample + 1.0f) / 2.0f) * display_height);
        points.push_back({x, y});
      }

      return points;
    }
  };
};
```

### 2.3 Real-Time Audio Visualization

```cpp
class AudioVisualizer {
  struct SpectrumAnalysis {
    std::vector<float> magnitude;     // Frequency bins
    std::vector<float> phase;          // Phase information
    std::vector<float> power_db;       // dB scale (log magnitude)
  };

  SpectrumAnalysis compute_spectrum(const AudioFrame& frame) {
    auto fft_result = fft(frame.samples);

    std::vector<float> magnitude;
    std::vector<float> phase;
    std::vector<float> power_db;

    // Convert FFT complex output to magnitude/phase
    for (size_t i = 0; i < fft_result.size() / 2; ++i) {
      float real = fft_result[2*i];
      float imag = fft_result[2*i + 1];

      float mag = std::sqrt(real*real + imag*imag);
      magnitude.push_back(mag);
      phase.push_back(std::atan2(imag, real));
      power_db.push_back(20.0f * std::log10(mag + 1e-10f));  // Add epsilon to avoid log(0)
    }

    return { magnitude, phase, power_db };
  }

  // Mel-scale spectrogram (human-perceived frequency)
  std::vector<std::vector<float>> compute_mel_spectrogram(
    const std::vector<AudioFrame>& frames
  ) {
    std::vector<std::vector<float>> spectrogram;

    for (const auto& frame : frames) {
      auto spectrum = compute_spectrum(frame);
      auto mel_bins = convert_to_mel_scale(spectrum.magnitude);
      spectrogram.push_back(mel_bins);
    }

    return spectrogram;
  }
};
```

---

## 3. VISUAL VALIDATION FRAMEWORK

### 3.1 Pixel-Perfect Comparison Tools

```cpp
class PixelComparer {
  struct ComparisonResult {
    bool images_identical;
    double mse;                    // Mean squared error
    double ssim;                   // Structural similarity index
    std::vector<Point2D> differences;  // Pixel locations that differ
  };

  ComparisonResult compare_images(
    const cv::Mat& image1,
    const cv::Mat& image2
  ) {
    if (image1.size() != image2.size() || image1.type() != image2.type()) {
      // Size mismatch
      return { false, 1e9, 0.0, {} };
    }

    // Compute pixel-level difference
    cv::Mat diff;
    cv::absdiff(image1, image2, diff);

    // MSE: Mean Squared Error
    double mse = compute_mse(diff);
    bool identical = mse < 0.01;  // Threshold for floating point comparison

    // SSIM: Structural Similarity (more perceptually relevant)
    double ssim = compute_ssim(image1, image2);

    // Find changed pixels
    std::vector<Point2D> differences = locate_differences(diff);

    return {
      .images_identical = identical,
      .mse = mse,
      .ssim = ssim,
      .differences = differences
    };
  }

private:
  double compute_mse(const cv::Mat& diff) {
    cv::Mat diff_squared = diff.mul(diff);
    return cv::mean(diff_squared)[0];
  }

  double compute_ssim(const cv::Mat& img1, const cv::Mat& img2) {
    // SSIM formula:
    // SSIM(x,y) = (2μx*μy + C1)(2σxy + C2) / ((μx² + μy² + C1)(σx² + σy² + C2))

    const float C1 = 6.5025f;
    const float C2 = 58.5225f;

    cv::Mat mu1, mu2;
    cv::GaussianBlur(img1, mu1, cv::Size(11, 11), 1.5);
    cv::GaussianBlur(img2, mu2, cv::Size(11, 11), 1.5);

    // ... compute SSIM as per formula
    return 0.95;  // Placeholder
  }

  std::vector<Point2D> locate_differences(const cv::Mat& diff) {
    std::vector<Point2D> points;
    const float threshold = 5.0f;  // Pixel value difference threshold

    for (int y = 0; y < diff.rows; ++y) {
      for (int x = 0; x < diff.cols; ++x) {
        if (diff.at<float>(y, x) > threshold) {
          points.push_back({x, y});
        }
      }
    }

    return points;
  }
};
```

### 3.2 Color Space Analysis

```cpp
class ColorSpaceAnalyzer {
  struct ColorProfile {
    std::vector<uint8_t> histogram_r;
    std::vector<uint8_t> histogram_g;
    std::vector<uint8_t> histogram_b;
    cv::Scalar mean_color;
    cv::Scalar std_color;
  };

  ColorProfile analyze_colors(const cv::Mat& image) {
    // Convert to different color spaces for analysis
    cv::Mat bgr = image;
    cv::Mat hsv, lab;
    cv::cvtColor(bgr, hsv, cv::COLOR_BGR2HSV);
    cv::cvtColor(bgr, lab, cv::COLOR_BGR2Lab);

    // Compute histograms
    std::vector<uint8_t> hist_r, hist_g, hist_b;
    compute_histogram(bgr, 0, hist_b);  // Blue
    compute_histogram(bgr, 1, hist_g);  // Green
    compute_histogram(bgr, 2, hist_r);  // Red

    // Compute statistics
    cv::Scalar mean = cv::mean(bgr);
    cv::Scalar std = compute_standard_deviation(bgr);

    return {
      .histogram_r = hist_r,
      .histogram_g = hist_g,
      .histogram_b = hist_b,
      .mean_color = mean,
      .std_color = std
    };
  }

  bool colors_match(
    const cv::Mat& image1,
    const cv::Mat& image2,
    float tolerance = 10.0f
  ) {
    auto profile1 = analyze_colors(image1);
    auto profile2 = analyze_colors(image2);

    // Compare histograms (chi-square distance)
    double chi2_distance = compute_histogram_distance(profile1, profile2);

    return chi2_distance < tolerance;
  }
};
```

### 3.3 Motion Vector Tracking

```cpp
class MotionTracker {
  struct MotionVector {
    float dx, dy;              // Displacement
    float confidence;          // 0-1
    std::vector<Point2D> tracking_points;
  };

  std::vector<MotionVector> track_motion(
    const cv::Mat& frame1,
    const cv::Mat& frame2
  ) {
    std::vector<cv::Point2f> features;
    cv::goodFeaturesToTrack(frame1, features, 100, 0.01, 10);

    std::vector<uint8_t> status;
    std::vector<float> error;

    cv::Mat flow;
    cv::calcOpticalFlowPyrLK(frame1, frame2, features, features, status, error);

    std::vector<MotionVector> motion_vectors;

    for (size_t i = 0; i < features.size(); ++i) {
      if (status[i]) {
        motion_vectors.push_back({
          .dx = features[i].x,
          .dy = features[i].y,
          .confidence = 1.0f - (error[i] / 100.0f),
          .tracking_points = {}
        });
      }
    }

    return motion_vectors;
  }
};
```

---

## 4. PERFORMANCE MEASUREMENT (Nanosecond Precision)

### 4.1 High-Resolution Timing

```cpp
class HighResolutionTimer {
  using Clock = std::chrono::high_resolution_clock;

  struct TimingResult {
    std::chrono::nanoseconds duration;
    uint64_t cpu_cycles;
    int number_of_iterations;
  };

  // Use CPU cycle counter for nanosecond precision
  inline uint64_t rdtsc() const {
    #ifdef __x86_64__
    unsigned int low, high;
    __asm__ volatile("rdtsc" : "=a" (low), "=d" (high));
    return ((uint64_t)high << 32) | low;
    #else
    return std::chrono::high_resolution_clock::now().time_since_epoch().count();
    #endif
  }

  template<typename Func>
  TimingResult measure(Func&& operation, int iterations = 1000) {
    // Warmup
    for (int i = 0; i < iterations / 10; ++i) {
      operation();
    }

    // Actual measurement
    uint64_t start_cycles = rdtsc();
    auto start_time = Clock::now();

    for (int i = 0; i < iterations; ++i) {
      operation();
    }

    auto end_time = Clock::now();
    uint64_t end_cycles = rdtsc();

    auto duration = end_time - start_time;
    uint64_t cycle_count = end_cycles - start_cycles;

    return {
      .duration = std::chrono::duration_cast<std::chrono::nanoseconds>(duration),
      .cpu_cycles = cycle_count,
      .number_of_iterations = iterations
    };
  }

  double get_cpu_frequency_ghz() const {
    // Determine CPU frequency from TSC
    // Can use /proc/cpuinfo on Linux or similar
    return 2.4;  // Example: 2.4 GHz
  }
};
```

### 4.2 Hardware Performance Counter Access

```cpp
class HardwarePerformanceCounters {
  enum class PerfEvent {
    CycleCount,
    InstructionCount,
    CacheMissL1,
    CacheMissL3,
    BranchMispredictions,
    PageFaults
  };

  struct PerfResult {
    uint64_t cycle_count;
    uint64_t instruction_count;
    uint64_t l1_misses;
    uint64_t l3_misses;
    uint64_t branch_mispredicts;
    double cycles_per_instruction;
    double ipc;  // Instructions per cycle
  };

  // Using PAPI (Performance API)
  class PAPIWrapper {
    int event_set;

    void initialize() {
      PAPI_library_init(PAPI_VER_CURRENT);
      PAPI_create_eventset(&event_set);

      // Add events to monitor
      PAPI_add_event(event_set, PAPI_TOT_CYC);  // Total cycles
      PAPI_add_event(event_set, PAPI_TOT_INS);  // Total instructions
      PAPI_add_event(event_set, PAPI_L1_DCM);   // L1 data cache misses
      PAPI_add_event(event_set, PAPI_L3_TCM);   // L3 total cache misses
      PAPI_add_event(event_set, PAPI_BR_MSP);   // Branch mispredictions
    }

    PerfResult measure(std::function<void()> operation) {
      long long values[6];

      PAPI_start(event_set);
      operation();
      PAPI_stop(event_set, values);

      double cpi = static_cast<double>(values[0]) / values[1];

      return {
        .cycle_count = values[0],
        .instruction_count = values[1],
        .l1_misses = values[2],
        .l3_misses = values[3],
        .branch_mispredicts = values[4],
        .cycles_per_instruction = cpi,
        .ipc = 1.0 / cpi
      };
    }

    ~PAPIWrapper() {
      PAPI_cleanup_eventset(event_set);
      PAPI_destroy_eventset(&event_set);
    }
  };
};
```

### 4.3 Statistical Analysis Framework

```cpp
class PerformanceStatistics {
  struct PerformanceAnalysis {
    double mean;
    double median;
    double std_dev;
    double min_value;
    double max_value;
    double p95;        // 95th percentile
    double p99;        // 99th percentile
    std::string distribution_shape;
  };

  PerformanceAnalysis analyze_measurements(
    const std::vector<double>& measurements
  ) {
    std::vector<double> sorted = measurements;
    std::sort(sorted.begin(), sorted.end());

    double mean = compute_mean(sorted);
    double median = sorted[sorted.size() / 2];
    double std_dev = compute_std_dev(sorted, mean);

    return {
      .mean = mean,
      .median = median,
      .std_dev = std_dev,
      .min_value = sorted.front(),
      .max_value = sorted.back(),
      .p95 = sorted[static_cast<size_t>(0.95 * sorted.size())],
      .p99 = sorted[static_cast<size_t>(0.99 * sorted.size())],
      .distribution_shape = detect_distribution(sorted)
    };
  }

private:
  std::string detect_distribution(const std::vector<double>& data) {
    // Histogram analysis to detect Gaussian, bimodal, etc.
    auto histogram = compute_histogram(data, 10);

    // Detect if distribution is normal-like or has outliers
    double skewness = compute_skewness(data);
    double kurtosis = compute_kurtosis(data);

    if (std::abs(skewness) < 0.5 && kurtosis < 3.5) {
      return "Normal";
    } else if (kurtosis > 5.0) {
      return "Heavy-tailed (outliers)";
    } else {
      return "Non-normal";
    }
  }
};
```

---

## 5. SUCCESS CRITERIA FOR LAYER 3

✅ **Graph Execution**
- Parallel scheduler handles 1M+ node graphs efficiently
- Fault tolerance recovers from 95% of recoverable failures
- Progress tracking accurate within 1 second estimation

✅ **Audio Processing**
- DSP pipeline latency <100 microseconds per frame
- FFT accuracy within 0.1 dB of reference implementation
- Feature extraction matches audio analysis libraries (MFCC, spectral features)

✅ **Visual Validation**
- Pixel-perfect comparison detects single-pixel differences
- Color space analysis accurate to ±1 unit in sRGB
- Motion tracking confidence >90% on standard test videos

✅ **Performance Measurement**
- Timing precision ±100 nanoseconds (0.1% accuracy)
- Hardware performance counters <1% measurement overhead
- Statistical analysis correctly identifies outliers and distribution shapes

---

## 6. IMPLEMENTATION TIMELINE

**Week 1-2**: Execution scheduler + fault tolerance
**Week 3-4**: Audio DSP pipeline + feature extraction
**Week 5-6**: Visual validation framework + color analysis
**Week 7-8**: Performance measurement + hardware counters

---

## INTEGRATION WITH LAYERS 1-2

```
Layer 1 (Graphs) → topological sort → Layer 3 (Scheduler)
Layer 2 (Code Analysis) → AST metrics → Layer 3 (Profiling)
Layer 3 (Execution) → measurements → Layer 1 (Performance Estimation validation)
```

---

**Status**: Published ✅
**All Layers Complete**: Architecture fully specified
**Ready for Implementation**
