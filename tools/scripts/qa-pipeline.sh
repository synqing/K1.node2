#!/usr/bin/env bash
set -euo pipefail

# QA pipeline: builds TS and runs the suite to emit artifacts into tools/artifacts.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ART="$ROOT/artifacts"
DIST="$ROOT/dist"

mkdir -p "$ART"

echo "[host-suite] Running QA suite (Node)"
node "$DIST/qa.js" --artifacts "$ART"
echo "[host-suite] Artifacts written to: $ART"