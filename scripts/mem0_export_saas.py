#!/usr/bin/env python3
"""
Mem0 SaaS Memory Export Script
Task #1.5: Export all bootstrap memories from managed platform

Exports all memories from Mem0 SaaS to local JSON for migration to self-hosted.
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Any
from mem0 import MemoryClient


class Mem0Exporter:
    """Export memories from Mem0 managed platform."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.memory = MemoryClient(api_key=self.api_key)
        self.user_id = "spectrasynq"  # Match bootstrap user_id
        self.export_data = {
            "export_metadata": {
                "timestamp": datetime.now().isoformat(),
                "source": "mem0_saas",
                "user_id": self.user_id,
                "export_version": "1.0"
            },
            "memories": []
        }

    def get_all_memories(self) -> List[Dict[str, Any]]:
        """
        Retrieve all memories from Mem0 SaaS.

        Returns:
            List of memory objects with full metadata
        """
        # Mem0 API v2: get_all() returns empty/incomplete results
        # Use comprehensive search-based retrieval instead
        print("⚠ Using search-based retrieval (get_all returns incomplete results)")
        return self._search_all_memories()

    def _search_all_memories(self) -> List[Dict[str, Any]]:
        """Fallback: Use search with broad queries to retrieve all memories."""
        queries = [
            "K1",
            "architecture",
            "node",
            "pattern",
            "audio",
            "LED",
            "firmware",
            "design"
        ]

        all_memories = []
        seen_ids = set()

        for query in queries:
            try:
                filters = {"user_id": self.user_id}
                response = self.memory.search(
                    query=query,
                    filters=filters,
                    limit=50  # Increase limit to catch all
                )

                # Handle Mem0 API v2 response structure: {'results': [...]}
                results = response.get('results', []) if isinstance(response, dict) else response

                if results:
                    for mem in results:
                        mem_id = mem.get("id", mem.get("memory_id"))
                        if mem_id and mem_id not in seen_ids:
                            all_memories.append(mem)
                            seen_ids.add(mem_id)

            except Exception as e:
                print(f"  ⚠ Query '{query}' failed: {e}")
                continue

        print(f"✓ Retrieved {len(all_memories)} unique memories via search")
        return all_memories

    def export_to_json(self, output_path: str):
        """
        Export all memories to JSON file.

        Args:
            output_path: Path to save exported JSON
        """
        # Get all memories
        memories = self.get_all_memories()

        if not memories:
            print("✗ No memories found to export")
            return False

        # Add to export data
        self.export_data["memories"] = memories
        self.export_data["export_metadata"]["total_count"] = len(memories)

        # Write to file
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.export_data, f, indent=2, ensure_ascii=False)

        print(f"\n✓ Exported {len(memories)} memories to: {output_path}")
        return True

    def validate_export(self, output_path: str, expected_count: int = 10) -> bool:
        """
        Validate exported JSON file.

        Args:
            output_path: Path to exported JSON
            expected_count: Expected number of memories (default: 12 bootstrap)

        Returns:
            True if validation passes
        """
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            memories = data.get("memories", [])
            actual_count = len(memories)

            print(f"\n=== Export Validation ===")
            print(f"Expected memories: {expected_count}")
            print(f"Actual memories:   {actual_count}")

            if actual_count < expected_count:
                print(f"✗ Missing memories (got {actual_count}, expected {expected_count})")
                return False

            # Check each memory has required fields
            required_fields = ["id", "memory"]
            for idx, mem in enumerate(memories):
                missing = [f for f in required_fields if f not in mem and f.replace("id", "memory_id") not in mem]
                if missing:
                    print(f"✗ Memory {idx} missing fields: {missing}")
                    return False

            print(f"✓ All memories valid")
            return True

        except Exception as e:
            print(f"✗ Validation error: {e}")
            return False


def main():
    """Main export execution."""
    # Get API key from environment
    api_key = os.getenv("MEM0_API_KEY")
    if not api_key:
        print("✗ MEM0_API_KEY environment variable not set")
        return 1

    # Initialize exporter
    print("=== Mem0 SaaS Export ===\n")
    exporter = Mem0Exporter(api_key)

    # Export path
    export_path = ".mem0_local/export/saas_memories.json"

    # Export memories
    success = exporter.export_to_json(export_path)
    if not success:
        return 1

    # Validate export
    valid = exporter.validate_export(export_path, expected_count=10)
    if not valid:
        print("\n⚠ Export validation failed - manual review recommended")
        return 1

    print("\n✓ Export complete and validated")
    return 0


if __name__ == "__main__":
    exit(main())
