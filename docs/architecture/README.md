---
title: README
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
Architecture Call Graphs

This folder contains comprehensive, end‑to‑end audio→LED call graphs for both codebases:

- Emotiscope v1.1 (reference: Downloads/Emotiscope-2.0/Emotiscope-1/src)
- K1.reinvented (this repo: firmware/src)

Files
- emotiscope_v1_1.mmd — Mermaid source for Emotiscope v1.1
- emotiscope_v1_1.dot — Graphviz DOT source for Emotiscope v1.1
- k1_reinvented.mmd — Mermaid source for K1.reinvented
- k1_reinvented.dot — Graphviz DOT source for K1.reinvented

Quick Render
- Graphviz (PNG):
  - dot -Tpng docs/architecture/emotiscope_v1_1.dot -o docs/architecture/out/emotiscope_v1_1.png
  - dot -Tpng docs/architecture/k1_reinvented.dot   -o docs/architecture/out/k1_reinvented.png

- Mermaid (SVG/PNG) using mmdc (mermaid-cli):
  - mmdc -i docs/architecture/emotiscope_v1_1.mmd -o docs/architecture/out/emotiscope_v1_1.svg
  - mmdc -i docs/architecture/k1_reinvented.mmd   -o docs/architecture/out/k1_reinvented.svg

Helper Script
- tools/render_diagrams.sh will attempt to render all outputs if `dot` and/or `mmdc` are installed.
- Outputs are placed in docs/architecture/out/

Optional: Docker Rendering
- Mermaid:
  - docker run --rm -v "$PWD":/work ghcr.io/mermaid-js/mermaid-cli/mermaid-cli \
    mmdc -i /work/docs/architecture/emotiscope_v1_1.mmd -o /work/docs/architecture/out/emotiscope_v1_1.svg
- Graphviz:
  - docker run --rm -v "$PWD":/work rlespinasse/graphviz \
    dot -Tpng /work/docs/architecture/emotiscope_v1_1.dot -o /work/docs/architecture/out/emotiscope_v1_1.png

Enhancements Suggestions
- Auto‑render on push: add a CI workflow to render PNG/SVG artifacts from DOT/Mermaid and attach to releases.
- Interactive HTML: generate an interactive D3/Graphviz view with clickable nodes linked to source paths.
- Profiling overlay: annotate nodes with avg/percentile execution times from profiler logs.
- Code navigation index: add a markdown index that maps each node to file:line anchors for quick jumping.
- Generated callgraph: integrate a toolchain (ctags/clang+Graphviz) to auto‑extract call graphs for drift detection.

