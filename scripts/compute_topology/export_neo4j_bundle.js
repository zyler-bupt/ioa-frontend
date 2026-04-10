#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function assertSnapshot(snapshot) {
  if (!snapshot || snapshot.version !== "compute-topology/v1") {
    throw new Error("Invalid snapshot: expected version compute-topology/v1");
  }
  if (!Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges)) {
    throw new Error("Invalid snapshot: nodes and edges must be arrays");
  }

  const nodeIds = new Set();
  snapshot.nodes.forEach((node, idx) => {
    if (!node || typeof node.id !== "string" || !node.id) {
      throw new Error(`Invalid snapshot: nodes[${idx}].id must be non-empty string`);
    }
    if (nodeIds.has(node.id)) {
      throw new Error(`Invalid snapshot: duplicate node id ${node.id}`);
    }
    nodeIds.add(node.id);
  });

  snapshot.edges.forEach((edge, idx) => {
    if (!edge || typeof edge.source !== "string" || typeof edge.target !== "string") {
      throw new Error(`Invalid snapshot: edges[${idx}] must have source/target`);
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(`Invalid snapshot: edges[${idx}] references unknown node`);
    }
  });
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[,"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvEscape).join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((key) => csvEscape(row[key])).join(","));
  });
  return `${lines.join("\n")}\n`;
}

