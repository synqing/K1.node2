#ifndef DSP_PIPELINE_HPP
#define DSP_PIPELINE_HPP

#include <vector>
#include <complex>
#include <cmath>
#include <algorithm>
#include <cstring>
#include <stdexcept>

namespace dsp {

constexpr double PI = 3.14159265358979323846;
constexpr double TWO_PI = 2.0 * PI;

struct AudioFrame {
    std::vector<float> samples;
    size_t sample_rate;

    AudioFrame() : sample_rate(44100) {}
    AudioFrame(size_t n, size_t sr = 44100) : samples(n, 0.0f), sample_rate(sr) {}
};

struct AudioFeatures {
    float rms_energy;
    float zero_crossing_rate;
    float spectral_centroid;
    float spectral_flux;
    std::vector<float> mfcc;

    AudioFeatures() : rms_energy(0.0f), zero_crossing_rate(0.0f),
                      spectral_centroid(0.0f), spectral_flux(0.0f) {}
};

class DSPPipeline {
public:
    DSPPipeline() = default;

    // FFT: Fast Fourier Transform (Cooley-Tukey radix-2 decimation-in-time)
    // Input size must be power of 2 (1024, 2048, 4096)
    // Returns complex spectrum (magnitude and phase)
    std::vector<std::complex<float>> fft(const std::vector<float>& input) {
        size_t N = input.size();

        if (N == 0 || (N & (N - 1)) != 0) {
            throw std::runtime_error("FFT size must be power of 2");
        }

        // Convert real input to complex
        std::vector<std::complex<float>> x(N);
        for (size_t i = 0; i < N; i++) {
            x[i] = std::complex<float>(input[i], 0.0f);
        }

        // Bit-reversal permutation
        size_t j = 0;
        for (size_t i = 0; i < N - 1; i++) {
            if (i < j) {
                std::swap(x[i], x[j]);
            }
            size_t k = N / 2;
            while (k <= j) {
                j -= k;
                k /= 2;
            }
            j += k;
        }

        // Cooley-Tukey FFT
        for (size_t s = 1; s <= log2(N); s++) {
            size_t m = 1 << s; // 2^s
            std::complex<float> wm = std::exp(std::complex<float>(0.0f, -TWO_PI / m));

            for (size_t k = 0; k < N; k += m) {
                std::complex<float> w(1.0f, 0.0f);
                for (size_t j = 0; j < m / 2; j++) {
                    std::complex<float> t = w * x[k + j + m / 2];
                    std::complex<float> u = x[k + j];
                    x[k + j] = u + t;
                    x[k + j + m / 2] = u - t;
                    w *= wm;
                }
            }
        }

        return x;
    }

    // IFFT: Inverse FFT (frequency → time domain)
    std::vector<float> ifft(const std::vector<std::complex<float>>& input) {
        size_t N = input.size();

        if (N == 0 || (N & (N - 1)) != 0) {
            throw std::runtime_error("IFFT size must be power of 2");
        }

        // Use FFT property: IFFT(X) = conj(FFT(conj(X))) / N
        std::vector<std::complex<float>> x(N);
        for (size_t i = 0; i < N; i++) {
            x[i] = std::conj(input[i]);
        }

        // Bit-reversal permutation
        size_t j = 0;
        for (size_t i = 0; i < N - 1; i++) {
            if (i < j) {
                std::swap(x[i], x[j]);
            }
            size_t k = N / 2;
            while (k <= j) {
                j -= k;
                k /= 2;
            }
            j += k;
        }

        // Cooley-Tukey FFT on conjugated input
        for (size_t s = 1; s <= log2(N); s++) {
            size_t m = 1 << s;
            std::complex<float> wm = std::exp(std::complex<float>(0.0f, -TWO_PI / m));

            for (size_t k = 0; k < N; k += m) {
                std::complex<float> w(1.0f, 0.0f);
                for (size_t j = 0; j < m / 2; j++) {
                    std::complex<float> t = w * x[k + j + m / 2];
                    std::complex<float> u = x[k + j];
                    x[k + j] = u + t;
                    x[k + j + m / 2] = u - t;
                    w *= wm;
                }
            }
        }

        // Conjugate output and normalize
        std::vector<float> output(N);
        for (size_t i = 0; i < N; i++) {
            output[i] = std::conj(x[i]).real() / N;
        }

        return output;
    }

    // FIR filter: Finite Impulse Response (convolution)
    std::vector<float> fir_filter(const std::vector<float>& input,
                                   const std::vector<float>& coefficients) {
        size_t N = input.size();
        size_t M = coefficients.size();
        std::vector<float> output(N, 0.0f);

        for (size_t n = 0; n < N; n++) {
            for (size_t k = 0; k < M; k++) {
                if (n >= k) {
                    output[n] += coefficients[k] * input[n - k];
                }
            }
        }

        return output;
    }

