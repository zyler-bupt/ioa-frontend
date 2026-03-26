/**
 * topology/interaction.js
 * Flow, pin/highlight, and interaction helpers.
 */

const FLOW_DEFAULTS = {
  durationMs: 0,
  particlesPerEdge: 10,
  particleRadius: 1,
  speed: 0.55,
  blinkIntervalMs: 1000,
  nodeScale: 1.3529,
};
const FLOW_HIGHLIGHT_COLOR = "#ffd84a";
const FLOW_HIGHLIGHT_SHADOW = "rgba(255, 216, 74, 0.45)";
const FLOW_ENTRY_TERMINAL_ID = TERMINAL_DEVICE_IDS[0];
const FLOW_TERMINAL_DEVICES = [...TERMINAL_DEVICE_IDS];
const FLOW_GATEWAYS = ["infra-edge-gateway-left", "infra-edge-gateway-right"];
const flowNodeOriginals = new Map();
const flowEdgeOriginals = new Map();
let flowActiveNodeIds = [];
let flowActiveEdgeIds = [];
let flowClearTimer = null;
let flowBlinkTimer = null;

function resolveNodeId(targetId, nodes) {
  if (!targetId || !nodes) return null;
  if (nodes.get(targetId)) return targetId;
  const agent = window.agentDatabase?.find(
    (item) =>
      item.id === targetId ||
      item.name === targetId ||
      item.displayName === targetId ||
      item.nodeLabel === targetId
  );
  if (agent && nodes.get(agent.id)) return agent.id;
  const matches = nodes.get({ filter: (node) => node.label === targetId });
  return matches.length ? matches[0].id : null;
}

function findEdgeBetween(edgeSet, fromId, toId) {
  if (!edgeSet || !fromId || !toId) return null;
  const matches = edgeSet.get({
    filter: (edge) =>
      (edge.from === fromId && edge.to === toId) ||
      (edge.from === toId && edge.to === fromId),
  });
  return matches.length ? matches[0] : null;
}

function ensureExtensionNodeVisible(nodeId, nodes, edges) {
  if (!nodeId || !nodes || !edges) return false;
  const node = nodes.get(nodeId);
  if (!node || !node.extensionFor || !node.hidden) return false;
  return toggleExtensionGroup(nodes, edges, node.extensionFor, true);
}

function buildAdjacency(edgeSet, nodes) {
  const adjacency = new Map();
  if (!edgeSet || !nodes) return adjacency;
  edgeSet.forEach((edge) => {
    if (!nodes.get(edge.from) || !nodes.get(edge.to)) return;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set());
    adjacency.get(edge.from).add(edge.to);
    adjacency.get(edge.to).add(edge.from);
  });
  return adjacency;
}

function findPathBfs(adjacency, startId, endId) {
  if (!adjacency || !startId || !endId) return null;
  if (startId === endId) return [startId];
  const queue = [startId];
  const visited = new Set([startId]);
  const prev = new Map();
  while (queue.length) {
    const current = queue.shift();
    const neighbors = adjacency.get(current);
    if (!neighbors) continue;
    for (const next of neighbors) {
      if (visited.has(next)) continue;
      visited.add(next);
      prev.set(next, current);
      if (next === endId) {
        queue.length = 0;
        break;
      }
      queue.push(next);
    }
  }
  if (!visited.has(endId)) return null;
  const path = [endId];
  let cursor = endId;
  while (prev.has(cursor)) {
    cursor = prev.get(cursor);
    path.push(cursor);
  }
  return path.reverse();
}

function pickGatewayForTarget(targetId, edgeSet, nodes) {
  const candidates = FLOW_GATEWAYS.filter((id) => nodes.get(id));
  for (const gatewayId of candidates) {
    if (findEdgeBetween(edgeSet, gatewayId, targetId)) return gatewayId;
  }
  return candidates[0] || null;
}

function pickDeviceForGateway(gatewayId, edgeSet, nodes) {
  const candidates = FLOW_TERMINAL_DEVICES.filter((id) => nodes.get(id));
  if (!gatewayId) return candidates[0] || null;
  for (const deviceId of candidates) {
    if (findEdgeBetween(edgeSet, deviceId, gatewayId)) return deviceId;
  }
  return candidates[0] || null;
}

