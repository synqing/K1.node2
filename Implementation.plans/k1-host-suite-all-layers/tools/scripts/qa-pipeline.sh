#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts
npm run -s qa:graph
npm run -s qa:deps
npm run -s qa:estimate
npm run -s qa:validate
npm run -s qa:path
npm run -s qa:ast
npm run -s qa:profile
npm run -s qa:exec
npm run -s qa:audio
npm run -s qa:visual
npm run -s qa:perfstats
echo "QA pipeline complete. Artifacts in ./tools/artifacts"