    // IIR filter: Infinite Impulse Response (feedback filter)
    // y[n] = b[0]*x[n] + b[1]*x[n-1] + ... - a[1]*y[n-1] - a[2]*y[n-2] - ...
    std::vector<float> iir_filter(const std::vector<float>& input,
                                   const std::vector<float>& b_coeffs,
                                   const std::vector<float>& a_coeffs) {
        size_t N = input.size();
        size_t M_b = b_coeffs.size();
        size_t M_a = a_coeffs.size();
        std::vector<float> output(N, 0.0f);

        for (size_t n = 0; n < N; n++) {
            // Feedforward (numerator)
            for (size_t k = 0; k < M_b; k++) {
                if (n >= k) {
                    output[n] += b_coeffs[k] * input[n - k];
                }
            }

            // Feedback (denominator)
            for (size_t k = 1; k < M_a; k++) {
                if (n >= k) {
                    output[n] -= a_coeffs[k] * output[n - k];
                }
            }

            // Normalize by a[0]
            if (a_coeffs.size() > 0 && a_coeffs[0] != 0.0f) {
                output[n] /= a_coeffs[0];
            }
        }

        return output;
    }

    // Resampling: Polyphase resampling (e.g., 44.1kHz → 48kHz)
    std::vector<float> resample(const std::vector<float>& input,
                                 size_t input_rate,
                                 size_t output_rate) {
        if (input_rate == output_rate) {
            return input;
        }

        double ratio = static_cast<double>(output_rate) / input_rate;
        size_t output_size = static_cast<size_t>(input.size() * ratio);
        std::vector<float> output(output_size);

        // Linear interpolation resampling
        for (size_t i = 0; i < output_size; i++) {
            double pos = i / ratio;
            size_t idx = static_cast<size_t>(pos);
            double frac = pos - idx;

            if (idx + 1 < input.size()) {
                output[i] = input[idx] * (1.0 - frac) + input[idx + 1] * frac;
            } else {
                output[i] = input[idx];
            }
        }

        return output;
    }

    // Feature extraction: RMS energy, zero crossing rate, spectral centroid, flux
    AudioFeatures extract_features(const AudioFrame& frame) {
        AudioFeatures features;

        // RMS energy
        features.rms_energy = compute_rms(frame.samples);

        // Zero crossing rate
        features.zero_crossing_rate = compute_zcr(frame.samples);

        // Spectral features (require FFT)
        if (!frame.samples.empty()) {
            // Pad to next power of 2
            size_t N = next_power_of_2(frame.samples.size());
            std::vector<float> padded(N, 0.0f);
            std::copy(frame.samples.begin(), frame.samples.end(), padded.begin());

            auto spectrum = fft(padded);
            features.spectral_centroid = compute_spectral_centroid(spectrum, frame.sample_rate);
            features.spectral_flux = compute_spectral_flux(spectrum);
        }

        return features;
    }

private:
    std::vector<float> prev_magnitude_; // For spectral flux

    size_t next_power_of_2(size_t n) {
        n--;
        n |= n >> 1;
        n |= n >> 2;
        n |= n >> 4;
        n |= n >> 8;
        n |= n >> 16;
        n++;
        return n;
    }

    float compute_rms(const std::vector<float>& samples) {
        if (samples.empty()) return 0.0f;

        float sum = 0.0f;
        for (float s : samples) {
            sum += s * s;
        }
        return std::sqrt(sum / samples.size());
    }

    float compute_zcr(const std::vector<float>& samples) {
        if (samples.size() < 2) return 0.0f;

        size_t crossings = 0;
        for (size_t i = 1; i < samples.size(); i++) {
            if ((samples[i] >= 0 && samples[i - 1] < 0) ||
                (samples[i] < 0 && samples[i - 1] >= 0)) {
                crossings++;
            }
        }

        return static_cast<float>(crossings) / (samples.size() - 1);
    }

    float compute_spectral_centroid(const std::vector<std::complex<float>>& spectrum,
                                     size_t sample_rate) {
        if (spectrum.empty()) return 0.0f;

        float weighted_sum = 0.0f;
        float magnitude_sum = 0.0f;

        size_t N = spectrum.size();
        for (size_t k = 0; k < N / 2; k++) {
            float magnitude = std::abs(spectrum[k]);
            float frequency = k * sample_rate / static_cast<float>(N);

            weighted_sum += frequency * magnitude;
            magnitude_sum += magnitude;
        }

        return (magnitude_sum > 0.0f) ? (weighted_sum / magnitude_sum) : 0.0f;
    }

    float compute_spectral_flux(const std::vector<std::complex<float>>& spectrum) {
        size_t N = spectrum.size() / 2;
        std::vector<float> magnitude(N);

        for (size_t i = 0; i < N; i++) {
            magnitude[i] = std::abs(spectrum[i]);
        }

        // Initialize on first call
        if (prev_magnitude_.empty()) {
            prev_magnitude_ = magnitude;
            return 0.0f;
        }

        // Compute flux (energy increase)
        float flux = 0.0f;
        for (size_t i = 0; i < N; i++) {
            float diff = magnitude[i] - prev_magnitude_[i];
            if (diff > 0.0f) {
                flux += diff * diff;
            }
        }

        prev_magnitude_ = magnitude;
        return std::sqrt(flux);
    }
};

} // namespace dsp

#endif // DSP_PIPELINE_HPP