function buildPreferredFlowPath(targetId, edgeSet, nodes) {
  if (!nodes.get(FLOW_ENTRY_TERMINAL_ID) || !nodes.get(targetId)) return null;
  const adjacency = buildAdjacency(edgeSet, nodes);
  if (!adjacency.size) return null;
  if (targetId === FLOW_ENTRY_TERMINAL_ID) return [FLOW_ENTRY_TERMINAL_ID];
  const gatewayId = pickGatewayForTarget(targetId, edgeSet, nodes);
  const deviceId = pickDeviceForGateway(gatewayId, edgeSet, nodes);
  const waypoints = [FLOW_ENTRY_TERMINAL_ID];
  if (deviceId && deviceId !== FLOW_ENTRY_TERMINAL_ID) waypoints.push(deviceId);
  if (gatewayId) waypoints.push(gatewayId);
  if (targetId !== gatewayId) waypoints.push(targetId);
  let path = [];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const segment = findPathBfs(adjacency, waypoints[i], waypoints[i + 1]);
    if (!segment) {
      return findPathBfs(adjacency, FLOW_ENTRY_TERMINAL_ID, targetId);
    }
    if (path.length) segment.shift();
    path = path.concat(segment);
  }
  return path.length ? path : null;
}

function buildFlowSegments(nodePath, edgeSet, options = {}) {
  if (!nodePath || nodePath.length < 2) return null;
  const segments = [];
  const edgeIds = [];
  const particlesPerEdge = Number.isFinite(options.particlesPerEdge)
    ? options.particlesPerEdge
    : FLOW_DEFAULTS.particlesPerEdge;
  for (let i = 0; i < nodePath.length - 1; i += 1) {
    const fromId = nodePath[i];
    const toId = nodePath[i + 1];
    const edge = findEdgeBetween(edgeSet, fromId, toId);
    if (!edge) return null;
    const tOffsets = [];
    for (let j = 0; j < particlesPerEdge; j += 1) {
      tOffsets.push(j / particlesPerEdge);
    }
    segments.push({
      fromId,
      toId,
      edgeId: edge.id,
      color: edge.color?.color || window.LINK_COLORS.primary,
      width: edge.width || 2,
      dashes: edge.dashes,
      smooth: edge.smooth,
      tOffsets,
    });
    edgeIds.push(edge.id);
  }
  return { segments, edgeIds };
}

function setFlowActiveEdges(edgeSet, edgeIds, active) {
  if (!edgeSet || !edgeIds || !edgeIds.length) return;
  const updates = [];
  edgeIds.forEach((edgeId) => {
    const edge = edgeSet.get(edgeId);
    if (!edge) return;
    if (active) {
      if (!flowEdgeOriginals.has(edgeId)) {
        flowEdgeOriginals.set(edgeId, {
          color: edge.color ? { ...edge.color } : edge.color,
          width: edge.width,
          dashes: edge.dashes,
          shadow: edge.shadow,
        });
      }
      updates.push({
        id: edgeId,
        flowActive: true,
        color: { color: window.LINK_COLORS.highlight, highlight: window.LINK_COLORS.highlight },
        width: Math.max(3.2, (edge.width || 2) + 1.4),
        dashes: edge.dashes || [10, 6],
        shadow: { enabled: true, color: "rgba(255, 215, 0, 0.5)", size: 10, x: 0, y: 0 },
      });
      return;
    }
    const original = flowEdgeOriginals.get(edgeId);
    updates.push({
      id: edgeId,
      flowActive: false,
      color: original?.color || edge.color,
      width: original?.width ?? edge.width,
      dashes: original?.dashes ?? edge.dashes,
      shadow: original?.shadow ?? edge.shadow,
    });
    flowEdgeOriginals.delete(edgeId);
  });
  if (updates.length) edgeSet.update(updates);
}

function cloneNodeColor(color) {
  if (!color || typeof color !== "object") return color;
  return {
    ...color,
    highlight: color.highlight ? { ...color.highlight } : color.highlight,
  };
}

function cloneNodeShadow(shadow) {
  if (!shadow || typeof shadow !== "object") return shadow;
  return { ...shadow };
}

const pinnedNodeIds = new Set();
const pinnedNodeOriginals = new Map();
const pinnedEdgeIds = new Set();
const pinnedEdgeOriginals = new Map();
let pinnedEdgeBlinkTimer = null;
let pinnedEdgeBlinkOn = true;

function getPinnedNodeLayer(nodeId, node) {
  const agent = window.agentDatabase?.find(
    (item) => item.id === nodeId || item.name === nodeId || item.displayName === nodeId
  );
  return agent?.layer || node?.layer || "edge";
}

