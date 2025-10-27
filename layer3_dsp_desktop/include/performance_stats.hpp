#ifndef PERFORMANCE_STATS_HPP
#define PERFORMANCE_STATS_HPP

#include <vector>
#include <algorithm>
#include <cmath>
#include <numeric>
#include <sstream>
#include <iomanip>
#include <string>

namespace dsp {

struct StatisticalSummary {
    double mean;
    double median;
    double std_dev;
    double min_value;
    double max_value;
    double p95;  // 95th percentile
    double p99;  // 99th percentile
    size_t num_samples;
    size_t num_outliers;  // >3σ from mean

    std::string to_string() const {
        std::ostringstream oss;
        oss << std::fixed << std::setprecision(2);
        oss << "Mean: " << mean << ", ";
        oss << "Median: " << median << ", ";
        oss << "StdDev: " << std_dev << ", ";
        oss << "Min: " << min_value << ", ";
        oss << "Max: " << max_value << ", ";
        oss << "P95: " << p95 << ", ";
        oss << "P99: " << p99 << ", ";
        oss << "Samples: " << num_samples << ", ";
        oss << "Outliers: " << num_outliers;
        return oss.str();
    }
};

class PerformanceStats {
public:
    // Compute statistical summary of measurements
    static StatisticalSummary compute(const std::vector<double>& data) {
        if (data.empty()) {
            return StatisticalSummary{0, 0, 0, 0, 0, 0, 0, 0, 0};
        }

        StatisticalSummary stats;
        stats.num_samples = data.size();

        // Sort data for percentile calculation
        std::vector<double> sorted_data = data;
        std::sort(sorted_data.begin(), sorted_data.end());

        // Min/Max
        stats.min_value = sorted_data.front();
        stats.max_value = sorted_data.back();

        // Mean
        stats.mean = std::accumulate(data.begin(), data.end(), 0.0) / data.size();

        // Median
        size_t mid = sorted_data.size() / 2;
        if (sorted_data.size() % 2 == 0) {
            stats.median = (sorted_data[mid - 1] + sorted_data[mid]) / 2.0;
        } else {
            stats.median = sorted_data[mid];
        }

        // Standard deviation
        double variance = 0.0;
        for (double value : data) {
            double diff = value - stats.mean;
            variance += diff * diff;
        }
        variance /= data.size();
        stats.std_dev = std::sqrt(variance);

        // Percentiles
        stats.p95 = percentile(sorted_data, 95.0);
        stats.p99 = percentile(sorted_data, 99.0);

        // Count outliers (>3σ from mean)
        stats.num_outliers = 0;
        double threshold = 3.0 * stats.std_dev;
        for (double value : data) {
            if (std::abs(value - stats.mean) > threshold) {
                stats.num_outliers++;
            }
        }

        return stats;
    }

    // Compute percentile from sorted data
    static double percentile(const std::vector<double>& sorted_data, double p) {
        if (sorted_data.empty()) return 0.0;
        if (p <= 0.0) return sorted_data.front();
        if (p >= 100.0) return sorted_data.back();

        double index = (p / 100.0) * (sorted_data.size() - 1);
        size_t lower = static_cast<size_t>(std::floor(index));
        size_t upper = static_cast<size_t>(std::ceil(index));

        if (lower == upper) {
            return sorted_data[lower];
        }

        double fraction = index - lower;
        return sorted_data[lower] * (1.0 - fraction) + sorted_data[upper] * fraction;
    }

    // Detect distribution shape
    enum class DistributionShape {
        NORMAL,
        HEAVY_TAILED,
        BIMODAL,
        UNIFORM,
        UNKNOWN
    };

    static DistributionShape detect_distribution(const std::vector<double>& data) {
        if (data.size() < 10) {
            return DistributionShape::UNKNOWN;
        }

        auto stats = compute(data);

        // Heavy-tailed: large difference between max and p99
        double tail_ratio = (stats.max_value - stats.p99) / (stats.p99 - stats.median);
        if (tail_ratio > 2.0) {
            return DistributionShape::HEAVY_TAILED;
        }

        // Uniform: small std dev relative to range
        double range = stats.max_value - stats.min_value;
        if (range > 0 && stats.std_dev < range * 0.2) {
            return DistributionShape::UNIFORM;
        }

        // Bimodal: high variance with median far from mean
        double median_mean_ratio = std::abs(stats.median - stats.mean) / stats.std_dev;
        if (median_mean_ratio > 0.5) {
            return DistributionShape::BIMODAL;
        }

        // Default to normal
        return DistributionShape::NORMAL;
    }

    // Generate histogram for visualization
    static std::vector<size_t> histogram(const std::vector<double>& data, size_t num_bins = 20) {
        if (data.empty()) {
            return std::vector<size_t>(num_bins, 0);
        }

        auto minmax = std::minmax_element(data.begin(), data.end());
        double min_val = *minmax.first;
        double max_val = *minmax.second;
        double range = max_val - min_val;

        if (range == 0.0) {
            std::vector<size_t> hist(num_bins, 0);
            hist[0] = data.size();
            return hist;
        }

        std::vector<size_t> hist(num_bins, 0);
        for (double value : data) {
            size_t bin = static_cast<size_t>((value - min_val) / range * (num_bins - 1));
            bin = std::min(bin, num_bins - 1);
            hist[bin]++;
        }

        return hist;
    }

    // Remove outliers from data (>3σ)
    static std::vector<double> remove_outliers(const std::vector<double>& data) {
        if (data.size() < 3) {
            return data;
        }

        auto stats = compute(data);
        double threshold = 3.0 * stats.std_dev;

        std::vector<double> filtered;
        filtered.reserve(data.size());

        for (double value : data) {
            if (std::abs(value - stats.mean) <= threshold) {
                filtered.push_back(value);
            }
        }

        return filtered;
    }

    // Convert distribution shape to string
    static std::string distribution_to_string(DistributionShape shape) {
        switch (shape) {
            case DistributionShape::NORMAL: return "Normal";
            case DistributionShape::HEAVY_TAILED: return "Heavy-tailed";
            case DistributionShape::BIMODAL: return "Bimodal";
            case DistributionShape::UNIFORM: return "Uniform";
            default: return "Unknown";
        }
    }
};

} // namespace dsp

#endif // PERFORMANCE_STATS_HPP
