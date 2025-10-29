#!/usr/bin/env python3
"""
Mem0 Agent Search Wrapper with K1 Reranker Integration

Drop-in replacement for direct Mem0 searches with production-ready K1 reranking.

Usage (Before):
    from mem0 import MemoryClient
    memory = MemoryClient(api_key=api_key)
    results = memory.search(query="...", filters={...}, limit=5)

Usage (After):
    from mem0_agent_search import K1MemorySearch
    memory = K1MemorySearch(api_key=api_key)
    results = memory.search(query="...", filters={...}, limit=5)  # Auto-reranked!

The wrapper:
- Fetches more candidates (10x limit) from Mem0
- Reranks using K1-specific criteria (architectural reasoning, trade-offs, temporal, actionability)
- Returns top N results sorted by K1 relevance scores
- Maintains backward compatibility (same interface as MemoryClient.search())
"""

import sys
import os
from pathlib import Path

# Add scripts directory to path for imports
scripts_dir = Path(__file__).parent
if str(scripts_dir) not in sys.path:
    sys.path.insert(0, str(scripts_dir))

from mem0 import MemoryClient
from mem0_k1_reranker import K1Reranker, RerankerBackend
from typing import Dict, List, Any, Optional


class K1MemorySearch:
    """
    Mem0 search wrapper with automatic K1 reranking.

    Provides same interface as MemoryClient but applies K1-aware reranking
    to improve relevance for architectural decisions, constraints, and learnings.
    """

    def __init__(self, api_key: str, reranker_model: str = "llama3.2:latest", use_ollama: bool = True):
        """
        Initialize K1 Memory Search with Mem0 client and reranker.

        Args:
            api_key: Mem0 API key
            reranker_model: LLM model for reranking (default: llama3.2:latest via Ollama)
            use_ollama: True for Ollama (local), False for OpenAI
        """
        self.memory = MemoryClient(api_key=api_key)
        backend = RerankerBackend.OLLAMA if use_ollama else RerankerBackend.OPENAI
        self.reranker = K1Reranker(backend=backend, model=reranker_model)
        self.user_id = "spectrasynq"  # Default K1 user ID

    def search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 5,
        enable_reranking: bool = True,
        candidate_multiplier: int = 10
    ) -> Dict[str, Any]:
        """
        Search Mem0 with automatic K1 reranking.

        Args:
            query: Search query
            filters: Mem0 search filters (e.g., {"user_id": "spectrasynq"})
            limit: Number of final results to return
            enable_reranking: Enable K1 reranking (disable for debugging)
            candidate_multiplier: Fetch N*limit candidates for reranking (default: 10x)

        Returns:
            Dict with 'results' key containing reranked memories
            Each result includes original Mem0 fields + 'k1_rerank_score' + 'k1_rerank_details'
        """
        if filters is None:
            filters = {"user_id": self.user_id}

        # Fetch more candidates for reranking
        candidate_limit = limit * candidate_multiplier if enable_reranking else limit

        # Query Mem0
        raw_results = self.memory.search(
            query=query,
            filters=filters,
            limit=candidate_limit
        )

        if not raw_results or 'results' not in raw_results or not raw_results['results']:
            return {"results": []}

        # Rerank if enabled
        if enable_reranking:
            reranked = self.reranker.rerank_results(query, raw_results['results'])
            return {"results": reranked[:limit]}
        else:
            return {"results": raw_results['results'][:limit]}

    def add(self, content: str, user_id: str, metadata: Optional[Dict[str, Any]] = None):
        """
        Add memory to Mem0 (pass-through to MemoryClient).

        Args:
            content: Memory content
            user_id: User ID for memory storage
            metadata: Optional metadata dict
        """
        return self.memory.add(content, user_id=user_id, metadata=metadata)

    def get_all(self, user_id: str, **kwargs):
        """Get all memories (pass-through to MemoryClient)."""
        return self.memory.get_all(user_id=user_id, **kwargs)

    def delete_all(self, user_id: str):
        """Delete all memories (pass-through to MemoryClient)."""
        return self.memory.delete_all(user_id=user_id)


def example_agent_usage():
    """
    Example: Agent using K1MemorySearch instead of direct Mem0 queries.
    """
    import os

    # Initialize with K1 reranker (drop-in replacement for MemoryClient)
    memory = K1MemorySearch(
        api_key=os.getenv("MEM0_API_KEY"),
        reranker_model="llama3.2:latest",  # Use Ollama locally
        use_ollama=True
    )

    # Search with automatic K1 reranking (same interface as before)
    results = memory.search(
        query="What are the key architectural constraints for the Node Editor?",
        filters={"user_id": "spectrasynq"},
        limit=3
    )

    # Results now include K1 rerank scores
    for i, result in enumerate(results['results'], 1):
        print(f"\n{i}. Score: {result['k1_rerank_score']}/100")
        print(f"   Memory: {result['memory'][:100]}...")
        print(f"   Reasoning: {result['k1_rerank_details']['reasoning']}")


if __name__ == "__main__":
    example_agent_usage()