function cachePinnedNodeState(nodeId, node) {
  if (pinnedNodeOriginals.has(nodeId)) return;
  pinnedNodeOriginals.set(nodeId, {
    size: node.size,
    color: cloneNodeColor(node.color),
    borderWidth: node.borderWidth,
    shadow: cloneNodeShadow(node.shadow),
    font: node.font ? { ...node.font } : node.font,
  });
}

function cachePinnedEdgeState(edge) {
  if (pinnedEdgeOriginals.has(edge.id)) return;
  pinnedEdgeOriginals.set(edge.id, {
    color: edge.color ? { ...edge.color } : edge.color,
    width: edge.width,
    dashes: edge.dashes,
    shadow: edge.shadow,
  });
}

function buildPinnedEdgeUpdate(edge, base) {
  const width = Number(base?.width ?? edge.width) || 2;
  return {
    id: edge.id,
    color: { color: "#FFD700", highlight: "#FFD700" },
    width: Math.max(3.4, width + 1.6),
    dashes: base?.dashes ?? edge.dashes,
    shadow: { enabled: true, color: "rgba(255, 215, 0, 0.45)", size: 8, x: 0, y: 0 },
  };
}

function updatePinnedEdgeBlinkState(active) {
  const graph = window.networkGraph;
  if (!graph || !graph.edges) return;
  const updates = [];
  pinnedEdgeIds.forEach((edgeId) => {
    const edge = graph.edges.get(edgeId);
    if (!edge) return;
    const base = pinnedEdgeOriginals.get(edgeId) || {
      color: edge.color,
      width: edge.width,
      dashes: edge.dashes,
      shadow: edge.shadow,
    };
    if (active) {
      updates.push(buildPinnedEdgeUpdate(edge, base));
    } else {
      updates.push({
        id: edge.id,
        color: base.color,
        width: base.width,
        dashes: base.dashes,
        shadow: base.shadow,
      });
    }
  });
  if (updates.length) graph.edges.update(updates);
}

function stopPinnedEdgeBlink() {
  if (!pinnedEdgeBlinkTimer) return;
  window.clearInterval(pinnedEdgeBlinkTimer);
  pinnedEdgeBlinkTimer = null;
  pinnedEdgeBlinkOn = true;
}

function startPinnedEdgeBlink(intervalMs) {
  const blinkInterval = Number.isFinite(intervalMs) ? intervalMs : FLOW_DEFAULTS.blinkIntervalMs;
  if (!pinnedEdgeIds.size || blinkInterval <= 0) return;
  if (pinnedEdgeBlinkTimer) return;
  pinnedEdgeBlinkOn = true;
  updatePinnedEdgeBlinkState(true);
  pinnedEdgeBlinkTimer = window.setInterval(() => {
    pinnedEdgeBlinkOn = !pinnedEdgeBlinkOn;
    updatePinnedEdgeBlinkState(pinnedEdgeBlinkOn);
  }, blinkInterval);
}

function buildPinnedNodeUpdate(nodeId, node) {
  const layer = getPinnedNodeLayer(nodeId, node);
  const baseStyle = getNodeStyleForLayer(layer);
  const highlightSize = Math.max(baseStyle.size * 1.8, baseStyle.size + 10);
  const background = node?.color?.background || "#1d3f8f";
  return {
    id: nodeId,
    size: highlightSize,
    borderWidth: baseStyle.borderWidth + 2.2,
    color: {
      background,
      border: "#FFD700",
      highlight: { background, border: "#000" },
    },
    shadow: { enabled: true, color: "rgba(255, 215, 0, 0.65)", size: 16, x: 0, y: 4 },
  };
}

function syncPinnedSelection() {
  if (!window.networkInstance) return;
  const pinned = Array.from(pinnedNodeIds);
  if (pinned.length) {
    window.networkInstance.selectNodes(pinned, false);
  } else {
    window.networkInstance.unselectAll();
  }
  window.networkInstance.redraw();
}

function applyPinnedNodeStyle(nodeId, nodes) {
  if (!nodes) return;
  const node = nodes.get(nodeId);
  if (!node) return;
  cachePinnedNodeState(nodeId, node);
  pinnedNodeIds.add(nodeId);
  nodes.update(buildPinnedNodeUpdate(nodeId, node));
}

