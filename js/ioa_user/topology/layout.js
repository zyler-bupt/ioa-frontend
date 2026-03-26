/**
 * topology/layout.js
 * Layout, positioning, and legend rendering.
 */

// ====== layout helpers ======
function getLayoutMetrics(container) {
  const bounds = container.getBoundingClientRect();
  const width = Math.max(bounds.width || 0, 520);
  const height = Math.max(bounds.height || 0, 420);
  const verticalGap = Math.max(150, Math.min(240, height * 0.3));
  const minSpacing = Math.max(120, width * 0.16);
  const maxSpacing = Math.max(minSpacing + 8, Math.min(320, width * 0.3));
  const paddingX = Math.max(18, width * 0.05);
  return { width, height, verticalGap, minSpacing, maxSpacing, paddingX };
}
  
function getLayerRowMetrics(metrics) {
  const inset = 14;
  const gap = 14;
  const rowHeight = Math.max(120, (metrics.height - inset * 2 - gap * 2) / 3);
  return { inset, gap, rowHeight };
}
  
function getLayerRowCenters(metrics) {
  const { inset, gap, rowHeight } = getLayerRowMetrics(metrics);
  const centers = [
    inset + rowHeight / 2,
    inset + rowHeight / 2 + rowHeight + gap,
    inset + rowHeight / 2 + 2 * (rowHeight + gap),
  ];
  return {
    cloud: centers[0] - metrics.height / 2,
    edge: centers[1] - metrics.height / 2,
    terminal: centers[2] - metrics.height / 2,
  };
}
  
function getLayerBandMetrics(container, layer) {
  const layers = container.querySelector(".topology-layers");
  if (!layers) return null;
  const band = layers.querySelector(`.topology-band--${layer}`);
  if (!band) return null;
  const containerRect = container.getBoundingClientRect();
  const bandRect = band.getBoundingClientRect();
  return {
    width: bandRect.width,
    height: bandRect.height,
    left: bandRect.left - containerRect.left,
    top: bandRect.top - containerRect.top,
  };
}
  
function getAnchorIndex(anchorCount, indexInLayer, totalAgents) {
  if (!anchorCount) return null;
  if (totalAgents <= anchorCount) {
    const projected = Math.round(((indexInLayer + 1) * (anchorCount + 1)) / (totalAgents + 1)) - 1;
    return Math.max(0, Math.min(anchorCount - 1, projected));
  }
  if (indexInLayer < anchorCount) return indexInLayer;
  return null;
}
  
function getLayerAnchorDomPosition(container, layer, indexInLayer, totalAgents) {
  const anchors = window.LAYER_ANCHORS[layer];
  const image = window.LAYER_IMAGES[layer];
  if (!anchors || !anchors.length || !image) return null;
  
  const bandMetrics = getLayerBandMetrics(container, layer);
  if (!bandMetrics) return null;
  
  const anchorIndex = getAnchorIndex(anchors.length, indexInLayer, totalAgents);
  if (anchorIndex === null) return null;
  
  const anchor = anchors[anchorIndex];
  const scale = Math.min(bandMetrics.width / image.width, bandMetrics.height / image.height);
  const renderWidth = image.width * scale;
  const renderHeight = image.height * scale;
  const offsetX = (bandMetrics.width - renderWidth) / 2;
  const offsetY = (bandMetrics.height - renderHeight) / 2;
  
  return {
    x: bandMetrics.left + offsetX + anchor.x * scale,
    y: bandMetrics.top + offsetY + anchor.y * scale,
  };
}
  
function alignNetworkView(network) {
  if (!network) return;
  network.moveTo({ position: { x: 0, y: 0 }, scale: 1, animation: false });
}
  
