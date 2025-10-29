# Betweenness Controls — Quick Reference

This condensed reference lists the supported domain selectors and normalization schemes for `k1_graph_bench`, with minimal syntax and examples. See `host/libgraph/User_Guide.md` for full details.

## Selectors (`--betweenness-domain`)

- `all` — all nodes
- `layer0` — nodes in layer 0
- `layer:<L>` — nodes in layer `L` (0-based)
- `layers:<L1-L2>` — nodes across inclusive range `[L1..L2]`
- `layers:<L1-L2>:step:<k>` — range with stride `k` over layers
- `even` / `odd` — nodes in even/odd-indexed layers
- `middle` — middle layer (odd `L`) or two middle layers (even `L`)
- `custom:<path>` — nodes from JSON file (array of node ids)
- `quantile:<q1-q2>` — layers where normalized index `i/(L-1)` lies in `[q1..q2]`
- `quantile:<q1-q2>:step:<k>` — quantile band with layer stride `k`
- `layer_quantile:<metric>:<q1-q2>` — layers in metric quantile band
  - `metric`: `width|outdeg|indeg|outdeg_median|indeg_median`
- `layer_rank:<metric>:<top|bottom>:<k>` — top/bottom `k` layers by metric

Layer-dependent selectors require layered hints (`layers`, `width`).

## Normalization (`--betweenness-normalize-scheme`)

- `none` — raw scores
- `directed` — Brandes directed normalization
- `max` — divide by max score
- `domain_avg` — divide by domain average
- `layer_max` — divide by per-layer max (layered only)
- `zscore` — `(v - mean) / stddev`
- `domain_minmax` — `(v - min)/(max - min)` → `[0,1]`
- `minmax_layer` — per-layer min/max → `[0,1]` (layered only)
- `robust_zscore` — `(v - median) / (1.4826 * MAD)`

## Examples

```bash
# Middle quantile band with stride; robust normalization
k1_graph_bench 60 500 \
  --betweenness-samples 32 \
  --betweenness-domain quantile:0.25-0.75:step:2 \
  --betweenness-normalize-scheme robust_zscore \
  --betweenness-top-k 6 \
  --json-out metrics/graph.metrics.json

# Top 2 layers by out-degree; domain min-max mapping
k1_graph_bench 60 500 \
  --betweenness-domain layer_rank:outdeg:top:2 \
  --betweenness-normalize-scheme domain_minmax \
  --betweenness-top-k 6 \
  --json-out metrics/graph.metrics.json

# Lowest quantile of median in-degree; z-score
k1_graph_bench 60 500 \
  --betweenness-domain layer_quantile:indeg_median:0.0-0.25 \
  --betweenness-normalize-scheme zscore \
  --json-out metrics/graph.metrics.json
```

## Notes

- Quantile inputs are clamped to `[0,1]`; invalid bands select nothing.
- Ties in `layer_rank` are resolved stably by layer index.
- For non-layered graphs, avoid layer-dependent selectors/schemes; the bench warns accordingly.