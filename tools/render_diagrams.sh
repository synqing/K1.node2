#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="docs/architecture/out"
mkdir -p "$OUT_DIR"

echo "==> Rendering Graphviz (if dot available)"
if command -v dot >/dev/null 2>&1; then
  dot -Tpng docs/architecture/emotiscope_v1_1.dot -o "$OUT_DIR"/emotiscope_v1_1.png || true
  dot -Tpng docs/architecture/k1_reinvented.dot   -o "$OUT_DIR"/k1_reinvented.png || true
else
  echo "  'dot' not found; skipping Graphviz renders."
fi

echo "==> Rendering Mermaid (if mmdc available)"
if command -v mmdc >/dev/null 2>&1; then
  mmdc -i docs/architecture/emotiscope_v1_1.mmd -o "$OUT_DIR"/emotiscope_v1_1.svg || true
  mmdc -i docs/architecture/k1_reinvented.mmd   -o "$OUT_DIR"/k1_reinvented.svg || true
else
  echo "  'mmdc' (mermaid-cli) not found; skipping Mermaid renders."
fi

echo "Done. Outputs in $OUT_DIR"