function applyPinnedEdgeStylesForNode(nodeId, edges, nodes) {
  if (!edges || !nodes) return;
  const preferredPath = buildPreferredFlowPath(nodeId, edges, nodes);
  let edgeIds = [];
  if (preferredPath && preferredPath.length > 1) {
    const segments = buildFlowSegments(preferredPath, edges, {});
    if (segments?.edgeIds?.length) {
      edgeIds = segments.edgeIds;
    }
  }
  if (!edgeIds.length) {
    const connected = edges.get({ filter: (edge) => edge.from === nodeId || edge.to === nodeId });
    edgeIds = connected.map((edge) => edge.id);
  }

  const updates = [];
  edgeIds.forEach((edgeId) => {
    const edge = edges.get(edgeId);
    if (!edge) return;
    cachePinnedEdgeState(edge);
    pinnedEdgeIds.add(edge.id);
    const base = pinnedEdgeOriginals.get(edge.id);
    updates.push(buildPinnedEdgeUpdate(edge, base));
  });
  if (updates.length) edges.update(updates);
  if (pinnedEdgeIds.size) startPinnedEdgeBlink(FLOW_DEFAULTS.blinkIntervalMs);
}

function reapplyPinnedEdgeStyles() {
  const graph = window.networkGraph;
  if (!graph || !graph.edges) return;
  const updates = [];
  pinnedEdgeIds.forEach((edgeId) => {
    const edge = graph.edges.get(edgeId);
    if (!edge) return;
    const base = pinnedEdgeOriginals.get(edgeId);
    updates.push(buildPinnedEdgeUpdate(edge, base));
  });
  if (updates.length) graph.edges.update(updates);
}

function reapplyPinnedNodeStyles() {
  const graph = window.networkGraph;
  if (!graph || !graph.nodes) return;
  pinnedNodeIds.forEach((nodeId) => {
    const node = graph.nodes.get(nodeId);
    if (!node) return;
    graph.nodes.update(buildPinnedNodeUpdate(nodeId, node));
  });
  syncPinnedSelection();
}

function pinTopologyAgent(targetId) {
  const graph = window.networkGraph;
  if (!graph || !graph.nodes || !graph.edges) return;
  const resolvedId = resolveNodeId(targetId, graph.nodes);
  if (!resolvedId) return;
  ensureExtensionNodeVisible(resolvedId, graph.nodes, graph.edges);
  applyPinnedNodeStyle(resolvedId, graph.nodes);
  applyPinnedEdgeStylesForNode(resolvedId, graph.edges, graph.nodes);
  syncPinnedSelection();
}

function pinTopologyAgents(targetIds) {
  if (!Array.isArray(targetIds)) {
    pinTopologyAgent(targetIds);
    return;
  }
  targetIds.forEach((id) => pinTopologyAgent(id));
}

function clearPinnedTopologyAgents() {
  const graph = window.networkGraph;
  if (!graph || !graph.nodes || !graph.edges) return;
  pinnedNodeIds.forEach((nodeId) => {
    const base = pinnedNodeOriginals.get(nodeId);
    if (!base || !graph.nodes.get(nodeId)) return;
    graph.nodes.update({
      id: nodeId,
      size: base.size,
      color: base.color,
      borderWidth: base.borderWidth,
      shadow: base.shadow,
      font: base.font,
    });
  });
  pinnedNodeIds.clear();
  pinnedNodeOriginals.clear();
  pinnedEdgeIds.forEach((edgeId) => {
    const base = pinnedEdgeOriginals.get(edgeId);
    if (!base || !graph.edges.get(edgeId)) return;
    graph.edges.update({
      id: edgeId,
      color: base.color,
      width: base.width,
      dashes: base.dashes,
      shadow: base.shadow,
    });
  });
  pinnedEdgeIds.clear();
  pinnedEdgeOriginals.clear();
  stopPinnedEdgeBlink();
  syncPinnedSelection();
}

function isHighlightStyle(node) {
  const border = node?.color?.border;
  if (!border || typeof border !== "string") return false;
  if (node?.id && pinnedNodeIds.has(node.id)) return false;
  return border.toLowerCase() === "#ffd700";
}