function getLayerPosition(layer, indexInLayer, totalAgents, metrics, container = null) {
  const layerY = getLayerRowCenters(metrics);
  const layerBandWidth = getLayerBandWidth(container, layer, metrics);
  const layerAvailableWidth = getLayerAvailableWidth(container, layer, metrics);
  
  if (layer === "edge" && totalAgents === 4) {
    const span = Math.max(160, Math.min(layerAvailableWidth * 0.78, layerAvailableWidth - 26));
    const rowGap = Math.max(64, Math.min(110, getLayerRowMetrics(metrics).rowHeight * 0.45));
    const shift = span * 0.06;
    const leftX = -span / 2;
    const rightX = span / 2;
    const positions = [
      { x: leftX, y: -rowGap / 2 },
      { x: leftX + shift, y: rowGap / 2 },
      { x: rightX - shift, y: -rowGap / 2 },
      { x: rightX, y: rowGap / 2 },
    ];
    const fallback = positions[indexInLayer] ?? { x: 0, y: 0 };
    return { x: fallback.x, y: fallback.y + (layerY.edge ?? 0) };
  }
  
  if (layer === "cloud" && totalAgents === 3) {
    const span = Math.max(110, Math.min(layerAvailableWidth * 0.72, layerAvailableWidth - 24));
    const rowGap = Math.max(70, Math.min(120, getLayerRowMetrics(metrics).rowHeight * 0.5));
    const positions = [
      { x: -span / 2, y: rowGap / 2 },
      { x: 0, y: -rowGap / 2 },
      { x: span / 2, y: rowGap / 2 },
    ];
    const fallback = positions[indexInLayer] ?? { x: 0, y: 0 };
    return { x: fallback.x, y: fallback.y + (layerY.cloud ?? layerY.edge) };
  }
  
  const spacing =
    totalAgents > 1
      ? Math.min(metrics.maxSpacing, Math.max(metrics.minSpacing, layerAvailableWidth / (totalAgents - 1)))
      : 0;
  const startX = (-(totalAgents - 1) * spacing) / 2;
  const tiltBase = layer === "cloud" ? -12 : layer === "edge" ? 12 : 0;
  const tilt = totalAgents > 1 ? tiltBase : 0;
  const y = (layerY[layer] ?? layerY.edge) + (indexInLayer - (totalAgents - 1) / 2) * tilt;
  const x = window.clampValue(startX + indexInLayer * spacing, -layerBandWidth / 2 + 18, layerBandWidth / 2 - 18);
  return { x, y };
}
  
function getLayerDomPosition(layer, indexInLayer, totalAgents, metrics, container = null) {
  const position = getLayerPosition(layer, indexInLayer, totalAgents, metrics, container);
  return { x: position.x + metrics.width / 2, y: position.y + metrics.height / 2 };
}
  
function resolveAgentPosition(container, network, agent, indexInLayer, totalAgents) {
  const metrics = getLayoutMetrics(container);
  const layer = agent.layer || "edge";
  const domPosition =
    getLayerAnchorDomPosition(container, layer, indexInLayer, totalAgents) ??
    getLayerDomPosition(layer, indexInLayer, totalAgents, metrics, container);
  
  if (network && typeof network.DOMtoCanvas === "function") {
    return network.DOMtoCanvas(domPosition);
  }

  return { x: domPosition.x - metrics.width / 2, y: domPosition.y - metrics.height / 2 };
}

function getNodeKey(agent) {
  return agent.node_id || agent.nodeId || agent.nodeLabel || "";
}

function sortExtensionAgents(agents) {
  return [...agents].sort((a, b) => {
    const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
    const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
    if (aTime !== bTime) return aTime - bTime;
    return String(a.id).localeCompare(String(b.id));
  });
}

function findAnchorNodeId(nodeKey, nodes) {
  if (!nodeKey || !nodes) return null;
  const matches = nodes.get({
    filter: (node) =>
      !String(node.id).startsWith("infra-") && (node.id === nodeKey || node.label === nodeKey),
  });
  return matches.length ? matches[0].id : null;
}

function getExtensionTreeOffset(index, total, metrics) {
  if (total <= 0) return { x: 0, y: 0 };
  const row = Math.floor(index / 2);
  const isRight = index % 2 === 0;
  const width = metrics?.width || 600;
  const height = metrics?.height || 400;
  const baseSpacing = Math.max(36, Math.round(width * 0.06));
  const rowSpacing = Math.max(12, Math.round(baseSpacing * 0.4));
  const levelGap = Math.max(28, Math.round(height * 0.06));
  const spread = baseSpacing + row * rowSpacing;
  const x = (isRight ? 1 : -1) * spread;
  const y = -row * levelGap;
  return { x, y };
}

