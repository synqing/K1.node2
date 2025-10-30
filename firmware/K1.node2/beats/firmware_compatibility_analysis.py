#!/usr/bin/env python3
"""
Firmware Compatibility Analysis for Beat Detection Results

Analyzes GTZAN and Ballroom evaluation results to assess firmware constraints:
- Beat density (beats per second)
- Tempo stability and drift
- Processing requirements
- Memory and latency considerations
"""

import csv
import json
import statistics
from pathlib import Path
from typing import Dict, List, Tuple

def analyze_beat_density(csv_path: Path, dataset_name: str) -> Tuple[Dict, List]:
    """Analyze beat density from per-file results."""
    data = []
    
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                n_ref = int(row['n_ref'])
                n_est = int(row['n_est'])
                f_measure = float(row['F-measure'])
                cemgil = float(row['Cemgil'])
                goto = float(row['Goto'])
                
                # Calculate beats per second (assuming ~30s clips for GTZAN, ~31s for Ballroom)
                clip_duration = 30.0 if dataset_name == "gtzan" else 31.0
                ref_bps = n_ref / clip_duration
                est_bps = n_est / clip_duration
                
                data.append({
                    'file': row['file'],
                    'n_ref': n_ref,
                    'n_est': n_est,
                    'ref_bps': ref_bps,
                    'est_bps': est_bps,
                    'f_measure': f_measure,
                    'cemgil': cemgil,
                    'goto': goto
                })
            except (ValueError, KeyError) as e:
                print(f"Skipping row due to error: {e}")
                continue
    
    if not data:
        return {}, []
    
    # Extract lists for statistics
    ref_bps_list = [d['ref_bps'] for d in data]
    est_bps_list = [d['est_bps'] for d in data]
    f_measure_list = [d['f_measure'] for d in data if not (d['f_measure'] != d['f_measure'])]  # Filter NaN
    cemgil_list = [d['cemgil'] for d in data if not (d['cemgil'] != d['cemgil'])]  # Filter NaN
    goto_list = [d['goto'] for d in data if not (d['goto'] != d['goto'])]  # Filter NaN
    
    def percentile(data_list, p):
        """Calculate percentile."""
        if not data_list:
            return 0
        sorted_data = sorted(data_list)
        k = (len(sorted_data) - 1) * p / 100
        f = int(k)
        c = k - f
        if f == len(sorted_data) - 1:
            return sorted_data[f]
        return sorted_data[f] * (1 - c) + sorted_data[f + 1] * c
    
    stats = {
        'dataset': dataset_name,
        'total_files': len(data),
        'reference_beats_per_second': {
            'mean': statistics.mean(ref_bps_list),
            'std': statistics.stdev(ref_bps_list) if len(ref_bps_list) > 1 else 0,
            'min': min(ref_bps_list),
            'max': max(ref_bps_list),
            'median': statistics.median(ref_bps_list),
            'p95': percentile(ref_bps_list, 95),
            'p99': percentile(ref_bps_list, 99)
        },
        'estimated_beats_per_second': {
            'mean': statistics.mean(est_bps_list),
            'std': statistics.stdev(est_bps_list) if len(est_bps_list) > 1 else 0,
            'min': min(est_bps_list),
            'max': max(est_bps_list),
            'median': statistics.median(est_bps_list),
            'p95': percentile(est_bps_list, 95),
            'p99': percentile(est_bps_list, 99)
        },
        'performance_metrics': {
            'f_measure_mean': statistics.mean(f_measure_list) if f_measure_list else 0,
            'f_measure_std': statistics.stdev(f_measure_list) if len(f_measure_list) > 1 else 0,
            'cemgil_mean': statistics.mean(cemgil_list) if cemgil_list else 0,
            'cemgil_std': statistics.stdev(cemgil_list) if len(cemgil_list) > 1 else 0,
            'goto_mean': statistics.mean(goto_list) if goto_list else 0,
            'goto_std': statistics.stdev(goto_list) if len(goto_list) > 1 else 0
        }
    }
    
    return stats, data

def analyze_timing_performance(run_summary_path: Path) -> Dict:
    """Analyze timing performance from run summary."""
    with open(run_summary_path) as f:
        summary = json.load(f)
    
    timing = summary.get('timing', {})
    processed = summary.get('audio_processed', 0)
    
    if timing and processed > 0:
        return {
            'validation_time_per_file': timing.get('validation', 0) / processed,
            'detection_time_per_file': timing.get('beat_detection', 0) / processed,
            'evaluation_time_per_file': timing.get('evaluation', 0) / processed,
            'total_time_per_file': timing.get('total', 0) / processed,
            'total_files_processed': processed,
            'raw_timing': timing
        }
    return {}

