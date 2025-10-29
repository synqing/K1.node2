#!/usr/bin/env python3
"""
PoC Phase 4 - Memory Quality Assessment & Validation

This script:
1. Runs 10 test queries to assess memory quality
2. Measures relevance scores, coverage, duplication
3. Validates institutional memory completeness
4. Generates validation report
"""

import os
from mem0 import MemoryClient
from datetime import datetime

class MemoryValidator:
    def __init__(self, api_key: str):
        """Initialize Mem0 client."""
        self.memory = MemoryClient(api_key=api_key)
        self.user_id = "spectrasynq"
        self.results = []

    def run_test_query(self, query: str, expected_topics: list, limit: int = 5):
        """Run a test query and assess results."""
        print(f"\n{'='*80}")
        print(f"TEST QUERY: {query}")
        print(f"Expected topics: {', '.join(expected_topics)}")
        print('-' * 80)

        filters = {"user_id": self.user_id}
        results = self.memory.search(
            query=query,
            filters=filters,
            limit=limit
        )

        if not results or 'results' not in results:
            print("❌ FAIL: No results found")
            self.results.append({
                "query": query,
                "status": "FAIL",
                "reason": "No results",
                "relevance_avg": 0,
                "coverage": 0,
                "top_result": None
            })
            return

        result_list = results['results']
        print(f"✓ Found {len(result_list)} results")

        # Calculate relevance scores
        scores = [r.get('score', 0) for r in result_list]
        avg_score = sum(scores) / len(scores) if scores else 0

        # Check coverage (how many expected topics are covered)
        memories_text = ' '.join([r['memory'].lower() for r in result_list])
        covered_topics = [topic for topic in expected_topics if topic.lower() in memories_text]
        coverage = len(covered_topics) / len(expected_topics) if expected_topics else 0

        # Display top 3 results
        print(f"\nTop {min(3, len(result_list))} results:")
        for i, r in enumerate(result_list[:3], 1):
            score = r.get('score', 0)
            memory = r['memory'][:120]
            print(f"{i}. [{score:.3f}] {memory}...")

        print(f"\n📊 Metrics:")
        print(f"   Avg Relevance: {avg_score:.3f}")
        print(f"   Coverage: {coverage*100:.0f}% ({len(covered_topics)}/{len(expected_topics)} topics)")
        print(f"   Covered: {', '.join(covered_topics) if covered_topics else 'None'}")

        # Assess status
        if avg_score >= 0.70 and coverage >= 0.60:
            status = "✅ PASS"
        elif avg_score >= 0.60 and coverage >= 0.40:
            status = "⚠️  CONDITIONAL"
        else:
            status = "❌ FAIL"

        print(f"\n{status}")

        self.results.append({
            "query": query,
            "status": status,
            "relevance_avg": avg_score,
            "coverage": coverage,
            "covered_topics": covered_topics,
            "top_result": result_list[0]['memory'][:200] if result_list else None
        })

    def run_validation_suite(self):
        """Run all validation queries."""
        print("\n" + "="*80)
        print("PHASE 4: MEMORY QUALITY ASSESSMENT & VALIDATION")
        print("="*80)

        # Query 1: Architecture
        self.run_test_query(
            "What are the key architectural constraints for the Node Editor?",
            expected_topics=["zero-overhead", "compile-time", "no runtime", "JSON graph"]
        )

        # Query 2: Integration
        self.run_test_query(
            "How does the Node Editor integrate with the Control Panel?",
            expected_topics=["4th view tab", "navigation", "sidebar", "design tokens"]
        )

        # Query 3: Accessibility
        self.run_test_query(
            "What are the accessibility requirements for the Node Editor?",
            expected_topics=["keyboard", "WCAG", "ARIA", "screen reader"]
        )

        # Query 4: Compilation Pipeline
        self.run_test_query(
            "How does the node graph compilation pipeline work?",
            expected_topics=["validate", "compile", "build", "deploy", "JSON", "C++"]
        )

        # Query 5: Node Categories
        self.run_test_query(
            "What are the four node categories and their visual identities?",
            expected_topics=["generators", "transforms", "color", "compositers", "icons"]
        )

        # Query 6: Design System
        self.run_test_query(
            "What design tokens should the Node Editor use?",
            expected_topics=["--k1-bg", "colors", "spacing", "typography", "dark theme"]
        )

        # Query 7: State Management
        self.run_test_query(
            "How should the Node Editor manage state separately from Control Panel?",
            expected_topics=["dual state", "graph state", "isolation", "shared connection"]
        )

        # Query 8: Component Reuse
        self.run_test_query(
            "Which K1 Control Panel components should Node Editor reuse?",
            expected_topics=["K1Button", "K1Card", "K1Modal", "K1Toast", "primitives"]
        )

        # Query 9: Migration Strategy
        self.run_test_query(
            "What is the phased rollout strategy for Node Editor?",
            expected_topics=["phase 1", "read-only", "editing", "compile", "deploy"]
        )

        # Query 10: Performance
        self.run_test_query(
            "What are the performance characteristics of compile-time nodes?",
            expected_topics=["15.9x", "faster", "22 cycles", "overhead", "benchmark"]
        )

    def generate_report(self):
        """Generate validation report."""
        print("\n" + "="*80)
        print("VALIDATION SUMMARY")
        print("="*80)

        passed = sum(1 for r in self.results if "✅" in r['status'])
        conditional = sum(1 for r in self.results if "⚠️" in r['status'])
        failed = sum(1 for r in self.results if "❌" in r['status'])

        avg_relevance = sum(r['relevance_avg'] for r in self.results) / len(self.results)
        avg_coverage = sum(r['coverage'] for r in self.results) / len(self.results)

        print(f"\nTest Results:")
        print(f"  ✅ PASS: {passed}/10 ({passed*10}%)")
        print(f"  ⚠️  CONDITIONAL: {conditional}/10 ({conditional*10}%)")
        print(f"  ❌ FAIL: {failed}/10 ({failed*10}%)")

        print(f"\nAggregate Metrics:")
        print(f"  Avg Relevance: {avg_relevance:.3f} (target: ≥0.70)")
        print(f"  Avg Coverage: {avg_coverage*100:.0f}% (target: ≥60%)")

        print(f"\nDetailed Results:")
        for i, r in enumerate(self.results, 1):
            print(f"\n{i}. {r['query'][:60]}...")
            print(f"   Status: {r['status']}")
            print(f"   Relevance: {r['relevance_avg']:.3f}")
            print(f"   Coverage: {r['coverage']*100:.0f}%")
            if r.get('covered_topics'):
                print(f"   Covered: {', '.join(r['covered_topics'])}")

        # Overall assessment
        print(f"\n{'='*80}")
        if passed >= 8:
            print("✅ VALIDATION RESULT: PASS")
            print("Memory quality is EXCELLENT. Proceed to Decision Gate.")
        elif passed >= 6:
            print("⚠️  VALIDATION RESULT: CONDITIONAL")
            print("Memory quality is GOOD but has gaps. Consider improvements before production.")
        else:
            print("❌ VALIDATION RESULT: FAIL")
            print("Memory quality is INSUFFICIENT. Address gaps before proceeding.")
        print("="*80)

        # Write report to file
        report_path = "/Users/spectrasynq/Workspace_Management/Software/K1.reinvented/docs/reports/poc_memory_quality_report.md"
        self._write_markdown_report(report_path, passed, conditional, failed, avg_relevance, avg_coverage)
        print(f"\n📄 Full report written to: {report_path}")

        return {
            "passed": passed,
            "conditional": conditional,
            "failed": failed,
            "avg_relevance": avg_relevance,
            "avg_coverage": avg_coverage
        }

    def _write_markdown_report(self, path, passed, conditional, failed, avg_relevance, avg_coverage):
        """Write detailed markdown report."""
        content = f"""---
title: Memory Quality Assessment Report
status: completed
version: v1.0
owner: Claude (Mem0 PoC)
reviewers: [Engineering Leads]
last_updated: {datetime.now().strftime('%Y-%m-%d')}
next_review_due: {datetime.now().strftime('%Y-%m-%d')}
tags: [report, poc, memory, validation]
related_docs: [Implementation.plans/poc/README.md, docs/reports/poc_task1_review.md, docs/reports/poc_task2_review.md]
---
# Memory Quality Assessment Report

**Date:** {datetime.now().strftime('%Y-%m-%d')}
**Phase:** 4 (Validation)
**Total Queries:** 10
**Memory Count:** 34 (12 bootstrap + 6 Task #1 + 16 Task #2)

---

## Executive Summary

**Test Results:**
- ✅ PASS: {passed}/10 ({passed*10}%)
- ⚠️  CONDITIONAL: {conditional}/10 ({conditional*10}%)
- ❌ FAIL: {failed}/10 ({failed*10}%)

**Aggregate Metrics:**
- Avg Relevance: {avg_relevance:.3f} (target: ≥0.70)
- Avg Coverage: {avg_coverage*100:.0f}% (target: ≥60%)

**Overall Assessment:**
"""
        if passed >= 8:
            content += "✅ **PASS** - Memory quality is EXCELLENT. Proceed to Decision Gate.\n"
        elif passed >= 6:
            content += "⚠️  **CONDITIONAL** - Memory quality is GOOD but has gaps. Consider improvements.\n"
        else:
            content += "❌ **FAIL** - Memory quality is INSUFFICIENT. Address gaps before proceeding.\n"

        content += "\n---\n\n## Detailed Test Results\n\n"

        for i, r in enumerate(self.results, 1):
            content += f"### Query {i}: {r['query']}\n\n"
            content += f"**Status:** {r['status']}\n\n"
            content += f"**Metrics:**\n"
            content += f"- Relevance Score: {r['relevance_avg']:.3f}\n"
            content += f"- Coverage: {r['coverage']*100:.0f}%\n"
            if r.get('covered_topics'):
                content += f"- Covered Topics: {', '.join(r['covered_topics'])}\n"
            content += f"\n**Top Result:**\n> {r['top_result']}\n\n"
            content += "---\n\n"

        content += """
## Recommendations

### If PASS (8+ queries passed)
1. Proceed to Decision Gate (Phase 5)
2. Review PoC results against 3 success criteria
3. Create ADR for production integration
4. Plan Phase 1 implementation

### If CONDITIONAL (6-7 queries passed)
1. Implement custom K1 reranker (10-15% improvement expected)
2. Prune low-relevance memories (<0.50 score)
3. Re-run validation queries
4. If improvement, proceed to Decision Gate

### If FAIL (<6 queries passed)
1. Analyze gaps in memory coverage
2. Extract missing context from source documents
3. Improve memory tagging and metadata
4. Re-run validation queries
5. Consider alternative approaches if still failing

---

**Report Status:** Completed
**Author:** Claude (Mem0 PoC Validation)
**Next Step:** Captain review + Decision Gate
"""

        with open(path, 'w') as f:
            f.write(content)

if __name__ == "__main__":
    api_key = os.environ.get("MEM0_API_KEY")
    if not api_key:
        print("❌ Error: MEM0_API_KEY not set")
        exit(1)

    validator = MemoryValidator(api_key)
    validator.run_validation_suite()
    results = validator.generate_report()

    # Return exit code based on results
    if results['passed'] >= 8:
        exit(0)  # SUCCESS
    elif results['passed'] >= 6:
        exit(1)  # CONDITIONAL
    else:
        exit(2)  # FAIL