function toggleExtensionGroup(nodes, edges, anchorId, forceVisible) {
  if (!nodes || !edges || !anchorId) return false;
  const extensions = nodes.get({ filter: (node) => node.extensionFor === anchorId });
  if (!extensions.length) return false;
  const shouldShow = typeof forceVisible === "boolean" ? forceVisible : !getExtensionVisibility(anchorId);
  setExtensionVisibility(anchorId, shouldShow);
  nodes.update(extensions.map((node) => ({ id: node.id, hidden: !shouldShow })));
  const edgeUpdates = edges
    .get({ filter: (edge) => edge.extensionFor === anchorId })
    .map((edge) => ({ id: edge.id, hidden: !shouldShow }));
  if (edgeUpdates.length) edges.update(edgeUpdates);
  return true;
}
  
function getInfraNodesLayout(metrics, container = null) {
  const { rowHeight } = getLayerRowMetrics(metrics);
  const rowCenters = getLayerRowCenters(metrics);
  const edgePositions = [0, 1, 2, 3].map((index) =>
    getLayerPosition("edge", index, 4, metrics, container)
  );
  const cloudCluster = getLayerPosition("cloud", 0, 1, metrics, container);
  const terminalBase = getLayerPosition("terminal", 0, 1, metrics, container).y;
  
  const bandPaddingY = Math.max(18, rowHeight * 0.18);
  const edgeBandWidth = getLayerBandWidth(container, "edge", metrics);
  const edgeBandHalf = edgeBandWidth / 2;
  const edgeBandPaddingX = Math.max(30, edgeBandWidth * 0.08);
  const edgeBandMinX = -edgeBandHalf + edgeBandPaddingX;
  const edgeBandMaxX = edgeBandHalf - edgeBandPaddingX;
  
  const widthHalf = metrics.width / 2 - 24;
  const edgeOffsetLimit = Math.max(
    50,
    Math.min(widthHalf - Math.abs(edgePositions[0].x), widthHalf - Math.abs(edgePositions[2].x))
  );
  const edgeOffsetX = Math.min(Math.max(edgeBandHalf * 0.26, metrics.width * 0.08), edgeOffsetLimit);
  const edgeOffsetY = Math.max(26, rowHeight * 0.24);
  
  const gatewayMargin = Math.max(6, metrics.width * 0.008);
  const gatewayOffsetX = Math.max(
    0,
    Math.min(
      edgeOffsetX * 1.05,
      edgePositions[1].x - edgeBandMinX - gatewayMargin,
      edgeBandMaxX - edgePositions[3].x - gatewayMargin
    )
  );
  const gatewayOffsetY = edgeOffsetY * 1.35;
  const edgeXValues = edgePositions.map((pos) => pos.x);
  const edgeMinX = Math.min(...edgeXValues);
  const edgeMaxX = Math.max(...edgeXValues);
  const gatewaySideOffset = Math.max(32, gatewayOffsetX) + 20;
  const edgeMidY = (edgePositions[0].y + edgePositions[3].y) / 2;

  const rowBounds = {
    cloud: { min: rowCenters.cloud - rowHeight / 2 + bandPaddingY, max: rowCenters.cloud + rowHeight / 2 - bandPaddingY },
    edge: { min: rowCenters.edge - rowHeight / 2 + bandPaddingY, max: rowCenters.edge + rowHeight / 2 - bandPaddingY },
    terminal: { min: rowCenters.terminal - rowHeight / 2 + bandPaddingY, max: rowCenters.terminal + rowHeight / 2 - bandPaddingY },
  };
  
  const clampToLayer = (layout) => {
    const layer = layout.id.includes("cloud") ? "cloud" : layout.id.includes("edge") ? "edge" : "terminal";
    const bounds = rowBounds[layer];
    const layerBandWidth = getLayerBandWidth(container, layer, metrics);
    const layerPaddingX = Math.max(24, layerBandWidth * 0.08);
    return {
      ...layout,
      x: window.clampValue(layout.x, -layerBandWidth / 2 + layerPaddingX, layerBandWidth / 2 - layerPaddingX),
      y: window.clampValue(layout.y, bounds.min, bounds.max),
    };
  };

  const terminalBandWidth = getLayerBandWidth(container, "terminal", metrics);
  const terminalHalfWidth = terminalBandWidth / 2;
  const terminalInnerPaddingX = Math.max(30, terminalBandWidth * 0.07);
  const terminalMaxRadiusX = Math.max(136, terminalHalfWidth - terminalInnerPaddingX);
  const terminalRadiusX = terminalMaxRadiusX * 0.92;
  const terminalMaxRadiusY = Math.max(58, rowHeight * 0.5 - 10);
  const terminalRadiusY = Math.min(Math.max(rowHeight * 0.42, 62), terminalMaxRadiusY);
  const terminalCenterYOffset = Math.max(10, rowHeight * 0.12);
  const terminalHex = TERMINAL_DEVICE_IDS.map((id, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    return {
      id,
      x: terminalRadiusX * Math.cos(angle),
      y: terminalBase + terminalCenterYOffset + terminalRadiusY * Math.sin(angle),
    };
  });

  return [
    {
      id: CLOUD_CLUSTER_NODE_ID,
      x: cloudCluster.x,
      y: cloudCluster.y - Math.max(12, rowHeight * 0.08),
    },

    { id: "infra-edge-gateway-left", x: edgeMinX - gatewaySideOffset, y: edgeMidY },
    { id: "infra-edge-gateway-right", x: edgeMaxX + gatewaySideOffset, y: edgeMidY },

    ...terminalHex,
  ].map(clampToLayer);
}
  
