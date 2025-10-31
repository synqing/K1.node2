#!/usr/bin/env python3
"""
K1 Lightwave Evaluation Harness (Beat/Downbeat/Structure/Drop/Latency)

Scaffolds evaluation over a dataset index (JSONL) using ground-truth
annotations in JAMS and predicted events produced by the MIR pipeline.

Inputs:
- Dataset index JSONL with entries including `file_key`, `jams_path`, `audio_path`.
- Predictions directory containing JSON/JAMS files keyed by `file_key`.

Outputs:
- Aggregated metrics written to `test-results/k1_eval_report.json`.

Notes:
- Requires `jams` and `mir_eval` for full functionality. If missing, the
  script will warn and skip metric computation gracefully.
"""

import argparse
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def read_jsonl(path: Path) -> List[Dict]:
    items: List[Dict] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError:
                # tolerate comments or malformed lines
                continue
    return items


def load_jams_annotations(jams_path: Path) -> Dict[str, List[float]]:
    annotations: Dict[str, List[float]] = {
        "beats": [],
        "downbeats": [],
        "boundaries": [],
        "drops": [],
    }
    try:
        import jams  # type: ignore
    except Exception:
        return annotations

    if not jams_path.exists():
        return annotations

    jam = jams.load(str(jams_path))
    # Collect beat, downbeat, structural, and drop times from annotations
    for ann in jam.annotations:
        namespace = getattr(ann, "namespace", "")
        if namespace == "beat":
            annotations["beats"].extend([obs.time for obs in ann.data])
        elif namespace in ("downbeat", "bar_downbeat"):
            annotations["downbeats"].extend([obs.time for obs in ann.data])
        elif namespace in ("segment", "segment_open"):
            bounds: List[float] = []
            for obs in ann.data:
                bounds.append(obs.time)
                duration = getattr(obs, "duration", 0.0) or 0.0
                if duration > 0:
                    bounds.append(obs.time + duration)
            annotations["boundaries"].extend(bounds)
        elif namespace.lower().startswith("tag"):
            # inspect labels for drop keywords
            for obs in ann.data:
                label = str(getattr(obs, "value", "")).lower()
                if "drop" in label:
                    annotations["drops"].append(obs.time)
        elif namespace.lower().startswith("event"):
            for obs in ann.data:
                label = str(getattr(obs, "value", "")).lower()
                if "drop" in label:
                    annotations["drops"].append(obs.time)

    # Normalize boundary list: include 0.0 and last time if available
    if annotations["boundaries"]:
        annotations["boundaries"].append(0.0)

    # Ensure sorted unique times
    for k in annotations:
        annotations[k] = sorted(set(round(t, 6) for t in annotations[k]))
    return annotations


