---
title: Research Session
query: "State-of-art natural language processing for lighting control in browser environments, focusing on lightweight embedding models like MiniLM-L6-v2, DistilBERT, Universal Sentence Encoder Lite, and TinyBERT. Compare model sizes, performance, and accuracy for semantic understanding of lighting commands, color extraction, mood mapping, and multi-language support. Include quantized model performance and WebAssembly deployment strategies."
date: 10/27/2025
time: 10:29:29 AM
timestamp: 2025-10-27T02:29:29.973Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** State-of-art natural language processing for lighting control in browser environments, focusing on lightweight embedding models like MiniLM-L6-v2, DistilBERT, Universal Sentence Encoder Lite, and TinyBERT. Compare model sizes, performance, and accuracy for semantic understanding of lighting commands, color extraction, mood mapping, and multi-language support. Include quantized model performance and WebAssembly deployment strategies.

**Response:**

**Executive Summary**

- Goal: Add fast, privacy-preserving natural language lighting control in the K1 Control App (React/TypeScript + Vite) with in-browser inference. 
- Best-fit baseline for English: MiniLM-L6-v2 embeddings + rules for color/slots, with 8-bit quantized ONNX via ONNX Runtime Web (WASM + SIMD + threads). 
- Best-fit for multilingual: DistilUSE multilingual or paraphrase-multilingual MiniLM (quantized) if offline multilingual is required; otherwise, keep MiniLM-L6 and enable a small translation fallback service. 
- Architecture: A hybrid pipeline—rule-first entity extraction (color, brightness, temperature, pattern), embedding-based intent/mood classification, and deterministic mapping to K1 actions. 
- Deployment: Use WebAssembly via `onnxruntime-web` with SIMD/threaded assets, lazy-load models with Vite code splitting, run inference in a Web Worker, and cache model assets with Service Worker. 
- Testing: Add synthetic corpora for intents/slots, unit tests for parsing, and integration tests for end-to-end command → K1 actions.

Below is a detailed comparison, pipeline design, code scaffolding, quantization and WASM strategies, and how to integrate this into the K1 documentation and Task 10/9 deliverables.


**Model Comparison (Lightweight, Browser-Oriented)**

All sizes and latency numbers below are typical ranges from public reports and prior deployments; validate with your target devices in CI and on real hardware. Accuracy refers to semantic similarity and paraphrase detection effectiveness (proxy for command intent understanding); slot extraction (e.g., colors) is best handled by rules plus small classifiers.

- MiniLM-L6-v2 (sentence-transformers all-MiniLM-L6-v2)
  - Shape: 6-layer MiniLM, 384-dim embeddings, English-focused.
  - Size: ~22M parameters; FP32 ~88–95 MB; ONNX INT8 ~22–35 MB; INT4 ~12–18 MB.
  - Latency: Laptop (WASM+SIMD+threads): ~20–40 ms per short sentence; Mobile: ~80–200 ms.
  - Accuracy: Strong sentence-level semantics for English; robust for intent similarity ranking and zero-shot label matching.
  - Pros: Small, fast, widely used; 384-dim saves memory for prototypes/ANN.
  - Cons: English-only; needs multilingual strategy if required offline.

- DistilBERT-based sentence models (e.g., distilbert-base-nli-stsb-mean-tokens; DistilUSE multilingual)
  - Shape: Distilled BERT encoders, 512–768 dims depending on variant.
  - Size: ~66M parameters typical; FP32 ~250–270 MB; INT8 ~65–90 MB.
  - Latency: Laptop: ~40–100 ms; Mobile: ~150–400 ms.
  - Accuracy: Good embeddings; multilingual variants (DistilUSE) have decent multilingual coverage.
  - Pros: Strong multilingual options (DistilUSE); good accuracy.
  - Cons: Heavier than MiniLM; might exceed budget on low-end devices.

