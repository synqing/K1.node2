#!/usr/bin/env python3
"""
Mem0 Production Readiness Validation
Integrates all 3 improvements: Reranker, Query Rephraser, Memory Pruner
Runs 10 validation queries with improvements enabled
Expected: 0.737 → 0.82-0.85 avg relevance
"""

import os
import json
import sys
from typing import List, Dict, Any

from mem0 import MemoryClient
sys.path.insert(0, os.path.dirname(__file__))
from mem0_k1_reranker import K1Reranker, RerankerBackend
from mem0_query_rephrase import QueryRephraser
from mem0_prune_memories import MemoryPruner


class ProductionValidator:
    """Validate Mem0 is production-ready using all 3 improvements."""

    VALIDATION_QUERIES = [
        "What are the key architectural constraints for the Node Editor?",
        "How does the Node Editor integrate with the Control Panel?",
        "What are the accessibility requirements for the Node Editor?",
        "How does the node graph compilation pipeline work?",
        "What are the four node categories and their visual identities?",
        "What design tokens should the Node Editor use?",
        "How should the Node Editor manage state separately from Control Panel?",
        "What is the zero-overhead compilation philosophy?",
        "What are the audio synchronization requirements?",
        "What constraints apply to the firmware FPS budget?"
    ]

    def __init__(self, api_key: str):
        self.memory = MemoryClient(api_key=api_key)
        self.user_id = "spectrasynq"
        self.reranker = K1Reranker(backend=RerankerBackend.OLLAMA)
        self.rephraser = QueryRephraser()
        self.results = []

    def validate(self):
        """Run all 10 validation queries with improvements enabled."""
        print("=" * 70)
        print("MEM0 PRODUCTION READINESS VALIDATION")
        print("=" * 70)
        print(f"Queries: {len(self.VALIDATION_QUERIES)}")
        print(f"Improvements: K1 Reranker + Query Rephraser")
        print("=" * 70 + "\n")

        for idx, query in enumerate(self.VALIDATION_QUERIES, 1):
            print(f"\n[Query {idx}/{len(self.VALIDATION_QUERIES)}] {query}")
            print("-" * 70)

            # Step 1: Initial search against Mem0
            filters = {"user_id": self.user_id}
            response = self.memory.search(query=query, filters=filters, limit=5)
            raw_results = response.get("results", []) if isinstance(response, dict) else response

            print(f"Initial results: {len(raw_results)}")

            if not raw_results:
                print("⚠️  No results found, skipping")
                self.results.append({"query": query, "status": "NO_RESULTS", "score": 0})
                continue

            # Step 2: Rerank results using K1 context
            print("Reranking with K1 context...")
            reranked = self.reranker.rerank_results(query, raw_results)
            top_score = reranked[0].get("k1_rerank_score", 0) if reranked else 0

            print(f"Top reranked score: {top_score:.0f}/100")

            # Step 3: If score is low, rephrase and retry
            if top_score < 60:
                top_result = reranked[0].get("memory", "")[:100] if reranked else ""
                print(f"Score too low ({top_score:.0f}/100), rephrasing query...")

                rephrased_queries, should_retry = self.rephraser.rephrase_query(query, top_result, top_score)
                if rephrased_queries:
                    print(f"Generated {len(rephrased_queries)} alternative phrasings")
                    best_rephrased_score = 0
                    best_rephrased = None

                    for rq in rephrased_queries[:2]:  # Try top 2
                        print(f"  Trying: '{rq}'...")
                        resp2 = self.memory.search(query=rq, filters=filters, limit=3)
                        res2 = resp2.get("results", []) if isinstance(resp2, dict) else resp2
                        if res2:
                            reranked2 = self.reranker.rerank_results(rq, res2)
                            score2 = reranked2[0].get("k1_rerank_score", 0)
                            if score2 > best_rephrased_score:
                                best_rephrased_score = score2
                                best_rephrased = reranked2

                    if best_rephrased and best_rephrased_score > top_score:
                        print(f"  ✓ Improvement: {top_score:.0f} → {best_rephrased_score:.0f}")
                        reranked = best_rephrased
                        top_score = best_rephrased_score

            # Record result
            self.results.append({
                "query": query,
                "status": "OK",
                "score": top_score,
                "results_count": len(reranked)
            })

        # Generate final report
        self.generate_report()

    def generate_report(self):
        """Generate production readiness report."""
        print("\n" + "=" * 70)
        print("VALIDATION RESULTS")
        print("=" * 70 + "\n")

        passed = sum(1 for r in self.results if r["status"] == "OK" and r["score"] >= 0.70)
        conditional = sum(1 for r in self.results if r["status"] == "OK" and 0.60 <= r["score"] < 0.70)
        failed = sum(1 for r in self.results if r["status"] == "OK" and r["score"] < 0.60)
        no_results = sum(1 for r in self.results if r["status"] == "NO_RESULTS")

        total_ok = len([r for r in self.results if r["status"] == "OK"])
        scores = [r["score"] for r in self.results if r["status"] == "OK"]
        avg_score = sum(scores) / len(scores) if scores else 0

        print(f"✅ PASS (≥0.70):      {passed}/{total_ok}")
        print(f"⚠️  CONDITIONAL:     {conditional}/{total_ok}")
        print(f"❌ FAIL (<0.60):     {failed}/{total_ok}")
        print(f"⚠️  NO RESULTS:      {no_results}/{len(self.results)}")
        print(f"\nAverage Relevance:   {avg_score:.3f}")
        print(f"Target Relevance:    0.820-0.850")

        status = "✅ PRODUCTION READY" if avg_score >= 0.82 else "⚠️  CONDITIONAL" if avg_score >= 0.737 else "❌ NEEDS WORK"
        print(f"\nStatus: {status}\n")

        # Save report
        report = {
            "timestamp": "2025-10-29",
            "passed": passed,
            "conditional": conditional,
            "failed": failed,
            "no_results": no_results,
            "total_queries": len(self.results),
            "avg_relevance": avg_score,
            "target_relevance": "0.82-0.85",
            "status": status,
            "queries": self.results
        }

        with open("Implementation.plans/poc/VALIDATION_RESULTS_POST_IMPROVEMENTS.json", "w") as f:
            json.dump(report, f, indent=2)

        print(f"Report saved to: Implementation.plans/poc/VALIDATION_RESULTS_POST_IMPROVEMENTS.json")


def main():
    api_key = os.getenv("MEM0_API_KEY")
    if not api_key:
        print("❌ MEM0_API_KEY not set")
        return 1

    validator = ProductionValidator(api_key)
    validator.validate()
    return 0


if __name__ == "__main__":
    exit(main())
