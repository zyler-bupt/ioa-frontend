/**
 * topology/edges.js
 * Edge building and dashed edge animation.
 */

// ====== edges ======
function getSmoothStyle(index, roundness) {
  return { type: index % 2 === 0 ? "curvedCW" : "curvedCCW", roundness };
}

const EDGE_LATENCY_MIN = 8;
const EDGE_LATENCY_MAX = 120;

function getEdgeLatencyKey(from, to) {
  return from < to ? `${from}|${to}` : `${to}|${from}`;
}

function getEdgeLatency(from, to) {
  if (!window.edgeLatencyMap) {
    window.edgeLatencyMap = new Map();
  }
  const key = getEdgeLatencyKey(from, to);
  if (!window.edgeLatencyMap.has(key)) {
    const value =
      EDGE_LATENCY_MIN +
      Math.round(Math.random() * (EDGE_LATENCY_MAX - EDGE_LATENCY_MIN));
    window.edgeLatencyMap.set(key, value);
  }
  return window.edgeLatencyMap.get(key);
}

function getEdgeTitle(from, to) {
  const latency = getEdgeLatency(from, to);
  return `延迟: ${latency}ms`;
}

function toAlphaColor(color, alpha) {
  if (typeof color !== "string") return color;
  const normalized = color.trim();
  if (normalized.startsWith("rgba(") || normalized.startsWith("rgb(")) return normalized;
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return normalized;
  const fullHex = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeEdgeColor(color, highlight) {
  if (color && typeof color === "object") {
    return {
      color: color.color || window.LINK_COLORS.primary,
      highlight: color.highlight || highlight || window.LINK_COLORS.highlight,
    };
  }
  return {
    color: color || window.LINK_COLORS.primary,
    highlight: highlight || window.LINK_COLORS.highlight,
  };
}

function getNodePoint(nodes, nodeId) {
  if (!nodes || !nodeId) return null;
  const node = nodes.get(nodeId);
  if (!node || typeof node.x !== "number" || typeof node.y !== "number") return null;
  return { x: node.x, y: node.y };
}

function getNearestGatewayIdForDevice(deviceId, gatewayIds, nodes) {
  if (!gatewayIds || !gatewayIds.length) return null;
  const devicePoint = getNodePoint(nodes, deviceId);
  if (!devicePoint) return gatewayIds[0];

  let nearestId = gatewayIds[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  gatewayIds.forEach((gatewayId) => {
    const gatewayPoint = getNodePoint(nodes, gatewayId);
    if (!gatewayPoint) return;
    const dx = devicePoint.x - gatewayPoint.x;
    const dy = devicePoint.y - gatewayPoint.y;
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestId = gatewayId;
    }
  });
  return nearestId;
}
  
function buildTopologyEdges(edgeSet, nodes) {
  edgeSet.clear();

  const baseAgents = window.agentDatabase.filter((agent) => !agent.isExtension);
  const edgeAgents = baseAgents.filter((a) => a.layer === "edge");
  const edgeColorBase = window.IN_LAYER_COLOR || "#f2a14b";
  const styles = {
    backbone: {
      width: 2.4,
      dashes: [6, 6],
      edgeColor: toAlphaColor(edgeColorBase, 0.9),
      cloudColor: toAlphaColor("#3b82f6", 0.9),
    },
    secondary: {
      width: 1.5,
      dashes: [4, 8],
      edgeColor: toAlphaColor(edgeColorBase, 0.42),
    },
    access: {
      width: 1.9,
      dashes: [6, 6],
      color: toAlphaColor("#22c55e", 0.72),
    },
    extension: {
      width: 1.6,
      dashes: [4, 6],
      color: toAlphaColor(edgeColorBase, 0.62),
    },
  };
  
  const addEdge = (from, to, options) => {
    edgeSet.add({
      from,
      to,
      color: normalizeEdgeColor(options.color, options.highlightColor),
      width: options.width,
      dashes: options.dashes,
      smooth: options.smooth,
      title: getEdgeTitle(from, to),
    });
  };
  
  if (edgeAgents.length === 4) {
    const [topLeft, bottomLeft, topRight, bottomRight] = edgeAgents;
    const backbonePairs = [
      [topLeft, topRight],
      [bottomLeft, bottomRight],
    ];
    const secondaryPairs = [
      [topLeft, bottomLeft],
      [topRight, bottomRight],
    ];

    backbonePairs.forEach(([from, to]) => {
      addEdge(from.id, to.id, {
        color: styles.backbone.edgeColor,
        width: styles.backbone.width,
        dashes: styles.backbone.dashes,
        smooth: false,
      });
    });

    secondaryPairs.forEach(([from, to]) => {
      addEdge(from.id, to.id, {
        color: styles.secondary.edgeColor,
        width: styles.secondary.width,
        dashes: styles.secondary.dashes,
        smooth: false,
      });
    });
  } else if (edgeAgents.length > 2) {
    edgeAgents.slice(0, -1).forEach((agent, index) => {
      addEdge(agent.id, edgeAgents[index + 1].id, {
        color: styles.backbone.edgeColor,
        width: styles.backbone.width,
        dashes: styles.backbone.dashes,
        smooth: false,
      });
    });
  } else if (edgeAgents.length > 1) {
    edgeAgents.slice(0, -1).forEach((agent, index) => {
      addEdge(agent.id, edgeAgents[index + 1].id, {
        color: styles.secondary.edgeColor,
        width: styles.secondary.width,
        dashes: styles.secondary.dashes,
        smooth: false,
      });
    });
  }

  // Terminal-to-edge direct links intentionally omitted.
  // Cloud-to-edge direct links intentionally omitted.

  if (edgeAgents.length >= 4) {
    const [topLeft, bottomLeft, topRight, bottomRight] = edgeAgents;
    [
      ["infra-edge-gateway-left", topLeft],
      ["infra-edge-gateway-left", bottomLeft],
      ["infra-edge-gateway-right", topRight],
      ["infra-edge-gateway-right", bottomRight],
    ].forEach(([gatewayId, agent], index) => {
      addEdge(gatewayId, agent.id, {
        color: styles.backbone.edgeColor,
        width: styles.backbone.width,
        dashes: styles.backbone.dashes,
        smooth: getSmoothStyle(index, 0.08),
      });
    });
  } else if (edgeAgents.length) {
    const first = edgeAgents[0];
    const last = edgeAgents[edgeAgents.length - 1];
    [
      ["infra-edge-gateway-left", first],
      ["infra-edge-gateway-right", last],
    ].forEach(([gatewayId, agent], index) => {
      addEdge(gatewayId, agent.id, {
        color: styles.backbone.edgeColor,
        width: styles.backbone.width,
        dashes: styles.backbone.dashes,
        smooth: getSmoothStyle(index, 0.08),
      });
    });
  }

  const gateways = ["infra-edge-gateway-left", "infra-edge-gateway-right"];
  const clusterLinks = gateways
    .filter((gatewayId) => !nodes || nodes.get(gatewayId))
    .map((gatewayId) => ({ from: CLOUD_CLUSTER_NODE_ID, to: gatewayId }));
  clusterLinks.forEach((link, index) => {
    addEdge(link.from, link.to, {
      color: styles.backbone.cloudColor,
      width: styles.backbone.width,
      dashes: styles.backbone.dashes,
      smooth: getSmoothStyle(index, 0.12),
    });
  });

  const edgeAgentExtensions = Object.entries(EDGE_AGENT01_MAP).map(([agentId, extensionId]) => ({
    from: agentId,
    to: extensionId,
    color: styles.extension.color,
  }));

  edgeAgentExtensions.forEach((link, index) => {
    addEdge(link.from, link.to, {
      color: link.color,
      width: styles.extension.width,
      dashes: styles.extension.dashes,
      smooth: getSmoothStyle(index, 0.08),
    });
  });

  const terminalDevices = TERMINAL_DEVICE_IDS.filter((id) => !nodes || nodes.get(id));
  const gatewayTargets = gateways.filter((id) => nodes && nodes.get(id));
  const deviceGateways = gatewayTargets.length ? gatewayTargets : gateways;
  terminalDevices.forEach((deviceId, index) => {
    const gatewayId =
      getNearestGatewayIdForDevice(deviceId, deviceGateways, nodes) ||
      deviceGateways[index % deviceGateways.length];
    if (!gatewayId) return;
    addEdge(deviceId, gatewayId, {
      color: styles.access.color,
      width: styles.access.width,
      dashes: styles.access.dashes,
      smooth: false,
    });
  });

  if (nodes) {
    appendExtensionEdges(edgeSet, nodes);
  }
}

function startEdgeFlowAnimation(edgeSet) {
  if (window.edgeFlowTimer) {
    window.clearInterval(window.edgeFlowTimer);
  }

  let offset = 0;
  window.edgeFlowTimer = window.setInterval(() => {
    offset = (offset + 1) % 1000;
    const updates = [];
    edgeSet.forEach((edge) => {
      if (!edge.dashes || !edge.flowActive) return;
      let length = 6;
      let gap = 6;
      if (Array.isArray(edge.dashes)) {
        length = Number(edge.dashes[0]) || length;
        gap = Number(edge.dashes[1]) || gap;
      } else if (edge.dashes && typeof edge.dashes === "object") {
        length = Number(edge.dashes.length) || length;
        gap = Number(edge.dashes.gap) || gap;
      }
      updates.push({
        id: edge.id,
        dashes: { enabled: true, length, gap, dashOffset: -offset },
      });
    });
    if (updates.length) {
      edgeSet.update(updates);
    }
  }, 40);
}


function appendExtensionEdges(edgeSet, nodes) {
  const extensionAgents = window.agentDatabase.filter((agent) => agent.isExtension);
  if (!extensionAgents.length) return;

  const grouped = new Map();
  extensionAgents.forEach((agent) => {
    const nodeKey = getNodeKey(agent);
    if (!nodeKey) return;
    if (!grouped.has(nodeKey)) grouped.set(nodeKey, []);
    grouped.get(nodeKey).push(agent);
  });

  grouped.forEach((agents, nodeKey) => {
    const anchorId = findAnchorNodeId(nodeKey, nodes);
    if (!anchorId) return;
    const ordered = sortExtensionAgents(agents);
      ordered.forEach((agent, index) => {
        const parentId =
          anchorId === CLOUD_CLUSTER_NODE_ID
            ? anchorId
            : index === 0
              ? anchorId
              : ordered[Math.floor((index - 1) / 2)].id;
        const edgeId = `extension-${anchorId}-${agent.id}`;
        const node = nodes.get(agent.id);
        const parentNode = nodes.get(parentId);
        const hiddenByState = !getExtensionVisibility(anchorId);
        const hidden =
          hiddenByState ||
          (node && node.hidden) ||
          (parentNode && parentNode.hidden) ||
          false;
        const payload = {
        id: edgeId,
        from: parentId,
        to: agent.id,
        color: { color: window.IN_LAYER_COLOR, highlight: window.LINK_COLORS.highlight },
        width: 1.6,
        dashes: [4, 6],
        smooth: { type: "curvedCW", roundness: 0.2 },
        title: getEdgeTitle(parentId, agent.id),
        hidden,
        extensionFor: anchorId,
      };
      if (edgeSet.get(edgeId)) {
        edgeSet.update(payload);
      } else {
        edgeSet.add(payload);
      }
    });
  });
}
  