def generate_firmware_constraints(gtzan_stats: Dict, ballroom_stats: Dict) -> Dict:
    """Generate firmware compatibility constraints based on analysis."""
    
    # Combine beat density statistics
    max_ref_bps = max(
        gtzan_stats['reference_beats_per_second']['p99'],
        ballroom_stats['reference_beats_per_second']['p99']
    )
    max_est_bps = max(
        gtzan_stats['estimated_beats_per_second']['p99'],
        ballroom_stats['estimated_beats_per_second']['p99']
    )
    
    # Calculate processing requirements
    avg_detection_time = (
        gtzan_stats.get('timing', {}).get('detection_time_per_file', 0) +
        ballroom_stats.get('timing', {}).get('detection_time_per_file', 0)
    ) / 2
    
    constraints = {
        'beat_density_constraints': {
            'max_beats_per_second_p99': max_ref_bps,
            'recommended_buffer_size': int(max_ref_bps * 1.2),  # 20% safety margin
            'max_estimated_bps_p99': max_est_bps,
            'description': f"Firmware should handle up to {max_ref_bps:.1f} beats/sec (99th percentile)"
        },
        'processing_constraints': {
            'avg_detection_time_per_file': avg_detection_time,
            'real_time_factor': avg_detection_time / 30.0 if avg_detection_time > 0 else 0,
            'description': f"Desktop processing: {avg_detection_time:.3f}s per 30s clip"
        },
        'memory_constraints': {
            'max_beats_per_buffer': int(max_ref_bps * 5),  # 5-second buffer
            'recommended_ring_buffer_size': int(max_ref_bps * 10),  # 10-second history
            'description': "Memory allocation for beat event buffers"
        },
        'latency_constraints': {
            'target_latency_ms': 50,  # Real-time requirement
            'max_acceptable_latency_ms': 100,
            'description': "Real-time processing latency targets"
        },
        'performance_benchmarks': {
            'gtzan_f_measure': gtzan_stats['performance_metrics']['f_measure_mean'],
            'ballroom_f_measure': ballroom_stats['performance_metrics']['f_measure_mean'],
            'target_f_measure': 0.6,  # Minimum acceptable performance
            'description': "Performance targets for firmware validation"
        }
    }
    
    return constraints

def main():
    """Main analysis function."""
    results_dir = Path("results")
    
    # Analyze GTZAN results
    gtzan_csv = results_dir / "phase2b_gtzan_full" / "per_file.csv"
    gtzan_summary = results_dir / "phase2b_gtzan_full" / "run_summary.json"
    
    # Analyze Ballroom results
    ballroom_csv = results_dir / "phase2b_ballroom_full" / "per_file.csv"
    ballroom_summary = results_dir / "phase2b_ballroom_full" / "run_summary.json"
    
    print("=== FIRMWARE COMPATIBILITY ANALYSIS ===\n")
    
    # Analyze beat density
    gtzan_stats, gtzan_data = analyze_beat_density(gtzan_csv, "gtzan")
    ballroom_stats, ballroom_data = analyze_beat_density(ballroom_csv, "ballroom")
    
    # Analyze timing (if available)
    if gtzan_summary.exists():
        gtzan_timing = analyze_timing_performance(gtzan_summary)
        gtzan_stats['timing'] = gtzan_timing
    
    if ballroom_summary.exists():
        ballroom_timing = analyze_timing_performance(ballroom_summary)
        ballroom_stats['timing'] = ballroom_timing
    
    # Generate firmware constraints
    constraints = generate_firmware_constraints(gtzan_stats, ballroom_stats)
    
    # Print summary
    print("BEAT DENSITY ANALYSIS:")
    print(f"GTZAN - Max beats/sec (99th percentile): {gtzan_stats['reference_beats_per_second']['p99']:.2f}")
    print(f"Ballroom - Max beats/sec (99th percentile): {ballroom_stats['reference_beats_per_second']['p99']:.2f}")
    print(f"Combined max: {constraints['beat_density_constraints']['max_beats_per_second_p99']:.2f}")
    print()
    
    print("PERFORMANCE METRICS:")
    print(f"GTZAN F-measure: {gtzan_stats['performance_metrics']['f_measure_mean']:.3f} ± {gtzan_stats['performance_metrics']['f_measure_std']:.3f}")
    print(f"Ballroom F-measure: {ballroom_stats['performance_metrics']['f_measure_mean']:.3f} ± {ballroom_stats['performance_metrics']['f_measure_std']:.3f}")
    print()
    
    if gtzan_stats.get('timing'):
        print("TIMING ANALYSIS:")
        print(f"GTZAN - Detection time per file: {gtzan_stats['timing']['detection_time_per_file']:.3f}s")
        if ballroom_stats.get('timing'):
            print(f"Ballroom - Detection time per file: {ballroom_stats['timing']['detection_time_per_file']:.3f}s")
        print()
    
    # Save detailed analysis
    analysis_output = {
        'gtzan_analysis': gtzan_stats,
        'ballroom_analysis': ballroom_stats,
        'firmware_constraints': constraints,
        'summary': {
            'max_beats_per_second': constraints['beat_density_constraints']['max_beats_per_second_p99'],
            'recommended_buffer_size': constraints['beat_density_constraints']['recommended_buffer_size'],
            'target_performance': constraints['performance_benchmarks']['target_f_measure'],
            'processing_requirements': constraints['processing_constraints']
        }
    }
    
    output_path = Path("firmware_compatibility_analysis.json")
    with open(output_path, 'w') as f:
        json.dump(analysis_output, f, indent=2)
    
    print(f"Detailed analysis saved to: {output_path}")
    print("\nFIRMWARE CONSTRAINTS SUMMARY:")
    print(f"- Max beat density: {constraints['beat_density_constraints']['max_beats_per_second_p99']:.1f} beats/sec")
    print(f"- Recommended buffer: {constraints['beat_density_constraints']['recommended_buffer_size']} beats")
    print(f"- Target latency: {constraints['latency_constraints']['target_latency_ms']}ms")
    print(f"- Min F-measure: {constraints['performance_benchmarks']['target_f_measure']}")

if __name__ == "__main__":
    main()