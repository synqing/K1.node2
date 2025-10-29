#ifndef AUDIO_VISUALIZER_HPP
#define AUDIO_VISUALIZER_HPP

#include "dsp_pipeline.hpp"
#include <vector>
#include <complex>
#include <cmath>
#include <algorithm>

namespace dsp {

struct SpectrumData {
    std::vector<float> magnitude;
    std::vector<float> phase;
    std::vector<float> magnitude_db;
    float max_magnitude;
    float max_db;
};

struct SpectrogramData {
    std::vector<std::vector<float>> magnitude_db; // [time][frequency]
    size_t num_frames;
    size_t num_bins;
    float time_resolution_ms;
    float frequency_resolution_hz;
};

class AudioVisualizer {
public:
    AudioVisualizer() : dsp_() {}

    // Compute FFT spectrum with magnitude, phase, dB scale
    SpectrumData compute_spectrum(const std::vector<float>& audio,
                                   size_t fft_size = 2048,
                                   bool apply_window = true) {
        SpectrumData spectrum;

        // Pad/truncate to FFT size
        std::vector<float> windowed(fft_size, 0.0f);
        size_t copy_size = std::min(audio.size(), fft_size);
        std::copy(audio.begin(), audio.begin() + copy_size, windowed.begin());

        // Apply Hann window to reduce spectral leakage
        if (apply_window) {
            apply_hann_window(windowed);
        }

        // Compute FFT
        auto fft_result = dsp_.fft(windowed);

        // Extract magnitude and phase (only positive frequencies)
        size_t num_bins = fft_size / 2 + 1;
        spectrum.magnitude.resize(num_bins);
        spectrum.phase.resize(num_bins);
        spectrum.magnitude_db.resize(num_bins);

        spectrum.max_magnitude = 0.0f;
        spectrum.max_db = -120.0f;

        for (size_t i = 0; i < num_bins; i++) {
            float real = fft_result[i].real();
            float imag = fft_result[i].imag();

            spectrum.magnitude[i] = std::sqrt(real * real + imag * imag);
            spectrum.phase[i] = std::atan2(imag, real);

            // Convert to dB (20*log10(magnitude))
            float db = 20.0f * std::log10(spectrum.magnitude[i] + 1e-10f);
            spectrum.magnitude_db[i] = db;

            spectrum.max_magnitude = std::max(spectrum.max_magnitude, spectrum.magnitude[i]);
            spectrum.max_db = std::max(spectrum.max_db, db);
        }

        return spectrum;
    }

    // Generate mel-scale spectrogram (human-perceived frequency scale)
    SpectrogramData compute_mel_spectrogram(const std::vector<float>& audio,
                                             size_t sample_rate = 44100,
                                             size_t fft_size = 2048,
                                             size_t hop_size = 512,
                                             size_t num_mel_bins = 128) {
        SpectrogramData spectrogram;

        // Compute mel filterbank
        auto mel_filters = create_mel_filterbank(num_mel_bins, fft_size, sample_rate);

        // Compute number of frames
        size_t num_frames = (audio.size() - fft_size) / hop_size + 1;

        spectrogram.num_frames = num_frames;
        spectrogram.num_bins = num_mel_bins;
        spectrogram.time_resolution_ms = hop_size * 1000.0f / sample_rate;
        spectrogram.frequency_resolution_hz = sample_rate / static_cast<float>(fft_size);

        spectrogram.magnitude_db.resize(num_frames);

        // Process each frame
        for (size_t frame = 0; frame < num_frames; frame++) {
            size_t start = frame * hop_size;
            std::vector<float> frame_audio(audio.begin() + start,
                                            audio.begin() + start + fft_size);

            // Compute spectrum
            auto spectrum = compute_spectrum(frame_audio, fft_size, true);

            // Apply mel filterbank
            std::vector<float> mel_magnitude(num_mel_bins, 0.0f);
            for (size_t mel_bin = 0; mel_bin < num_mel_bins; mel_bin++) {
                for (size_t freq_bin = 0; freq_bin < spectrum.magnitude.size(); freq_bin++) {
                    mel_magnitude[mel_bin] += mel_filters[mel_bin][freq_bin] * spectrum.magnitude[freq_bin];
                }
            }

            // Convert to dB
            spectrogram.magnitude_db[frame].resize(num_mel_bins);
            for (size_t mel_bin = 0; mel_bin < num_mel_bins; mel_bin++) {
                spectrogram.magnitude_db[frame][mel_bin] =
                    20.0f * std::log10(mel_magnitude[mel_bin] + 1e-10f);
            }
        }

        return spectrogram;
    }

