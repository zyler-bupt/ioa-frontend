#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

CPU_CORE_PEAK_TFLOPS = 0.1  # 100 GFLOPS per CPU core (rough estimate)
GPU_CARD_PEAK_TFLOPS = 15.0  # 15 TFLOPS per GPU card (rough estimate)
DEFAULT_UTIL_PCT_BY_STATUS = {
    "up": 35.0,
    "degraded": 25.0,
    "down": 5.0,
    "unknown": 15.0,
}


def _as_non_negative_number(value: Any, default: float = 0.0) -> float:
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        number = float(value)
        return number if number >= 0 else default
    return default


def _default_util_pct_for_status(status: Any) -> float:
    if isinstance(status, str):
        return DEFAULT_UTIL_PCT_BY_STATUS.get(status.lower(), DEFAULT_UTIL_PCT_BY_STATUS["unknown"])
    return DEFAULT_UTIL_PCT_BY_STATUS["unknown"]


def build_three_matrices(snapshot: dict[str, Any]) -> dict[str, Any]:
    nodes = snapshot.get("nodes")
    edges = snapshot.get("edges")
    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise ValueError("Invalid snapshot: nodes and edges must be arrays.")

    node_index: list[str] = []
    index_of: dict[str, int] = {}
    load_matrix: list[Any] = []

    for idx, node in enumerate(nodes):
        if not isinstance(node, dict):
            raise ValueError(f"Invalid snapshot: nodes[{idx}] must be an object.")
        node_id = node.get("id")
        if not isinstance(node_id, str) or not node_id:
            raise ValueError(f"Invalid snapshot: nodes[{idx}].id must be a non-empty string.")
        if node_id in index_of:
            raise ValueError(f"Invalid snapshot: duplicate node id '{node_id}'.")
        index_of[node_id] = len(node_index)
        node_index.append(node_id)

        metrics = node.get("metrics")
        capacity = node.get("capacity")
        metrics_dict = metrics if isinstance(metrics, dict) else {}
        capacity_dict = capacity if isinstance(capacity, dict) else {}
        default_util_pct = _default_util_pct_for_status(node.get("status"))

        cpu_cores = _as_non_negative_number(capacity_dict.get("cpu_cores"))
        gpu_count = _as_non_negative_number(capacity_dict.get("gpu_count"))
        load_pct = _as_non_negative_number(metrics_dict.get("load_pct"), default=default_util_pct)
        cpu_pct = _as_non_negative_number(metrics_dict.get("cpu_pct"), default=load_pct)
        gpu_pct = _as_non_negative_number(metrics_dict.get("gpu_pct"), default=load_pct)

        cpu_load_tflops = cpu_cores * CPU_CORE_PEAK_TFLOPS * (cpu_pct / 100.0)
        gpu_load_tflops = gpu_count * GPU_CARD_PEAK_TFLOPS * (gpu_pct / 100.0)
        load_value = cpu_load_tflops + gpu_load_tflops
        load_matrix.append(load_value)

    n = len(node_index)
    latency_matrix = [[0.0 for _ in range(n)] for _ in range(n)]
    bandwidth_matrix = [[0.0 for _ in range(n)] for _ in range(n)]

    for idx, edge in enumerate(edges):
        if not isinstance(edge, dict):
            raise ValueError(f"Invalid snapshot: edges[{idx}] must be an object.")
        if edge.get("relation") != "network_link":
            continue

        source = edge.get("source")
        target = edge.get("target")
        if source not in index_of or target not in index_of:
            raise ValueError(
                f"Invalid snapshot: edges[{idx}] references unknown node '{source}' -> '{target}'."
            )

        metrics = edge.get("metrics")
        if metrics is None:
            metrics = {}
        if not isinstance(metrics, dict):
            raise ValueError(f"Invalid snapshot: edges[{idx}].metrics must be an object.")

        i = index_of[source]
        j = index_of[target]

        # For duplicated (source, target) network links, the latest one overwrites previous values.
        latency_matrix[i][j] = _as_non_negative_number(metrics.get("latency_ms"))
        bandwidth_matrix[i][j] = _as_non_negative_number(metrics.get("bandwidth_mbps"))

    return {
        "node_index": node_index,
        "latency_matrix": latency_matrix,
        "load_matrix": load_matrix,
        "bandwidth_matrix": bandwidth_matrix,
    }


def read_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Invalid snapshot: root JSON value must be an object.")
    return data


def _format_number(value: Any) -> str:
    if value is None:
        return "0"
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        text = f"{value:.4f}".rstrip("0").rstrip(".")
        return text if text else "0"
    return str(value)


def format_matrix_numpy_like(matrix: list[list[Any]]) -> str:
    if not matrix:
        return "[]"

    tokens = [[_format_number(cell) for cell in row] for row in matrix]
    width = max(len(token) for row in tokens for token in row)

    lines = []
    for row in tokens:
        lines.append("[" + " ".join(token.rjust(width) for token in row) + "]")
    return "[\n " + "\n ".join(lines) + "\n]"


def format_list_numpy_like(values: list[Any]) -> str:
    if not values:
        return "[]"
    tokens = [_format_number(cell) for cell in values]
    width = max(len(token) for token in tokens)
    return "[" + " ".join(token.rjust(width) for token in tokens) + "]"


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    json_mode = False
    path_args: list[str] = []
    for arg in args:
        if arg == "--json":
            json_mode = True
            continue
        path_args.append(arg)

    input_arg = path_args[0] if path_args else "data/compute_topology/graph_snapshot.sample.json"
    input_path = Path(input_arg)
    if not input_path.is_absolute():
        input_path = Path.cwd() / input_path

    snapshot = read_json(input_path)
    matrices = build_three_matrices(snapshot)
    if json_mode:
        print(json.dumps(matrices, ensure_ascii=False, indent=2))
        return 0

    node_count = len(matrices["node_index"])
    print(f"node_count={node_count}")
    print("node_index=")
    print(json.dumps(matrices["node_index"], ensure_ascii=False))
    print()
    print(f"latency_matrix ({node_count}x{node_count}) =")
    print(format_matrix_numpy_like(matrices["latency_matrix"]))
    print()
    print(f"load_matrix ({node_count}, unit=TFLOPS) =")
    print(format_list_numpy_like(matrices["load_matrix"]))
    print()
    print(f"bandwidth_matrix ({node_count}x{node_count}) =")
    print(format_matrix_numpy_like(matrices["bandwidth_matrix"]))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