def load_predictions(pred_dir: Path, file_key: str) -> Dict[str, List[float]]:
    preds: Dict[str, List[float]] = {
        "beats": [],
        "downbeats": [],
        "boundaries": [],
        "drops": [],
        "latency_ms_trace": [],
    }
    latency_trace: List[float] = []
    # Try JSON first
    json_path = pred_dir / f"{file_key}.json"
    if json_path.exists():
        try:
            with json_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            for k in ("beats", "downbeats"):
                if k in data and isinstance(data[k], list):
                    preds[k] = sorted(set(round(float(t), 6) for t in data[k]))
            # Structure segments
            structure = data.get("structure", {})
            if isinstance(structure, dict):
                segments = structure.get("segments") or []
                boundary_times: List[float] = []
                for seg in segments:
                    if not isinstance(seg, dict):
                        continue
                    start_ms = seg.get("start_ms")
                    end_ms = seg.get("end_ms")
                    if start_ms is not None:
                        boundary_times.append(float(start_ms) / 1000.0)
                    if end_ms is not None:
                        boundary_times.append(float(end_ms) / 1000.0)
                preds["boundaries"] = sorted(set(round(t, 6) for t in boundary_times))
            # Drop events
            drop_data = data.get("drops")
            drop_events: List[float] = []
            if isinstance(drop_data, dict):
                events = drop_data.get("events") or []
                for evt in events:
                    if not isinstance(evt, dict):
                        continue
                    ts = evt.get("timestamp")
                    if ts is not None:
                        drop_events.append(float(ts))
            elif isinstance(drop_data, list):
                for evt in drop_data:
                    if isinstance(evt, dict) and "timestamp" in evt:
                        drop_events.append(float(evt["timestamp"]))
                    elif isinstance(evt, (float, int)):
                        drop_events.append(float(evt))
            preds["drops"] = sorted(set(round(t, 6) for t in drop_events))

            # Latency trace
            if isinstance(data.get("latency_ms_trace"), list):
                latency_trace.extend(float(x) for x in data["latency_ms_trace"])
            elif isinstance(data.get("latency_ms"), list):
                latency_trace.extend(float(x) for x in data["latency_ms"])

            preds["latency_ms_trace"] = latency_trace
            return preds
        except Exception:
            pass

    # Try JAMS predictions
    jams_path = pred_dir / f"{file_key}.jams"
    try:
        import jams  # type: ignore
    except Exception:
        jams_path = None

    if jams_path and jams_path.exists():
        try:
            jam = jams.load(str(jams_path))
            for ann in jam.annotations:
                namespace = getattr(ann, "namespace", "")
                if namespace == "beat":
                    preds["beats"].extend([obs.time for obs in ann.data])
                elif namespace in ("downbeat", "bar_downbeat"):
                    preds["downbeats"].extend([obs.time for obs in ann.data])
            for k in ("beats", "downbeats"):
                preds[k] = sorted(set(round(t, 6) for t in preds[k]))
        except Exception:
            pass
    return preds


def evaluate_beat_metrics(ref_beats: List[float], est_beats: List[float]) -> Dict[str, float]:
    try:
        import mir_eval  # type: ignore
    except Exception:
        return {"F1": float("nan"), "Cemgil": float("nan"), "AnyMetric": float("nan")}

    # mir_eval expects arrays; use default parameters
    ref = list(ref_beats)
    est = list(est_beats)
    if len(ref) == 0 or len(est) == 0:
        return {"F1": 0.0, "Cemgil": 0.0, "AnyMetric": 0.0}

    # F-measure
    f_measure = mir_eval.beat.f_measure(ref, est)
    # Cemgil accuracy
    cemgil = mir_eval.beat.cemgil(ref, est)
    return {"F1": float(f_measure), "Cemgil": float(cemgil), "AnyMetric": float(cemgil)}


def evaluate_downbeat(ref_downbeats: List[float], est_downbeats: List[float]) -> Dict[str, float]:
    # As a placeholder, reuse beat metrics on downbeats
    return evaluate_beat_metrics(ref_downbeats, est_downbeats)


def compute_boundary_scores(ref: List[float], est: List[float], tol: float) -> Dict[str, float]:
    if not ref or not est:
        return {"P": 0.0, "R": 0.0, "F1": 0.0}
    matches = 0
    used_ref = set()
    for e in est:
        diffs = [(abs(e - r), idx) for idx, r in enumerate(ref) if idx not in used_ref]
        if not diffs:
            continue
        distance, idx = min(diffs)
        if distance <= tol:
            matches += 1
            used_ref.add(idx)
    precision = matches / max(1, len(est))
    recall = matches / max(1, len(ref))
    denom = precision + recall
    f1 = 2 * precision * recall / denom if denom > 0 else 0.0
    return {"P": precision, "R": recall, "F1": f1}


def compute_drop_scores(ref: List[float], est: List[float], tol: float) -> Dict[str, float]:
    return compute_boundary_scores(ref, est, tol)


