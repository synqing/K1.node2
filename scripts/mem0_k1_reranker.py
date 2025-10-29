#!/usr/bin/env python3
"""
Mem0 K1-Specific Reranker - Production Improvement #1
Uses K1 context to re-rank search results by architectural reasoning, trade-offs, temporal importance, actionability.
Expected improvement: +10-15% relevance (0.737 → 0.82-0.85)
"""

import os
import json
import requests
from typing import List, Dict, Any, Tuple
from enum import Enum


class RerankerBackend(Enum):
    OLLAMA = "ollama"
    OPENAI = "openai"


class K1Reranker:
    """Rerank Mem0 search results using K1-specific criteria."""

    K1_CONTEXT = """You are evaluating institutional memories for K1.reinvented, a visual programming environment for ESP32-S3 LEDs.

K1 Context:
- Zero-overhead node graph compilation (graphs → C++ at development-time)
- Audio-visual synchronization (Emotiscope core feature)
- Strict performance constraints (60+ FPS, <100ms audio latency, <10KB per pattern)
- Design philosophy: intentional, minimal, zero-cost abstractions

Evaluation Criteria:
1. **Architectural Reasoning (40%)** - Explains WHY a choice was made over alternatives?
2. **Trade-offs/Constraints (30%)** - Captures non-negotiable constraints or learnings from failures?
3. **Temporal Importance (20%)** - Recent/relevant knowledge?
4. **Actionability (10%)** - Can agents use this immediately?

Return JSON: {"score": <0-100>, "reasoning": "<explanation>", "weights_breakdown": {...}}"""

    RERANK_PROMPT = """
{k1_context}

Query: {query}
Memory: {memory_text}

Evaluate this memory against the query and scoring criteria. Return valid JSON only."""

    def __init__(self, backend: RerankerBackend = RerankerBackend.OLLAMA, model: str = None):
        self.backend = backend
        if backend == RerankerBackend.OLLAMA:
            self.model = model or "llama3.2:latest"
            self.url = "http://localhost:11434"
        else:
            self.model = model or "gpt-4"
            self.api_key = os.getenv("OPENAI_API_KEY")

    def score_memory(self, query: str, memory_text: str) -> Tuple[float, Dict[str, Any]]:
        """Score a single memory against a query."""
        prompt = self.RERANK_PROMPT.format(
            k1_context=self.K1_CONTEXT,
            query=query,
            memory_text=memory_text[:500]
        )
        try:
            if self.backend == RerankerBackend.OLLAMA:
                response = self._query_ollama(prompt)
            else:
                response = self._query_openai(prompt)
            details = json.loads(response)
            score = details.get("score", 0)
            return score, details
        except Exception as e:
            print(f"  ⚠️  Scoring failed: {e}")
            return 0, {"error": str(e)}

    def _query_ollama(self, prompt: str) -> str:
        """Query local Ollama LLM."""
        response = requests.post(
            f"{self.url}/api/generate",
            json={"model": self.model, "prompt": prompt, "stream": False, "format": "json"},
            timeout=30
        )
        response.raise_for_status()
        return response.json().get("response", "")

    def _query_openai(self, prompt: str) -> str:
        """Query OpenAI API."""
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={"model": self.model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.3},
            timeout=30
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    def rerank_results(self, query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Rerank search results using K1 context."""
        print(f"\n=== Reranking {len(results)} results ===\n")
        scored_results = []
        for idx, result in enumerate(results, 1):
            memory_text = result.get("memory", "")
            print(f"  [{idx}/{len(results)}] Scoring... ", end="", flush=True)
            score, details = self.score_memory(query, memory_text)
            print(f"✓ {score:.0f}/100")
            scored_results.append({**result, "k1_rerank_score": score, "k1_rerank_details": details})
        scored_results.sort(key=lambda x: x["k1_rerank_score"], reverse=True)
        print(f"\n=== Reranking Complete ===\n")
        return scored_results


if __name__ == "__main__":
    print("K1 Reranker module loaded")
