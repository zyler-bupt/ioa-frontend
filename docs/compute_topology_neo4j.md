# Compute Topology Neo4j Guide (v1)

This guide describes how to export `GraphSnapshot` into a Neo4j import bundle and load it into Neo4j 5.x.

## Output Model

- Node label: `ComputeNode`
- Relationship labels:
  - `NETWORK_LINK_MERGED` (merged from bidirectional `network_link`)
  - `HOSTS`
  - `DEPENDS_ON`

`NETWORK_LINK_MERGED` is stored in deterministic direction by node id lexicographic order (`from_id <= to_id`).

## 1) Generate Neo4j Bundle

Run from repository root:

```bash
node scripts/compute_topology/export_neo4j_bundle.js \
  data/compute_topology/graph_snapshot.sample.json \
  data/compute_topology/neo4j_bundle
```

Default arguments (if omitted):
- `snapshotPath`: `data/compute_topology/graph_snapshot.sample.json`
- `outDir`: `data/compute_topology/neo4j_bundle`

Generated files:
- `nodes.csv`
- `rels_network_link_merged.csv`
- `rels_semantic.csv`
- `import.cypher`
- `view.cypher`

## 2) Copy CSV to Neo4j Import Directory

In Neo4j Desktop, open the DBMS details and locate the `import` directory.
Copy these files into that directory:
- `nodes.csv`
- `rels_network_link_merged.csv`
- `rels_semantic.csv`

## 3) Run Import Cypher

Open Neo4j Browser and run the content of `import.cypher`.

What it does:
- Creates unique constraint on `ComputeNode.id`
- Imports all nodes from `nodes.csv`
- Imports merged network links from `rels_network_link_merged.csv`
- Imports `HOSTS` and `DEPENDS_ON` from `rels_semantic.csv`

## 4) Validate in Browser

Run `view.cypher`.

The script includes:
- graph preview query
- relationship label query for merged links
- count checks for nodes and relationships

## 5) Show `display_label` in Neo4j Browser / Bloom

Use relationship caption/label as `display_label` for `NETWORK_LINK_MERGED`.

Recommended caption:
- `NETWORK_LINK_MERGED`: `display_label`

This matches the frontend style:
- label format: `lat_ab/lat_ba | bw_ab/bw_ba`

## Troubleshooting

- `Couldn't load the external resource at: file:///...`
  - Ensure CSV files are inside Neo4j DBMS `import` directory.
  - Verify file names match exactly: `nodes.csv`, `rels_network_link_merged.csv`, `rels_semantic.csv`.

- Constraint or duplicate errors on re-import
  - The script uses `MERGE`, so re-run is safe.
  - If data model changed heavily, clear graph first before re-import.

- CSV appears loaded but no relationships
  - Check `from_id` and `to_id` in CSV exist in `nodes.csv`.
  - Run counts in `view.cypher` to verify each relationship type.

- Direction confusion on `NETWORK_LINK_MERGED`
  - Direction is canonicalized by node id sort for stable storage.
  - Directional metrics are preserved in properties:
    - `ab_*` means `from_id -> to_id`
    - `ba_*` means `to_id -> from_id`
