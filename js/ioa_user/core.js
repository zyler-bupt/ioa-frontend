/**
 * core.js
 * - 数据源（agentDatabase）
 * - 资源/图标常量
 * - 全局状态 appState
 * - 通用工具（clamp 等）
 */

(function () {
    const CLOUD_CLUSTER_NODE_ID = "cloud-cluster-01";
    const CLOUD_CLUSTER_NODE_IDS = ["cloud-cluster-01", "cloud-cluster-02", "cloud-cluster-03"];
    const LEGACY_CLOUD_NODE_IDS = new Set(["cloud-hz-03", "cloud-bj-01", "cloud-sh-01"]);

    function normalizeAgentNodeId(nodeId, fallbackLayer) {
      const raw = String(nodeId || "").trim();
      if (LEGACY_CLOUD_NODE_IDS.has(raw)) return CLOUD_CLUSTER_NODE_ID;
      if (!raw && fallbackLayer === "cloud") return CLOUD_CLUSTER_NODE_ID;
      return raw;
    }

    // 模拟数据 - Agent列表（云边端三层架构）
    const agentDatabase = [
      {
        id: "agent-video",
        name: "VideoAgent",
        displayName: "VideoAgent",
        nodeLabel: CLOUD_CLUSTER_NODE_ID,
        node_id: CLOUD_CLUSTER_NODE_ID,
        type: "agent",
        status: "active",
        layer: "cloud",
        isExtension: true,
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
        nodeLabel: CLOUD_CLUSTER_NODE_ID,
        node_id: CLOUD_CLUSTER_NODE_ID,
        type: "agent",
        status: "active",
        layer: "cloud",
        isExtension: true,
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
        nodeLabel: "cloud-cluster-02",
        node_id: "cloud-cluster-02",
        type: "agent",
        status: "active",
        layer: "cloud",
        isExtension: true,
        cpu: 59,
        memory: 66,
        capabilities: ["semantic search", "routing", "capability matching"],
        description: "Cloud-layer agent for discovery and routing decisions",
        relevance: 0,
      },
      {
        id: "agent-meteorology",
        name: "MeteorologyAgent",
        displayName: "MeteorologyAgent",
        nodeLabel: "edge-bj-01",
        node_id: "edge-bj-01",
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
        node_id: "edge-bj-02",
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
        node_id: "edge-sh-01",
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
        node_id: "edge-gz-01",
        type: "agent",
        status: "active",
        layer: "edge",
        cpu: 72,
        memory: 80,
        capabilities: ["report generation", "data visualization", "comprehensive analysis", "export formatting"],
        description: "Edge-layer agent for generating structured reports from processed data",
        relevance: 0,
      },
      {
        id: "agent-traffic",
        name: "TrafficAgent",
        displayName: "TrafficAgent",
        nodeLabel: "edge-cd-01",
        node_id: "edge-cd-01",
        type: "agent",
        status: "active",
        layer: "edge",
        cpu: 61,
        memory: 70,
        capabilities: ["traffic analysis", "flow optimization", "congestion prediction"],
        description: "Edge-layer agent for network traffic analysis and optimization",
        relevance: 0,
      },
      {
        id: "agent-sensor",
        name: "SensorAgent",
        displayName: "SensorAgent",
        nodeLabel: "edge-cd-02",
        node_id: "edge-cd-02",
        type: "agent",
        status: "active",
        layer: "edge",
        cpu: 44,
        memory: 56,
        capabilities: ["IoT sensor aggregation", "anomaly detection", "device telemetry"],
        description: "Edge-layer agent for IoT sensor data aggregation and analysis",
        relevance: 0,
      },
      {
        id: "agent-nlp",
        name: "NLPAgent",
        displayName: "NLPAgent",
        nodeLabel: "edge-wh-01",
        node_id: "edge-wh-01",
        type: "agent",
        status: "active",
        layer: "edge",
        cpu: 67,
        memory: 74,
        capabilities: ["text analysis", "entity extraction", "sentiment analysis"],
        description: "Edge-layer agent for natural language processing tasks",
        relevance: 0,
      },
      {
        id: "agent-audio",
        name: "AudioAgent",
        displayName: "AudioAgent",
        nodeLabel: "edge-wh-02",
        node_id: "edge-wh-02",
        type: "agent",
        status: "active",
        layer: "edge",
        cpu: 56,
        memory: 65,
        capabilities: ["audio processing", "speech recognition", "sound classification"],
        description: "Edge-layer agent for audio stream processing and recognition",
        relevance: 0,
      },
      {
        id: "agent-edge-bj-ops-01",
        name: "EdgeOpsAgent",
        displayName: "EdgeOpsAgent",
        nodeLabel: "edge-bj-01",
        node_id: "edge-bj-01",
        type: "agent",
        status: "active",
        layer: "edge",
        isExtension: true,
        cpu: 46,
        memory: 57,
        capabilities: ["ops telemetry", "runtime diagnostics", "health triage"],
        description: "Extension agent for edge operational telemetry analysis",
        relevance: 0,
        createdAt: 1001,
      },
      {
        id: "agent-edge-bj-vision-02",
        name: "EdgeVisionAgent",
        displayName: "EdgeVisionAgent",
        nodeLabel: "edge-bj-01",
        node_id: "edge-bj-01",
        type: "agent",
        status: "active",
        layer: "edge",
        isExtension: true,
        cpu: 51,
        memory: 63,
        capabilities: ["image enhancement", "anomaly spotting", "multi-view fusion"],
        description: "Extension agent for edge visual signal enhancement",
        relevance: 0,
        createdAt: 1002,
      },
      {
        id: "agent-edge-bj-stream-03",
        name: "StreamGuardAgent",
        displayName: "StreamGuardAgent",
        nodeLabel: "edge-bj-02",
        node_id: "edge-bj-02",
        type: "agent",
        status: "active",
        layer: "edge",
        isExtension: true,
        cpu: 45,
        memory: 55,
        capabilities: ["stream QoS", "packet diagnostics", "latency mitigation"],
        description: "Extension agent for stream quality and packet diagnostics",
        relevance: 0,
        createdAt: 1003,
      },
      {
        id: "agent-edge-sh-spatial-04",
        name: "SpatialLinkAgent",
        displayName: "SpatialLinkAgent",
        nodeLabel: "edge-sh-01",
        node_id: "edge-sh-01",
        type: "agent",
        status: "active",
        layer: "edge",
        isExtension: true,
        cpu: 49,
        memory: 61,
        capabilities: ["spatial joins", "route scoring", "corridor analysis"],
        description: "Extension agent for spatial route intelligence",
        relevance: 0,
        createdAt: 1004,
      },
      {
        id: "agent-edge-gz-dispatch-05",
        name: "DispatchLinkAgent",
        displayName: "DispatchLinkAgent",
        nodeLabel: "edge-gz-01",
        node_id: "edge-gz-01",
        type: "agent",
        status: "active",
        layer: "edge",
        isExtension: true,
        cpu: 44,
        memory: 53,
        capabilities: ["dispatch orchestration", "priority routing", "feedback aggregation"],
        description: "Extension agent for dispatch-side execution routing",
        relevance: 0,
        createdAt: 1005,
      },
      {
        id: "agent-edge-cd-flow-06",
        name: "FlowControlAgent",
        displayName: "FlowControlAgent",
        nodeLabel: "edge-cd-01",
        node_id: "edge-cd-01",
        type: "agent",
        status: "active",
        layer: "edge",
        isExtension: true,
        cpu: 42,
        memory: 52,
        capabilities: ["flow control", "rate limiting", "bandwidth allocation"],
        description: "Extension agent for traffic flow control and rate management",
        relevance: 0,
        createdAt: 1011,
      },
      {
        id: "agent-edge-cd-iot-07",
        name: "IoTBridgeAgent",
        displayName: "IoTBridgeAgent",
        nodeLabel: "edge-cd-02",
        node_id: "edge-cd-02",
        type: "agent",
        status: "active",
        layer: "edge",
        isExtension: true,
        cpu: 38,
        memory: 48,
        capabilities: ["protocol bridging", "device pairing", "signal normalization"],
        description: "Extension agent for IoT device protocol bridging",
        relevance: 0,
        createdAt: 1012,
      },
      {
        id: "agent-edge-wh-text-08",
        name: "TextMiningAgent",
        displayName: "TextMiningAgent",
        nodeLabel: "edge-wh-01",
        node_id: "edge-wh-01",
        type: "agent",
        status: "active",
        layer: "edge",
        isExtension: true,
        cpu: 50,
        memory: 59,
        capabilities: ["text mining", "keyword extraction", "document clustering"],
        description: "Extension agent for advanced text mining and clustering",
        relevance: 0,
        createdAt: 1013,
      },
      {
        id: "agent-edge-wh-voice-09",
        name: "VoiceAnalyticsAgent",
        displayName: "VoiceAnalyticsAgent",
        nodeLabel: "edge-wh-02",
        node_id: "edge-wh-02",
        type: "agent",
        status: "active",
        layer: "edge",
        isExtension: true,
        cpu: 46,
        memory: 55,
        capabilities: ["voice analytics", "speaker identification", "emotion detection"],
        description: "Extension agent for voice signal analytics and identification",
        relevance: 0,
        createdAt: 1014,
      },
      {
        id: "agent-cloud-governance-06",
        name: "ClusterGovernanceAgent",
        displayName: "ClusterGovernanceAgent",
        nodeLabel: "cloud-cluster-03",
        node_id: "cloud-cluster-03",
        type: "agent",
        status: "active",
        layer: "cloud",
        isExtension: true,
        cpu: 43,
        memory: 56,
        capabilities: ["cluster governance", "quota policy", "cross-region audit"],
        description: "Extension agent for cloud-cluster governance and policy checks",
        relevance: 0,
        createdAt: 1006,
      },
      {
        id: "agent-cloud-storage-07",
        name: "StorageAgent",
        displayName: "StorageAgent",
        nodeLabel: "cloud-cluster-02",
        node_id: "cloud-cluster-02",
        type: "agent",
        status: "active",
        layer: "cloud",
        isExtension: true,
        cpu: 47,
        memory: 58,
        capabilities: ["distributed storage", "replication", "data sharding"],
        description: "Cloud-layer agent for distributed storage management",
        relevance: 0,
        createdAt: 1007,
      },
      {
        id: "agent-cloud-scheduler-08",
        name: "SchedulerAgent",
        displayName: "SchedulerAgent",
        nodeLabel: "cloud-cluster-02",
        node_id: "cloud-cluster-02",
        type: "agent",
        status: "active",
        layer: "cloud",
        isExtension: true,
        cpu: 52,
        memory: 60,
        capabilities: ["task scheduling", "load balancing", "queue management"],
        description: "Cloud-layer agent for task scheduling and load balancing",
        relevance: 0,
        createdAt: 1008,
      },
      {
        id: "agent-cloud-security-09",
        name: "SecurityAgent",
        displayName: "SecurityAgent",
        nodeLabel: "cloud-cluster-03",
        node_id: "cloud-cluster-03",
        type: "agent",
        status: "active",
        layer: "cloud",
        isExtension: true,
        cpu: 41,
        memory: 54,
        capabilities: ["threat detection", "access control", "encryption management"],
        description: "Cloud-layer agent for security monitoring and access control",
        relevance: 0,
        createdAt: 1009,
      },
      {
        id: "agent-cloud-analytics-10",
        name: "AnalyticsAgent",
        displayName: "AnalyticsAgent",
        nodeLabel: "cloud-cluster-03",
        node_id: "cloud-cluster-03",
        type: "agent",
        status: "active",
        layer: "cloud",
        isExtension: true,
        cpu: 55,
        memory: 63,
        capabilities: ["data aggregation", "stream analytics", "trend analysis"],
        description: "Cloud-layer agent for data aggregation and stream analytics",
        relevance: 0,
        createdAt: 1010,
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
      rack01: assetUrl("云端,云,云服务.svg"),
      agent01: assetUrl("Agent02.svg"),
      server01: assetUrl("server01.svg"),
    };
  
    const LAYER_IMAGES = {};
    const LAYER_ANCHORS = { cloud: [], edge: [], terminal: [] };

    const TERMINAL_INFRA_IDS = [
      "infra-terminal-phone-1",
      "infra-terminal-desktop-1",
      "infra-terminal-phone-2",
      "infra-terminal-desktop-2",
      "infra-terminal-phone-3",
      "infra-terminal-desktop-3",
      "infra-terminal-smartagent-1",
      "infra-terminal-smartagent-2",
      "infra-terminal-smartagent-3",
    ];
  
    const INFRA_NODE_META = {
      [CLOUD_CLUSTER_NODE_ID]: {
        image: TOPOLOGY_ICONS.rack01,
        size: 30,
        label: "Cloud Cluster 01",
        labelOffset: 12,
        labelSize: 11,
      },
      "cloud-cluster-02": {
        image: TOPOLOGY_ICONS.rack01,
        size: 30,
        label: "Cloud Cluster 02",
        labelOffset: 12,
        labelSize: 11,
      },
      "cloud-cluster-03": {
        image: TOPOLOGY_ICONS.rack01,
        size: 30,
        label: "Cloud Cluster 03",
        labelOffset: 12,
        labelSize: 11,
      },

      "infra-edge-server-left": { image: TOPOLOGY_ICONS.server, size: 22, label: "Server", labelOffset: -12, labelSize: 9 },
      "infra-edge-server-right": { image: TOPOLOGY_ICONS.server, size: 22, label: "Server", labelOffset: -12, labelSize: 9 },
      "infra-edge-server-left-agent01": { image: TOPOLOGY_ICONS.agent01, size: 20, label: "" },
      "infra-edge-server-right-agent01": { image: TOPOLOGY_ICONS.agent01, size: 20, label: "" },
  
      "infra-edge-gateway-left": { image: TOPOLOGY_ICONS.gateway, size: 24, label: "Gateway", labelOffset: 12, labelSize: 9 },
      "infra-edge-gateway-right": { image: TOPOLOGY_ICONS.gateway, size: 24, label: "Gateway", labelOffset: 12, labelSize: 9 },

      "infra-terminal-phone-1": { image: TOPOLOGY_ICONS.phone, size: 22, label: "Phone" },
      "infra-terminal-desktop-1": { image: TOPOLOGY_ICONS.desktop, size: 22, label: "Desktop" },
      "infra-terminal-phone-2": { image: TOPOLOGY_ICONS.phone, size: 22, label: "Phone" },
      "infra-terminal-desktop-2": { image: TOPOLOGY_ICONS.desktop, size: 22, label: "Desktop" },
      "infra-terminal-phone-3": { image: TOPOLOGY_ICONS.phone, size: 22, label: "Phone" },
      "infra-terminal-desktop-3": { image: TOPOLOGY_ICONS.desktop, size: 22, label: "Desktop" },
      "infra-terminal-smartagent-1": { image: TOPOLOGY_ICONS.agent01, size: 20, label: "Smart Agent" },
      "infra-terminal-smartagent-2": { image: TOPOLOGY_ICONS.agent01, size: 20, label: "Smart Agent" },
      "infra-terminal-smartagent-3": { image: TOPOLOGY_ICONS.agent01, size: 20, label: "Smart Agent" },
    };
  
    const LINK_COLORS = { primary: "#ff6d2d", secondary: "#ffb48f", highlight: "#ff3d00" };
    const IN_LAYER_COLOR = "#f2a14b";
  
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
    window.CLOUD_CLUSTER_NODE_ID = CLOUD_CLUSTER_NODE_ID;
    window.CLOUD_CLUSTER_NODE_IDS = CLOUD_CLUSTER_NODE_IDS;
    window.TERMINAL_INFRA_IDS = TERMINAL_INFRA_IDS;
    window.normalizeAgentNodeId = normalizeAgentNodeId;
    window.LINK_COLORS = LINK_COLORS;
    window.IN_LAYER_COLOR = IN_LAYER_COLOR;
  
    window.clampValue = clampValue;
  })();
  
