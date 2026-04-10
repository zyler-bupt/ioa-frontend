// Compute topology import script for Neo4j 5.x
// Put CSV files under Neo4j import directory, then run this script in Neo4j Browser.

CREATE CONSTRAINT compute_node_id IF NOT EXISTS
FOR (n:ComputeNode) REQUIRE n.id IS UNIQUE;

LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
MERGE (n:ComputeNode {id: row.id})
SET
  n.name = row.name,
  n.kind = row.kind,
  n.layer = row.layer,
  n.status = row.status,
  n.region = row.region,
  n.zone = row.zone,
  n.cpu_cores = CASE WHEN row.cpu_cores = '' THEN null ELSE toInteger(row.cpu_cores) END,
  n.gpu_count = CASE WHEN row.gpu_count = '' THEN null ELSE toInteger(row.gpu_count) END,
  n.memory_gb = CASE WHEN row.memory_gb = '' THEN null ELSE toFloat(row.memory_gb) END,
  n.load_pct = CASE WHEN row.load_pct = '' THEN null ELSE toFloat(row.load_pct) END,
  n.cpu_pct = CASE WHEN row.cpu_pct = '' THEN null ELSE toFloat(row.cpu_pct) END,
  n.gpu_pct = CASE WHEN row.gpu_pct = '' THEN null ELSE toFloat(row.gpu_pct) END,
  n.mem_pct = CASE WHEN row.mem_pct = '' THEN null ELSE toFloat(row.mem_pct) END,
  n.metrics_ts = CASE WHEN row.metrics_ts = '' THEN null ELSE row.metrics_ts END;

LOAD CSV WITH HEADERS FROM 'file:///rels_network_link_merged.csv' AS row
MATCH (a:ComputeNode {id: row.from_id})
MATCH (b:ComputeNode {id: row.to_id})
MERGE (a)-[r:NETWORK_LINK_MERGED {pair_key: row.pair_key}]->(b)
SET
  r.status = row.status,
  r.status_ab = row.status_ab,
  r.status_ba = row.status_ba,
  r.ab_latency_ms = CASE WHEN row.ab_latency_ms = '' THEN null ELSE toFloat(row.ab_latency_ms) END,
  r.ba_latency_ms = CASE WHEN row.ba_latency_ms = '' THEN null ELSE toFloat(row.ba_latency_ms) END,
  r.ab_bandwidth_mbps = CASE WHEN row.ab_bandwidth_mbps = '' THEN null ELSE toFloat(row.ab_bandwidth_mbps) END,
  r.ba_bandwidth_mbps = CASE WHEN row.ba_bandwidth_mbps = '' THEN null ELSE toFloat(row.ba_bandwidth_mbps) END,
  r.ab_utilization_pct = CASE WHEN row.ab_utilization_pct = '' THEN null ELSE toFloat(row.ab_utilization_pct) END,
  r.ba_utilization_pct = CASE WHEN row.ba_utilization_pct = '' THEN null ELSE toFloat(row.ba_utilization_pct) END,
  r.ab_packet_loss_pct = CASE WHEN row.ab_packet_loss_pct = '' THEN null ELSE toFloat(row.ab_packet_loss_pct) END,
  r.ba_packet_loss_pct = CASE WHEN row.ba_packet_loss_pct = '' THEN null ELSE toFloat(row.ba_packet_loss_pct) END,
  r.ab_jitter_ms = CASE WHEN row.ab_jitter_ms = '' THEN null ELSE toFloat(row.ab_jitter_ms) END,
  r.ba_jitter_ms = CASE WHEN row.ba_jitter_ms = '' THEN null ELSE toFloat(row.ba_jitter_ms) END,
  r.ab_ts = CASE WHEN row.ab_ts = '' THEN null ELSE row.ab_ts END,
  r.ba_ts = CASE WHEN row.ba_ts = '' THEN null ELSE row.ba_ts END,
  r.latency_peak_ms = CASE WHEN row.latency_peak_ms = '' THEN null ELSE toFloat(row.latency_peak_ms) END,
  r.bandwidth_peak_mbps = CASE WHEN row.bandwidth_peak_mbps = '' THEN null ELSE toFloat(row.bandwidth_peak_mbps) END,
  r.display_label = row.display_label;

LOAD CSV WITH HEADERS FROM 'file:///rels_semantic.csv' AS row
WITH row WHERE row.relation = 'hosts'
MATCH (a:ComputeNode {id: row.from_id})
MATCH (b:ComputeNode {id: row.to_id})
MERGE (a)-[r:HOSTS {edge_id: row.edge_id}]->(b)
SET r.status = row.status;

LOAD CSV WITH HEADERS FROM 'file:///rels_semantic.csv' AS row
WITH row WHERE row.relation = 'depends_on'
MATCH (a:ComputeNode {id: row.from_id})
MATCH (b:ComputeNode {id: row.to_id})
MERGE (a)-[r:DEPENDS_ON {edge_id: row.edge_id}]->(b)
SET r.status = row.status;
