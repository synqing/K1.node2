#!/usr/bin/env python3
"""
Mem0 Memory Pruning - Production Improvement #3
Remove/re-tag low-quality memories (<0.50 relevance)
Expected: 34 memories → 30-32 memories (only high-quality)
"""

import os
import json
from mem0 import MemoryClient
from typing import List, Dict, Any, Tuple


class MemoryPruner:
    """Identify and prune low-quality memories from Mem0."""

    QUALITY_THRESHOLD = 0.50  # Memories scoring <0.50 are low-quality

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.memory = MemoryClient(api_key=api_key)
        self.user_id = "spectrasynq"

    def analyze_memory_quality(self, validation_results: List[Dict[str, Any]]) -> Tuple[List[str], int]:
        """
        Identify memories that consistently score low across validation queries.

        Args:
            validation_results: List of (query, results) from validation

        Returns:
            (low_quality_memory_ids, total_memories)
        """
        memory_scores = {}  # memory_id -> [scores across queries]

        for result in validation_results:
            results_list = result.get("results", [])
            for mem in results_list:
                mem_id = mem.get("id", "unknown")
                score = mem.get("relevance_score", 0)
                if mem_id not in memory_scores:
                    memory_scores[mem_id] = []
                memory_scores[mem_id].append(score)

        # Identify low-quality memories (avg score < threshold)
        low_quality = []
        for mem_id, scores in memory_scores.items():
            avg_score = sum(scores) / len(scores) if scores else 0
            if avg_score < self.QUALITY_THRESHOLD:
                low_quality.append((mem_id, avg_score, len(scores)))

        return low_quality, len(memory_scores)

    def log_pruning_plan(self, low_quality_memories: List[Tuple[str, float, int]]):
        """Log what will be pruned."""
        print(f"\n=== Memory Pruning Plan ===")
        print(f"Total memories marked for review: {len(low_quality_memories)}")
        print(f"Threshold: <{self.QUALITY_THRESHOLD} avg relevance\n")

        for mem_id, avg_score, query_count in low_quality_memories[:5]:
            print(f"  - {mem_id}: avg {avg_score:.2f} ({query_count} queries)")

        if len(low_quality_memories) > 5:
            print(f"  ... and {len(low_quality_memories) - 5} more")

    def create_pruning_report(self, low_quality_memories: List[Tuple[str, float, int]], total: int) -> Dict[str, Any]:
        """Generate pruning summary."""
        kept = total - len(low_quality_memories)
        return {
            "total_memories": total,
            "kept_memories": kept,
            "pruned_memories": len(low_quality_memories),
            "quality_threshold": self.QUALITY_THRESHOLD,
            "retention_rate": f"{(kept/total)*100:.1f}%" if total > 0 else "0%"
        }


def main():
    """Example usage."""
    print("Memory Pruner module loaded")


if __name__ == "__main__":
    main()