function saveFlowNodeState(nodeIds, nodes) {
  if (!nodes || !nodeIds || !nodeIds.length) return;
  nodeIds.forEach((nodeId) => {
    if (flowNodeOriginals.has(nodeId)) return;
    const node = nodes.get(nodeId);
    if (!node) return;
    const baseState = {
      size: node.size,
      color: cloneNodeColor(node.color),
      borderWidth: node.borderWidth,
      shadow: cloneNodeShadow(node.shadow),
      font: node.font ? { ...node.font } : node.font,
    };

    if (isHighlightStyle(node)) {
      const agent = window.agentDatabase?.find((item) => item.id === nodeId);
      if (agent) {
        const layer = agent.layer || "edge";
        const style = getNodeStyleForLayer(layer);
        baseState.size = style.size;
        baseState.borderWidth = style.borderWidth;
        baseState.shadow = {
          enabled: true,
          color: style.shadowColor,
          size: style.shadowSize,
          x: 0,
          y: 4,
        };
        baseState.color = {
          background: "#1d3f8f",
          border: style.borderColor,
          highlight: { background: "#3a5fb7", border: "#000" },
        };
      }
    }

    flowNodeOriginals.set(nodeId, baseState);
  });
}

function setNodeFlowActive(nodes, nodeId, active) {
  if (!nodes) return;
  const base = flowNodeOriginals.get(nodeId);
  if (!base) return;
  if (!nodes.get(nodeId)) return;
  if (active) {
    const baseSize = Number.isFinite(base.size) ? base.size : 20;
    const nextSize = Math.max(baseSize * FLOW_DEFAULTS.nodeScale, baseSize + 6);
    const baseColor = cloneNodeColor(base.color);
    let activeColor = baseColor;
    if (!activeColor || typeof activeColor !== "object") {
      const fallback = typeof baseColor === "string" ? baseColor : "#1d3f8f";
      activeColor = {
        background: fallback,
        border: FLOW_HIGHLIGHT_COLOR,
        highlight: { background: fallback, border: "#000" },
      };
    } else {
      const highlight = activeColor.highlight && typeof activeColor.highlight === "object"
        ? { ...activeColor.highlight }
        : { background: activeColor.background, border: "#000" };
      activeColor = {
        ...activeColor,
        border: FLOW_HIGHLIGHT_COLOR,
        highlight: { ...highlight, border: "#000" },
      };
    }

    nodes.update({
      id: nodeId,
      size: nextSize,
      borderWidth: Math.max(1.4, Number(base.borderWidth) || 1.8) + 1.2,
      color: activeColor,
      shadow: {
        enabled: true,
        color: FLOW_HIGHLIGHT_SHADOW,
        size: Math.max(10, Number(base.shadow?.size) || 6) + 4,
        x: 0,
        y: 4,
      },
    });
    return;
  }

  nodes.update({
    id: nodeId,
    size: base.size,
    color: base.color,
    borderWidth: base.borderWidth,
    shadow: base.shadow,
    font: base.font,
  });
}

function stopFlowBlink() {
  if (flowBlinkTimer) {
    window.clearInterval(flowBlinkTimer);
    flowBlinkTimer = null;
  }
}

function startFlowBlink(nodes, edgeSet, nodeIds, edgeIds, intervalMs) {
  if (!nodes || !edgeSet || !nodeIds || !edgeIds) return;
  stopFlowBlink();

  let on = true;
  nodeIds.forEach((nodeId) => setNodeFlowActive(nodes, nodeId, on));
  setFlowActiveEdges(edgeSet, edgeIds, on);

  const blinkInterval = Number.isFinite(intervalMs) ? intervalMs : FLOW_DEFAULTS.blinkIntervalMs;
  if (blinkInterval <= 0) return;
  flowBlinkTimer = window.setInterval(() => {
    on = !on;
    nodeIds.forEach((nodeId) => setNodeFlowActive(nodes, nodeId, on));
    setFlowActiveEdges(edgeSet, edgeIds, on);
  }, blinkInterval);
}

function restoreFlowNodes(nodes, nodeIds) {
  if (!nodes || !nodeIds || !nodeIds.length) return;
  nodeIds.forEach((nodeId) => setNodeFlowActive(nodes, nodeId, false));
  flowNodeOriginals.clear();
}

