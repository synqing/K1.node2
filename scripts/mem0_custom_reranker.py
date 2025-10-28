#!/usr/bin/env python3
"""
Custom K1 Reranker for Mem0

Applies K1-specific relevance scoring to improve memory retrieval quality.

Scoring Criteria (from MEM0_OPTIMIZATION_INSIGHTS.md):
1. Architectural reasoning (40%): Why X over Y, design decisions with rationale
2. Trade-offs (30%): Benefits vs. costs, constraints, alternatives considered
3. Recency (20%): Recent findings over generic facts
4. Actionability (10%): Specific guidance vs. abstract concepts

Expected improvement: +10-15% relevance score
"""

from mem0 import MemoryClient
from typing import List, Dict
import re
from datetime import datetime

class K1Reranker:
    """Custom reranker for K1.reinvented institutional memory."""

    # Architectural reasoning keywords (40% weight)
    ARCHITECTURAL_KEYWORDS = [
        "zero-overhead", "compile-time", "development-time", "philosophy",
        "decision", "constraint", "requirement", "must", "architecture",
        "design pattern", "why", "because", "rationale", "reasoning"
    ]

    # Trade-off keywords (30% weight)
    TRADEOFF_KEYWORDS = [
        "trade-off", "tradeoff", "benefit", "cost", "versus", "vs",
        "alternative", "option", "instead of", "compared to", "advantage",
        "disadvantage", "acceptable", "overhead", "complexity"
    ]

    # Recency indicators (20% weight)
    RECENCY_KEYWORDS = [
        "Task #1", "Task #2", "Agent #1", "Agent #2", "Agent #3",
        "PoC", "2025", "recent", "new", "latest", "current"
    ]

    # Actionability keywords (10% weight)
    ACTIONABILITY_KEYWORDS = [
        "should", "must", "implement", "use", "apply", "follow",
        "step", "action", "guide", "pattern", "example", "code",
        "specific", "exactly", "how to"
    ]

    def __init__(self):
        """Initialize K1 reranker."""
        pass

    def calculate_k1_score(self, memory: str, metadata: Dict) -> float:
        """
        Calculate K1-specific relevance score.

        Args:
            memory: Memory content text
            metadata: Memory metadata dict

        Returns:
            float: K1 relevance score (0.0-1.0)
        """
        memory_lower = memory.lower()

        # Score architectural reasoning (40%)
        arch_score = self._keyword_score(memory_lower, self.ARCHITECTURAL_KEYWORDS)
        arch_weight = 0.40

        # Score trade-offs (30%)
        tradeoff_score = self._keyword_score(memory_lower, self.TRADEOFF_KEYWORDS)
        tradeoff_weight = 0.30

        # Score recency (20%)
        recency_score = self._keyword_score(memory_lower, self.RECENCY_KEYWORDS)
        # Boost recency for recent memories
        if metadata and metadata.get('tags'):
            tags = metadata.get('tags', [])
            if 'poc' in tags or 'task1' in tags or 'task2' in tags:
                recency_score = min(1.0, recency_score * 1.2)
        recency_weight = 0.20

        # Score actionability (10%)
        action_score = self._keyword_score(memory_lower, self.ACTIONABILITY_KEYWORDS)
        action_weight = 0.10

        # Calculate weighted score
        k1_score = (
            arch_score * arch_weight +
            tradeoff_score * tradeoff_weight +
            recency_score * recency_weight +
            action_score * action_weight
        )

        return k1_score

    def _keyword_score(self, text: str, keywords: List[str]) -> float:
        """
        Calculate keyword presence score.

        Args:
            text: Text to score (lowercase)
            keywords: List of keywords to search for

        Returns:
            float: Score 0.0-1.0 based on keyword presence
        """
        matches = sum(1 for kw in keywords if kw in text)
        # Normalize: 0 matches = 0.0, 5+ matches = 1.0
        return min(1.0, matches / 5.0)

    def rerank(self, results: List[Dict], boost_factor: float = 0.15) -> List[Dict]:
        """
        Rerank search results using K1-specific scoring.

        Args:
            results: List of Mem0 search results
            boost_factor: How much to boost K1 score (0.0-1.0)

        Returns:
            List[Dict]: Reranked results with updated scores
        """
        reranked = []

        for result in results:
            memory = result.get('memory', '')
            metadata = result.get('metadata', {})
            original_score = result.get('score', 0.0)

            # Calculate K1-specific score
            k1_score = self.calculate_k1_score(memory, metadata)

            # Boost original score by K1 score
            boosted_score = original_score + (k1_score * boost_factor)
            boosted_score = min(1.0, boosted_score)  # Cap at 1.0

            # Update result
            result_copy = result.copy()
            result_copy['score'] = boosted_score
            result_copy['k1_score'] = k1_score
            result_copy['original_score'] = original_score

            reranked.append(result_copy)

        # Sort by boosted score
        reranked.sort(key=lambda x: x['score'], reverse=True)

        return reranked


