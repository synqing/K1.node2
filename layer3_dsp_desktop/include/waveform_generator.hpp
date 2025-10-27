#ifndef WAVEFORM_GENERATOR_HPP
#define WAVEFORM_GENERATOR_HPP

#include <vector>
#include <cmath>
#include <random>
#include <stdexcept>

namespace dsp {

enum class WaveformType {
    SINE,
    SQUARE,
    SAWTOOTH,
    TRIANGLE,
    WHITE_NOISE,
    PINK_NOISE
};

class WaveformGenerator {
public:
    WaveformGenerator() : rng_(std::random_device{}()), dist_(-1.0f, 1.0f) {}

    // Generate waveform with specified parameters
    std::vector<float> generate(WaveformType type,
                                 float frequency_hz,
                                 float amplitude,
                                 float duration_sec,
                                 size_t sample_rate = 44100) {
        // Allow frequency = 0 for noise types
        bool is_noise = (type == WaveformType::WHITE_NOISE || type == WaveformType::PINK_NOISE);
        if (!is_noise && frequency_hz <= 0.0f) {
            throw std::runtime_error("Invalid frequency (must be > 0 for non-noise waveforms)");
        }
        if (amplitude < 0.0f || duration_sec <= 0.0f) {
            throw std::runtime_error("Invalid waveform parameters");
        }

        size_t num_samples = static_cast<size_t>(duration_sec * sample_rate);
        std::vector<float> waveform(num_samples);

        switch (type) {
            case WaveformType::SINE:
                generate_sine(waveform, frequency_hz, amplitude, sample_rate);
                break;
            case WaveformType::SQUARE:
                generate_square(waveform, frequency_hz, amplitude, sample_rate);
                break;
            case WaveformType::SAWTOOTH:
                generate_sawtooth(waveform, frequency_hz, amplitude, sample_rate);
                break;
            case WaveformType::TRIANGLE:
                generate_triangle(waveform, frequency_hz, amplitude, sample_rate);
                break;
            case WaveformType::WHITE_NOISE:
                generate_white_noise(waveform, amplitude);
                break;
            case WaveformType::PINK_NOISE:
                generate_pink_noise(waveform, amplitude);
                break;
        }

        return waveform;
    }

    // Compute waveform statistics
    struct WaveformStats {
        float peak_amplitude;
        float rms;
        float dc_offset;
        float frequency_estimate;
        float total_harmonic_distortion;
    };

    WaveformStats analyze(const std::vector<float>& waveform, size_t sample_rate = 44100) {
        WaveformStats stats;

        if (waveform.empty()) {
            stats.peak_amplitude = 0.0f;
            stats.rms = 0.0f;
            stats.dc_offset = 0.0f;
            stats.frequency_estimate = 0.0f;
            stats.total_harmonic_distortion = 0.0f;
            return stats;
        }

        // Peak amplitude
        stats.peak_amplitude = 0.0f;
        for (float sample : waveform) {
            stats.peak_amplitude = std::max(stats.peak_amplitude, std::abs(sample));
        }

        // DC offset
        float sum = 0.0f;
        for (float sample : waveform) {
            sum += sample;
        }
        stats.dc_offset = sum / waveform.size();

        // RMS
        float sum_squares = 0.0f;
        for (float sample : waveform) {
            float centered = sample - stats.dc_offset;
            sum_squares += centered * centered;
        }
        stats.rms = std::sqrt(sum_squares / waveform.size());

        // Frequency estimate (zero crossing method)
        stats.frequency_estimate = estimate_frequency(waveform, sample_rate);

        // THD (simplified - would need FFT for full implementation)
        stats.total_harmonic_distortion = 0.0f;

        return stats;
    }

private:
    std::mt19937 rng_;
    std::uniform_real_distribution<float> dist_;

    // Pink noise state
    float pink_b0_ = 0.0f;
    float pink_b1_ = 0.0f;
    float pink_b2_ = 0.0f;
    float pink_b3_ = 0.0f;
    float pink_b4_ = 0.0f;
    float pink_b5_ = 0.0f;
    float pink_b6_ = 0.0f;