function clearFlowState() {
  const graph = window.networkGraph;
  if (!graph) return;
  if (flowClearTimer) {
    window.clearTimeout(flowClearTimer);
    flowClearTimer = null;
  }
  stopFlowBlink();
  if (flowActiveNodeIds.length) {
    restoreFlowNodes(graph.nodes, flowActiveNodeIds);
    flowActiveNodeIds = [];
  }
  if (flowActiveEdgeIds.length) {
    setFlowActiveEdges(graph.edges, flowActiveEdgeIds, false);
    flowActiveEdgeIds = [];
  }
  if (window.edgeDotFlow) {
    window.edgeDotFlow.activeSegments = null;
    window.edgeDotFlow.activeUntil = 0;
    window.edgeDotFlow.lastTs = 0;
    if (window.edgeDotFlow.raf) {
      window.cancelAnimationFrame(window.edgeDotFlow.raf);
      window.edgeDotFlow.raf = 0;
    }
  }
  if (pinnedNodeIds.size) {
    reapplyPinnedNodeStyles();
  }
  if (pinnedEdgeIds.size) {
    reapplyPinnedEdgeStyles();
  }
}

function triggerTopologyFlow(targetId, options = {}) {
  const graph = window.networkGraph;
  if (!graph || !window.networkInstance) return;
  const nodes = graph.nodes;
  const edges = graph.edges;
  const resolvedTarget = resolveNodeId(targetId, nodes);
  if (!resolvedTarget) return;

  const nodePath = options.nodePath
    ? options.nodePath.map((id) => resolveNodeId(id, nodes)).filter(Boolean)
    : buildPreferredFlowPath(resolvedTarget, edges, nodes);
  if (!nodePath || nodePath.length < 2) return;

  const flowSegments = buildFlowSegments(nodePath, edges, options);
  if (!flowSegments) return;

  clearFlowState();
  flowActiveNodeIds = nodePath;
  saveFlowNodeState(flowActiveNodeIds, nodes);
  flowActiveEdgeIds = flowSegments.edgeIds;

  const blinkIntervalMs = Number.isFinite(options.blinkIntervalMs)
    ? options.blinkIntervalMs
    : FLOW_DEFAULTS.blinkIntervalMs;
  startFlowBlink(nodes, edges, flowActiveNodeIds, flowActiveEdgeIds, blinkIntervalMs);

  if (!window.edgeDotFlow) {
    const container = document.getElementById("networkGraph");
    if (container) startEdgeDotFlow(window.networkInstance, edges, container);
  }

  const durationMs = Number.isFinite(options.durationMs) ? options.durationMs : FLOW_DEFAULTS.durationMs;
  const hasDuration = Number.isFinite(durationMs) && durationMs > 0;
  if (window.edgeDotFlow) {
    window.edgeDotFlow.activeSegments = flowSegments.segments;
    window.edgeDotFlow.activeUntil = hasDuration ? Date.now() + durationMs : 0;
    window.edgeDotFlow.flowSpeed = Number.isFinite(options.speed) ? options.speed : FLOW_DEFAULTS.speed;
    window.edgeDotFlow.particleRadius = Number.isFinite(options.particleRadius)
      ? options.particleRadius
      : FLOW_DEFAULTS.particleRadius;
    window.edgeDotFlow.lastTs = 0;
    window.edgeDotFlow.onExpire = clearFlowState;
    if (typeof window.edgeDotFlow.start === "function") {
      window.edgeDotFlow.start();
    }
    if (window.networkInstance) {
      window.networkInstance.redraw();
    }
  }

  if (hasDuration) {
    flowClearTimer = window.setTimeout(clearFlowState, durationMs);
  }
}

