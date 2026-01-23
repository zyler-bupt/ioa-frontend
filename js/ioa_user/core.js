/**
 * core.js
 * - 数据源（agentDatabase）
 * - 资源/图标常量
 * - 全局状态 appState
 * - 通用工具（clamp 等）
 */

(function () {
    // 模拟数据 - Agent列表（云边端三层架构）
    const agentDatabase = [
      {
        id: "agent-video",
        name: "VideoAgent",
        displayName: "VideoAgent",
        nodeLabel: "cloud-hz-03",
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
        displayName: "RegistryAgent",
        nodeLabel: "cloud-bj-01",
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
        displayName: "DiscoveryAgent",
        nodeLabel: "cloud-sh-01",
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
        displayName: "MetrologyAgent",
        nodeLabel: "edge-bj-01",
        type: "agent",
        status: "active",
        layer: "edge",
        cpu: 58,
        memory: 68,
        capabilities: ["weather analysis", "climate prediction", "data integration"],
        description: "Edge-layer agent for meteorological data analysis",
        relevance: 0,
      },
      {
        id: "agent-keyframe",
        name: "KeyframeAgent",
        displayName: "KeyframeAgent",
        nodeLabel: "edge-bj-02",
        type: "agent",
        status: "active",
        layer: "edge",
        cpu: 48,
        memory: 58,
        capabilities: ["keyframe extraction", "scene detection", "thumbnail generation"],
        description: "Edge-layer agent for extracting key frames from video streams",
        relevance: 0,
      },
      {
        id: "agent-map",
        name: "MapAgent",
        displayName: "MapAgent",
        nodeLabel: "edge-sh-01",
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
        displayName: "ReportAgent",
        nodeLabel: "edge-gz-01",
        type: "agent",
        status: "active",
        layer: "edge",
        cpu: 72,
        memory: 80,
        capabilities: ["report generation", "data visualization", "comprehensive analysis", "export formatting"],
        description: "Edge-layer agent for generating structured reports from processed data",
        relevance: 0,
      },
    ];
  
    const svgToDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    const assetUrl = (fileName) => encodeURI(`img/${fileName}`);
  
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
      rack01: assetUrl("机柜01.svg"),
      agent01: assetUrl("Agent02.svg"),
      server01: assetUrl("server01.svg"),
    };
  
    const LAYER_IMAGES = {};
    const LAYER_ANCHORS = { cloud: [], edge: [], terminal: [] };
  
    const INFRA_NODE_META = {
      "infra-cloud-bot-left": { image: TOPOLOGY_ICONS.agent01, size: 22, label: "VideoAgent", labelOffset: 12, labelSize: 10 },
      "infra-cloud-bot-mid": { image: TOPOLOGY_ICONS.agent01, size: 22, label: "RegistryAgent", labelOffset: 12, labelSize: 10 },
      "infra-cloud-server": { image: TOPOLOGY_ICONS.agent01, size: 22, label: "DiscoveryAgent", labelOffset: 12, labelSize: 10 },
      "infra-cloud-server-agent01": { image: TOPOLOGY_ICONS.agent01, size: 20, label: "" },
  
      "infra-edge-server-left": { image: TOPOLOGY_ICONS.server, size: 22, label: "Server", labelOffset: -12, labelSize: 9 },
      "infra-edge-server-right": { image: TOPOLOGY_ICONS.server, size: 22, label: "Server", labelOffset: -12, labelSize: 9 },
      "infra-edge-server-left-agent01": { image: TOPOLOGY_ICONS.agent01, size: 20, label: "" },
      "infra-edge-server-right-agent01": { image: TOPOLOGY_ICONS.agent01, size: 20, label: "" },
  
      "infra-edge-gateway-left": { image: TOPOLOGY_ICONS.gateway, size: 24, label: "Gateway", labelOffset: 12, labelSize: 9 },
      "infra-edge-gateway-right": { image: TOPOLOGY_ICONS.gateway, size: 24, label: "Gateway", labelOffset: 12, labelSize: 9 },
  
      "infra-terminal-user-left": { image: TOPOLOGY_ICONS.user, size: 22, label: "User" },
      "infra-terminal-phone-left": { image: TOPOLOGY_ICONS.phone, size: 22, label: "Phone" },
      "infra-terminal-user-right": { image: TOPOLOGY_ICONS.user, size: 22, label: "User" },
      "infra-terminal-desktop-left": { image: TOPOLOGY_ICONS.desktop, size: 22, label: "Desktop" },
      "infra-terminal-desktop-right": { image: TOPOLOGY_ICONS.desktop, size: 22, label: "Desktop" },
      "infra-terminal-phone-right": { image: TOPOLOGY_ICONS.phone, size: 22, label: "Phone" },
    };
  
    const LINK_COLORS = { primary: "#ff6d2d", secondary: "#ffb48f", highlight: "#ff3d00" };
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
  
    function clampValue(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
  
    // 暴露到全局（供其他文件使用）
    window.agentDatabase = agentDatabase;
    window.appState = appState;
  
    window.svgToDataUri = svgToDataUri;
    window.TOPOLOGY_ICONS = TOPOLOGY_ICONS;
    window.LAYER_IMAGES = LAYER_IMAGES;
    window.LAYER_ANCHORS = LAYER_ANCHORS;
  
    window.INFRA_NODE_META = INFRA_NODE_META;
    window.LINK_COLORS = LINK_COLORS;
    window.IN_LAYER_COLOR = IN_LAYER_COLOR;
  
    window.clampValue = clampValue;
  })();
  
