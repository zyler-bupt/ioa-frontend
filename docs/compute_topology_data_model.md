# 云边端算力网络图数据模型（v1）

## 产物
- `GraphSnapshot`: `data/compute_topology/graph_snapshot.sample.json`
- `MatrixBundle`: `data/compute_topology/matrix_bundle.sample.json`
- Schema:
  - `schemas/compute_topology/graph_snapshot.schema.json`
  - `schemas/compute_topology/matrix_bundle.schema.json`

## 接口要点
- `GraphSnapshot.version` 固定为 `compute-topology/v1`
- `GraphSnapshot` 以有向边表达拓扑，双向链路使用两条边
- `relation` 支持 `network_link | hosts | depends_on`
- `network_link` 边必须包含网络指标：
  - `latency_ms`
  - `bandwidth_mbps`
  - `utilization_pct`
  - `packet_loss_pct`
  - `jitter_ms`
- `MatrixBundle` 派生输出：
  - `adjacency_matrix A[n][n]`
  - `latency_matrix L[n][n]`
  - `bandwidth_matrix B[n][n]`
  - `node_load_vector U[n]`
  - `node_index`

## 生成与校验
```bash
# 1) 由 GraphSnapshot 生成 MatrixBundle
node scripts/compute_topology/build_matrix_bundle.js \
  data/compute_topology/graph_snapshot.sample.json \
  data/compute_topology/matrix_bundle.sample.json

# 2) 一致性校验（结构 + 指标 + 场景 + 矩阵）
node scripts/compute_topology/validate_topology_data.js \
  data/compute_topology/graph_snapshot.sample.json \
  data/compute_topology/matrix_bundle.sample.json
```

## 场景覆盖
- 跨层链路：terminal -> edge -> cloud
- 链路退化：`status=degraded`
- 节点下线：`node.status=down`
- 孤立节点：无入边且无出边节点