function triggerTopologyFlows(targetIds, options = {}) {
  if (!Array.isArray(targetIds)) {
    triggerTopologyFlow(targetIds, options);
    return;
  }

  const graph = window.networkGraph;
  if (!graph || !window.networkInstance) return;
  const nodes = graph.nodes;
  const edges = graph.edges;

  const resolvedTargets = targetIds
    .map((id) => resolveNodeId(id, nodes))
    .filter(Boolean);
  const uniqueTargets = Array.from(new Set(resolvedTargets));
  if (!uniqueTargets.length) return;

  const nodeIdSet = new Set();
  const edgeIdSet = new Set();
  const segmentMap = new Map();

  uniqueTargets.forEach((targetId) => {
    const nodePath = options.nodePath
      ? options.nodePath.map((id) => resolveNodeId(id, nodes)).filter(Boolean)
      : buildPreferredFlowPath(targetId, edges, nodes);
    if (!nodePath || nodePath.length < 2) return;

    nodePath.forEach((id) => nodeIdSet.add(id));

    const flowSegments = buildFlowSegments(nodePath, edges, options);
    if (!flowSegments) return;

    flowSegments.edgeIds.forEach((edgeId) => edgeIdSet.add(edgeId));
    flowSegments.segments.forEach((segment) => {
      if (!segmentMap.has(segment.edgeId)) {
        segmentMap.set(segment.edgeId, segment);
      }
    });
  });

  const segments = Array.from(segmentMap.values());
  if (!segments.length || !edgeIdSet.size) return;

  clearFlowState();
  flowActiveNodeIds = Array.from(nodeIdSet);
  saveFlowNodeState(flowActiveNodeIds, nodes);
  flowActiveEdgeIds = Array.from(edgeIdSet);

  const blinkIntervalMs = Number.isFinite(options.blinkIntervalMs)
    ? options.blinkIntervalMs
    : FLOW_DEFAULTS.blinkIntervalMs;
  startFlowBlink(nodes, edges, flowActiveNodeIds, flowActiveEdgeIds, blinkIntervalMs);

  if (!window.edgeDotFlow) {
    const container = document.getElementById("networkGraph");
    if (container) startEdgeDotFlow(window.networkInstance, edges, container);
  }

  const durationMs = Number.isFinite(options.durationMs) ? options.durationMs : FLOW_DEFAULTS.durationMs;
  const hasDuration = Number.isFinite(durationMs) && durationMs > 0;
  if (window.edgeDotFlow) {
    window.edgeDotFlow.activeSegments = segments;
    window.edgeDotFlow.activeUntil = hasDuration ? Date.now() + durationMs : 0;
    window.edgeDotFlow.flowSpeed = Number.isFinite(options.speed) ? options.speed : FLOW_DEFAULTS.speed;
    window.edgeDotFlow.particleRadius = Number.isFinite(options.particleRadius)
      ? options.particleRadius
      : FLOW_DEFAULTS.particleRadius;
    window.edgeDotFlow.lastTs = 0;
    window.edgeDotFlow.onExpire = clearFlowState;
    if (typeof window.edgeDotFlow.start === "function") {
      window.edgeDotFlow.start();
    }
    if (window.networkInstance) {
      window.networkInstance.redraw();
    }
  }

  if (hasDuration) {
    flowClearTimer = window.setTimeout(clearFlowState, durationMs);
  }
}

