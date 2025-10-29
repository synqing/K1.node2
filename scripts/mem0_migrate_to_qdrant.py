#!/usr/bin/env python3
"""
Mem0 SaaS → Qdrant Migration Script
Task #1.5: Transform and import memories from SaaS export to local Qdrant

Reads exported Mem0 SaaS memories, generates embeddings via Ollama,
and imports to local Qdrant instance for self-hosted deployment.
"""

import json
import os
from typing import List, Dict, Any
from datetime import datetime
import requests
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct


class Mem0ToQdrantMigrator:
    """Migrate memories from Mem0 SaaS export to local Qdrant."""

    def __init__(self, ollama_url: str = "http://localhost:11434", qdrant_url: str = "http://localhost:6333"):
        self.ollama_url = ollama_url
        self.qdrant_url = qdrant_url
        self.qdrant_client = QdrantClient(url=qdrant_url)
        self.collection_name = "mem0_k1_memories"
        self.embedding_model = "nomic-embed-text:latest"
        self.embedding_dims = 768  # nomic-embed-text dimensions

    def setup_qdrant_collection(self):
        """
        Create Qdrant collection if it doesn't exist.

        Collection schema:
        - name: mem0_k1_memories
        - vector size: 768 (nomic-embed-text)
        - distance: Cosine similarity
        """
        try:
            # Check if collection exists
            collections = self.qdrant_client.get_collections()
            collection_names = [c.name for c in collections.collections]

            if self.collection_name in collection_names:
                print(f"⚠ Collection '{self.collection_name}' already exists, will append to it")
                return True

            # Create collection
            self.qdrant_client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.embedding_dims,
                    distance=Distance.COSINE
                )
            )
            print(f"✓ Created collection: {self.collection_name}")
            return True

        except Exception as e:
            print(f"✗ Error setting up collection: {e}")
            return False

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text using Ollama.

        Args:
            text: Text to embed

        Returns:
            768-dimensional embedding vector
        """
        try:
            response = requests.post(
                f"{self.ollama_url}/api/embeddings",
                json={
                    "model": self.embedding_model,
                    "prompt": text
                },
                timeout=30
            )
            response.raise_for_status()

            data = response.json()
            embedding = data.get("embedding", [])

            if len(embedding) != self.embedding_dims:
                raise ValueError(f"Expected {self.embedding_dims} dims, got {len(embedding)}")

            return embedding

        except Exception as e:
            print(f"  ✗ Embedding generation failed: {e}")
            raise

    def load_export(self, export_path: str) -> List[Dict[str, Any]]:
        """
        Load memories from Mem0 SaaS export JSON.

        Args:
            export_path: Path to exported JSON file

        Returns:
            List of memory dictionaries
        """
        try:
            with open(export_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            memories = data.get("memories", [])
            metadata = data.get("export_metadata", {})

            print(f"\n=== Export Loaded ===")
            print(f"Source: {metadata.get('source', 'unknown')}")
            print(f"User ID: {metadata.get('user_id', 'unknown')}")
            print(f"Timestamp: {metadata.get('timestamp', 'unknown')}")
            print(f"Total memories: {len(memories)}")

            return memories

        except Exception as e:
            print(f"✗ Error loading export: {e}")
            return []

    def transform_memory(self, memory: Dict[str, Any], index: int) -> PointStruct:
        """
        Transform Mem0 memory to Qdrant point.

        Args:
            memory: Memory dict from Mem0 export
            index: Sequential index for point ID

        Returns:
            Qdrant PointStruct with embedding and payload
        """
        # Extract memory text
        memory_text = memory.get("memory", memory.get("content", ""))
        memory_id = memory.get("id", memory.get("memory_id", str(index)))

        # Generate embedding
        print(f"  [{index}] Generating embedding... ", end="")
        embedding = self.generate_embedding(memory_text)
        print(f"✓ ({len(embedding)} dims)")

        # Build payload (metadata)
        payload = {
            "memory": memory_text,
            "source": "mem0_saas_migration",
            "migrated_at": datetime.now().isoformat(),
            "original_id": memory_id,
            "original_metadata": memory.get("metadata", {})
        }

        # Create Qdrant point
        point = PointStruct(
            id=index,  # Use sequential index
            vector=embedding,
            payload=payload
        )

        return point

    def migrate(self, export_path: str) -> bool:
        """
        Execute full migration from export to Qdrant.

        Args:
            export_path: Path to Mem0 SaaS export JSON

        Returns:
            True if migration successful
        """
        print("=" * 60)
        print("MEM0 SAAS → QDRANT MIGRATION")
        print("=" * 60)

        # Load export
        memories = self.load_export(export_path)
        if not memories:
            print("✗ No memories to migrate")
            return False

        # Setup Qdrant collection
        print("\n=== Setting up Qdrant ===")
        if not self.setup_qdrant_collection():
            return False

        # Transform and import memories
        print(f"\n=== Migrating {len(memories)} memories ===")
        points = []

        for idx, memory in enumerate(memories, start=1):
            try:
                point = self.transform_memory(memory, idx)
                points.append(point)
            except Exception as e:
                print(f"  ✗ Failed to transform memory {idx}: {e}")
                continue

        if not points:
            print("✗ No points to import")
            return False

        # Batch import to Qdrant
        print(f"\n=== Importing {len(points)} points to Qdrant ===")
        try:
            self.qdrant_client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            print(f"✓ Successfully imported {len(points)} memories")
            return True

        except Exception as e:
            print(f"✗ Import failed: {e}")
            return False

    def validate_migration(self, expected_count: int) -> bool:
        """
        Validate migration by checking collection stats.

        Args:
            expected_count: Expected number of points

        Returns:
            True if validation passes
        """
        print(f"\n=== Migration Validation ===")
        try:
            collection_info = self.qdrant_client.get_collection(self.collection_name)
            actual_count = collection_info.points_count

            print(f"Expected points: {expected_count}")
            print(f"Actual points:   {actual_count}")

            if actual_count >= expected_count:
                print(f"✓ Validation passed")
                return True
            else:
                print(f"✗ Missing points ({actual_count}/{expected_count})")
                return False

        except Exception as e:
            print(f"✗ Validation error: {e}")
            return False


def main():
    """Main migration execution."""
    # Paths
    export_path = ".mem0_local/export/saas_memories.json"

    if not os.path.exists(export_path):
        print(f"✗ Export file not found: {export_path}")
        print("  Run: python3 scripts/mem0_export_saas.py first")
        return 1

    # Initialize migrator
    migrator = Mem0ToQdrantMigrator()

    # Execute migration
    success = migrator.migrate(export_path)
    if not success:
        return 1

    # Validate migration
    # Count expected memories from export
    with open(export_path, 'r') as f:
        data = json.load(f)
        expected_count = len(data.get("memories", []))

    valid = migrator.validate_migration(expected_count)
    if not valid:
        print("\n⚠ Migration validation failed")
        return 1

    print("\n✓ Migration complete and validated")
    return 0


if __name__ == "__main__":
    exit(main())
