#!/usr/bin/env python3
"""
Mem0 Bulk Ingestion Script for K1.reinvented

Purpose:
  - Ingest all critical documentation into Mem0 institutional memory
  - Structured by priority tiers (TIER 1-6)
  - Handles ADRs, forensic analysis, reports, plans, and architecture docs

Usage:
  1. Set MEM0_API_KEY:
     export MEM0_API_KEY="your-api-key"

  2. Run full ingestion:
     python scripts/mem0_bulk_ingest.py --tier all

  3. Run specific tier:
     python scripts/mem0_bulk_ingest.py --tier 1

  4. Dry run (preview only):
     python scripts/mem0_bulk_ingest.py --tier all --dry-run

Documentation: https://docs.mem0.ai/
"""

import os
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

try:
    from mem0 import MemoryClient
except ImportError:
    print("ERROR: mem0ai package not installed. Install with:")
    print("  pip install mem0ai")
    sys.exit(1)


class BulkIngestion:
    """Bulk documentation ingestion for Mem0."""

    def __init__(self, api_key: Optional[str] = None, dry_run: bool = False):
        """Initialize Mem0 connection."""
        self.api_key = api_key or os.getenv("MEM0_API_KEY")
        if not self.api_key:
            raise ValueError(
                "MEM0_API_KEY not found. Set via environment or pass as argument."
            )

        self.memory = MemoryClient(api_key=self.api_key)
        self.user_id = "spectrasynq"
        self.dry_run = dry_run
        self.root = Path(__file__).parent.parent

        self.stats = {
            "total": 0,
            "success": 0,
            "skipped": 0,
            "errors": 0
        }

    def ingest_file(
        self,
        file_path: Path,
        memory_type: str,
        domain_tags: List[str],
        category: str
    ) -> bool:
        """
        Ingest a single file into Mem0.

        Args:
            file_path: Path to file (relative to project root)
            memory_type: One of 'decision', 'learning', 'constraint', 'reference'
            domain_tags: List of domain tags
            category: TIER category for logging

        Returns:
            True if successful, False otherwise
        """
        full_path = self.root / file_path

        if not full_path.exists():
            print(f"  ⚠️  SKIP: File not found - {file_path}")
            self.stats["skipped"] += 1
            return False

        try:
            # Read file content
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Truncate if too large (Mem0 limits ~8KB per memory)
            if len(content) > 7000:
                content = content[:7000] + "\n\n[...truncated for memory storage...]"

            # Build memory content with metadata
            memory_content = f"""Document: {file_path}
Category: {category}
Type: {memory_type}

{content}"""

            if self.dry_run:
                print(f"  🔍 DRY-RUN: Would ingest {file_path} ({len(content)} chars)")
                self.stats["success"] += 1
                return True

            # Create message format for Mem0
            messages = [
                {
                    "role": "user",
                    "content": f"Store this K1.reinvented documentation:\n\n{memory_content}",
                },
                {
                    "role": "assistant",
                    "content": f"Stored {memory_type} from {file_path} ({category})",
                }
            ]

            # Add to Mem0
            self.memory.add(
                messages=messages,
                user_id=self.user_id
            )

            print(f"  ✅ ADDED: {file_path} ({len(content)} chars)")
            self.stats["success"] += 1
            return True

        except Exception as e:
            print(f"  ❌ ERROR: {file_path} - {e}")
            self.stats["errors"] += 1
            return False

    def ingest_tier(self, tier: int, files: Dict[str, any]) -> None:
        """Ingest all files in a tier."""
        category = files["category"]
        file_list = files["files"]
        memory_type = files["memory_type"]
        domain_tags = files["domain_tags"]

        print(f"\n{'='*70}")
        print(f"TIER {tier}: {category} ({len(file_list)} files)")
        print(f"{'='*70}")

        self.stats["total"] += len(file_list)

        for file_path in file_list:
            self.ingest_file(
                Path(file_path),
                memory_type,
                domain_tags,
                category
            )

    def run(self, tiers: List[int]) -> None:
        """Run ingestion for specified tiers."""

        # Define all tiers
        tier_config = {
            1: {
                "category": "CRITICAL_ARCHITECTURE",
                "memory_type": "reference",
                "domain_tags": ["architecture", "governance", "workflows"],
                "files": [
                    "CLAUDE.md",
                    "README.md",
                    "AGENTS.md"
                ]
            },
            2: {
                "category": "ADR_DECISIONS",
                "memory_type": "decision",
                "domain_tags": ["architecture", "adr", "decisions"],
                "files": [
                    "docs/adr/ADR-0001-led_driver_header_split.md",
                    "docs/adr/ADR-0001-fps-targets.md",
                    "docs/adr/ADR-0002-global-brightness.md",
                    "docs/adr/ADR-0003-phase-a-acceptance.md",
                    "docs/adr/ADR-0004-institutional-memory-adoption.md",
                    "docs/adr/ADR-0004-PHASE_C_NODE_EDITOR_ARCHITECTURE.md"
                ]
            },
            3: {
                "category": "FORENSIC_ANALYSIS",
                "memory_type": "learning",
                "domain_tags": ["forensic", "bottlenecks", "analysis", "audio"],
                "files": [
                    "docs/analysis/forensic_audio_pipeline/FORENSIC_AUDIO_ANALYSIS.md",
                    "docs/analysis/forensic_audio_pipeline/BOTTLENECK_ELIMINATION_SUMMARY.md",
                    "docs/analysis/forensic_audio_pipeline/EXACT_FIX_LOCATIONS.md",
                    "docs/analysis/forensic_audio_pipeline/PHASE_1_IMPLEMENTATION_COMPLETE.md",
                    "docs/analysis/forensic_audio_pipeline/PHASE_2_IMPLEMENTATION_SUMMARY.md",
                    "docs/analysis/forensic_audio_pipeline/PHASE_2_VALIDATION_CHECKLIST.md",
                    "docs/analysis/forensic_audio_pipeline/BOTTLENECK_PRIORITY_MATRIX.md",
                    "docs/analysis/forensic_audio_pipeline/WORKFLOW_OPTIMIZATION_MULTIPLIERS.md",
                    "docs/analysis/fps_bottleneck_i2s_timeout_forensic_analysis.md",
                    "docs/analysis/webserver_bottleneck_matrix.md",
                    "docs/analysis/K1_ARCHITECTURE_RECOMMENDATIONS.md"
                ]
            },
            4: {
                "category": "PHASE_REPORTS",
                "memory_type": "reference",
                "domain_tags": ["reports", "phases", "completion"],
                "files": [
                    "docs/reports/PHASE_C_ALIGNMENT_EXECUTIVE_BRIEF.md",
                    "docs/reports/PHASE_2_RUNTIME_VALIDATION_REPORT.md",
                    "docs/reports/PHASE_COMPREHENSIVE_BRIEF.md",
                    "docs/reports/PF5_RESEARCH_BRIEFING.md",
                    "docs/reports/PHASE_1_COMPLETION_REPORT.md",
                    "docs/reports/FINAL_DEPLOYMENT_DECISION.md",
                    "docs/reports/TIER2_IMPLEMENTATION_COMPLETE.md"
                ]
            },
            5: {
                "category": "IMPLEMENTATION_PLANS",
                "memory_type": "reference",
                "domain_tags": ["roadmaps", "plans", "execution"],
                "files": [
                    "Implementation.plans/roadmaps/PHASE_C_EXECUTION_ROADMAP.md",
                    "Implementation.plans/roadmaps/PF5_EXECUTION_ROADMAP.md",
                    "Implementation.plans/roadmaps/visualization_pipeline_rebuild.md"
                ]
            },
            6: {
                "category": "MEM0_DOCS",
                "memory_type": "reference",
                "domain_tags": ["mem0", "institutional_memory", "integration"],
                "files": [
                    "Implementation.plans/poc/MEM0_OPTIMIZATION_INSIGHTS.md",
                    "Implementation.plans/poc/MEM0_ARCHITECTURE_REVIEW.md",
                    "docs/resources/mem0_production_integration_guide.md"
                ]
            }
        }

        print("\n" + "="*70)
        print("MEM0 BULK INGESTION - K1.REINVENTED")
        print("="*70)
        if self.dry_run:
            print("🔍 DRY-RUN MODE (no actual ingestion)")
        print(f"User: {self.user_id}")
        print(f"Tiers: {tiers}")
        print(f"Timestamp: {datetime.now().isoformat()}")

        # Run selected tiers
        for tier in tiers:
            if tier in tier_config:
                self.ingest_tier(tier, tier_config[tier])
            else:
                print(f"\n⚠️  WARNING: Unknown tier {tier}, skipping")

        # Print summary
        print(f"\n{'='*70}")
        print("INGESTION SUMMARY")
        print(f"{'='*70}")
        print(f"Total files:   {self.stats['total']}")
        print(f"✅ Success:    {self.stats['success']}")
        print(f"⚠️  Skipped:    {self.stats['skipped']}")
        print(f"❌ Errors:     {self.stats['errors']}")

        success_rate = (self.stats['success'] / self.stats['total'] * 100) if self.stats['total'] > 0 else 0
        print(f"\nSuccess rate: {success_rate:.1f}%")
        print(f"{'='*70}")


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Bulk ingest K1.reinvented documentation into Mem0"
    )
    parser.add_argument(
        "--tier",
        type=str,
        required=True,
        help="Tier to ingest: 1-6 or 'all'"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview files without actually ingesting"
    )
    parser.add_argument(
        "--api-key",
        type=str,
        help="Mem0 API key (or set MEM0_API_KEY env var)"
    )

    args = parser.parse_args()

    # Parse tier argument
    if args.tier.lower() == "all":
        tiers = [1, 2, 3, 4, 5, 6]
    else:
        try:
            tiers = [int(args.tier)]
        except ValueError:
            print(f"ERROR: Invalid tier '{args.tier}'. Use 1-6 or 'all'")
            sys.exit(1)

    # Run ingestion
    try:
        ingester = BulkIngestion(
            api_key=args.api_key,
            dry_run=args.dry_run
        )
        ingester.run(tiers)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
