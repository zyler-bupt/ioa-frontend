/**
 * IOA (Internet of Agent) - Main Application
 * Displays agent network topology and discovery process
 */

// 模拟数据 - Agent列表（云边端三层架构）
const agentDatabase = [
  {
    id: "agent-video",
    name: "VideoAgent",
    type: "agent",
    status: "active",
    layer: "cloud",
    cpu: 65,
    memory: 72,
    capabilities: [
      "video analysis",
      "object detection",
      "frame extraction",
      "real-time streaming",
    ],
    description: "Cloud-layer agent for video processing and analysis",
    relevance: 0,
  },
  {
    id: "agent-registry",
    name: "RegistryAgent",
    type: "agent",
    status: "active",
    layer: "cloud",
    cpu: 54,
    memory: 61,
    capabilities: ["registry", "agent catalog", "service discovery"],
    description: "Cloud-layer agent registry and metadata indexing",
    relevance: 0,
  },
  {
    id: "agent-discovery",
    name: "DiscoveryAgent",
    type: "agent",
    status: "active",
    layer: "cloud",
    cpu: 59,
    memory: 66,
    capabilities: ["semantic search", "routing", "capability matching"],
    description: "Cloud-layer agent for discovery and routing decisions",
    relevance: 0,
  },
  {
    id: "agent-meteorology",
    name: "MeteorologyAgent",
    type: "agent",
    status: "active",
    layer: "edge",
    cpu: 58,
    memory: 68,
    capabilities: [
      "weather analysis",
      "climate prediction",
      "data integration",
    ],
    description: "Edge-layer agent for meteorological data analysis",
    relevance: 0,
  },
  {
    id: "agent-keyframe",
    name: "KeyframeAgent",
    type: "agent",
    status: "active",
    layer: "edge",
    cpu: 48,
    memory: 58,
    capabilities: [
      "keyframe extraction",
      "scene detection",
      "thumbnail generation",
    ],
    description:
      "Edge-layer agent for extracting key frames from video streams",
    relevance: 0,
  },
  {
    id: "agent-map",
    name: "MapAgent",
    type: "agent",
    status: "active",
    layer: "edge",
    cpu: 52,
    memory: 64,
    capabilities: ["map analysis", "spatial indexing", "location processing"],
    description: "Edge-layer agent for geographic information processing",
    relevance: 0,
  },
  {
    id: "agent-report",
    name: "ReportAgent",
    type: "agent",
    status: "active",
    layer: "edge",
    cpu: 72,
    memory: 80,
    capabilities: [
      "report generation",
      "data visualization",
      "comprehensive analysis",
      "export formatting",
    ],
    description:
      "Edge-layer agent for generating structured reports from processed data",
    relevance: 0,
  },
];

const svgToDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const TOPOLOGY_ICONS = {
  agent: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <polygon points="32,8 52,20 52,44 32,56 12,44 12,20"
        fill="#eef3ff" stroke="#1b2f6b" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="24" cy="26" r="4" fill="#1a73e8"/>
      <circle cx="40" cy="26" r="4" fill="#1a73e8"/>
      <circle cx="32" cy="40" r="4" fill="#1a73e8"/>
      <path d="M24 26 L32 40 L40 26" fill="none" stroke="#1a73e8" stroke-width="3"/>
    </svg>
  `),
  bot: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect x="10" y="16" width="44" height="34" rx="6" fill="#ffffff" stroke="#1b1b1b" stroke-width="3"/>
      <circle cx="26" cy="33" r="4" fill="#1b1b1b"/>
      <circle cx="38" cy="33" r="4" fill="#1b1b1b"/>
      <rect x="24" y="41" width="16" height="4" rx="2" fill="#1b1b1b"/>
      <line x1="32" y1="8" x2="32" y2="16" stroke="#1b1b1b" stroke-width="3"/>
      <circle cx="32" cy="6" r="4" fill="#ffffff" stroke="#1b1b1b" stroke-width="3"/>
    </svg>
  `),
  server: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect x="18" y="8" width="28" height="16" rx="4" fill="#f7f7f7" stroke="#1b1b1b" stroke-width="3"/>
      <rect x="18" y="26" width="28" height="16" rx="4" fill="#f7f7f7" stroke="#1b1b1b" stroke-width="3"/>
      <rect x="18" y="44" width="28" height="12" rx="4" fill="#f7f7f7" stroke="#1b1b1b" stroke-width="3"/>
      <circle cx="26" cy="16" r="2" fill="#1b1b1b"/>
      <circle cx="26" cy="34" r="2" fill="#1b1b1b"/>
      <circle cx="26" cy="50" r="2" fill="#1b1b1b"/>
    </svg>
  `),
  gateway: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <ellipse cx="32" cy="22" rx="22" ry="10" fill="#dbe7ff" stroke="#1b1b1b" stroke-width="3"/>
      <rect x="10" y="22" width="44" height="20" fill="#c5d8ff" stroke="#1b1b1b" stroke-width="3"/>
      <ellipse cx="32" cy="42" rx="22" ry="10" fill="#b4c9ff" stroke="#1b1b1b" stroke-width="3"/>
      <path d="M22 26 L42 38" stroke="#1b1b1b" stroke-width="3"/>
      <path d="M42 26 L22 38" stroke="#1b1b1b" stroke-width="3"/>
    </svg>
  `),
  user: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <circle cx="32" cy="22" r="12" fill="#ffffff" stroke="#1b1b1b" stroke-width="3"/>
      <rect x="14" y="36" width="36" height="18" rx="9" fill="#ffffff" stroke="#1b1b1b" stroke-width="3"/>
    </svg>
  `),
  phone: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect x="20" y="6" width="24" height="52" rx="6" fill="#ffffff" stroke="#1b1b1b" stroke-width="3"/>
      <rect x="24" y="14" width="16" height="30" rx="2" fill="#f2f2f2" stroke="#1b1b1b" stroke-width="2"/>
      <circle cx="32" cy="50" r="2.5" fill="#1b1b1b"/>
    </svg>
  `),
  desktop: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect x="10" y="12" width="44" height="28" rx="4" fill="#ffffff" stroke="#1b1b1b" stroke-width="3"/>
      <rect x="26" y="40" width="12" height="8" fill="#ffffff" stroke="#1b1b1b" stroke-width="3"/>
      <rect x="18" y="48" width="28" height="6" rx="3" fill="#ffffff" stroke="#1b1b1b" stroke-width="3"/>
    </svg>
  `),
};

const LAYER_IMAGES = {};
const LAYER_ANCHORS = {
  cloud: [],
  edge: [],
  terminal: [],
};

const INFRA_NODE_META = {
  "infra-cloud-bot-left": { image: TOPOLOGY_ICONS.bot, size: 22, label: "" },
  "infra-cloud-bot-mid": { image: TOPOLOGY_ICONS.bot, size: 22, label: "" },
  "infra-cloud-server": {
    image: TOPOLOGY_ICONS.server,
    size: 22,
    label: "Server",
    labelOffset: -12,
    labelSize: 9,
  },
  "infra-edge-server-left": {
    image: TOPOLOGY_ICONS.server,
    size: 22,
    label: "Server",
    labelOffset: -12,
    labelSize: 9,
  },
  "infra-edge-server-right": {
    image: TOPOLOGY_ICONS.server,
    size: 22,
    label: "Server",
    labelOffset: -12,
    labelSize: 9,
  },
  "infra-edge-gateway-left": {
    image: TOPOLOGY_ICONS.gateway,
    size: 24,
    label: "Gateway",
    labelOffset: 12,
    labelSize: 9,
  },
  "infra-edge-gateway-right": {
    image: TOPOLOGY_ICONS.gateway,
    size: 24,
    label: "Gateway",
    labelOffset: 12,
    labelSize: 9,
  },
  "infra-terminal-user-left": { image: TOPOLOGY_ICONS.user, size: 22, label: "User" },
  "infra-terminal-phone-left": { image: TOPOLOGY_ICONS.phone, size: 22, label: "Phone" },
  "infra-terminal-user-right": { image: TOPOLOGY_ICONS.user, size: 22, label: "User" },
  "infra-terminal-desktop-left": { image: TOPOLOGY_ICONS.desktop, size: 22, label: "Desktop" },
  "infra-terminal-desktop-right": { image: TOPOLOGY_ICONS.desktop, size: 22, label: "Desktop" },
  "infra-terminal-phone-right": { image: TOPOLOGY_ICONS.phone, size: 22, label: "Phone" },
};
const LINK_COLORS = {
  primary: "#ff6d2d",
  secondary: "#ffb48f",
  highlight: "#ff3d00",
};
const IN_LAYER_COLOR = "#2e4f93";

// 应用状态
let appState = {
  selectedAgents: [],
  filteredAgents: [...agentDatabase],
  messages: [],
  filterType: "",
  filterStatus: "active",
  currentRequest: "",
};

// 初始化应用
document.addEventListener("DOMContentLoaded", function () {
  console.log("IOA Application Initializing...");

  // 初始化各个模块
  initializeStats();
  initializeNetworkGraph();
  initializeDiscoveryProcess();
  initializeChatSystem();

  // 检查是否有新注册的Agent
  loadNewAgents();

  console.log("IOA Application Ready!");
});

/**
 * 初始化顶部统计数据
 */
function initializeStats() {
  const agents = agentDatabase.filter((a) => a.type === "agent");
  const edgeAgents = agents.filter((a) => a.layer === "edge");

  const setStat = (id, value) => {
    const target = document.getElementById(id);
    if (target) {
      target.textContent = value;
    }
  };

  setStat("totalNodes", agentDatabase.length);
  setStat("agentCount", agents.length);
  setStat("toolCount", 16);
}

/**
 * 获取三层拓扑中每个节点的位置
 */
function getLayoutMetrics(container) {
  const bounds = container.getBoundingClientRect();
  const width = Math.max(bounds.width || 0, 520);
  const height = Math.max(bounds.height || 0, 420);
  const verticalGap = Math.max(150, Math.min(240, height * 0.3));
  const minSpacing = Math.max(120, width * 0.16);
  const maxSpacing = Math.max(minSpacing + 8, Math.min(320, width * 0.3));
  const paddingX = Math.max(18, width * 0.05);

  return {
    width,
    height,
    verticalGap,
    minSpacing,
    maxSpacing,
    paddingX,
  };
}

function getLayerRowMetrics(metrics) {
  const inset = 14;
  const gap = 14;
  const rowHeight = Math.max(
    120,
    (metrics.height - inset * 2 - gap * 2) / 3
  );

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
    const projected =
      Math.round(((indexInLayer + 1) * (anchorCount + 1)) / (totalAgents + 1)) - 1;
    return Math.max(0, Math.min(anchorCount - 1, projected));
  }
  if (indexInLayer < anchorCount) {
    return indexInLayer;
  }
  return null;
}

function getLayerAnchorDomPosition(container, layer, indexInLayer, totalAgents) {
  const anchors = LAYER_ANCHORS[layer];
  const image = LAYER_IMAGES[layer];
  if (!anchors || !anchors.length || !image) return null;

  const bandMetrics = getLayerBandMetrics(container, layer);
  if (!bandMetrics) return null;

  const anchorIndex = getAnchorIndex(anchors.length, indexInLayer, totalAgents);
  if (anchorIndex === null) return null;
  const anchor = anchors[anchorIndex];
  const scale = Math.min(
    bandMetrics.width / image.width,
    bandMetrics.height / image.height
  );
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
  network.moveTo({
    position: { x: 0, y: 0 },
    scale: 1,
    animation: false,
  });
}

function getLayerDomPosition(layer, indexInLayer, totalAgents, metrics) {
  const position = getLayerPosition(layer, indexInLayer, totalAgents, metrics);
  return {
    x: position.x + metrics.width / 2,
    y: position.y + metrics.height / 2,
  };
}

function resolveAgentPosition(container, network, agent, indexInLayer, totalAgents) {
  const metrics = getLayoutMetrics(container);
  const layer = agent.layer || "edge";
  const domPosition =
    getLayerAnchorDomPosition(container, layer, indexInLayer, totalAgents) ??
    getLayerDomPosition(layer, indexInLayer, totalAgents, metrics);

  if (network && typeof network.DOMtoCanvas === "function") {
    return network.DOMtoCanvas(domPosition);
  }

  return {
    x: domPosition.x - metrics.width / 2,
    y: domPosition.y - metrics.height / 2,
  };
}

function syncTopologyLayout(container, network) {
  if (!window.networkGraph) return;
  alignNetworkView(network);
  applyTopologyLayout(container, window.networkGraph.nodes, network);
}

function observeTopologyLayout(container, network) {
  if (!("ResizeObserver" in window)) return;
  const observer = new ResizeObserver(() => {
    syncTopologyLayout(container, network);
  });
  observer.observe(container);
}

function getLayerPosition(layer, indexInLayer, totalAgents, metrics) {
  const layerY = getLayerRowCenters(metrics);
  const bandWidth = metrics.width - metrics.paddingX * 2;

  if (layer === "edge" && totalAgents === 4) {
    const span = Math.min(bandWidth * 0.68, bandWidth - 80);
    const rowGap = Math.max(
      64,
      Math.min(110, getLayerRowMetrics(metrics).rowHeight * 0.45)
    );
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
    const span = Math.min(bandWidth * 0.84, bandWidth - 44);
    const spacing = span / 2;
    const startX = -span / 2;
    return {
      x: startX + indexInLayer * spacing,
      y: layerY.cloud ?? layerY.edge,
    };
  }

  const availableWidth = metrics.width - metrics.paddingX * 2;
  const spacing =
    totalAgents > 1
      ? Math.min(
          metrics.maxSpacing,
          Math.max(metrics.minSpacing, availableWidth / (totalAgents - 1))
        )
      : 0;
  const startX = (-(totalAgents - 1) * spacing) / 2;
  const tiltBase = layer === "cloud" ? -12 : layer === "edge" ? 12 : 0;
  const tilt = totalAgents > 1 ? tiltBase : 0;
  const y =
    (layerY[layer] ?? layerY.edge) +
    (indexInLayer - (totalAgents - 1) / 2) * tilt;

  return { x: startX + indexInLayer * spacing, y };
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getInfraNodesLayout(metrics) {
  const { rowHeight } = getLayerRowMetrics(metrics);
  const rowCenters = getLayerRowCenters(metrics);
  const cloudPositions = [0, 1, 2].map((index) =>
    getLayerPosition("cloud", index, 3, metrics)
  );
  const edgePositions = [0, 1, 2, 3].map((index) =>
    getLayerPosition("edge", index, 4, metrics)
  );
  const terminalBase = getLayerPosition("terminal", 0, 1, metrics).y;
  const widthHalf = metrics.width / 2 - 24;
  const heightHalf = metrics.height / 2 - 24;
  const bandHalf = (metrics.width - metrics.paddingX * 2) / 2;
  const bandPaddingX = Math.max(42, metrics.width * 0.08);
  const bandMinX = -bandHalf + bandPaddingX;
  const bandMaxX = bandHalf - bandPaddingX;
  const bandPaddingY = Math.max(18, rowHeight * 0.18);

  const cloudOffsetLimit = Math.max(
    40,
    widthHalf - Math.abs(cloudPositions[0].x)
  );
  const cloudOffsetX = Math.min(
    Math.max(bandHalf * 0.22, metrics.width * 0.07),
    cloudOffsetLimit
  );
  const cloudOffsetY = Math.max(8, rowHeight * 0.14);
  const edgeOffsetLimit = Math.max(
    50,
    Math.min(
      widthHalf - Math.abs(edgePositions[0].x),
      widthHalf - Math.abs(edgePositions[2].x)
    )
  );
  const edgeOffsetX = Math.min(
    Math.max(bandHalf * 0.26, metrics.width * 0.08),
    edgeOffsetLimit
  );
  const edgeOffsetY = Math.max(26, rowHeight * 0.24);
  const gatewayMargin = Math.max(6, metrics.width * 0.008);
  const gatewayOffsetX = Math.max(
    0,
    Math.min(
      edgeOffsetX * 1.05,
      edgePositions[1].x - bandMinX - gatewayMargin,
      bandMaxX - edgePositions[3].x - gatewayMargin
    )
  );
  const gatewayOffsetY = edgeOffsetY * 1.35;
  const terminalCount = 6;
  const terminalSpacing = Math.min(
    Math.max(82, metrics.width * 0.13),
    (metrics.width - 56) / Math.max(terminalCount - 1, 1)
  );
  const terminalStartX = -((terminalCount - 1) * terminalSpacing) / 2;
  const terminalY = Math.min(
    terminalBase + Math.max(34, rowHeight * 0.22),
    heightHalf - 10
  );

  const rowBounds = {
    cloud: {
      min: rowCenters.cloud - rowHeight / 2 + bandPaddingY,
      max: rowCenters.cloud + rowHeight / 2 - bandPaddingY,
    },
    edge: {
      min: rowCenters.edge - rowHeight / 2 + bandPaddingY,
      max: rowCenters.edge + rowHeight / 2 - bandPaddingY,
    },
    terminal: {
      min: rowCenters.terminal - rowHeight / 2 + bandPaddingY,
      max: rowCenters.terminal + rowHeight / 2 - bandPaddingY,
    },
  };

  const clampToLayer = (layout) => {
    const layer = layout.id.includes("cloud")
      ? "cloud"
      : layout.id.includes("edge")
        ? "edge"
        : "terminal";
    const bounds = rowBounds[layer];
    return {
      ...layout,
      x: clampValue(layout.x, bandMinX, bandMaxX),
      y: clampValue(layout.y, bounds.min, bounds.max),
    };
  };

  return [
    {
      id: "infra-cloud-bot-left",
      x: cloudPositions[0].x - cloudOffsetX,
      y: cloudPositions[0].y - cloudOffsetY * 0.9,
    },
    {
      id: "infra-cloud-bot-mid",
      x: cloudPositions[1].x - cloudOffsetX * 0.6,
      y: cloudPositions[1].y - cloudOffsetY * 0.9,
    },
    {
      id: "infra-cloud-server",
      x: cloudPositions[2].x + cloudOffsetX * 1.1,
      y: cloudPositions[2].y - cloudOffsetY * 1.4,
    },
    {
      id: "infra-edge-server-left",
      x: edgePositions[0].x - edgeOffsetX * 1.15,
      y: edgePositions[0].y - edgeOffsetY * 1.3,
    },
    {
      id: "infra-edge-gateway-left",
      x: edgePositions[1].x - gatewayOffsetX,
      y: edgePositions[1].y + gatewayOffsetY,
    },
    {
      id: "infra-edge-server-right",
      x: edgePositions[2].x + edgeOffsetX * 1.15,
      y: edgePositions[2].y - edgeOffsetY * 1.3,
    },
    {
      id: "infra-edge-gateway-right",
      x: edgePositions[3].x + gatewayOffsetX,
      y: edgePositions[3].y + gatewayOffsetY,
    },
    {
      id: "infra-terminal-user-left",
      x: terminalStartX,
      y: terminalY,
    },
    {
      id: "infra-terminal-phone-left",
      x: terminalStartX + terminalSpacing,
      y: terminalY,
    },
    {
      id: "infra-terminal-user-right",
      x: terminalStartX + terminalSpacing * 2,
      y: terminalY,
    },
    {
      id: "infra-terminal-desktop-left",
      x: terminalStartX + terminalSpacing * 3,
      y: terminalY,
    },
    {
      id: "infra-terminal-desktop-right",
      x: terminalStartX + terminalSpacing * 4,
      y: terminalY,
    },
    {
      id: "infra-terminal-phone-right",
      x: terminalStartX + terminalSpacing * 5,
      y: terminalY,
    },
  ].map(clampToLayer);
}

function createInfraNodes(metrics) {
  return getInfraNodesLayout(metrics).map((layout) => {
    const meta = INFRA_NODE_META[layout.id];
    const label = meta.label || "";
    const labelOffset =
      typeof meta.labelOffset === "number" ? meta.labelOffset : 12;
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
      selectable: false,
      hover: false,
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

  agentDatabase.forEach((agent) => {
    const layer = layerGroups[agent.layer] ? agent.layer : "edge";
    layerGroups[layer].push(agent);
  });

  const updates = [];
  Object.entries(layerGroups).forEach(([layer, agents]) => {
    const total = agents.length;
    agents.forEach((agent, index) => {
      const position = resolveAgentPosition(
        container,
        network,
        agent,
        index,
        total
      );
      updates.push({
        id: agent.id,
        x: position.x,
        y: position.y,
      });
    });
  });

  nodes.update(updates);

  const metrics = getLayoutMetrics(container);
  const infraUpdates = getInfraNodesLayout(metrics).map((layout) => ({
    id: layout.id,
    x: layout.x,
    y: layout.y,
  }));
  nodes.update(infraUpdates);
}

/**
 * 生成弧线连接的样式，避免线条完全重叠
 */
function getSmoothStyle(index, roundness) {
  return {
    type: index % 2 === 0 ? "curvedCW" : "curvedCCW",
    roundness: roundness,
  };
}

function buildTopologyEdges(edgeSet) {
  edgeSet.clear();

  const terminalAgents = agentDatabase.filter((a) => a.layer === "terminal");
  const edgeAgents = agentDatabase.filter((a) => a.layer === "edge");
  const cloudAgents = agentDatabase.filter((a) => a.layer === "cloud");

  const addEdge = (from, to, options) => {
    edgeSet.add({
      from,
      to,
      color: {
        color: options.color,
        highlight: LINK_COLORS.highlight,
      },
      width: options.width,
      dashes: options.dashes,
      smooth: options.smooth,
    });
  };

  // Edge-layer in-layer links (parallelogram when 4 nodes).
  if (edgeAgents.length === 4) {
    const [topLeft, bottomLeft, topRight, bottomRight] = edgeAgents;
    [
      [topLeft, topRight],
      [bottomLeft, bottomRight],
      [topLeft, bottomLeft],
      [topRight, bottomRight],
    ].forEach(([from, to], index) => {
      addEdge(from.id, to.id, {
        color: IN_LAYER_COLOR,
        width: 2.4,
        dashes: [6, 6],
        smooth: false,
      });
    });
  } else if (edgeAgents.length > 1) {
    edgeAgents.slice(0, -1).forEach((agent, index) => {
      addEdge(agent.id, edgeAgents[index + 1].id, {
        color: IN_LAYER_COLOR,
        width: 2.2,
        dashes: [6, 6],
        smooth: false,
      });
    });
  }

  // Terminal layer connects up to the nearest edge agent.
  if (terminalAgents.length && edgeAgents.length) {
    terminalAgents.forEach((agent, index) => {
      const target = edgeAgents[index % edgeAgents.length];
      addEdge(agent.id, target.id, {
        color: LINK_COLORS.primary,
        width: 2.2,
        dashes: [6, 8],
        smooth: getSmoothStyle(index, 0.18),
      });
    });
  }

  // Cloud to edge links (one-to-one for a clean layout).
  if (cloudAgents.length && edgeAgents.length) {
    const targets =
      cloudAgents.length === 3 && edgeAgents.length >= 3
        ? [1, 2, 3]
        : cloudAgents.map((_, index) => index % edgeAgents.length);

    cloudAgents.forEach((agent, index) => {
      const edgeIndex = targets[index % targets.length] % edgeAgents.length;
      const target = edgeAgents[edgeIndex];
      addEdge(agent.id, target.id, {
        color: LINK_COLORS.primary,
        width: 3.2,
        dashes: false,
        smooth: getSmoothStyle(index, 0.24),
      });
    });
  }

  const infraLinks = [
    { from: "infra-cloud-bot-left", to: "agent-video", color: IN_LAYER_COLOR },
    { from: "infra-cloud-bot-mid", to: "agent-registry", color: IN_LAYER_COLOR },
    { from: "infra-cloud-server", to: "agent-discovery", color: IN_LAYER_COLOR },
    { from: "infra-edge-server-left", to: "agent-meteorology", color: IN_LAYER_COLOR },
    { from: "infra-edge-gateway-left", to: "agent-keyframe", color: IN_LAYER_COLOR },
    { from: "infra-edge-server-right", to: "agent-map", color: IN_LAYER_COLOR },
    { from: "infra-edge-gateway-right", to: "agent-report", color: IN_LAYER_COLOR },
  ];

  infraLinks.forEach((link, index) => {
    addEdge(link.from, link.to, {
      color: link.color,
      width: 2,
      dashes: [6, 6],
      smooth: getSmoothStyle(index, 0.1),
    });
  });

  const terminalDevices = [
    "infra-terminal-user-left",
    "infra-terminal-phone-left",
    "infra-terminal-user-right",
    "infra-terminal-desktop-left",
    "infra-terminal-desktop-right",
    "infra-terminal-phone-right",
  ];

  if (edgeAgents.length) {
    terminalDevices.forEach((id, index) => {
      const target = edgeAgents[index % edgeAgents.length];
      addEdge(id, target.id, {
        color: LINK_COLORS.primary,
        width: 2,
        dashes: [6, 8],
        smooth: getSmoothStyle(index, 0.18),
      });
    });
  }
}

function getNodeStyleForLayer(layer) {
  const style = {
    size: 26,
    borderWidth: 1.8,
    borderColor: "#333",
    shadowColor: "rgba(0, 0, 0, 0.12)",
    shadowSize: 6,
  };

  if (layer === "cloud") {
    style.size = 30;
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

/**
 * 初始化网络拓扑图 - 云边端三层架构（3D层级效果）
 * 三个清晰的3D层，Agent按层放置，连线从上到下逐渐变粗
 */
function initializeNetworkGraph() {
  const container = document.getElementById("networkGraph");
  const layoutMetrics = getLayoutMetrics(container);

  // 准备节点数据 - 按层级布局，根据资源大小调整节点大小
  const nodeItems = agentDatabase.map((agent, index) => {
      const layer = agent.layer || "edge";
      const style = getNodeStyleForLayer(layer);

      // 基础颜色 - 所有Agent都是绿色
      const baseColor = "#1d3f8f";

      // 按层级分组排列节点
      const layerAgents = agentDatabase.filter((a) => a.layer === layer);
      const indexInLayer = layerAgents.findIndex((a) => a.id === agent.id);
      const totalAgents = layerAgents.length;
      const position = getLayerPosition(
        layer,
        indexInLayer,
        totalAgents,
        layoutMetrics
      );

      const label = agent.name;

      return {
        id: agent.id,
        label: label,
        shape: "image",
        image: TOPOLOGY_ICONS.agent,
        color: {
          background: baseColor,
          border: style.borderColor,
          highlight: {
            background: "#3a5fb7",
            border: "#000",
          },
        },
        x: position.x,
        y: position.y,
        size: style.size,
        borderWidth: style.borderWidth,
        physics: false,
        font: {
          size: 12,
          color: "#1d3f8f",
          align: "center",
        vadjust: 8,
          strokeWidth: 3,
          strokeColor: "rgba(247, 249, 252, 0.9)",
        },
        shadow: {
          enabled: true,
          color: style.shadowColor,
          size: style.shadowSize,
          x: 0,
          y: 5,
        },
        title: `<b>${agent.name}</b><br>Layer: ${layer.toUpperCase()}<br>CPU: ${
          agent.cpu
        }%<br>Memory: ${agent.memory}%<br>Resources: ${(
          (agent.cpu + agent.memory) /
          2
        ).toFixed(0)}%`,
        layer: layer,
      };
    });

  nodeItems.push(...createInfraNodes(layoutMetrics));

  const nodes = new vis.DataSet(nodeItems);

  const edgeSet = new vis.DataSet();
  buildTopologyEdges(edgeSet);

  // 获取网络实例的全局引用以支持动态更新
  window.networkGraph = { nodes, edges: edgeSet };

  // 创建网络图
  const data = { nodes: nodes, edges: edgeSet };
  const options = {
    physics: {
      enabled: false, // 禁用物理引擎以使用固定布局
    },
    interaction: {
      navigationButtons: false,
      keyboard: true,
      zoomView: false,
      dragView: false,
      dragNodes: true,
      hover: true,
      tooltipDelay: 200,
    },
    layout: {
      hierarchical: false, // 手动布局
    },
    edges: {
      shadow: {
        enabled: false,
        color: "rgba(0, 0, 0, 0.12)",
        size: 6,
        x: 0,
        y: 3,
      },
    },
  };

  const network = new vis.Network(container, data, options);
  window.networkInstance = network;
  addNetworkLegend();
  alignNetworkView(network);
  applyTopologyLayout(container, nodes, network);
  observeTopologyLayout(container, network);
  requestAnimationFrame(() => syncTopologyLayout(container, network));

  // 事件监听：节点点击时高亮
  network.on("click", function (params) {
    if (params.nodes.length > 0) {
      const selectedNodeId = params.nodes[0];
      highlightNodeInNetwork(selectedNodeId);
    }
  });

  // 添加动态闪烁效果 - 只闪烁在线的agent
  setInterval(() => {
    const activeAgents = agentDatabase.filter((a) => a.status === "active");
    if (activeAgents.length > 0) {
      const randomAgent =
        activeAgents[Math.floor(Math.random() * activeAgents.length)];
      const originalNode = nodes.get(randomAgent.id);
      const originalSize = originalNode.size;
      const originalColor = {
        ...originalNode.color,
        highlight: { ...originalNode.color.highlight },
      };
      const originalShadow = originalNode.shadow
        ? { ...originalNode.shadow }
        : { enabled: false };

      nodes.update({
        id: randomAgent.id,
        size: originalSize * 1.25,
        color: {
          background: originalColor.background,
          border: "#ffd700",
          highlight: {
            background: originalColor.background,
            border: "#000",
          },
        },
        shadow: {
          enabled: true,
          color: "rgba(255, 215, 0, 0.45)",
          size: Math.max(12, originalShadow.size + 4),
          x: 0,
          y: 6,
        },
      });

      setTimeout(() => {
        nodes.update({
          id: randomAgent.id,
          size: originalSize,
          color: originalColor,
          shadow: originalShadow,
        });
      }, 500);
    }
  }, 3000);

  // 添加图例说明

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (!window.networkGraph || !window.networkInstance) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      syncTopologyLayout(container, window.networkInstance);
    }, 120);
  });
}

/**
 * 初始化Discovery过程 - 核心功能
 */
function initializeDiscoveryProcess() {
  const discoveryList = document.getElementById("discoveryList");

  // 默认渲染所有Agent
  renderDiscoveryList(agentDatabase);
}

/**
 * 语义搜索 - 模拟Orchestrator Agent的工作过程
 */
function performSemanticSearch(request) {
  const keywords = request.toLowerCase().split(/\s+/);

  // 计算每个Agent与请求的相关度
  return agentDatabase
    .map((agent) => {
      let score = 0;
      const agentText = (
        agent.name +
        " " +
        agent.description +
        " " +
        agent.capabilities.join(" ")
      ).toLowerCase();

      // 关键词匹配
      keywords.forEach((keyword) => {
        if (agentText.includes(keyword)) {
          score += 10;
        }
      });

      // 能力匹配
      agent.capabilities.forEach((cap) => {
        keywords.forEach((keyword) => {
          if (cap.includes(keyword)) {
            score += 15;
          }
        });
      });

      // 特定能力的权重提升
      if (
        keywords.some((k) => ["video", "analyze", "analysis"].includes(k)) &&
        agent.capabilities.some((c) => c.includes("video"))
      ) {
        score += 20;
      }

      if (
        keywords.some((k) => ["report", "generate", "summary"].includes(k)) &&
        agent.capabilities.some((c) => c.includes("report"))
      ) {
        score += 20;
      }

      if (
        keywords.some((k) => ["process", "data", "processing"].includes(k)) &&
        agent.capabilities.some((c) => c.includes("process"))
      ) {
        score += 15;
      }

      return {
        ...agent,
        matchScore: Math.max(score, Math.floor(Math.random() * 100) + 30),
      };
    })
    .filter((a) => a.matchScore > 20)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 应用过滤条件
 */
function applyFilters() {
  let filtered = [...agentDatabase];

  // 类型过滤
  if (appState.filterType) {
    filtered = filtered.filter((a) => a.type === appState.filterType);
  }

  // 状态过滤
  if (appState.filterStatus) {
    filtered = filtered.filter((a) => a.status === appState.filterStatus);
  }

  // 如果有当前请求，按相关度排序
  if (appState.currentRequest) {
    filtered = performSemanticSearch(appState.currentRequest).filter(
      (agent) => {
        if (appState.filterType && agent.type !== appState.filterType)
          return false;
        if (appState.filterStatus && agent.status !== appState.filterStatus)
          return false;
        return true;
      }
    );
  }

  renderDiscoveryList(filtered);
}

/**
 * 渲染Discovery列表 - Agent Card格式
 */
function renderDiscoveryList(agents) {
  const discoveryList = document.getElementById("discoveryList");
  discoveryList.innerHTML = "";

  agents.forEach((agent, index) => {
    const card = document.createElement("div");
    card.className = "agent-card";

    const typeLabel = agent.type.charAt(0).toUpperCase() + agent.type.slice(1);
    const capabilities = agent.capabilities.slice(0, 2).join(", ");

    // 计算匹配度（如果有）
    const matchScore = agent.matchScore || agent.relevance || 0;
    const relevancePercent = Math.min(100, matchScore);

    card.innerHTML = `
      <div class="agent-card-left">
        <input type="checkbox" class="agent-card-checkbox" id="checkbox-${
          agent.id
        }" data-agent-id="${agent.id}">
        <div class="agent-card-info">
          <div class="agent-card-name">${agent.name}</div>
          <div>
            <span class="agent-card-type ${agent.type}">${typeLabel}</span>
            <span class="agent-card-status ${agent.status}">● ${
      agent.status.charAt(0).toUpperCase() + agent.status.slice(1)
    }</span>
          </div>
          <div class="agent-card-capabilities">${capabilities}</div>
        </div>
      </div>
      <div class="agent-card-right">
        <div class="agent-score">
          <span class="agent-score-label">Match</span>
          <span class="agent-score-value">${relevancePercent}%</span>
          <div class="relevance-bar">
            <div class="relevance-fill" style="width: ${relevancePercent}%"></div>
          </div>
        </div>
      </div>
    `;

    // 处理选择事件
    const checkbox = card.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        appState.selectedAgents.push(agent);
        // 在拓扑图中高亮该Agent
        highlightNodeInNetwork(agent.id);
      } else {
        appState.selectedAgents = appState.selectedAgents.filter(
          (a) => a.id !== agent.id
        );
      }
      updateSelectedAgentsList();
    });

    discoveryList.appendChild(card);
  });
}

/**
 * 更新已选中的Agents显示
 */
function updateSelectedAgentsList() {
  const selectedList = document.getElementById("selectedList");
  selectedList.innerHTML = "";

  appState.selectedAgents.forEach((agent) => {
    const tag = document.createElement("div");
    tag.className = "selected-tag";
    tag.innerHTML = `
      ${agent.name}
      <button onclick="removeSelectedAgent('${agent.id}')" type="button">×</button>
    `;
    selectedList.appendChild(tag);
  });
}

/**
 * 移除已选中的Agent
 */
function removeSelectedAgent(agentId) {
  appState.selectedAgents = appState.selectedAgents.filter(
    (a) => a.id !== agentId
  );

  // 取消对应的checkbox选中状态
  const checkbox = document.getElementById(`checkbox-${agentId}`);
  if (checkbox) {
    checkbox.checked = false;
  }

  updateSelectedAgentsList();
}

/**
 * 从localStorage加载新注册的Agent
 */
function loadNewAgents() {
  const newAgentsData = localStorage.getItem("newAgents");
  if (newAgentsData) {
    try {
      const newAgents = JSON.parse(newAgentsData);
      newAgents.forEach((agent) => {
        // 检查agent是否已存在
        const exists = agentDatabase.some((a) => a.id === agent.id);
        if (!exists) {
          agentDatabase.push(agent);
          // 动态添加到拓扑图
          if (window.networkGraph && window.networkInstance) {
            addAgentToNetwork(agent);
          }
        }
      });

      // 更新统计
      initializeStats();

      // 清空localStorage中的新Agent列表
      localStorage.removeItem("newAgents");

      // 重新渲染Discovery列表
      renderDiscoveryList(agentDatabase);

      console.log("Loaded", newAgents.length, "new agents from localStorage");
    } catch (e) {
      console.error("Error loading new agents:", e);
    }
  }
}

/**
 * 初始化聊天系统
 */
function initializeChatSystem() {
  const userInput = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");
  const messages = document.getElementById("messages");

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMultilineText(text) {
    return escapeHtml(text).replace(/\n/g, "<br>");
  }


  const STREAM_SPEED = {
    slow: 100,
    fast: 60,
  };

  const streamTimers = new WeakMap();

  function streamText(target, text, speed = STREAM_SPEED.slow) {
    const content = text === undefined || text === null ? "" : String(text);
    const existingTimer = streamTimers.get(target);
    if (existingTimer) {
      window.clearInterval(existingTimer);
      streamTimers.delete(target);
    }

    target.textContent = "";
    if (!content) return Promise.resolve();

    let index = 0;
    return new Promise((resolve) => {
      const timer = window.setInterval(() => {
        target.textContent += content[index];
        index += 1;
        messages.scrollTop = messages.scrollHeight;
        if (index >= content.length) {
          window.clearInterval(timer);
          streamTimers.delete(target);
          resolve();
        }
      }, speed);

      streamTimers.set(target, timer);
    });
  }

  function createAssistantMessage() {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message assistant";
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
    return messageDiv;
  }

  function appendLabeledStreamLine(
    container,
    labelText,
    valueText,
    speed = STREAM_SPEED.fast
  ) {
    const line = document.createElement("div");
    const label = document.createElement("strong");
    label.textContent = labelText;
    line.appendChild(label);
    line.appendChild(document.createTextNode(" "));

    const valueSpan = document.createElement("span");
    valueSpan.style.whiteSpace = "pre-wrap";
    line.appendChild(valueSpan);
    container.appendChild(line);

    streamText(valueSpan, valueText, speed);
  }

  function appendStreamBlock(
    container,
    labelText,
    valueText,
    speed = STREAM_SPEED.fast
  ) {
    const label = document.createElement("div");
    const labelStrong = document.createElement("strong");
    labelStrong.textContent = labelText;
    label.appendChild(labelStrong);
    container.appendChild(label);

    const box = document.createElement("div");
    box.style.backgroundColor = "#f5f5f5";
    box.style.padding = "10px";
    box.style.borderRadius = "4px";
    box.style.marginTop = "8px";
    box.style.fontSize = "0.9em";
    box.style.lineHeight = "1.5";
    const valueSpan = document.createElement("span");
    valueSpan.style.whiteSpace = "pre-wrap";
    box.appendChild(valueSpan);
    container.appendChild(box);

    streamText(valueSpan, valueText, speed);
  }

  function appendExecutionTime(container, timeStr) {
    const timeLine = document.createElement("small");
    timeLine.style.color = "#999";
    timeLine.style.marginTop = "8px";
    timeLine.style.display = "block";
    timeLine.textContent = `⏱️ 执行时间: ${timeStr}ms`;
    container.appendChild(timeLine);
  }

  function appendStepMessage(label, content, styleClass, speed = STREAM_SPEED.slow) {
    const messageDiv = createAssistantMessage();
    const inner = document.createElement("div");
    if (styleClass) {
      inner.className = styleClass;
    }

    const labelEl = document.createElement("strong");
    labelEl.textContent = `${label}:`;
    inner.appendChild(labelEl);
    inner.appendChild(document.createElement("br"));

    const contentSpan = document.createElement("span");
    contentSpan.style.whiteSpace = "pre-wrap";
    inner.appendChild(contentSpan);
    messageDiv.appendChild(inner);

    streamText(contentSpan, content, speed);
  }

  // 发送消息
  function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // 添加用户消息到聊天框
    appState.messages.push({ type: "user", text: text });
    displayMessage(text, "user");
    userInput.value = "";

    // 发送请求到后端
    callBackendAPI(text);
  }

  // 调用后端API
  // WebSocket 连接（全局复用，避免每次新建）
  // WebSocket 连接（全局复用）
  // =======================
  // WebSocket 调用后端（干净版）
  // =======================
  let ws = null;
  let wsReadyPromise = null;

  function getWSUrl() {
    // 页面是 https 就必须 wss
    const proto = location.protocol === "https:" ? "wss" : "ws";
  
    // ✅ 推荐：优先用当前域名（同源部署时最省心）
    // return `${proto}://${location.host}/ws`;
  
    // ✅ 你现在后端在 10.200.1.35:8001，就用这个：
    return `${proto}://10.200.1.35:8001/ws`;
  }

  function ensureWSConnection() {
    if (ws && ws.readyState === WebSocket.OPEN) return Promise.resolve(ws);
    if (wsReadyPromise) return wsReadyPromise;

    wsReadyPromise = new Promise((resolve, reject) => {
      ws = new WebSocket(getWSUrl());

      ws.onopen = () => {
        console.log("[WS] ✅ connected");
        resolve(ws);
      };

      ws.onerror = (e) => {
        console.error("[WS] ❌ error", e);
        wsReadyPromise = null;
        reject(
          new Error("WebSocket 连接失败：请确认后端已启动 & ngrok 域名未过期")
        );
      };

      ws.onclose = () => {
        console.warn("[WS] ⚠️ closed");
        ws = null;
        wsReadyPromise = null;
      };
    });

    return wsReadyPromise;
  }

  async function callBackendAPI(userInput) {
    const messages = document.getElementById("messages");

    // loading
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "message assistant";
    loadingDiv.id = "loading-message";
    loadingDiv.innerHTML = "🔄 正在建立实时连接...";
    messages.appendChild(loadingDiv);
    messages.scrollTop = messages.scrollHeight;

    let progressContent = null;
    let spinnerRow = null;
    let progressQueue = Promise.resolve();

    function ensureProgressContent() {
      if (!progressContent) {
        progressContent = document.createElement("div");
        progressContent.className = "progress-content";
        loadingDiv.innerHTML = "";
        loadingDiv.appendChild(progressContent);
      }
      return progressContent;
    }

    function appendProgressStep(label, content, variant) {
      progressQueue = progressQueue.then(() => {
        const container = ensureProgressContent();
        const step = document.createElement("div");
        step.className = variant
          ? `progress-step progress-step--${variant}`
          : "progress-step";

        const labelEl = document.createElement("strong");
        labelEl.textContent = `${label}:`;
        step.appendChild(labelEl);
        step.appendChild(document.createElement("br"));

        const contentSpan = document.createElement("span");
        contentSpan.style.whiteSpace = "pre-wrap";
        step.appendChild(contentSpan);
        container.appendChild(step);

        return streamText(contentSpan, content, STREAM_SPEED.slow);
      });
      return progressQueue;
    }

    function showSpinnerRow() {
      progressQueue = progressQueue.then(() => {
        const container = ensureProgressContent();
        if (spinnerRow) return null;

        spinnerRow = document.createElement("div");
        spinnerRow.className = "progress-step progress-step--spinner";

        const spinner = document.createElement("span");
        spinner.className = "inline-spinner";
        spinnerRow.appendChild(spinner);

        const text = document.createElement("span");
        text.textContent = "正在生成结果...";
        spinnerRow.appendChild(text);

        container.appendChild(spinnerRow);
        return null;
      });
      return progressQueue;
    }

    try {
      const socket = await ensureWSConnection();
      const requestId = `req_${Date.now()}`;

      // 绑定监听（只处理本次 requestId）
      const handleMessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (e) {
          console.warn("[WS] 非JSON消息：", ev.data);
          return;
        }

        if (msg.request_id !== requestId) return;

        console.log(`[WS] ${msg.type}`, msg.data);

        if (msg.type === "ack") {
          if (!progressContent) {
            loadingDiv.innerHTML = "✅ 服务器已确认，正在调度 Agent...";
          }
          return;
        }

        if (msg.type === "routing") {
          if (!progressContent) {
            loadingDiv.innerHTML = "🧭 正在路由最匹配的 Agent...";
          }

          const payload = msg.data

          const selected = payload.selected_agent;
          if (selected?.agent_name) {
            highlightSelectedAgent(selected.agent_name);
            appendProgressStep(
              "路由结果",
              `已选择 Agent：${selected.agent_name}`,
              "routing"
            );
          }
          return;
        }

        if (msg.type === "thought") {
          appendProgressStep("思考", msg.data, "thought");
          return;
        }

        if (msg.type === "rewrite") {
          if (!progressContent) {
            loadingDiv.innerHTML = "✍️ 正在改写提示词并准备执行...";
          }
          if (msg.data?.final_prompt) {
            appendProgressStep("改写提示词", msg.data.final_prompt, "rewrite");
          }
          return;
        }

        if (msg.type === "status") {
          showSpinnerRow();
          return;
        }

        if (msg.type === "log") {
          appendStepMessage("日志", msg.data, "thought-content");
          return;
        }

        if (msg.type === "final") {
          progressQueue = progressQueue.then(() => {
            if (spinnerRow) {
              spinnerRow.remove();
              spinnerRow = null;
            }
            if (loadingDiv && !progressContent) {
              loadingDiv.remove();
            }
            processBackendResponse(msg.data); // ✅ 复用你原有渲染
          });
          socket.removeEventListener("message", handleMessage);
          return;
        }

        if (msg.type === "error") {
          if (loadingDiv) loadingDiv.remove();
          const errorDiv = document.createElement("div");
          errorDiv.className = "message assistant";
          const message = msg.data?.message || msg.message || "unknown";
          errorDiv.innerHTML = `❌ 后端错误: ${message}`;
          messages.appendChild(errorDiv);
          messages.scrollTop = messages.scrollHeight;
          socket.removeEventListener("message", handleMessage);
          return;
        }
      };

      socket.addEventListener("message", handleMessage);

      // 发送 run
      socket.send(
        JSON.stringify({
          type: "run",
          request_id: requestId,
          user_input: userInput,
          top_k: 5,
        })
      );
    } catch (error) {
      if (loadingDiv) loadingDiv.remove();
      const errorDiv = document.createElement("div");
      errorDiv.className = "message assistant";
      errorDiv.innerHTML = `❌ 连接失败: ${error.message}`;
      messages.appendChild(errorDiv);
      messages.scrollTop = messages.scrollHeight;
    }
  }

  // 处理后端响应数据
  function processBackendResponse(data) {
    console.log("Backend response:", data); // Debug日志

    // 检查响应状态（兼容不同格式）
    if (
      data.status === "error" ||
      (data.status && data.status !== "ok" && data.status !== "success")
    ) {
      displayMessage("❌ 后端返回错误状态", "assistant");
      return;
    }

    // 1. 显示思考过程 - 兼容多个字段名
    let thoughtContent = data.thought || data.final_prompt || "";
    if (thoughtContent) {
      const thoughtDiv = document.createElement("div");
      thoughtDiv.className = "message assistant";
      thoughtDiv.innerHTML = `<div class="thought-content"><strong>🧠 处理逻辑:</strong><br>${formatMultilineText(
        thoughtContent
      )}</div>`;
      messages.appendChild(thoughtDiv);
    }

    // 2. 显示最终答案 - 兼容多个字段名和新的answer对象格式
    let hasAnswer = false;
    let answerDiv = null;

    const answerText =
      (typeof data.answer?.text === "string" && data.answer.text.trim()) ||
      (typeof data.answer_text === "string" && data.answer_text.trim()) ||
      "";

      if (typeof data.answer === "object" && data.answer !== null) {
        // answer.images: [{url|data_uri|path}, ...]
        const images = Array.isArray(data.answer.images) ? data.answer.images : [];
      
        // answer.keyframe: {url|data_uri|path} 或 string
        const keyframe = data.answer.keyframe
          ? [data.answer.keyframe]
          : [];
      
        // ✅ structured.images: [{path: "..."}]
        const structuredImages = Array.isArray(data.structured?.images)
          ? data.structured.images
          : [];
      
        // ✅ 合并所有图片来源
        const allImages = [...images, ...keyframe, ...structuredImages].filter(Boolean);
      
      if (answerText || allImages.length) {
        answerDiv = createAssistantMessage();
        const header = document.createElement("div");
        const headerStrong = document.createElement("strong");
        headerStrong.textContent = "📋 分析结果:";
        header.appendChild(headerStrong);
        answerDiv.appendChild(header);
      }

      if (answerText && answerDiv) {
        appendStreamBlock(answerDiv, "📌 结果:", answerText, STREAM_SPEED.fast);
        hasAnswer = true;
      }

      allImages.forEach((image) => {
        const src = image?.data_uri || image?.url;
        if (!src || !answerDiv) return;

        let imageUrl = src;
        if (!imageUrl.startsWith("data:") && !imageUrl.startsWith("http")) {
          imageUrl =
            "https://andree-unwistful-ilene.ngrok-free.dev" +
            (imageUrl.startsWith("/") ? "" : "/") +
            imageUrl;
        }

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = "结果图片";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "300px";
        img.style.borderRadius = "6px";
        img.style.margin = "8px 0";
        img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
        img.onerror = () => {
          img.src =
            "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctext x=%2220%22 y=%2235%22 font-size=%2220%22%3E图片加载失败%3C/text%3E%3C/svg%3E";
        };
        answerDiv.appendChild(img);
        hasAnswer = true;
      });
    } else if (answerText) {
      answerDiv = createAssistantMessage();
      appendStreamBlock(answerDiv, "📋 结果:", answerText, STREAM_SPEED.fast);
      hasAnswer = true;
    }

    if (hasAnswer && answerDiv) {
      const executionTime =
        data.execution_time ||
        (data.result && data.result.execution_time) ||
        "N/A";
      const timeStr =
        typeof executionTime === "number"
          ? executionTime.toFixed(2)
          : executionTime;
      appendExecutionTime(answerDiv, timeStr);
    }

    // 3. 更新右侧Discovery列表 - 兼容多个字段名
    // 3. 更新右侧Discovery列表 - ✅兼容 routing:{candidates:[]}, routing:[], candidates:[]
    const candidates =
    (Array.isArray(data.candidates) && data.candidates) ||
    (Array.isArray(data.routing) && data.routing) ||
    (Array.isArray(data.routing?.candidates) && data.routing.candidates) ||
    [];

    if (candidates.length) {
    updateDiscoveryListFromBackend(candidates);
    }

    // 4. 高亮拓扑图中被选中的Agent - ✅兼容 agent.selected / best_match / selected_agent
    const selectedAgentName =
    data.best_match?.agent_name ||
    data.selected_agent?.agent_name ||
    data.agent?.selected ||          // 你后端示例里是 agent.selected
    data.agent_name ||
    "";

    if (selectedAgentName) {
    highlightSelectedAgent(selectedAgentName);
    }


    messages.scrollTop = messages.scrollHeight;
  }

  // 根据后端数据更新Discovery列表（兼容routing和candidates格式）
  // 根据后端数据更新Discovery列表（兼容routing和candidates格式）
