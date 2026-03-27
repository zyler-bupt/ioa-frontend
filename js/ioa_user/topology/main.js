/**
 * topology/main.js
 * Topology bootstrap, dynamic add, and exports.
 */

function getEdgePerspectiveScale(indexInLayer, totalAgents) {
  if (!Number.isFinite(indexInLayer) || !Number.isFinite(totalAgents) || totalAgents <= 1) return 1;
  if (totalAgents === 4) {
    return indexInLayer === 0 || indexInLayer === 2 ? 0.9 : 1.12;
  }
  const depth = indexInLayer / Math.max(1, totalAgents - 1);
  return 0.9 + depth * 0.22;
}

function getNodeVisualScale(layer, style, indexInLayer, totalAgents) {
  if (layer !== "edge") {
    return {
      size: style.size,
      borderWidth: style.borderWidth,
      fontSize: 12,
      shadowSize: style.shadowSize,
    };
  }

  const scale = getEdgePerspectiveScale(indexInLayer, totalAgents);
  const roundedSize = Math.round(style.size * scale * 10) / 10;
  return {
    size: roundedSize,
    borderWidth: Math.max(1.4, Math.round(style.borderWidth * (0.95 + (scale - 1) * 0.35) * 100) / 100),
    fontSize: Math.max(10, Math.min(13, Math.round(12 * (0.94 + (scale - 1) * 0.65)))),
    shadowSize: Math.max(4, Math.round(style.shadowSize * (0.95 + (scale - 1) * 0.5) * 100) / 100),
  };
}