- Universal Sentence Encoder Lite (USE Lite; TensorFlow.js)
  - Shape: Mobile-optimized embedding with TFJS graph; 512-dim output common.
  - Size: Typically ~2–8 MB model + ~1–2 MB tokenizer assets.
  - Latency: Laptop: ~5–20 ms (WebGL/WebGPU/wasm); Mobile: ~20–60 ms.
  - Accuracy: Lower than SBERT family on semantic similarity; can be acceptable for coarse intent classes.
  - Pros: Very small, very fast, simple TFJS deploy; good fit for strict bundle budgets.
  - Cons: English-centric; weaker semantic nuance; requires more rules/prototypes to compensate.

- TinyBERT (e.g., 4L-312D for classification/embeddings)
  - Shape: 4–6 layers; can be used as embedding model when pooled or fine-tuned; 312–768 hidden dims.
  - Size: ~14–40M parameters depending on variant; FP32 ~56–160 MB; INT8 ~14–40 MB.
  - Latency: Laptop: ~8–30 ms; Mobile: ~40–120 ms.
  - Accuracy: Lower than MiniLM for sentence similarity without task-specific fine-tuning; strong when fine-tuned for intent classification.
  - Pros: Very fast; great for lightweight classifier heads (intent labels).
  - Cons: Out-of-the-box embedding quality may lag; benefits from task-specific fine-tuning.

Guidance:
- English-only: Start with MiniLM-L6-v2 (quantized INT8). Combine with rule-based slot extraction. 
- Strict tiny budget: USE Lite + strong rules for colors/slots; consider a lightweight intent classifier on top (logistic regression over USE embeddings).
- Multilingual offline: DistilUSE multilingual (quantized) or paraphrase-multilingual-MiniLM-L12-v2 (quantized). Accept higher size and latency.
- Low-latency classification focus: TinyBERT 4L-312 fine-tuned for intents; keep rule-based slots; add a few-shot label prototype store for synonyms.


**Lighting-Control Task Breakdown**

Lighting commands typically include multiple semantic layers; combining rule-first extraction with embeddings yields robust results:

- Intents (classification/semantic similarity)
  - Examples: set_color, set_brightness, set_temperature, set_pattern, set_mood, power_on/off, dim_up/down, speed_up/down, relax/party scenes.
  - Approach: Zero-shot using embeddings vs. label descriptions + paraphrases; or a lightweight supervised classifier on top of embeddings.