function updateDiscoveryListFromBackend(candidates) {
  const discoveryList = document.getElementById("discoveryList");
  discoveryList.innerHTML = "";

  if (!Array.isArray(candidates)) {
    console.warn("candidates is not an array:", candidates);
    return;
  }

  candidates.forEach((item) => {
    const card = document.createElement("div");
    card.className = "agent-card";

    // 1) 统一：优先使用后端给的 match_pct（约定它永远是 0-100 的“百分比”）
    let matchPercent = NaN;

    if (item.match_pct !== undefined && item.match_pct !== null) {
      const s = String(item.match_pct).trim();
      matchPercent = s.includes("%") ? Number(s.replace("%", "")) : Number(s);
    } else if (item.match !== undefined && item.match !== null) {
      const m = Number(item.match);
      matchPercent = Number.isFinite(m) ? m * 100 : NaN;
    } else if (item.confidence !== undefined && item.confidence !== null) {
      const confStr = String(item.confidence).trim();
      if (confStr.includes("%")) {
        matchPercent = Number(confStr.replace("%", ""));
      } else {
        matchPercent = Number(confStr);
      }
    }

    if (!Number.isFinite(matchPercent)) matchPercent = 0;
    matchPercent = Math.max(0, Math.min(100, matchPercent));

    // 2) clamp 但不 round（保持与后端一致）
    matchPercent = Math.max(0, Math.min(100, matchPercent));

    // 3) 展示格式（只影响文本，不影响后端匹配）
    const matchLabel = matchPercent.toFixed(2).replace(/\.00$/, ""); // 23.90 / 24 / 19.65

    const capability = item.capability || "未知功能";

    let shortDesc = "";
    if (item.description) {
      const descParts = item.description.split("|");
      shortDesc = descParts.length > 2 ? descParts[2].trim() : item.description.substring(0, 50);
    }

    card.innerHTML = `
      <input type="checkbox" class="agent-card-checkbox" data-agent-id="${item.agent_name}" data-agent-name="${item.agent_name}">
      <div class="agent-card-info">
        <div class="agent-card-name">${item.agent_name}</div>
        <div style="margin-bottom: 4px;">
          <span class="agent-card-type agent">${capability}</span>
        </div>
        <div class="agent-card-capabilities">${shortDesc}</div>
      </div>
      <div class="agent-card-score">
        <div class="agent-score">
          <span class="agent-score-label">匹配度</span>
          <span class="agent-score-value">${matchLabel}%</span>
          <div class="relevance-bar">
            <div class="relevance-fill" style="width: ${matchPercent}%"></div>
          </div>
        </div>
      </div>
    `;

    const checkbox = card.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        const agentName = e.target.dataset.agentName;
        const agent = agentDatabase.find((a) => a.name === agentName || a.id === agentName);
        if (agent) highlightNodeInNetwork(agent.id);
      }
    });

    discoveryList.appendChild(card);
  });
}


  // 高亮被选中的Agent
  function highlightSelectedAgent(agentName) {
    const agent = agentDatabase.find((a) => a.name === agentName || a.id === agentName);
    if (agent) {
      // 高亮拓扑图中的节点
      highlightNodeInNetwork(agent.id);

      // 更新右侧Selected Agents列表
      if (!appState.selectedAgents.find((a) => a.id === agent.id)) {
        appState.selectedAgents.push(agent);
        updateSelectedAgentsList();
      }
    }
  }

  // 显示消息
  function displayMessage(text, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = text;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  // 生成AI回复 - 同时更新Discovery列表

  sendButton.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // 欢迎消息
  displayMessage(
    "👋 欢迎使用 IOA 平台！\n\n• 使用<strong>Discovery Process</strong>来搜索和选择 Agent\n• 点击<strong>Register Agent</strong>注册新的 Agent\n• 在此与 Orchestrator Agent 进行交互",
    "assistant"
  );
}