function initializeNetworkGraph() {
  const container = document.getElementById("networkGraph");
  const layoutMetrics = getLayoutMetrics(container);
  const edgeAgentVisibility = {};
  EDGE_AGENT01_IDS.forEach((id) => {
    edgeAgentVisibility[id] = false;
  });
  
  const baseAgents = window.agentDatabase.filter((agent) => !agent.isExtension);

  const nodeItems = baseAgents.map((agent) => {
    const layer = agent.layer || "edge";
    const style = getNodeStyleForLayer(layer);
    const baseColor = "#1d3f8f";
    const agentImage =
      layer === "cloud"
        ? window.TOPOLOGY_ICONS.rack01
        : layer === "edge"
          ? window.TOPOLOGY_ICONS.server01
          : window.TOPOLOGY_ICONS.agent;
  
    const layerAgents = baseAgents.filter((a) => a.layer === layer);
    const indexInLayer = layerAgents.findIndex((a) => a.id === agent.id);
    const totalAgents = layerAgents.length;
  
    const position = getLayerPosition(layer, indexInLayer, totalAgents, layoutMetrics, container);
    const visualScale = getNodeVisualScale(layer, style, indexInLayer, totalAgents);
  
    const nodeLabel = agent.nodeLabel || agent.name;

    return {
      id: agent.id,
      label: nodeLabel,
      shape: "image",
      image: agentImage,
      color: {
        background: baseColor,
        border: style.borderColor,
        highlight: { background: "#3a5fb7", border: "#000" },
      },
      x: position.x,
      y: position.y,
      size: visualScale.size,
      borderWidth: visualScale.borderWidth,
      physics: false,
      font: {
        size: visualScale.fontSize,
        color: "#1d3f8f",
        align: "center",
        vadjust: 8,
        strokeWidth: 3,
        strokeColor: "rgba(247, 249, 252, 0.9)",
      },
      shadow: { enabled: true, color: style.shadowColor, size: visualScale.shadowSize, x: 0, y: 5 },
      layer,
    };
  });
  
  const edgeAgentExtensions = baseAgents
    .filter((agent) => (agent.layer || "edge") === "edge")
    .map((agent) => {
      const extensionId = EDGE_AGENT01_MAP[agent.id];
      if (!extensionId) return null;
      const layerAgents = baseAgents.filter((a) => a.layer === "edge");
      const indexInLayer = layerAgents.findIndex((a) => a.id === agent.id);
      const totalAgents = layerAgents.length;
      const position = getLayerPosition("edge", indexInLayer, totalAgents, layoutMetrics, container);
      const offsetX = Math.max(36, layoutMetrics.width * 0.06);
      const direction = position.x >= 0 ? 1 : -1;
  
      return {
        id: extensionId,
        label: agent.displayName || agent.name,
        shape: "image",
        image: window.TOPOLOGY_ICONS.agent01,
        x: position.x + direction * offsetX,
        y: position.y,
        size: 20,
        fixed: true,
        physics: false,
        selectable: false,
        hover: false,
        hidden: true,
        font: {
          size: 11,
          color: "#1d3f8f",
          align: "center",
          vadjust: 8,
          strokeWidth: 3,
          strokeColor: "rgba(247, 249, 252, 0.9)",
        },
      };
    })
    .filter(Boolean);
  
  nodeItems.push(...edgeAgentExtensions);
  
  nodeItems.push(...createInfraNodes(layoutMetrics, container));
  
  const nodes = new vis.DataSet(nodeItems);
  const edgeSet = new vis.DataSet();
  buildTopologyEdges(edgeSet, nodes);

  window.networkGraph = { nodes, edges: edgeSet };

  const toggleEdgeAgentExtension = (agentId) => {
    const extensionId = EDGE_AGENT01_MAP[agentId];
    if (!extensionId) return;
    const nextVisible = !edgeAgentVisibility[extensionId];
    edgeAgentVisibility[extensionId] = nextVisible;
    nodes.update({ id: extensionId, hidden: !nextVisible });
  };
  
  const data = { nodes, edges: edgeSet };
  const options = {
    physics: { enabled: false },
    interaction: {
      navigationButtons: false,
      keyboard: false,
      zoomView: false,
      dragView: false,
      dragNodes: true,
      hover: true,
      tooltipDelay: 200,
    },
    layout: { hierarchical: false },
    edges: { shadow: { enabled: false, color: "rgba(0, 0, 0, 0.12)", size: 6, x: 0, y: 3 } },
  };
  
  const network = new vis.Network(container, data, options);
  window.networkInstance = network;
  
  addNetworkLegend();
  alignNetworkView(network);
  applyTopologyLayout(container, nodes, network);
  toggleExtensionGroup(nodes, edgeSet, CLOUD_CLUSTER_NODE_ID, getExtensionVisibility(CLOUD_CLUSTER_NODE_ID));
  observeTopologyLayout(container, network);
  requestAnimationFrame(() => syncTopologyLayout(container, network));
  startEdgeFlowAnimation(edgeSet);
  startEdgeDotFlow(network, edgeSet, container);
  
  network.on("click", function (params) {
    if (params.nodes.length > 0) {
      const selectedNodeId = params.nodes[0];
      let handled = false;
      const isEdgeAgent = window.agentDatabase.some(
        (agent) => agent.id === selectedNodeId && (agent.layer || "edge") === "edge"
      );
      if (isEdgeAgent) {
        toggleEdgeAgentExtension(selectedNodeId);
        handled = true;
      }
      if (toggleExtensionGroup(nodes, edgeSet, selectedNodeId)) {
        handled = true;
      }
      if (!handled) {
        highlightNodeInNetwork(selectedNodeId);
      }
    }
  });
  
  // 动态闪烁效果
  setInterval(() => {
    const activeAgents = window.agentDatabase.filter((a) => a.status === "active");
    if (!activeAgents.length) return;
    const randomAgent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
    const originalNode = nodes.get(randomAgent.id);
    const originalSize = originalNode.size;
    const originalColor = { ...originalNode.color, highlight: { ...originalNode.color.highlight } };
    const originalShadow = originalNode.shadow ? { ...originalNode.shadow } : { enabled: false };
  
    nodes.update({
      id: randomAgent.id,
      size: originalSize * 1.25,
      color: {
        background: originalColor.background,
        border: "#ffd700",
        highlight: { background: originalColor.background, border: "#000" },
      },
      shadow: { enabled: true, color: "rgba(255, 215, 0, 0.45)", size: Math.max(12, originalShadow.size + 4), x: 0, y: 6 },
    });
  
    setTimeout(() => {
      nodes.update({ id: randomAgent.id, size: originalSize, color: originalColor, shadow: originalShadow });
    }, 500);
  }, 3000);
  
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (!window.networkGraph || !window.networkInstance) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      syncTopologyLayout(container, window.networkInstance);
    }, 120);
  });
}
  