- Entities/slots (deterministic + small ML)
  - Color: Named colors (CSS list), multi-word colors (deep sky blue), hex (#ff9933), rgb/hsl, synonyms (scarlet, sky, teal), “warm/cool”, “pastel/neon”.
  - Brightness/Intensity: percentages, “dim”, “a bit”, “max”, “half”, “two notches”, “brighter than before”.
  - Temperature: “warmer/cooler”, “daylight”, “soft white”.
  - Pattern names/aliases: mapping to `K1_PATTERNS`; include synonyms and mood tags.
  - Groups/targets: room names or zones (optional if K1 supports grouping).

- Mood mapping (semantic → palette/effect params)
  - Mood labels (calm, focus, energize, romantic, party, cozy) map to palette IDs and to K1 pattern param presets (speed, blend, brightness).
  - Approach: Embedding similarity from user phrase to mood prototypes; fallback to fixed dictionary.

- Multi-language support
  - Option A (offline): Use multilingual embedding (DistilUSE or multilingual MiniLM).
  - Option B (hybrid): Language detection + translate to English (client or service) → MiniLM-L6 pipeline.
  - Add multilingual lexicons for colors and mood synonyms for rule-based slots.


**Quantization, Performance, and Accuracy Trade-offs**

- INT8 quantization (dynamic) on ONNX often reduces model size ~3–4x and yields <1–2% drop on intent classification and semantic matching in practice; confirm by A/B tests on your corpus.
- INT4 quantization can halve size again with a larger accuracy hit (3–6+ points), sometimes acceptable for coarse intents but risky for nuanced mood mapping.
- For embeddings, small drifts from quantization are usually acceptable if decisions rely on relative similarity to prototyped labels; maintain safety margins in thresholds.
- For TinyBERT classifiers, quantization is particularly effective; post-training dynamic quantization on linear layers yields strong size/latency improvements with minimal impact.
- WebGPU backends (ORT Web, TFJS) can outperform WASM on capable devices; keep WASM+SIMD fallback for broad compatibility.
- Always budget for tokenizer latency; sentencepiece BPE in WASM threads helps. Cache vocab/tokenizer in memory across commands.

Sample quantization workflow (offline build step):
- Export to ONNX (HuggingFace):
  - `optimum-cli export onnx --model sentence-transformers/all-MiniLM-L6-v2 ./onnx-minilm-l6-v2`
- Quantize (dynamic INT8):
  - Python: 
    - `from onnxruntime.quantization import quantize_dynamic, QuantType`
    - `quantize_dynamic("model.onnx", "model.int8.onnx", weight_type=QuantType.QInt8)`
- Validate: Run your test corpus to compare intent accuracy and threshold robustness.


**WebAssembly Deployment Strategies (Vite + React)**

- ONNX Runtime Web
  - Use `onnxruntime-web` with prebuilt `ort-wasm-simd-threaded.wasm` and fallbacks.
  - Enable SIMD and threads; set thread count conservatively (2–3) to avoid starving UI updates.
  - Keep the model `.onnx` in `public/models/` and WASM assets in `public/ort/` or served from CDN; cache via Service Worker.
  - Run inference in a Web Worker to avoid main thread jank.

- TensorFlow.js (for USE Lite)
  - Use `@tensorflow/tfjs` + `@tensorflow/tfjs-backend-webgpu` or `tfjs-backend-wasm` depending on device support.
  - Lazy-load model with dynamic import; prewarm backend after K1 device connect to hide cold-start.
  - Use `tf.env().set("WEBGPU_USE_LOW_POWER", true)` where applicable to save energy.

- WebNN (future)
  - Optional progressive enhancement; feature-detect and prefer WebNN for compatible hardware, fallback to WASM/WebGPU.

Vite integration tips:
- Put assets under `public/` and reference with absolute paths in runtime; or use `vite-plugin-static-copy` to move `.onnx` and `.wasm` into dist.
- Split `src/nlp/` into a separate chunk loaded on demand when user opens “Command” UI.
- Cache model and tokenizer with Service Worker (stale-while-revalidate). 
- Use `import.meta.env.PROD` to choose small vs. multilingual model at build time.


**Reference Pipeline and Code Scaffolding**

Project structure additions:
- `src/nlp/embed.ts` – model loading and sentence embedding (ORT Web or TFJS).
- `src/nlp/intent.ts` – label prototypes, similarity scoring, thresholds, tie-breaking.
- `src/nlp/color.ts` – color parser (rules + small lexicon), brightness/temp interpreters.
- `src/nlp/mood.ts` – mood mapping to palettes and K1 params.
- `src/nlp/parser.ts` – orchestrates pipeline: detect language, extract slots, get intent, assemble command.
- `src/workers/nlpWorker.ts` – Web Worker hosting model and pipeline.
- `public/models/...` – model and tokenizer assets.
- `public/ort/...` – ORT WASM assets.

Example: ONNX Runtime Web embedding loader (MiniLM-L6 INT8)
```ts
// src/nlp/embed.ts
import * as ort from 'onnxruntime-web';

let session: ort.InferenceSession | null = null;

export async function initEmbedder() {
  if (session) return;
  await ort.env.wasm.setNumThreads(2);
  ort.env.wasm.simd = true;
  session = await ort.InferenceSession.create('/models/minilm-l6-v2.int8.onnx', {
    executionProviders: ['wasm'],
  });
}

export async function embed(texts: string[]): Promise<Float32Array[]> {
  if (!session) await initEmbedder();
  // 1) tokenize -> input_ids, attention_mask (implement or import tokenizer)
  // 2) run session.run({ input_ids, attention_mask })
  // 3) mean-pool last_hidden_state; L2-normalize to unit vectors
  // return Float32Array[] embeddings of size 384
  throw new Error('tokenizer + pooling not shown for brevity');
}
```

Zero-shot intent scoring with prototypes
```ts
// src/nlp/intent.ts
import { cosineSim } from './math';

type Intent = 'set_color'|'set_brightness'|'set_temperature'|'set_pattern'|'set_mood'|'power'|'adjust_speed';
type Prototype = { label: Intent; texts: string[]; vector?: Float32Array };

export const prototypes: Prototype[] = [
  { label: 'set_color', texts: ['set lights to COLOR', 'make it COLOR', 'change color'] },
  { label: 'set_brightness', texts: ['dim the lights', 'set brightness to PERCENT', 'brighter'] },
  { label: 'set_temperature', texts: ['warmer', 'cooler', 'daylight tone'] },
  { label: 'set_pattern', texts: ['set pattern to NAME', 'enable wave effect'] },
  { label: 'set_mood', texts: ['relax mode', 'party vibe', 'romantic mood'] },
  { label: 'power', texts: ['turn lights on', 'switch off'] },
  { label: 'adjust_speed', texts: ['make it faster', 'slow the effect'] },
];

export function pickIntent(embedding: Float32Array, protoVectors: Record<Intent, Float32Array>): {intent: Intent; score: number} {
  let best: {intent: Intent; score: number} = { intent: 'set_color', score: -Infinity };
  for (const [label, pv] of Object.entries(protoVectors) as [Intent, Float32Array][]) {
    const s = cosineSim(embedding, pv);
    if (s > best.score) best = { intent: label, score: s };
  }
  return best;
}
```

Color and slot extraction (rules-first)
```ts
// src/nlp/color.ts
import { parse as parseColor } from 'colorjs.io'; // or a small CSS color parser

const NAMED_ALIASES: Record<string,string> = {
  scarlet: '#ff2400', sky: 'deepskyblue', teal: 'teal', magenta: 'fuchsia',
  // add multilingual aliases in separate files
};

export function extractColor(text: string): {hex?: string; temperature?: number} {
  const hexMatch = text.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i);
  if (hexMatch) return { hex: `#${hexMatch[1]}` };

  const rgb = text.match(/\brgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)/i);
  if (rgb) {
    const [_, r, g, b] = rgb.map(Number);
    return { hex: `#${[r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')}` };
  }

  const tempWarmer = /\b(warm|warmer|candle|amber)\b/i.test(text);
  const tempCooler = /\b(cool|cooler|daylight|ice)\b/i.test(text);
  if (tempWarmer) return { temperature: 2700 };
  if (tempCooler) return { temperature: 6500 };

  const name = Object.keys(NAMED_ALIASES).find(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (name) return { hex: NAMED_ALIASES[name] };

  const cssName = text.match(/\b(aliceblue|blue|coral|crimson|deepskyblue|fuchsia|gold|indigo|teal|tomato|plum)\b/i);
  if (cssName) {
    try { return { hex: parseColor(cssName[0]).to('srgb').toString({ format: 'hex' }) }; } catch {}
  }
  return {};
}

