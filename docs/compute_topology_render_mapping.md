# Compute Topology Render Mapping (v1)

This document defines how to render `GraphSnapshot` as a knowledge-graph-like topology.

## Input
- `data/compute_topology/graph_snapshot.sample.json`
- Version must be `compute-topology/v1`.

## Node visual rules
- Color by `layer`:
  - `cloud`: `#3b82f6`
  - `edge`: `#f59e0b`
  - `terminal`: `#22c55e`
- Shape by `kind`:
  - `compute`: rounded rectangle
  - `gateway`: hexagon
  - `terminal`: circle
  - `service`: capsule
- Border style by `status`:
  - `up`: solid 1px
  - `degraded`: solid 2px (`#f97316`)
  - `down`: dashed 2px (`#ef4444`)
- Label text:
  - primary: `labels.name`
  - secondary: `id`

## Edge visual rules
- `network_link` is rendered as merged bidirectional pair by unordered `(source,target)`.
- `relation` style:
  - `network_link`: solid line, no arrow
  - `hosts`: dotted line
  - `depends_on`: dashed line
- For `network_link`:
  - Label always shown:
    - `lat_ab/lat_ba | bw_ab/bw_ba`
  - Line color by merged peak latency:
    - `<=20`: `#22c55e`
    - `21-50`: `#f59e0b`
    - `>50` or null: `#ef4444`
  - Line width by merged peak bandwidth (thin range):
    - `>=5000`: `2.1`
    - `1000-4999`: `1.6`
    - `<1000` or null: `1.2`

## Tooltip fields
- Node tooltip:
  - `id`, `kind`, `layer`, `status`
  - `load_pct`, `cpu_pct`, `gpu_pct`, `mem_pct`, `metrics.ts`
- Edge tooltip:
  - `id`, `relation`, `status`
  - For `network_link`: `ab_*`, `ba_*`, `display_label`

## Layout guidance
- Prefer weak three-band seed by `layer`, but keep final layout force-directed.
- Place `gateway` near border between edge and terminal bands.
- Keep isolated nodes visible in their own layer with a warning badge.

## Supported render engines
- vis-network
- Cytoscape.js
- Neo4j Bloom

All engines should consume the same `GraphSnapshot` payload and apply this mapping policy.