function addAgentToNetwork(agent) {
  if (!window.networkGraph || !window.networkInstance) {
    console.error("Network graph not initialized");
    return;
  }

  const nodes = window.networkGraph.nodes;
  const edges = window.networkGraph.edges;
  const container = document.getElementById("networkGraph");
  const nodeKey = getNodeKey(agent);
  const anchorId = findAnchorNodeId(nodeKey, nodes);

  if (anchorId) {
    agent.isExtension = true;
    const shouldShow = getExtensionVisibility(anchorId);
    const extensionAgents = sortExtensionAgents(
      window.agentDatabase.filter((item) => item.isExtension && getNodeKey(item) === nodeKey)
    );
    const extensionIndex = Math.max(0, extensionAgents.findIndex((item) => item.id === agent.id));
    const metrics = getLayoutMetrics(container);
    const offset = getExtensionTreeOffset(extensionIndex, extensionAgents.length, metrics);
    const anchorPos = window.networkInstance.getPositions([anchorId])[anchorId];
    const position = anchorPos
      ? { x: anchorPos.x + offset.x, y: anchorPos.y + offset.y }
      : { x: 0, y: 0 };

    const extensionPayload = {
      id: agent.id,
      label: agent.name,
      shape: "image",
      image: window.TOPOLOGY_ICONS.agent01 || window.TOPOLOGY_ICONS.agent,
      x: position.x,
      y: position.y,
      size: 14,
      fixed: true,
      physics: false,
      selectable: false,
      hover: false,
      hidden: !shouldShow,
      extensionFor: anchorId,
      font: {
        size: 9,
        color: "#1d3f8f",
        align: "center",
        vadjust: 8,
        strokeWidth: 3,
        strokeColor: "rgba(247, 249, 252, 0.9)",
      },
    };

    if (nodes.get(agent.id)) {
      nodes.update(extensionPayload);
    } else {
      nodes.add(extensionPayload);
    }

    buildTopologyEdges(edges, nodes);
    syncTopologyLayout(container, window.networkInstance);
    if (shouldShow) {
      toggleExtensionGroup(nodes, edges, anchorId, true);
    }
    console.log("Added agent to network:", agent.name);
    return;
  }

  agent.isExtension = false;
  const layer = agent.layer || "edge";
  const style = getNodeStyleForLayer(layer);
  const baseColor = "#1d3f8f";
  const agentImage =
    layer === "cloud"
      ? window.TOPOLOGY_ICONS.rack01
      : layer === "edge"
        ? window.TOPOLOGY_ICONS.server01
        : window.TOPOLOGY_ICONS.agent;

  const layerAgents = window.agentDatabase.filter((a) => a.layer === layer && !a.isExtension);
  const indexInLayer = layerAgents.findIndex((a) => a.id === agent.id);
  const totalAgents = layerAgents.length;

  const position = resolveAgentPosition(container, window.networkInstance, agent, indexInLayer, totalAgents);
  const visualScale = getNodeVisualScale(layer, style, indexInLayer, totalAgents);

  nodes.add({
    id: agent.id,
    label: agent.nodeLabel || agent.name,
    shape: "image",
    image: agentImage,
    color: {
      background: baseColor,
      border: style.borderColor,
      highlight: { background: "#3a5fb7", border: "#000" },
    },
    x: position.x,
    y: position.y,
    size: visualScale.size,
    borderWidth: visualScale.borderWidth,
    physics: false,
    font: {
      size: visualScale.fontSize,
      color: baseColor,
      align: "center",
      vadjust: 8,
      strokeWidth: 3,
      strokeColor: "rgba(247, 249, 252, 0.9)",
    },
    shadow: { enabled: true, color: style.shadowColor, size: visualScale.shadowSize, x: 0, y: 4 },
    layer,
  });

  buildTopologyEdges(edges, nodes);
  syncTopologyLayout(container, window.networkInstance);
  console.log("Added agent to network:", agent.name);
}
  

window.initializeStats = initializeStats;
window.initializeNetworkGraph = initializeNetworkGraph;
  
window.getLayoutMetrics = getLayoutMetrics;
window.getLayerPosition = getLayerPosition;
window.resolveAgentPosition = resolveAgentPosition;
  
window.applyTopologyLayout = applyTopologyLayout;
window.syncTopologyLayout = syncTopologyLayout;
  
window.buildTopologyEdges = buildTopologyEdges;
window.addNetworkLegend = addNetworkLegend;
  
window.highlightNodeInNetwork = highlightNodeInNetwork;
window.addAgentToNetwork = addAgentToNetwork;
window.triggerTopologyFlow = triggerTopologyFlow;
window.triggerTopologyFlows = triggerTopologyFlows;
window.pinTopologyAgent = pinTopologyAgent;
window.pinTopologyAgents = pinTopologyAgents;
window.clearPinnedTopologyAgents = clearPinnedTopologyAgents;