/**
 * 添加网络拓扑图的图例说明和层级标签
 */
function addNetworkLegend() {
  const container = document.getElementById("networkGraph");

  if (!container.querySelector(".topology-layers")) {
    const layers = document.createElement("div");
    layers.className = "topology-layers";

    const layerMeta = {
      cloud: { icon: "☁️", title: "CLOUD LAYER", sub: "高性能计算" },
      edge: { icon: "🌐", title: "EDGE LAYER", sub: "中等处理" },
      terminal: { icon: "📱", title: "TERMINAL LAYER", sub: "本地处理" },
    };

    ["cloud", "edge", "terminal"].forEach((layerName) => {
      const band = document.createElement("div");
      band.className = `topology-band topology-band--${layerName}`;

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

/**
 * 高亮拓扑图中的节点 - 当Agent被选中时调用
 */
function highlightNodeInNetwork(nodeId) {
  if (!window.networkInstance) return;

  // 获取节点信息
  const agent = agentDatabase.find((a) => a.id === nodeId);
  if (!agent) return;
  const layer = agent.layer || "edge";
  const baseStyle = getNodeStyleForLayer(layer);
  const highlightSize = Math.max(baseStyle.size * 1.6, baseStyle.size + 8);

  // 高亮该节点
  window.networkGraph.nodes.update({
    id: nodeId,
    size: highlightSize,
    color: {
      background: window.networkGraph.nodes.get(nodeId).color.background,
      border: "#FFD700",
      highlight: {
        background: window.networkGraph.nodes.get(nodeId).color.background,
        border: "#000",
      },
    },
    borderWidth: baseStyle.borderWidth + 1.8,
    shadow: {
      enabled: true,
      color: "rgba(255, 215, 0, 0.5)",
      size: 12,
      x: 5,
      y: 5,
    },
  });

  // 高亮相关的边
  const edges = window.networkGraph.edges.get({
    filter: (edge) => edge.from === nodeId || edge.to === nodeId,
  });

  edges.forEach((edge) => {
    window.networkGraph.edges.update({
      id: edge.id,
      width: 4,
      color: { color: "#FFD700", highlight: "#FFD700" },
    });
  });

  // 3秒后取消高亮
  setTimeout(() => {
    window.networkGraph.nodes.update({
      id: nodeId,
      size: baseStyle.size,
      color: {
        background: "#1d3f8f",
        border: baseStyle.borderColor,
        highlight: {
          background: "#3a5fb7",
          border: "#000",
        },
      },
      borderWidth: baseStyle.borderWidth,
      shadow: {
        enabled: true,
        color: baseStyle.shadowColor,
        size: baseStyle.shadowSize,
        x: 0,
        y: 4,
      },
    });

    edges.forEach((edge) => {
      const originalEdge = window.networkGraph.edges.get(edge.id);
      window.networkGraph.edges.update({
        id: edge.id,
        width: originalEdge.width || 2,
        color: {
          color: originalEdge.color.color || "#bbb",
          highlight: originalEdge.color.highlight || "#1a73e8",
        },
      });
    });
  }, 3000);
}

/**
 * 动态添加新Agent到拓扑图
 */
function addAgentToNetwork(agent) {
  if (!window.networkGraph || !window.networkInstance) {
    console.error("Network graph not initialized");
    return;
  }

  const layer = agent.layer || "edge";
  const style = getNodeStyleForLayer(layer);
  const baseColor = "#1d3f8f";
  const layerAgents = agentDatabase.filter((a) => a.layer === layer);
  const indexInLayer = layerAgents.findIndex((a) => a.id === agent.id);
  const totalAgents = layerAgents.length;
  const container = document.getElementById("networkGraph");
  const position = resolveAgentPosition(
    container,
    window.networkInstance,
    agent,
    indexInLayer,
    totalAgents
  );

  const label = agent.name;

  // 添加节点
  window.networkGraph.nodes.add({
    id: agent.id,
    label: label,
    shape: "image",
    image: TOPOLOGY_ICONS.agent,
    color: {
      background: baseColor,
      border: style.borderColor,
      highlight: {
        background: "#3a5fb7",
        border: "#000",
      },
    },
    x: position.x,
    y: position.y,
    size: style.size,
    borderWidth: style.borderWidth,
    physics: false,
    font: {
      size: 12,
      color: baseColor,
      align: "center",
      vadjust: 8,
      strokeWidth: 3,
      strokeColor: "rgba(247, 249, 252, 0.9)",
    },
    shadow: {
      enabled: true,
      color: style.shadowColor,
      size: style.shadowSize,
      x: 0,
      y: 4,
    },
    title: `<b>${agent.name}</b><br>Layer: ${layer.toUpperCase()}<br>CPU: ${
      agent.cpu
    }%<br>Memory: ${agent.memory}%<br>Resources: ${(
      (agent.cpu + agent.memory) /
      2
    ).toFixed(0)}%`,
    layer: layer,
  });

  buildTopologyEdges(window.networkGraph.edges);

  syncTopologyLayout(container, window.networkInstance);

  console.log("Added agent to network:", agent.name);
}
