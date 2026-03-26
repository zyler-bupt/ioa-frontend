/**
 * topology/constants.js
 * Shared constants and state helpers for topology modules.
 */

const CLOUD_CLUSTER_NODE_ID = window.CLOUD_CLUSTER_NODE_ID || "cloud-cluster-01";
const TERMINAL_DEVICE_IDS = Array.isArray(window.TERMINAL_INFRA_IDS) && window.TERMINAL_INFRA_IDS.length
  ? window.TERMINAL_INFRA_IDS
  : [
      "infra-terminal-phone-1",
      "infra-terminal-desktop-1",
      "infra-terminal-phone-2",
      "infra-terminal-desktop-2",
      "infra-terminal-phone-3",
      "infra-terminal-desktop-3",
    ];
const EDGE_AGENT01_MAP = {
  "agent-meteorology": "edge-agent-meteorology-agent01",
  "agent-keyframe": "edge-agent-keyframe-agent01",
  "agent-map": "edge-agent-map-agent01",
  "agent-report": "edge-agent-report-agent01",
};
const EDGE_AGENT01_IDS = new Set(Object.values(EDGE_AGENT01_MAP));
const PYRAMID_LAYER_WIDTH_RATIO = { cloud: 1, edge: 1, terminal: 1 };
const extensionVisibilityByAnchor = new Map([[CLOUD_CLUSTER_NODE_ID, false]]);

function getLayerBandWidth(container, layer, metrics) {
  const bandMetrics = container ? getLayerBandMetrics(container, layer) : null;
  if (bandMetrics && bandMetrics.width > 0) return bandMetrics.width;
  const baseWidth = metrics.width - metrics.paddingX * 2;
  const ratio = PYRAMID_LAYER_WIDTH_RATIO[layer] || 1;
  return baseWidth * ratio;
}

function getLayerAvailableWidth(container, layer, metrics) {
  const bandWidth = getLayerBandWidth(container, layer, metrics);
  const innerPadding = Math.max(34, bandWidth * 0.09);
  return Math.max(120, bandWidth - innerPadding * 2);
}

function getExtensionVisibility(anchorId) {
  if (!anchorId) return false;
  if (!extensionVisibilityByAnchor.has(anchorId)) {
    extensionVisibilityByAnchor.set(anchorId, false);
  }
  return extensionVisibilityByAnchor.get(anchorId);
}

function setExtensionVisibility(anchorId, visible) {
  if (!anchorId) return;
  extensionVisibilityByAnchor.set(anchorId, !!visible);
}

function initializeStats() {
  const agents = window.agentDatabase.filter((a) => a.type === "agent");
  const setStat = (id, value) => {
    const target = document.getElementById(id);
    if (target) target.textContent = value;
  };
  setStat("totalNodes", window.agentDatabase.length);
  setStat("agentCount", agents.length);
  setStat("toolCount", 16);
}
