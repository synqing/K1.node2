# Betweenness Controls in Control App (Integration Guide)

This guide explains how to use `libgraph` betweenness controls in development to generate metrics that can be consumed by the control app’s debug tooling and future analytics overlays.

## Why Use Betweenness Controls

- Focus analysis on specific layers (bands, top/bottom-k) to understand influence distribution.
- Normalize scores for UI pipelines that prefer `[0,1]` ranges or robust scaling.
- Produce reproducible metrics snapshots for comparison across builds.

## Generate Metrics with libgraph

Run the `k1_graph_bench` from `host/libgraph`:

```bash
cmake -S host/libgraph -B host/libgraph/build -DCMAKE_BUILD_TYPE=Release
cmake --build host/libgraph/build -j

# Example: top-2 layers by out-degree; domain min-max normalization
./host/libgraph/build/k1_graph_bench 60 500 \
  --betweenness-domain layer_rank:outdeg:top:2 \
  --betweenness-normalize-scheme domain_minmax \
  --betweenness-top-k 6 \
  --json-out metrics/graph.metrics.json
```

The output `metrics/graph.metrics.json` includes:
- `betweenness_domain`
- `betweenness_normalization_scheme`
- `betweenness_top_nodes`

## Consuming Metrics in Control App (Dev Flow)

- Use the DevDebugPanel (Alt+Shift+D) to view real-time metrics and overlays.
- For offline inspection, open `metrics/graph.metrics.json` alongside the app; planned features will render domain and normalization summaries in the debug UI.
- Recommended schemes for UI scaling:
  - `domain_minmax` or `max` for `[0,1]` mapping
  - `minmax_layer` when per-layer comparisons are primary
  - `robust_zscore` for skewed distributions

## Selector and Scheme Cheatsheet

- Domain selectors: `all`, `layer0`, `layer:<L>`, `layers:<L1-L2>`, `layers:<L1-L2>:step:<k>`, `even`, `odd`, `middle`, `custom:<path>`, `quantile:<q1-q2>`, `quantile:<q1-q2>:step:<k>`, `layer_quantile:<width|outdeg|indeg|outdeg_median|indeg_median>:<q1-q2>`, `layer_rank:<metric>:<top|bottom>:<k>`
- Normalization: `none`, `directed`, `max`, `domain_avg`, `layer_max`, `zscore`, `domain_minmax`, `minmax_layer`, `robust_zscore`

See the comprehensive `host/libgraph/User_Guide.md` for behavior details and edge cases.

## Caveats

- Layer-dependent selectors require layered hints (the bench provides `layers` and `width`).
- Quantile bands that resolve to no layers produce no samples; adjust thresholds/stride.
- Ties in `layer_rank` are resolved stably by layer index.

## Next Steps (Roadmap)

- Add a UI hook to load `metrics/graph.metrics.json` into the DevDebugPanel.
- Visualization overlays: highlight selected domain layers and top-k nodes based on normalization.
- Comparison view: side-by-side metrics snapshots across commits.