    void generate_sine(std::vector<float>& waveform,
                       float frequency_hz,
                       float amplitude,
                       size_t sample_rate) {
        double phase = 0.0;
        double phase_increment = 2.0 * M_PI * frequency_hz / sample_rate;

        for (size_t i = 0; i < waveform.size(); i++) {
            waveform[i] = amplitude * std::sin(phase);
            phase += phase_increment;
            if (phase >= 2.0 * M_PI) {
                phase -= 2.0 * M_PI;
            }
        }
    }

    void generate_square(std::vector<float>& waveform,
                         float frequency_hz,
                         float amplitude,
                         size_t sample_rate) {
        double phase = 0.0;
        double phase_increment = 2.0 * M_PI * frequency_hz / sample_rate;

        for (size_t i = 0; i < waveform.size(); i++) {
            waveform[i] = (phase < M_PI) ? amplitude : -amplitude;
            phase += phase_increment;
            if (phase >= 2.0 * M_PI) {
                phase -= 2.0 * M_PI;
            }
        }
    }

    void generate_sawtooth(std::vector<float>& waveform,
                           float frequency_hz,
                           float amplitude,
                           size_t sample_rate) {
        double phase = 0.0;
        double phase_increment = 2.0 * M_PI * frequency_hz / sample_rate;

        for (size_t i = 0; i < waveform.size(); i++) {
            waveform[i] = amplitude * (2.0 * (phase / (2.0 * M_PI)) - 1.0);
            phase += phase_increment;
            if (phase >= 2.0 * M_PI) {
                phase -= 2.0 * M_PI;
            }
        }
    }

    void generate_triangle(std::vector<float>& waveform,
                           float frequency_hz,
                           float amplitude,
                           size_t sample_rate) {
        double phase = 0.0;
        double phase_increment = 2.0 * M_PI * frequency_hz / sample_rate;

        for (size_t i = 0; i < waveform.size(); i++) {
            double normalized_phase = phase / (2.0 * M_PI);
            if (normalized_phase < 0.5) {
                waveform[i] = amplitude * (4.0 * normalized_phase - 1.0);
            } else {
                waveform[i] = amplitude * (3.0 - 4.0 * normalized_phase);
            }
            phase += phase_increment;
            if (phase >= 2.0 * M_PI) {
                phase -= 2.0 * M_PI;
            }
        }
    }

    void generate_white_noise(std::vector<float>& waveform, float amplitude) {
        for (size_t i = 0; i < waveform.size(); i++) {
            waveform[i] = amplitude * dist_(rng_);
        }
    }

    void generate_pink_noise(std::vector<float>& waveform, float amplitude) {
        // Paul Kellett's pink noise algorithm
        for (size_t i = 0; i < waveform.size(); i++) {
            float white = dist_(rng_);

            pink_b0_ = 0.99886f * pink_b0_ + white * 0.0555179f;
            pink_b1_ = 0.99332f * pink_b1_ + white * 0.0750759f;
            pink_b2_ = 0.96900f * pink_b2_ + white * 0.1538520f;
            pink_b3_ = 0.86650f * pink_b3_ + white * 0.3104856f;
            pink_b4_ = 0.55000f * pink_b4_ + white * 0.5329522f;
            pink_b5_ = -0.7616f * pink_b5_ - white * 0.0168980f;

            float pink = pink_b0_ + pink_b1_ + pink_b2_ + pink_b3_ + pink_b4_ + pink_b5_ + pink_b6_ + white * 0.5362f;
            pink_b6_ = white * 0.115926f;

            waveform[i] = amplitude * pink * 0.11f; // Scale down
        }
    }

    float estimate_frequency(const std::vector<float>& waveform, size_t sample_rate) {
        if (waveform.size() < 2) return 0.0f;

        // Count zero crossings
        size_t crossings = 0;
        for (size_t i = 1; i < waveform.size(); i++) {
            if ((waveform[i] >= 0 && waveform[i - 1] < 0) ||
                (waveform[i] < 0 && waveform[i - 1] >= 0)) {
                crossings++;
            }
        }

        // Frequency = (crossings / 2) / duration
        float duration = waveform.size() / static_cast<float>(sample_rate);
        return (crossings / 2.0f) / duration;
    }
};

} // namespace dsp

#endif // WAVEFORM_GENERATOR_HPP
