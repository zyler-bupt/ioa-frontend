// Base graph view
MATCH p=(a:ComputeNode)-[r]->(b:ComputeNode)
RETURN p
LIMIT 800;

// Label-ready network links (use r.display_label as relationship caption in Browser/Bloom)
MATCH (a:ComputeNode)-[r:NETWORK_LINK_MERGED]->(b:ComputeNode)
RETURN a.id AS from_id, b.id AS to_id, r.display_label AS label, r.status AS status, r.latency_peak_ms AS latency_peak_ms, r.bandwidth_peak_mbps AS bandwidth_peak_mbps
ORDER BY from_id, to_id
LIMIT 300;

// Count checks
MATCH (:ComputeNode) RETURN count(*) AS node_count;
MATCH ()-[r:NETWORK_LINK_MERGED]->() RETURN count(r) AS merged_network_link_count;
MATCH ()-[r:HOSTS|DEPENDS_ON]->() RETURN count(r) AS semantic_relation_count;