export function extractBrightness(text: string): number|undefined {
  const p = text.match(/(\d{1,3})\s?%/);
  if (p) return Math.max(0, Math.min(100, parseInt(p[1],10)));
  if (/\bmax|full\b/i.test(text)) return 100;
  if (/\bhalf\b/i.test(text)) return 50;
  if (/\bdim\b/i.test(text)) return 25;
  if (/\bbrighter\b/i.test(text)) return 75;
  return undefined;
}
```

End-to-end mapping to K1 actions
```ts
// src/nlp/parser.ts
import { embed } from './embed';
import { pickIntent } from './intent';
import { extractColor, extractBrightness } from './color';
import { mapMood } from './mood';
import { useK1 } from '../k1/K1Provider';

export async function handleCommand(input: string) {
  const k1 = useK1.getState(); // if Zustand / context exposure

  // Slots first
  const color = extractColor(input);
  const brightness = extractBrightness(input);

  // Intent
  const [vec] = await embed([input]);
  const { intent, score } = pickIntent(vec, /* precomputed proto vectors */);

  // Decision with guardrails
  if (intent === 'set_color' && color.hex) k1.updateParameters({ colorHex: color.hex });
  else if (intent === 'set_brightness' && brightness != null) k1.updateParameters({ brightness });
  else if (intent === 'set_temperature' && color.temperature) k1.updateParameters({ temperatureK: color.temperature });
  else if (intent === 'set_mood') {
    const preset = mapMood(input); // returns { paletteId, speed, brightness } etc.
    if (preset.paletteId) k1.setPalette(preset.paletteId);
    k1.updateParameters({ speed: preset.speed, brightness: preset.brightness });
  }
  // add patterns, power, speed adjustments similarly
}
```

Run the NLP in a Web Worker and expose a `postMessage` API to avoid blocking the UI during model load and inference.


**Multilingual Strategies**

- Offline multilingual model:
  - DistilUSE multilingual (INT8) or paraphrase-multilingual MiniLM-L12-v2 (INT8). Expect ~60–140 MB artifacts post-quantization. 
  - Pros: No network; uniform pipeline across locales.
  - Cons: Heavier; higher latency on mobile.

- Translate-to-English (hybrid):
  - Detect language with a tiny JS detector (e.g., char n-grams); route non-English text to a translation endpoint; embed with MiniLM-L6.
  - Pros: Keeps client model small; best English accuracy.
  - Cons: Requires a service; latency depends on network; consider privacy.

- Multilingual lexicons for rules:
  - Provide color/mood dictionaries per locale for entity extraction even when embeddings remain English. This significantly improves slot accuracy and keeps the model small.

Recommendation for K1:
- If offline-only and multilingual is a core requirement: ship DistilUSE multilingual INT8 for initial release and plan a future optimization pass with model distillation to TinyBERT-sized classifiers for intents.
- If English-first with optional multilingual: ship MiniLM-L6 INT8; add translation fallback (opt-in), plus per-locale color lexicons for common languages.


**Integration With K1 Control App Tasks**

- Task 9 (error handling + performance hardening)
  - Lazy-load NLP chunk when user opens “Command” or “Voice” UI. 
  - Prewarm model after K1 connection established. 
  - Use Web Worker; cap ORT threads to 2–3; handle timeouts and fallback to rules-only path if model loading exceeds 1s on low-end devices.
  - Add toast notifications when a command is ambiguous with suggestions (“Did you mean set color to blue or set pattern Waves?”).
  - Coalesce param updates from NLP to a single `updateParameters()` call; honor existing debouncing to avoid WS floods.

- Task 10 (docs + tests)
  - README updates: add “NLP Command Bar” with offline/on-device AI; explain privacy and model download size; troubleshooting (slow start on first load, clearing model cache).
  - ADR: “On-device NLP with quantized embeddings” — rationale vs alternatives (cloud NLP) and performance budgets; “Rules-first slot extraction.”
  - Tests:
    - Unit: color/brightness parsers; multilingual alias coverage; intent scoring on a synthetic corpus; mood → palette mapping.
    - Integration: command strings → K1 actions; verify `selectPattern`, `updateParameters`, `setPalette` are called correctly.
    - E2E smoke: type “make it teal at 40%” and verify parameters; “party mode” selects party palette and pattern.

- Task 11 (architecture docs)
  - Add a new doc: `docs/architecture/control-app/NLP_PIPELINE.md`:
    - System context: In-browser inference, model assets, worker, cache.
    - Dataflow: user text → tokenizer → embed → intent/mood → slots → K1 actions.
    - Diagrams: Mermaid sequence of command processing and failure fallbacks.
    - Budgets: cold start under 400 ms on laptop; p95 inference under 120 ms; memory ceiling for NLP chunk (<=40 MB for MiniLM-L6 INT8).
    - Quality playbook: dataset curation, thresholds, safety checks.


**Evaluation Plan and Metrics**

- Dataset creation
  - Generate 1–2k synthetic commands using templates + synonyms for intents and slots; include noisy variants (typos, code-switching, emoji).
  - Add multilingual samples for target locales.
  - Annotate with intent and slot labels.

- Metrics
  - Intent top-1 accuracy; top-1 margin (best minus second-best score) to drive uncertainty thresholds and “ask back” UX.
  - Slot F1 for color, brightness, temperature; hex/rgb extraction correctness; percentage normalization accuracy.
  - Latency: model load (first-use), median and p95 inference time on budget devices; memory footprint after warmup.

- Thresholds and fallbacks
  - If intent confidence < 0.35 or margin < 0.08 → ask clarification and/or default to rules-only interpretation.
  - Keep per-intent custom thresholds (e.g., “power” can tolerate lower thresholds than “set_pattern”).


**Recommended Configurations by Scenario**

- English-only, good devices
  - Model: MiniLM-L6-v2 (INT8, ONNX, ORT Web).
  - Backends: WASM+SIMD+threads; optional WebGPU.
  - Pipeline: rules for slots + zero-shot intents + mood prototypes.

- English-only, very tight footprint
  - Model: USE Lite (TFJS) + logistic regression classifier for intents over 512-dim embeddings.
  - Heavier reliance on rules and prototypes.

- Multilingual offline (fr/de/es/it)
  - Model: DistilUSE multilingual (INT8).
  - Lexicons: per-locale color/mood synonyms; localized patterns.
  - Note: Higher bundle impact; ensure lazy load and caching.

- Low-latency classifier alternative
  - Model: TinyBERT-4L fine-tuned for K1 intents; rules for slots.
  - Optional: Keep a miniature English embedding (USE Lite) only for mood mapping where needed.


**Pitfalls and Edge Cases**

- Tokenizer costs: Tokenization can dominate time for very short models; keep tokenizer in worker, reuse instances, and pre-load vocab.
- Ambiguous commands: “Make it warmer and brighter” requires multi-action handling; maintain an internal actions list and apply in a consistent order.
- Color phrases with metaphors: “midnight blue”, “rose gold”, “forest green” — extend aliases; test top palettes for complex names.
- Context dependence: “same as yesterday” or “as before the party” needs state memory; persist last N commands for quick repeats.
- Mobile throttling: Background tabs or low-power mode will slow inference; detect and degrade to rules-only with a notice.
- Multilingual homographs: Words that map to different colors or intents across languages; ensure language detection runs before parsing aliases.
- Quantization outliers: INT4 might skew borderline class margins; keep conservative thresholds or stick to INT8 for embeddings.


**Deployment Playbook (Step-by-Step)**

- Prepare models
  - Choose baseline (MiniLM-L6-v2 for English).
  - Export ONNX and quantize to INT8; store in `public/models/`.
  - Include tokenizer assets (vocab, merges).

- Add ORT Web
  - Install `onnxruntime-web`.
  - Copy WASM assets to `public/ort/` (SIMD/threaded variants).
  - Create `src/nlp/embed.ts` and the Web Worker `src/workers/nlpWorker.ts`.

- Build pipeline
  - Add a dynamic import path for the NLP module.
  - Add Service Worker caching for `.onnx`, `.wasm`, tokenizer files.
  - Prewarm after K1 connect.

- Integrate UI and state
  - Add a “Command Bar” or reuse an existing input to call `handleCommand`.
  - Map NLU output to `useK1()` actions: `selectPattern`, `updateParameters`, `setPalette`.

- Testing
  - Add unit tests for parsers and intent scoring.
  - Add integration tests for the top 20 commands.
  - Add E2E smoke for 3–5 representative flows.

- Monitoring
  - Add lightweight telemetry (local only if offline) for latency and confidence; enable opt-in anonymized reporting if allowed.


**How This Fits K1 Tasks**

- Documentation (Task 10 + 11)
  - Add `docs/architecture/control-app/NLP_PIPELINE.md` with system context, diagrams, budgets, and deployment steps.
  - Update `docs/architecture/control-app/QUALITY_PLAYBOOK.md` with NLP testing and performance targets.

- Tests (Task 10)
  - Create fixtures of commands and expected `K1Provider` calls.
  - Add a small synthetic multilingual set if needed.

- Error handling + performance (Task 9)
  - Introduce fallback to rules-only when model load or inference exceeds thresholds.
  - Add user-facing toasts for low-confidence interpretations.

If you want, I can draft the new `NLP_PIPELINE.md`, provide a minimal `src/nlp/` scaffold compatible with your current `K1Provider`, and include a small test corpus with unit tests to kickstart evaluation.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-10-27T02:29:29.973Z*