function trimNumber(value, digits) {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(typeof digits === "number" ? digits : 1).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function formatLatency(value) {
  if (value === null || value === undefined) return "-";
  return `${trimNumber(value, 1)}ms`;
}

function formatBandwidth(value) {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  if (num >= 1000) return `${trimNumber(num / 1000, 2)}Gbps`;
  return `${trimNumber(num, 0)}Mbps`;
}

function mergeStatus(statusA, statusB) {
  const statuses = [statusA, statusB].filter((s) => typeof s === "string" && s.length > 0);
  if (statuses.includes("down")) return "down";
  if (statuses.includes("degraded")) return "degraded";
  return "up";
}

function pairKey(a, b) {
  return [a, b].sort().join("||");
}

function buildNodesCsvRows(snapshot) {
  return snapshot.nodes.map((node) => {
    const labels = node.labels || {};
    const cap = node.capacity || {};
    const metrics = node.metrics || {};
    return {
      id: node.id,
      name: labels.name || "",
      kind: node.kind || "",
      layer: node.layer || "",
      status: node.status || "up",
      region: labels.region || "",
      zone: labels.zone || "",
      cpu_cores: cap.cpu_cores ?? "",
      gpu_count: cap.gpu_count ?? "",
      memory_gb: cap.memory_gb ?? "",
      load_pct: metrics.load_pct ?? "",
      cpu_pct: metrics.cpu_pct ?? "",
      gpu_pct: metrics.gpu_pct ?? "",
      mem_pct: metrics.mem_pct ?? "",
      metrics_ts: metrics.ts || ""
    };
  });
}

function buildMergedNetworkRows(snapshot) {
  const mergedByPair = new Map();

  snapshot.edges.forEach((edge) => {
    if (edge.relation !== "network_link") return;
    const [fromId, toId] = [edge.source, edge.target].sort();
    const key = pairKey(edge.source, edge.target);
    if (!mergedByPair.has(key)) {
      mergedByPair.set(key, {
        pair_key: key,
        from_id: fromId,
        to_id: toId,
        status_ab: null,
        status_ba: null,
        ab_latency_ms: null,
        ba_latency_ms: null,
        ab_bandwidth_mbps: null,
        ba_bandwidth_mbps: null,
        ab_utilization_pct: null,
        ba_utilization_pct: null,
        ab_packet_loss_pct: null,
        ba_packet_loss_pct: null,
        ab_jitter_ms: null,
        ba_jitter_ms: null,
        ab_ts: null,
        ba_ts: null
      });
    }

    const row = mergedByPair.get(key);
    const metrics = edge.metrics || {};
    const isForward = edge.source === row.from_id && edge.target === row.to_id;
    const prefix = isForward ? "ab" : "ba";

    row[`status_${prefix}`] = edge.status || "up";
    row[`${prefix}_latency_ms`] = metrics.latency_ms ?? null;
    row[`${prefix}_bandwidth_mbps`] = metrics.bandwidth_mbps ?? null;
    row[`${prefix}_utilization_pct`] = metrics.utilization_pct ?? null;
    row[`${prefix}_packet_loss_pct`] = metrics.packet_loss_pct ?? null;
    row[`${prefix}_jitter_ms`] = metrics.jitter_ms ?? null;
    row[`${prefix}_ts`] = metrics.ts || null;
  });

  const rows = Array.from(mergedByPair.values()).map((row) => {
    const latencies = [row.ab_latency_ms, row.ba_latency_ms].filter((v) => typeof v === "number" && Number.isFinite(v));
    const bandwidths = [row.ab_bandwidth_mbps, row.ba_bandwidth_mbps].filter((v) => typeof v === "number" && Number.isFinite(v));
    const status = mergeStatus(row.status_ab, row.status_ba);
    const displayLabel = `${formatLatency(row.ab_latency_ms)}/${formatLatency(row.ba_latency_ms)} | ${formatBandwidth(row.ab_bandwidth_mbps)}/${formatBandwidth(row.ba_bandwidth_mbps)}`;

    return {
      pair_key: row.pair_key,
      from_id: row.from_id,
      to_id: row.to_id,
      status,
      status_ab: row.status_ab,
      status_ba: row.status_ba,
      ab_latency_ms: row.ab_latency_ms ?? "",
      ba_latency_ms: row.ba_latency_ms ?? "",
      ab_bandwidth_mbps: row.ab_bandwidth_mbps ?? "",
      ba_bandwidth_mbps: row.ba_bandwidth_mbps ?? "",
      ab_utilization_pct: row.ab_utilization_pct ?? "",
      ba_utilization_pct: row.ba_utilization_pct ?? "",
      ab_packet_loss_pct: row.ab_packet_loss_pct ?? "",
      ba_packet_loss_pct: row.ba_packet_loss_pct ?? "",
      ab_jitter_ms: row.ab_jitter_ms ?? "",
      ba_jitter_ms: row.ba_jitter_ms ?? "",
      ab_ts: row.ab_ts || "",
      ba_ts: row.ba_ts || "",
      latency_peak_ms: latencies.length ? Math.max(...latencies) : "",
      bandwidth_peak_mbps: bandwidths.length ? Math.max(...bandwidths) : "",
      display_label: displayLabel
    };
  });

  rows.sort((a, b) => a.pair_key.localeCompare(b.pair_key));
  return rows;
}

function buildSemanticRows(snapshot) {
  const rows = snapshot.edges
    .filter((edge) => edge.relation === "hosts" || edge.relation === "depends_on")
    .map((edge) => ({
      edge_id: edge.id,
      from_id: edge.source,
      to_id: edge.target,
      relation: edge.relation,
      status: edge.status || "up"
    }));

  rows.sort((a, b) => a.edge_id.localeCompare(b.edge_id));
  return rows;
}

function buildImportCypher() {
  return `// Compute topology import script for Neo4j 5.x\n// Put CSV files under Neo4j import directory, then run this script in Neo4j Browser.\n\nCREATE CONSTRAINT compute_node_id IF NOT EXISTS\nFOR (n:ComputeNode) REQUIRE n.id IS UNIQUE;\n\nLOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row\nMERGE (n:ComputeNode {id: row.id})\nSET\n  n.name = row.name,\n  n.kind = row.kind,\n  n.layer = row.layer,\n  n.status = row.status,\n  n.region = row.region,\n  n.zone = row.zone,\n  n.cpu_cores = CASE WHEN row.cpu_cores = '' THEN null ELSE toInteger(row.cpu_cores) END,\n  n.gpu_count = CASE WHEN row.gpu_count = '' THEN null ELSE toInteger(row.gpu_count) END,\n  n.memory_gb = CASE WHEN row.memory_gb = '' THEN null ELSE toFloat(row.memory_gb) END,\n  n.load_pct = CASE WHEN row.load_pct = '' THEN null ELSE toFloat(row.load_pct) END,\n  n.cpu_pct = CASE WHEN row.cpu_pct = '' THEN null ELSE toFloat(row.cpu_pct) END,\n  n.gpu_pct = CASE WHEN row.gpu_pct = '' THEN null ELSE toFloat(row.gpu_pct) END,\n  n.mem_pct = CASE WHEN row.mem_pct = '' THEN null ELSE toFloat(row.mem_pct) END,\n  n.metrics_ts = CASE WHEN row.metrics_ts = '' THEN null ELSE row.metrics_ts END;\n\nLOAD CSV WITH HEADERS FROM 'file:///rels_network_link_merged.csv' AS row\nMATCH (a:ComputeNode {id: row.from_id})\nMATCH (b:ComputeNode {id: row.to_id})\nMERGE (a)-[r:NETWORK_LINK_MERGED {pair_key: row.pair_key}]->(b)\nSET\n  r.status = row.status,\n  r.status_ab = row.status_ab,\n  r.status_ba = row.status_ba,\n  r.ab_latency_ms = CASE WHEN row.ab_latency_ms = '' THEN null ELSE toFloat(row.ab_latency_ms) END,\n  r.ba_latency_ms = CASE WHEN row.ba_latency_ms = '' THEN null ELSE toFloat(row.ba_latency_ms) END,\n  r.ab_bandwidth_mbps = CASE WHEN row.ab_bandwidth_mbps = '' THEN null ELSE toFloat(row.ab_bandwidth_mbps) END,\n  r.ba_bandwidth_mbps = CASE WHEN row.ba_bandwidth_mbps = '' THEN null ELSE toFloat(row.ba_bandwidth_mbps) END,\n  r.ab_utilization_pct = CASE WHEN row.ab_utilization_pct = '' THEN null ELSE toFloat(row.ab_utilization_pct) END,\n  r.ba_utilization_pct = CASE WHEN row.ba_utilization_pct = '' THEN null ELSE toFloat(row.ba_utilization_pct) END,\n  r.ab_packet_loss_pct = CASE WHEN row.ab_packet_loss_pct = '' THEN null ELSE toFloat(row.ab_packet_loss_pct) END,\n  r.ba_packet_loss_pct = CASE WHEN row.ba_packet_loss_pct = '' THEN null ELSE toFloat(row.ba_packet_loss_pct) END,\n  r.ab_jitter_ms = CASE WHEN row.ab_jitter_ms = '' THEN null ELSE toFloat(row.ab_jitter_ms) END,\n  r.ba_jitter_ms = CASE WHEN row.ba_jitter_ms = '' THEN null ELSE toFloat(row.ba_jitter_ms) END,\n  r.ab_ts = CASE WHEN row.ab_ts = '' THEN null ELSE row.ab_ts END,\n  r.ba_ts = CASE WHEN row.ba_ts = '' THEN null ELSE row.ba_ts END,\n  r.latency_peak_ms = CASE WHEN row.latency_peak_ms = '' THEN null ELSE toFloat(row.latency_peak_ms) END,\n  r.bandwidth_peak_mbps = CASE WHEN row.bandwidth_peak_mbps = '' THEN null ELSE toFloat(row.bandwidth_peak_mbps) END,\n  r.display_label = row.display_label;\n\nLOAD CSV WITH HEADERS FROM 'file:///rels_semantic.csv' AS row\nWITH row WHERE row.relation = 'hosts'\nMATCH (a:ComputeNode {id: row.from_id})\nMATCH (b:ComputeNode {id: row.to_id})\nMERGE (a)-[r:HOSTS {edge_id: row.edge_id}]->(b)\nSET r.status = row.status;\n\nLOAD CSV WITH HEADERS FROM 'file:///rels_semantic.csv' AS row\nWITH row WHERE row.relation = 'depends_on'\nMATCH (a:ComputeNode {id: row.from_id})\nMATCH (b:ComputeNode {id: row.to_id})\nMERGE (a)-[r:DEPENDS_ON {edge_id: row.edge_id}]->(b)\nSET r.status = row.status;\n`;
}

function buildViewCypher() {
  return `// Base graph view\nMATCH p=(a:ComputeNode)-[r]->(b:ComputeNode)\nRETURN p\nLIMIT 800;\n\n// Label-ready network links (use r.display_label as relationship caption in Browser/Bloom)\nMATCH (a:ComputeNode)-[r:NETWORK_LINK_MERGED]->(b:ComputeNode)\nRETURN a.id AS from_id, b.id AS to_id, r.display_label AS label, r.status AS status, r.latency_peak_ms AS latency_peak_ms, r.bandwidth_peak_mbps AS bandwidth_peak_mbps\nORDER BY from_id, to_id\nLIMIT 300;\n\n// Count checks\nMATCH (:ComputeNode) RETURN count(*) AS node_count;\nMATCH ()-[r:NETWORK_LINK_MERGED]->() RETURN count(r) AS merged_network_link_count;\nMATCH ()-[r:HOSTS|DEPENDS_ON]->() RETURN count(r) AS semantic_relation_count;\n`;
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function main() {
  const cwd = process.cwd();
  const inputArg = process.argv[2] || "data/compute_topology/graph_snapshot.sample.json";
  const outArg = process.argv[3] || "data/compute_topology/neo4j_bundle";

  const inputPath = path.resolve(cwd, inputArg);
  const outDir = path.resolve(cwd, outArg);

  const snapshot = readJson(inputPath);
  assertSnapshot(snapshot);

  const nodeRows = buildNodesCsvRows(snapshot);
  const mergedRows = buildMergedNetworkRows(snapshot);
  const semanticRows = buildSemanticRows(snapshot);

  ensureDir(outDir);

  const nodesCsvPath = path.join(outDir, "nodes.csv");
  const mergedCsvPath = path.join(outDir, "rels_network_link_merged.csv");
  const semanticCsvPath = path.join(outDir, "rels_semantic.csv");
  const importCypherPath = path.join(outDir, "import.cypher");
  const viewCypherPath = path.join(outDir, "view.cypher");

  writeFile(nodesCsvPath, toCsv(nodeRows));
  writeFile(mergedCsvPath, toCsv(mergedRows));
  writeFile(semanticCsvPath, toCsv(semanticRows));
  writeFile(importCypherPath, buildImportCypher());
  writeFile(viewCypherPath, buildViewCypher());

  console.log("Neo4j bundle generated:");
  console.log(`- input: ${inputPath}`);
  console.log(`- outDir: ${outDir}`);
  console.log(`- nodes.csv rows: ${nodeRows.length}`);
  console.log(`- rels_network_link_merged.csv rows: ${mergedRows.length}`);
  console.log(`- rels_semantic.csv rows: ${semanticRows.length}`);
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
  buildNodesCsvRows,
  buildMergedNetworkRows,
  buildSemanticRows
};