def summarize_latency(latencies: List[float]) -> Dict[str, float]:
    if not latencies:
        return {"median_ms": float("nan"), "p95_ms": float("nan"), "min_ms": float("nan"), "max_ms": float("nan")}
    arr = sorted(latencies)
    median = arr[len(arr) // 2]
    p95 = arr[int(len(arr) * 0.95) - 1] if len(arr) > 1 else median
    return {
        "median_ms": median,
        "p95_ms": p95,
        "min_ms": arr[0],
        "max_ms": arr[-1],
    }


def main():
    parser = argparse.ArgumentParser(description="K1 Lightwave Evaluation Harness")
    parser.add_argument(
        "--index",
        type=Path,
        default=Path("Implementation.plans/harmonixset-main/dataset/index.jsonl"),
        help="Path to dataset index JSONL",
    )
    parser.add_argument(
        "--predictions",
        type=Path,
        required=False,
        help="Directory containing prediction files (JSON/JAMS) keyed by file_key",
    )
    parser.add_argument(
        "--split",
        type=str,
        default="val",
        help="Dataset split to evaluate (train|val|test)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("test-results/k1_eval_report.json"),
        help="Output report path",
    )

    args = parser.parse_args()
    index_path: Path = args.index
    preds_dir: Optional[Path] = args.predictions
    split: str = args.split
    out_path: Path = args.out

    items = read_jsonl(index_path)
    selected = [it for it in items if it.get("split") == split]

    results: List[Dict] = []
    for it in selected:
        file_key = it.get("file_key")
        jams_path = Path(it.get("jams_path")) if it.get("jams_path") else None

        if not file_key or not jams_path:
            continue

        gt = load_jams_annotations(jams_path)
        preds = {"beats": [], "downbeats": []}
        if preds_dir:
            preds = load_predictions(preds_dir, file_key)

        beat_metrics = evaluate_beat_metrics(gt.get("beats", []), preds.get("beats", []))
        downbeat_metrics = evaluate_downbeat(gt.get("downbeats", []), preds.get("downbeats", []))
        structure_metrics = {
            "F1_0p5": compute_boundary_scores(gt.get("boundaries", []), preds.get("boundaries", []), tol=0.5)["F1"],
            "F1_3p0": compute_boundary_scores(gt.get("boundaries", []), preds.get("boundaries", []), tol=3.0)["F1"],
        }
        drop_metrics = {
            "F1_0p5": compute_drop_scores(gt.get("drops", []), preds.get("drops", []), tol=0.5)["F1"],
            "F1_1p0": compute_drop_scores(gt.get("drops", []), preds.get("drops", []), tol=1.0)["F1"],
        }
        latency_summary = summarize_latency(preds.get("latency_ms_trace", []))

        results.append(
            {
                "file_key": file_key,
                "beats": beat_metrics,
                "downbeats": downbeat_metrics,
                 "structure": structure_metrics,
                 "drops": drop_metrics,
                 "latency": latency_summary,
                "gt_counts": {k: len(v) for k, v in gt.items()},
                "pred_counts": {k: len(v) for k, v in preds.items()},
            }
        )

    # Aggregate simple averages
    def avg_metric(metric_key: str, field: str) -> float:
        vals = []
        for r in results:
            metric = r.get(metric_key, {})
            if isinstance(metric, dict):
                val = metric.get(field)
                if isinstance(val, (int, float)) and not (val != val):
                    vals.append(float(val))
        return float(sum(vals) / max(1, len(vals)))

    def collect_latencies() -> List[float]:
        latencies: List[float] = []
        for r in results:
            trace = r.get("latency", {})
            if isinstance(trace, dict):
                median = trace.get("median_ms")
                if isinstance(median, (int, float)):
                    latencies.append(float(median))
        return latencies

    report = {
        "split": split,
        "count": len(results),
        "metrics": {
            "beats_F1_avg": avg_metric("beats", "F1"),
            "beats_Cemgil_avg": avg_metric("beats", "Cemgil"),
            "structure_F1_0p5_avg": avg_metric("structure", "F1_0p5"),
            "structure_F1_3p0_avg": avg_metric("structure", "F1_3p0"),
            "drops_F1_0p5_avg": avg_metric("drops", "F1_0p5"),
            "drops_F1_1p0_avg": avg_metric("drops", "F1_1p0"),
        },
        "latency_summary": summarize_latency(collect_latencies()),
        "items": results,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # Minimal CLI feedback
    print(f"Wrote evaluation report: {out_path} (items={len(results)})")
    if len(results) == 0:
        print("Warning: No items found for split or missing JAMS paths.")


if __name__ == "__main__":
    main()