class K1MemoryClient:
    """
    Wrapper around Mem0 MemoryClient with K1 custom reranker.

    Usage:
        client = K1MemoryClient(api_key=api_key)
        results = client.search(query="...", filters={...}, limit=5)
        # Results are automatically reranked with K1 scoring
    """

    def __init__(self, api_key: str):
        """Initialize K1 memory client with custom reranker."""
        self.client = MemoryClient(api_key=api_key)
        self.reranker = K1Reranker()

    def search(self, query: str, filters: Dict = None, limit: int = 5,
               use_reranker: bool = True, boost_factor: float = 0.15):
        """
        Search with optional K1 reranking.

        Args:
            query: Search query string
            filters: Mem0 filters dict
            limit: Number of results to return
            use_reranker: Whether to apply K1 reranking (default: True)
            boost_factor: How much to boost K1 score (default: 0.15 for +10-15%)

        Returns:
            Dict with 'results' key containing reranked results
        """
        # Execute base search
        results = self.client.search(query=query, filters=filters, limit=limit)

        if not results or 'results' not in results:
            return results

        # Apply K1 reranking if enabled
        if use_reranker:
            results['results'] = self.reranker.rerank(
                results['results'],
                boost_factor=boost_factor
            )

        return results

    def add(self, content: str, user_id: str, metadata: Dict = None):
        """
        Add memory (passthrough to Mem0 client).

        Args:
            content: Memory content
            user_id: User ID
            metadata: Memory metadata
        """
        return self.client.add(content, user_id=user_id, metadata=metadata)


# Example usage
if __name__ == "__main__":
    import os

    api_key = os.environ.get("MEM0_API_KEY")
    if not api_key:
        print("❌ Error: MEM0_API_KEY not set")
        exit(1)

    print("="*80)
    print("K1 CUSTOM RERANKER - TEST")
    print("="*80)

    # Initialize K1 memory client
    client = K1MemoryClient(api_key=api_key)

    # Test query
    query = "What are the key architectural constraints for the Node Editor?"
    print(f"\nTest Query: {query}")
    print("-" * 80)

    # Search WITHOUT reranker
    print("\n🔍 WITHOUT K1 Reranker:")
    results_no_rerank = client.search(
        query=query,
        filters={"user_id": "spectrasynq"},
        limit=5,
        use_reranker=False
    )

    if results_no_rerank and 'results' in results_no_rerank:
        for i, r in enumerate(results_no_rerank['results'][:3], 1):
            score = r.get('score', 0)
            memory = r['memory'][:100]
            print(f"{i}. [{score:.3f}] {memory}...")

    # Search WITH reranker
    print("\n🔍 WITH K1 Reranker (+15% boost):")
    results_reranked = client.search(
        query=query,
        filters={"user_id": "spectrasynq"},
        limit=5,
        use_reranker=True,
        boost_factor=0.15
    )

    if results_reranked and 'results' in results_reranked:
        for i, r in enumerate(results_reranked['results'][:3], 1):
            original = r.get('original_score', 0)
            k1 = r.get('k1_score', 0)
            boosted = r.get('score', 0)
            memory = r['memory'][:100]
            print(f"{i}. [orig: {original:.3f}, k1: {k1:.3f}, final: {boosted:.3f}] {memory}...")

    print("\n" + "="*80)
    print("✅ K1 RERANKER TEST COMPLETE")
    print("="*80)