function createInfraNodes(metrics, container = null) {
  return getInfraNodesLayout(metrics, container).map((layout) => {
    const meta = window.INFRA_NODE_META[layout.id];
    const label = meta.label || "";
    const labelOffset = typeof meta.labelOffset === "number" ? meta.labelOffset : 12;
    const labelSize = meta.labelSize || (label ? 11 : 0);
    return {
      id: layout.id,
      label,
      shape: "image",
      image: meta.image,
      size: meta.size,
      x: layout.x,
      y: layout.y,
      fixed: true,
      physics: false,
      selectable: layout.id === CLOUD_CLUSTER_NODE_ID,
      hover: layout.id === CLOUD_CLUSTER_NODE_ID,
      hidden: false,
      font: {
        size: labelSize,
        color: "#1b2f6b",
        align: "center",
        vadjust: labelOffset,
        strokeWidth: 3,
        strokeColor: "rgba(247, 249, 252, 0.9)",
      },
    };
  });
}
  
function applyTopologyLayout(container, nodes, network) {
  const layerGroups = { cloud: [], edge: [], terminal: [] };
  const metrics = getLayoutMetrics(container);
  const baseAgents = window.agentDatabase.filter((agent) => !agent.isExtension);
  baseAgents.forEach((agent) => {
    const layer = layerGroups[agent.layer] ? agent.layer : "edge";
    layerGroups[layer].push(agent);
  });

  const updates = [];
  Object.entries(layerGroups).forEach(([layer, agents]) => {
    const total = agents.length;
    agents.forEach((agent, index) => {
      const position = resolveAgentPosition(container, network, agent, index, total);
      updates.push({ id: agent.id, x: position.x, y: position.y });
      if (layer === "edge") {
        const extensionId = EDGE_AGENT01_MAP[agent.id];
        if (extensionId) {
          const offsetX = Math.max(36, metrics.width * 0.06);
          const direction = position.x >= 0 ? 1 : -1;
          updates.push({
            id: extensionId,
            x: position.x + direction * offsetX,
            y: position.y,
          });
        }
      }
    });
  });

  nodes.update(updates);

  const infraUpdates = getInfraNodesLayout(metrics, container).map((layout) => ({
    id: layout.id,
    x: layout.x,
    y: layout.y,
  }));
  nodes.update(infraUpdates);

  const extensionAgents = window.agentDatabase.filter((agent) => agent.isExtension);
  if (extensionAgents.length) {
    const extensionGroups = new Map();
    extensionAgents.forEach((agent) => {
      const nodeKey = getNodeKey(agent);
      if (!nodeKey) return;
      if (!extensionGroups.has(nodeKey)) extensionGroups.set(nodeKey, []);
      extensionGroups.get(nodeKey).push(agent);
    });

    const extensionUpdates = [];
    extensionGroups.forEach((agents, nodeKey) => {
      const anchorId = findAnchorNodeId(nodeKey, nodes);
      if (!anchorId) return;
      const anchorPos = network?.getPositions
        ? network.getPositions([anchorId])[anchorId]
        : nodes.get(anchorId);
      if (!anchorPos || typeof anchorPos.x !== "number" || typeof anchorPos.y !== "number") return;
      const ordered = sortExtensionAgents(agents);
      ordered.forEach((agent, index) => {
        const offset = getExtensionTreeOffset(index, ordered.length, metrics);
        const shouldShow = getExtensionVisibility(anchorId);
        extensionUpdates.push({
          id: agent.id,
          x: anchorPos.x + offset.x,
          y: anchorPos.y + offset.y,
          size: 14,
          shape: "image",
          image: window.TOPOLOGY_ICONS.agent01 || window.TOPOLOGY_ICONS.agent,
          hidden: !shouldShow,
          extensionFor: anchorId,
          font: { size: 9, vadjust: 8, color: "#1d3f8f" },
        });
      });
    });
    if (extensionUpdates.length) nodes.update(extensionUpdates);
  }
}
  
