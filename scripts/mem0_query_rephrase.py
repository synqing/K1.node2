#!/usr/bin/env python3
"""
Mem0 Query Rephrasing - Production Improvement #2
Auto-rephrase queries that score <0.60 relevance using K1 context
Expected improvement: Fixes phrasing mismatches (Query #1 and #5)
"""

import os
import json
import requests
from typing import Tuple


class QueryRephraser:
    """Auto-rephrase queries using K1 context when results are poor."""

    K1_CONTEXT = """You are helping rephrase a search query for K1.reinvented, a visual programming environment for ESP32-S3 LEDs.

K1 terminology:
- "Node Editor" vs "Graph Editor" (we use "Node Editor")
- "Patterns" = LED visual effects (animations, reactive visuals)
- "Zero-overhead" = compile-time (development-time), not runtime
- "Emotiscope" = audio-visual synchronization system
- "Control Panel" = main web UI for device control
- "Node graph" = visual representation of effect composition
- "Constraints" = FPS limits, memory limits, performance budgets

When a query fails or scores low, suggest 2-3 alternative phrasings that K1 engineers would use."""

    REPHRASE_PROMPT = """
{k1_context}

Original Query: {original_query}
Top Result: {top_result}
Relevance Score: {relevance_score}/100

This query scored low. Generate 2-3 alternative phrasings that K1 engineers would use.
Return JSON: {{"rephrased_queries": ["phrasing1", "phrasing2", "phrasing3"]}}"""

    def __init__(self, model: str = "llama3.2:latest"):
        self.model = model
        self.ollama_url = "http://localhost:11434"

    def rephrase_query(self, original_query: str, top_result: str, relevance_score: float) -> Tuple[list, bool]:
        """
        Generate alternative query phrasings.
        
        Returns:
            (rephrased_queries: list, should_retry: bool)
        """
        if relevance_score >= 0.60:
            return [], False  # Query is good, don't rephrase

        prompt = self.REPHRASE_PROMPT.format(
            k1_context=self.K1_CONTEXT,
            original_query=original_query,
            top_result=top_result[:200],
            relevance_score=int(relevance_score * 100)
        )

        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False, "format": "json"},
                timeout=30
            )
            response.raise_for_status()
            result = json.loads(response.json().get("response", "{}"))
            rephrased = result.get("rephrased_queries", [])
            return rephrased, len(rephrased) > 0
        except Exception as e:
            print(f"  ⚠️  Rephrase failed: {e}")
            return [], False


if __name__ == "__main__":
    print("Query Rephraser module loaded")