function startEdgeDotFlow(network) {
  if (!network) return;
  const previous = window.edgeDotFlow;
  if (previous?.raf) {
    window.cancelAnimationFrame(previous.raf);
  }
  if (previous?.afterDrawingHandler) {
    network.off("afterDrawing", previous.afterDrawingHandler);
  }

  const state = {
    raf: 0,
    activeSegments: null,
    activeUntil: 0,
    lastTs: 0,
    flowSpeed: FLOW_DEFAULTS.speed,
    particleRadius: FLOW_DEFAULTS.particleRadius,
    onExpire: null,
    afterDrawingHandler: null,
    start: null,
  };
  window.edgeDotFlow = state;

  const getQuadraticControlPoint = (start, end, smooth) => {
    if (!smooth || smooth === false) return null;
    const roundness = typeof smooth.roundness === "number" ? smooth.roundness : 0.2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy) || 1;
    const nx = -dy / distance;
    const ny = dx / distance;
    const direction = smooth.type === "curvedCCW" ? 1 : -1;
    const offset = distance * roundness * direction;
    return {
      x: (start.x + end.x) / 2 + nx * offset,
      y: (start.y + end.y) / 2 + ny * offset,
    };
  };

  const getPointAlongEdge = (start, end, smooth, t) => {
    const control = getQuadraticControlPoint(start, end, smooth);
    if (!control) {
      return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      };
    }
    const inv = 1 - t;
    return {
      x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
      y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y,
    };
  };

  const drawParticles = (ctx) => {
    if (!state.activeSegments || !state.activeSegments.length) return;
    const now = Date.now();
    if (state.activeUntil && now >= state.activeUntil) {
      if (typeof state.onExpire === "function") state.onExpire();
      return;
    }
    const ts = typeof performance !== "undefined" && performance.now ? performance.now() : now;
    ctx.save();

    state.activeSegments.forEach((segment) => {
      const positions = network.getPositions([segment.fromId, segment.toId]);
      const start = positions[segment.fromId];
      const end = positions[segment.toId];
      if (!start || !end) return;

      const dotRadius = Math.max(2, state.particleRadius || FLOW_DEFAULTS.particleRadius);
      const color = segment.color || window.LINK_COLORS.primary;
      const offsets = segment.tOffsets || [];
      for (let i = 0; i < offsets.length; i += 1) {
        const t = offsets[i];
        const pt = getPointAlongEdge(start, end, segment.smooth, t);
        const pulse = 0.6 + 0.4 * Math.sin(ts / 140 + i);
        ctx.fillStyle = color;
        ctx.globalAlpha = pulse;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(2, dotRadius + pulse), 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  };

  const afterDrawingHandler = (ctx) => {
    drawParticles(ctx);
  };
  state.afterDrawingHandler = afterDrawingHandler;
  network.on("afterDrawing", afterDrawingHandler);

  const tick = (ts) => {
    if (!state.activeSegments || !state.activeSegments.length) {
      state.raf = 0;
      return;
    }

    const now = Date.now();
    if (state.activeUntil && now >= state.activeUntil) {
      if (typeof state.onExpire === "function") state.onExpire();
      state.activeSegments = null;
      state.activeUntil = 0;
      state.lastTs = 0;
      state.raf = 0;
      return;
    }

    const dt = state.lastTs ? Math.min(0.05, (ts - state.lastTs) / 1000) : 0;
    state.lastTs = ts;
    const delta = (state.flowSpeed || FLOW_DEFAULTS.speed) * dt;

    state.activeSegments.forEach((segment) => {
      const offsets = segment.tOffsets || [];
      for (let i = 0; i < offsets.length; i += 1) {
        let t = offsets[i] + delta;
        if (t >= 1) t -= 1;
        offsets[i] = t;
      }
    });

    network.redraw();
    state.raf = window.requestAnimationFrame(tick);
  };

  state.start = () => {
    if (state.raf) return;
    state.raf = window.requestAnimationFrame(tick);
  };
}


function highlightNodeInNetwork(nodeId) {
  if (!window.networkInstance) return;
  if (!window.networkGraph || !window.networkGraph.nodes) return;
  if (window.networkGraph.edges) {
    ensureExtensionNodeVisible(nodeId, window.networkGraph.nodes, window.networkGraph.edges);
  }
  if (pinnedNodeIds.has(nodeId)) {
    applyPinnedNodeStyle(nodeId, window.networkGraph.nodes);
    if (window.networkGraph.edges) {
      applyPinnedEdgeStylesForNode(nodeId, window.networkGraph.edges, window.networkGraph.nodes);
    }
    syncPinnedSelection();
    return;
  }

  const agent = window.agentDatabase.find((a) => a.id === nodeId);
  if (!agent) return;
  
  const layer = agent.layer || "edge";
  const baseStyle = getNodeStyleForLayer(layer);
  const highlightSize = Math.max(baseStyle.size * 1.6, baseStyle.size + 8);
  
  const currentNode = window.networkGraph.nodes.get(nodeId);
  if (!currentNode || !currentNode.color) return;

  window.networkGraph.nodes.update({
    id: nodeId,
    size: highlightSize,
    color: {
      background: currentNode.color.background,
      border: "#FFD700",
      highlight: { background: currentNode.color.background, border: "#000" },
    },
    borderWidth: baseStyle.borderWidth + 1.8,
    shadow: { enabled: true, color: "rgba(255, 215, 0, 0.5)", size: 12, x: 5, y: 5 },
  });
  
  const edges = window.networkGraph.edges.get({
    filter: (edge) => edge.from === nodeId || edge.to === nodeId,
  });
  
  edges.forEach((edge) => {
    window.networkGraph.edges.update({ id: edge.id, width: 4, color: { color: "#FFD700", highlight: "#FFD700" } });
  });
  
  setTimeout(() => {
    window.networkGraph.nodes.update({
      id: nodeId,
      size: baseStyle.size,
      color: {
        background: "#1d3f8f",
        border: baseStyle.borderColor,
        highlight: { background: "#3a5fb7", border: "#000" },
      },
      borderWidth: baseStyle.borderWidth,
      shadow: { enabled: true, color: baseStyle.shadowColor, size: baseStyle.shadowSize, x: 0, y: 4 },
    });
  
    edges.forEach((edge) => {
      const originalEdge = window.networkGraph.edges.get(edge.id);
      window.networkGraph.edges.update({
        id: edge.id,
        width: originalEdge.width || 2,
        color: { color: originalEdge.color.color || "#bbb", highlight: originalEdge.color.highlight || "#1a73e8" },
      });
    });
  }, 3000);
}
  
