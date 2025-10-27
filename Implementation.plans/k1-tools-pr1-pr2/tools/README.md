
# K1 Tools (PR-1 + PR-2)
Host-first QA toolchain providing graph algorithms, dependency analysis, performance estimation, and semantic validation.

## Quick start
```bash
cd tools
npm ci
npm run build
npm run qa
```

Artifacts appear in `tools/artifacts/`:
- `graph.metrics.json`
- `graph.impact.json`
- `graph.estimate.json`
- `graph.validation.json`
- Optional: `graph.cycles.dot`, `deps.dot`

To run agents with your own inputs:
```bash
# Graph algorithms on a custom CSR JSON
npm run qa:graph -- --graph /path/to/graph.json --src 0 --out ./artifacts

# Dependency analysis
npm run qa:deps -- --deps /path/to/deps.json --changed Core,Audio --out ./artifacts

# Estimation
npm run qa:estimate -- --graph /path/to/graph.json --kinds /path/to/kinds.json --model /path/to/model.json --out ./artifacts

# Validation
npm run qa:validate -- --model /path/to/model.json --cpp /path/to/generated.cpp --out ./artifacts
```
