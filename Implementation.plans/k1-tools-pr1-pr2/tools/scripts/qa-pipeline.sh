#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts

echo "== Layer 1: Graph algorithms =="
npm run -s qa:graph

echo "== Layer 1: Dependencies =="
npm run -s qa:deps

echo "== Layer 1: Estimation =="
npm run -s qa:estimate

echo "== Layer 1: Semantic validation =="
npm run -s qa:validate

echo "QA pipeline complete. Artifacts in ./tools/artifacts"