function syncTopologyLayout(container, network) {
  if (!window.networkGraph) return;
  alignNetworkView(network);
  applyTopologyLayout(container, window.networkGraph.nodes, network);
}
  
function observeTopologyLayout(container, network) {
  if (!("ResizeObserver" in window)) return;
  const observer = new ResizeObserver(() => syncTopologyLayout(container, network));
  observer.observe(container);
}
  

function addNetworkLegend() {
  const container = document.getElementById("networkGraph");
  if (!container.querySelector(".topology-layers")) {
    const layers = document.createElement("div");
    layers.className = "topology-layers";
  
    const layerMeta = {
      cloud: { icon: "☁️", title: "CLOUD LAYER", sub: " " },
      edge: { icon: "🌐", title: "EDGE LAYER", sub: " " },
      terminal: { icon: "📱", title: "TERMINAL LAYER", sub: " " },
    };
  
    ["cloud", "edge", "terminal"].forEach((layerName) => {
      const band = document.createElement("div");
      band.className = `topology-band topology-band--${layerName}`;
      const face = document.createElement("div");
      face.className = "topology-band-face";
      band.appendChild(face);
      const meta = layerMeta[layerName];
      const label = document.createElement("div");
      label.className = `layer-tag layer-tag--${layerName}`;
      label.innerHTML = `
        <span class="layer-tag-title">${meta.icon} ${meta.title}</span>
        <span class="layer-tag-sub">${meta.sub}</span>
      `;
      band.appendChild(label);
      layers.appendChild(band);
    });
  
    container.appendChild(layers);
  }
}
  

function getNodeStyleForLayer(layer) {
  const style = { size: 26, borderWidth: 1.8, borderColor: "#333", shadowColor: "rgba(0, 0, 0, 0.12)", shadowSize: 6 };
  if (layer === "cloud") {
    style.size = 20;
    style.borderWidth = 2;
    style.borderColor = "#1a73e8";
    style.shadowColor = "rgba(26, 115, 232, 0.3)";
  } else if (layer === "edge") {
    style.size = 28;
    style.borderWidth = 1.8;
    style.borderColor = "#f57c00";
    style.shadowColor = "rgba(245, 124, 0, 0.3)";
  } else if (layer === "terminal") {
    style.size = 24;
    style.borderWidth = 1.6;
    style.borderColor = "#7b1fa2";
    style.shadowColor = "rgba(123, 31, 162, 0.35)";
  }
  return style;
}
