#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isPercent(value) {
  return value === null || (isFiniteNumber(value) && value >= 0 && value <= 100);
}

function isNonNegativeOrNull(value) {
  return value === null || (isFiniteNumber(value) && value >= 0);
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validateSnapshot(snapshot) {
  const errors = [];

  assert(snapshot?.version === "compute-topology/v1", "snapshot.version must be compute-topology/v1", errors);
  assert(typeof snapshot?.generated_at === "string", "snapshot.generated_at must be a string", errors);
  assert(Array.isArray(snapshot?.metric_windows) && snapshot.metric_windows.length > 0, "snapshot.metric_windows must be non-empty array", errors);
  assert(Array.isArray(snapshot?.nodes) && snapshot.nodes.length > 0, "snapshot.nodes must be non-empty array", errors);
  assert(Array.isArray(snapshot?.edges) && snapshot.edges.length > 0, "snapshot.edges must be non-empty array", errors);

  if (errors.length) return { errors, context: null };

  const nodeIds = new Set();
  const edgeIds = new Set();
  const nodeMap = new Map();

  snapshot.nodes.forEach((node, idx) => {
    const prefix = `nodes[${idx}]`;
    assert(typeof node.id === "string" && node.id.length > 0, `${prefix}.id must be non-empty string`, errors);
    assert(["compute", "gateway", "terminal", "service"].includes(node.kind), `${prefix}.kind invalid`, errors);
    assert(["cloud", "edge", "terminal"].includes(node.layer), `${prefix}.layer invalid`, errors);
    if (node.status !== undefined) {
      assert(["up", "degraded", "down"].includes(node.status), `${prefix}.status invalid`, errors);
    }

    assert(node.labels && typeof node.labels === "object", `${prefix}.labels must be object`, errors);
    if (node.labels && typeof node.labels === "object") {
      assert(typeof node.labels.name === "string", `${prefix}.labels.name must be string`, errors);
      assert(typeof node.labels.region === "string", `${prefix}.labels.region must be string`, errors);
      assert(typeof node.labels.zone === "string", `${prefix}.labels.zone must be string`, errors);
    }

    assert(node.capacity && typeof node.capacity === "object", `${prefix}.capacity must be object`, errors);
    if (node.capacity && typeof node.capacity === "object") {
      assert(isNonNegativeOrNull(node.capacity.cpu_cores) && node.capacity.cpu_cores !== null, `${prefix}.capacity.cpu_cores must be >=0`, errors);
      assert(isNonNegativeOrNull(node.capacity.gpu_count) && node.capacity.gpu_count !== null, `${prefix}.capacity.gpu_count must be >=0`, errors);
      assert(isNonNegativeOrNull(node.capacity.memory_gb) && node.capacity.memory_gb !== null, `${prefix}.capacity.memory_gb must be >=0`, errors);
    }

    assert(node.metrics && typeof node.metrics === "object", `${prefix}.metrics must be object`, errors);
    if (node.metrics && typeof node.metrics === "object") {
      assert(typeof node.metrics.ts === "string", `${prefix}.metrics.ts must be string`, errors);
      assert(isPercent(node.metrics.load_pct), `${prefix}.metrics.load_pct must be [0,100] or null`, errors);
      assert(isPercent(node.metrics.cpu_pct), `${prefix}.metrics.cpu_pct must be [0,100] or null`, errors);
      assert(isPercent(node.metrics.gpu_pct), `${prefix}.metrics.gpu_pct must be [0,100] or null`, errors);
      assert(isPercent(node.metrics.mem_pct), `${prefix}.metrics.mem_pct must be [0,100] or null`, errors);
    }

    if (node.id) {
      assert(!nodeIds.has(node.id), `duplicate node id: ${node.id}`, errors);
      nodeIds.add(node.id);
      nodeMap.set(node.id, node);
    }
  });

  snapshot.edges.forEach((edge, idx) => {
    const prefix = `edges[${idx}]`;
    assert(typeof edge.id === "string" && edge.id.length > 0, `${prefix}.id must be non-empty string`, errors);
    if (edge.id) {
      assert(!edgeIds.has(edge.id), `duplicate edge id: ${edge.id}`, errors);
      edgeIds.add(edge.id);
    }

    assert(typeof edge.source === "string" && nodeIds.has(edge.source), `${prefix}.source must reference an existing node`, errors);
    assert(typeof edge.target === "string" && nodeIds.has(edge.target), `${prefix}.target must reference an existing node`, errors);
    assert(["network_link", "hosts", "depends_on"].includes(edge.relation), `${prefix}.relation invalid`, errors);
    assert(["up", "degraded", "down"].includes(edge.status), `${prefix}.status invalid`, errors);

    if (edge.relation === "network_link") {
      assert(edge.metrics && typeof edge.metrics === "object", `${prefix}.metrics required for network_link`, errors);
      if (edge.metrics && typeof edge.metrics === "object") {
        assert(typeof edge.metrics.ts === "string", `${prefix}.metrics.ts must be string`, errors);
        assert(isNonNegativeOrNull(edge.metrics.latency_ms), `${prefix}.metrics.latency_ms must be >=0 or null`, errors);
        assert(isNonNegativeOrNull(edge.metrics.bandwidth_mbps), `${prefix}.metrics.bandwidth_mbps must be >=0 or null`, errors);
        assert(isPercent(edge.metrics.utilization_pct), `${prefix}.metrics.utilization_pct must be [0,100] or null`, errors);
        assert(isPercent(edge.metrics.packet_loss_pct), `${prefix}.metrics.packet_loss_pct must be [0,100] or null`, errors);
        assert(isNonNegativeOrNull(edge.metrics.jitter_ms), `${prefix}.metrics.jitter_ms must be >=0 or null`, errors);
      }
    }
  });

  const hasCrossLayerLink = snapshot.edges.some((edge) => {
    if (edge.relation !== "network_link") return false;
    const sourceLayer = nodeMap.get(edge.source)?.layer;
    const targetLayer = nodeMap.get(edge.target)?.layer;
    return sourceLayer && targetLayer && sourceLayer !== targetLayer;
  });
  assert(hasCrossLayerLink, "scenario check failed: at least one cross-layer network link is required", errors);

  const hasDownNode = snapshot.nodes.some((node) => node.status === "down");
  assert(hasDownNode, "scenario check failed: at least one node with status=down is required", errors);

  const hasDegradedOrDownEdge = snapshot.edges.some((edge) => edge.status === "degraded" || edge.status === "down");
  assert(hasDegradedOrDownEdge, "scenario check failed: at least one edge with status=degraded/down is required", errors);

  const outDegree = new Map(snapshot.nodes.map((node) => [node.id, 0]));
  const inDegree = new Map(snapshot.nodes.map((node) => [node.id, 0]));
  snapshot.edges.forEach((edge) => {
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });
  const hasIsolatedNode = snapshot.nodes.some((node) => (outDegree.get(node.id) || 0) === 0 && (inDegree.get(node.id) || 0) === 0);
  assert(hasIsolatedNode, "scenario check failed: at least one isolated node is required", errors);

  return {
    errors,
    context: {
      nodeMap,
      nodeIds: snapshot.nodes.map((node) => node.id)
    }
  };
}

function validateMatrix(snapshot, matrix, context) {
  const errors = [];
  const n = snapshot.nodes.length;

  assert(matrix?.version === "compute-topology-matrix/v1", "matrix.version must be compute-topology-matrix/v1", errors);
  assert(typeof matrix?.generated_at === "string", "matrix.generated_at must be string", errors);
  assert(matrix?.source_snapshot_version === snapshot.version, "matrix.source_snapshot_version mismatch", errors);
  assert(matrix?.source_snapshot_generated_at === snapshot.generated_at, "matrix.source_snapshot_generated_at mismatch", errors);

  assert(Array.isArray(matrix?.node_index) && matrix.node_index.length === n, "matrix.node_index length mismatch", errors);
  assert(Array.isArray(matrix?.adjacency_matrix) && matrix.adjacency_matrix.length === n, "matrix.adjacency_matrix row size mismatch", errors);
  assert(Array.isArray(matrix?.latency_matrix) && matrix.latency_matrix.length === n, "matrix.latency_matrix row size mismatch", errors);
  assert(Array.isArray(matrix?.bandwidth_matrix) && matrix.bandwidth_matrix.length === n, "matrix.bandwidth_matrix row size mismatch", errors);
  assert(Array.isArray(matrix?.node_load_vector) && matrix.node_load_vector.length === n, "matrix.node_load_vector size mismatch", errors);

  if (errors.length) return errors;

  const expectedOrder = snapshot.nodes.map((node) => node.id);
  for (let i = 0; i < n; i += 1) {
    assert(matrix.node_index[i] === expectedOrder[i], `matrix.node_index[${i}] should be ${expectedOrder[i]}`, errors);

    assert(Array.isArray(matrix.adjacency_matrix[i]) && matrix.adjacency_matrix[i].length === n, `matrix.adjacency_matrix[${i}] col size mismatch`, errors);
    assert(Array.isArray(matrix.latency_matrix[i]) && matrix.latency_matrix[i].length === n, `matrix.latency_matrix[${i}] col size mismatch`, errors);
    assert(Array.isArray(matrix.bandwidth_matrix[i]) && matrix.bandwidth_matrix[i].length === n, `matrix.bandwidth_matrix[${i}] col size mismatch`, errors);

    assert(isPercent(matrix.node_load_vector[i]), `matrix.node_load_vector[${i}] must be [0,100] or null`, errors);

    for (let j = 0; j < n; j += 1) {
      const a = matrix.adjacency_matrix[i][j];
      assert(a === 0 || a === 1, `matrix.adjacency_matrix[${i}][${j}] must be 0 or 1`, errors);
      assert(isNonNegativeOrNull(matrix.latency_matrix[i][j]), `matrix.latency_matrix[${i}][${j}] must be >=0 or null`, errors);
      assert(isNonNegativeOrNull(matrix.bandwidth_matrix[i][j]), `matrix.bandwidth_matrix[${i}][${j}] must be >=0 or null`, errors);
    }
  }

  const indexOf = new Map(matrix.node_index.map((id, idx) => [id, idx]));
  const pairMeta = new Map();

  for (const edge of snapshot.edges) {
    const i = indexOf.get(edge.source);
    const j = indexOf.get(edge.target);
    const key = `${i}|${j}`;

    assert(matrix.adjacency_matrix[i][j] === 1, `adjacency missing edge ${edge.id}`, errors);

    if (!pairMeta.has(key)) {
      pairMeta.set(key, { hasNetwork: false, latency: null, bandwidth: null });
    }
    if (edge.relation === "network_link") {
      pairMeta.set(key, {
        hasNetwork: true,
        latency: edge.metrics?.latency_ms ?? null,
        bandwidth: edge.metrics?.bandwidth_mbps ?? null
      });
    }
  }

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const key = `${i}|${j}`;
      const meta = pairMeta.get(key);
      if (!meta) {
        assert(matrix.adjacency_matrix[i][j] === 0, `adjacency has extra connection ${matrix.node_index[i]} -> ${matrix.node_index[j]}`, errors);
        assert(matrix.latency_matrix[i][j] === null, `latency should be null when no edge (${matrix.node_index[i]} -> ${matrix.node_index[j]})`, errors);
        assert(matrix.bandwidth_matrix[i][j] === null, `bandwidth should be null when no edge (${matrix.node_index[i]} -> ${matrix.node_index[j]})`, errors);
        continue;
      }
      if (!meta.hasNetwork) {
        assert(matrix.latency_matrix[i][j] === null, `latency should be null for non-network edge (${matrix.node_index[i]} -> ${matrix.node_index[j]})`, errors);
        assert(matrix.bandwidth_matrix[i][j] === null, `bandwidth should be null for non-network edge (${matrix.node_index[i]} -> ${matrix.node_index[j]})`, errors);
      } else {
        assert(matrix.latency_matrix[i][j] === meta.latency, `latency mismatch for ${matrix.node_index[i]} -> ${matrix.node_index[j]}`, errors);
        assert(matrix.bandwidth_matrix[i][j] === meta.bandwidth, `bandwidth mismatch for ${matrix.node_index[i]} -> ${matrix.node_index[j]}`, errors);
      }
    }
  }

  snapshot.nodes.forEach((node, idx) => {
    const expectedLoad = node.metrics?.load_pct ?? null;
    assert(matrix.node_load_vector[idx] === expectedLoad, `node_load_vector mismatch for node ${node.id}`, errors);
  });

  return errors;
}

function main() {
  const cwd = process.cwd();
  const snapshotArg = process.argv[2] || "data/compute_topology/graph_snapshot.sample.json";
  const matrixArg = process.argv[3] || "data/compute_topology/matrix_bundle.sample.json";

  const snapshotPath = path.resolve(cwd, snapshotArg);
  const matrixPath = path.resolve(cwd, matrixArg);

  const snapshot = readJson(snapshotPath);
  const matrix = readJson(matrixPath);

  const snapshotResult = validateSnapshot(snapshot);
  const matrixErrors = snapshotResult.context
    ? validateMatrix(snapshot, matrix, snapshotResult.context)
    : [];

  const errors = [...snapshotResult.errors, ...matrixErrors];
  if (errors.length) {
    console.error("Validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Validation passed:");
  console.log(`- snapshot: ${snapshotPath}`);
  console.log(`- matrix:   ${matrixPath}`);
  console.log(`- nodes: ${snapshot.nodes.length}`);
  console.log(`- edges: ${snapshot.edges.length}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
