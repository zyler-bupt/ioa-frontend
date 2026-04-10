#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function buildMatrixBundle(snapshot) {
  if (!snapshot || snapshot.version !== "compute-topology/v1") {
    throw new Error("Invalid snapshot: expected version compute-topology/v1");
  }
  if (!Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges)) {
    throw new Error("Invalid snapshot: nodes and edges must be arrays");
  }

  const nodeIndex = snapshot.nodes.map((node) => node.id);
  const n = nodeIndex.length;
  const indexOf = new Map(nodeIndex.map((id, idx) => [id, idx]));

  const adjacency = Array.from({ length: n }, () => Array(n).fill(0));
  const latency = Array.from({ length: n }, () => Array(n).fill(null));
  const bandwidth = Array.from({ length: n }, () => Array(n).fill(null));

  for (const edge of snapshot.edges) {
    const i = indexOf.get(edge.source);
    const j = indexOf.get(edge.target);
    if (i === undefined || j === undefined) {
      throw new Error(`Edge ${edge.id} references unknown node: ${edge.source} -> ${edge.target}`);
    }

    adjacency[i][j] = 1;

    if (edge.relation === "network_link") {
      const metrics = edge.metrics || {};
      latency[i][j] = metrics.latency_ms ?? null;
      bandwidth[i][j] = metrics.bandwidth_mbps ?? null;
    }
  }

  const nodeLoadVector = snapshot.nodes.map((node) => node.metrics?.load_pct ?? null);

  return {
    version: "compute-topology-matrix/v1",
    generated_at: new Date().toISOString(),
    source_snapshot_version: snapshot.version,
    source_snapshot_generated_at: snapshot.generated_at,
    node_index: nodeIndex,
    adjacency_matrix: adjacency,
    latency_matrix: latency,
    bandwidth_matrix: bandwidth,
    node_load_vector: nodeLoadVector,
    notes: {
      adjacency_rule: "A[i][j]=1 means at least one directed edge from node_index[i] to node_index[j] in GraphSnapshot.",
      network_metric_rule: "latency_matrix / bandwidth_matrix are filled only for relation=network_link; otherwise null."
    }
  };
}

function main() {
  const cwd = process.cwd();
  const inputArg = process.argv[2] || "data/compute_topology/graph_snapshot.sample.json";
  const outputArg = process.argv[3] || "data/compute_topology/matrix_bundle.sample.json";

  const inputPath = path.resolve(cwd, inputArg);
  const outputPath = path.resolve(cwd, outputArg);

  const snapshot = readJson(inputPath);
  const bundle = buildMatrixBundle(snapshot);
  writeJson(outputPath, bundle);

  console.log(`MatrixBundle generated:`);
  console.log(`- input:  ${inputPath}`);
  console.log(`- output: ${outputPath}`);
  console.log(`- nodes:  ${bundle.node_index.length}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  buildMatrixBundle
};