    // Get rendering points for GUI integration (magnitude vs frequency)
    std::vector<std::pair<float, float>> get_spectrum_points(const SpectrumData& spectrum,
                                                              size_t sample_rate = 44100,
                                                              bool use_db = true) {
        std::vector<std::pair<float, float>> points;
        points.reserve(spectrum.magnitude.size());

        size_t fft_size = (spectrum.magnitude.size() - 1) * 2;
        float freq_resolution = sample_rate / static_cast<float>(fft_size);

        for (size_t i = 0; i < spectrum.magnitude.size(); i++) {
            float frequency = i * freq_resolution;
            float amplitude = use_db ? spectrum.magnitude_db[i] : spectrum.magnitude[i];
            points.emplace_back(frequency, amplitude);
        }

        return points;
    }

    // Get rendering points for spectrogram (time vs frequency grid)
    std::vector<std::vector<float>> get_spectrogram_grid(const SpectrogramData& spectrogram,
                                                          float min_db = -80.0f,
                                                          float max_db = 0.0f) {
        std::vector<std::vector<float>> grid = spectrogram.magnitude_db;

        // Normalize to [0, 1] range for rendering
        for (auto& frame : grid) {
            for (float& value : frame) {
                value = (value - min_db) / (max_db - min_db);
                value = std::clamp(value, 0.0f, 1.0f);
            }
        }

        return grid;
    }

private:
    DSPPipeline dsp_;

    void apply_hann_window(std::vector<float>& signal) {
        size_t N = signal.size();
        for (size_t i = 0; i < N; i++) {
            float window_value = 0.5f * (1.0f - std::cos(2.0f * M_PI * i / (N - 1)));
            signal[i] *= window_value;
        }
    }

    float hz_to_mel(float hz) {
        return 2595.0f * std::log10(1.0f + hz / 700.0f);
    }

    float mel_to_hz(float mel) {
        return 700.0f * (std::pow(10.0f, mel / 2595.0f) - 1.0f);
    }

    std::vector<std::vector<float>> create_mel_filterbank(size_t num_mel_bins,
                                                           size_t fft_size,
                                                           size_t sample_rate) {
        // Create mel filterbank matrix
        std::vector<std::vector<float>> filters(num_mel_bins);

        float nyquist = sample_rate / 2.0f;
        float min_mel = hz_to_mel(0.0f);
        float max_mel = hz_to_mel(nyquist);

        // Create mel-spaced frequency points
        std::vector<float> mel_points(num_mel_bins + 2);
        for (size_t i = 0; i < num_mel_bins + 2; i++) {
            float mel = min_mel + (max_mel - min_mel) * i / (num_mel_bins + 1);
            mel_points[i] = mel_to_hz(mel);
        }

        // Convert to FFT bin indices
        std::vector<size_t> bin_points(num_mel_bins + 2);
        for (size_t i = 0; i < num_mel_bins + 2; i++) {
            bin_points[i] = static_cast<size_t>((fft_size + 1) * mel_points[i] / sample_rate);
        }

        // Create triangular filters
        size_t num_freq_bins = fft_size / 2 + 1;
        for (size_t mel_bin = 0; mel_bin < num_mel_bins; mel_bin++) {
            filters[mel_bin].resize(num_freq_bins, 0.0f);

            size_t left = bin_points[mel_bin];
            size_t center = bin_points[mel_bin + 1];
            size_t right = bin_points[mel_bin + 2];

            // Rising edge
            for (size_t i = left; i < center && i < num_freq_bins; i++) {
                filters[mel_bin][i] = (i - left) / static_cast<float>(center - left);
            }

            // Falling edge
            for (size_t i = center; i < right && i < num_freq_bins; i++) {
                filters[mel_bin][i] = (right - i) / static_cast<float>(right - center);
            }
        }

        return filters;
    }
};

} // namespace dsp

#endif // AUDIO_VISUALIZER_HPP
