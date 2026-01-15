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
    layer: "terminal",
    cpu: 65,
    memory: 72,
    capabilities: [
      "video analysis",
      "object detection",
      "frame extraction",
      "real-time streaming",
    ],
    description:
      "Terminal-layer agent for video processing and analysis at the edge",
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
    id: "agent-meteorology",
    name: "MeteorologyAgent",
    type: "agent",
    status: "active",
    layer: "cloud",
    cpu: 58,
    memory: 68,
    capabilities: [
      "weather analysis",
      "climate prediction",
      "data integration",
    ],
    description: "Cloud-layer agent for meteorological data analysis",
    relevance: 0,
  },
  {
    id: "agent-report",
    name: "ReportAgent",
    type: "agent",
    status: "active",
    layer: "cloud",
    cpu: 72,
    memory: 80,
    capabilities: [
      "report generation",
      "data visualization",
      "comprehensive analysis",
      "export formatting",
    ],
    description:
      "Cloud-layer agent for generating comprehensive reports from processed data",
    relevance: 0,
  },
];

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
  initializeResourceChart();
  initializeDiscoveryProcess();
  initializeChatSystem();

  // 检查是否有新注册的Agent
  loadNewAgents();

  // 初始化实时时间显示
  updateSystemTime();
  setInterval(updateSystemTime, 1000);

  console.log("IOA Application Ready!");
});

/**
 * 更新系统实时时间
 */
function updateSystemTime() {
  const now = new Date();
  const timeString = now.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  document.getElementById("systemTime").textContent = timeString;
}

/**
 * 初始化顶部统计数据
 */
function initializeStats() {
  const agents = agentDatabase.filter((a) => a.type === "agent");
  const cloudAgents = agents.filter((a) => a.layer === "cloud");
  const edgeAgents = agents.filter((a) => a.layer === "edge");
  const terminalAgents = agents.filter((a) => a.layer === "terminal");

  document.getElementById("totalNodes").textContent = agentDatabase.length;
  document.getElementById("agentCount").textContent = agents.length;
  document.getElementById("llmCount").textContent = cloudAgents.length;
  document.getElementById("toolCount").textContent = edgeAgents.length;
  document.getElementById("computeCount").textContent = terminalAgents.length;
}

/**
 * 获取三层拓扑中每个节点的位置
 */
function getLayoutMetrics(container) {
  const bounds = container.getBoundingClientRect();
  const width = Math.max(bounds.width || 0, 520);
  const height = Math.max(bounds.height || 0, 420);
  const verticalGap = Math.max(160, Math.min(260, height * 0.28));
  const minSpacing = Math.max(150, width * 0.18);
  const maxSpacing = Math.max(minSpacing + 10, Math.min(340, width * 0.34));
  const paddingX = Math.max(30, width * 0.08);

  return {
    width,
    height,
    verticalGap,
    minSpacing,
    maxSpacing,
    paddingX,
  };
}

function getLayerPosition(layer, indexInLayer, totalAgents, metrics) {
  const layerY = {
    cloud: -metrics.verticalGap,
    edge: 0,
    terminal: metrics.verticalGap,
  };

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

function applyTopologyLayout(container, nodes) {
  const metrics = getLayoutMetrics(container);
  const layerGroups = { cloud: [], edge: [], terminal: [] };

  agentDatabase.forEach((agent) => {
    const layer = layerGroups[agent.layer] ? agent.layer : "edge";
    layerGroups[layer].push(agent);
  });

  const updates = [];
  Object.entries(layerGroups).forEach(([layer, agents]) => {
    const total = agents.length;
    agents.forEach((agent, index) => {
      const position = getLayerPosition(layer, index, total, metrics);
      updates.push({ id: agent.id, x: position.x, y: position.y });
    });
  });

  nodes.update(updates);
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

/**
 * 初始化网络拓扑图 - 云边端三层架构（3D层级效果）
 * 三个清晰的3D层，Agent按层放置，连线从上到下逐渐变粗
 */
function initializeNetworkGraph() {
  const container = document.getElementById("networkGraph");
  const layoutMetrics = getLayoutMetrics(container);

  // 为不同的Agent定义图标
  const agentIcons = {
    VideoAgent: "🎬",
    KeyframeAgent: "🖼️",
    MapAgent: "🗺️",
    MeteorologyAgent: "🌤️",
    ReportAgent: "📊",
  };

  // 准备节点数据 - 按层级布局，根据资源大小调整节点大小
  const nodes = new vis.DataSet(
    agentDatabase.map((agent, index) => {
      const layer = agent.layer || "edge";

      // 基础颜色 - 所有Agent都是绿色
      const baseColor = "#34a853";

      // 根据资源大小（CPU + Memory）调整节点大小
      const resourceLevel = (agent.cpu + agent.memory) / 2;
      let size = 35 + (resourceLevel / 100) * 20;

      // 根据层级调整样式，体现3D效果
      let borderWidth = 2;
      let borderColor = "#333";
      let shadowColor = "rgba(0, 0, 0, 0.1)";
      let shadowSize = 10;

      if (layer === "cloud") {
        size = Math.max(size, 50); // 云层最大
        borderWidth = 3;
        borderColor = "#1a73e8"; // 蓝色边框
        shadowColor = "rgba(26, 115, 232, 0.4)";
        shadowSize = 8;
      } else if (layer === "edge") {
        size = Math.max(size, 45); // 边缘层中等
        borderWidth = 2.5;
        borderColor = "#f57c00"; // 橙色边框
        shadowColor = "rgba(245, 124, 0, 0.3)";
        shadowSize = 10;
      } else if (layer === "terminal") {
        size = Math.min(size, 40); // 终端层
        borderWidth = 2;
        borderColor = "#7b1fa2"; // 紫色边框
        shadowColor = "rgba(123, 31, 162, 0.35)";
        shadowSize = 12;
      }

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

      // 获取图标
      const icon = agentIcons[agent.name] || "⚙️";
      const label = `${icon}\n${agent.name}`;

      return {
        id: agent.id,
        label: label,
        color: {
          background: baseColor,
          border: borderColor,
          highlight: {
            background: "#66bb6a",
            border: "#000",
          },
        },
        x: position.x,
        y: position.y,
        size: size,
        borderWidth: borderWidth,
        physics: false,
        font: {
          size: 12,
          color: "#fff",
          bold: { color: "#fff" },
          multi: true,
        },
        shadow: {
          enabled: true,
          color: shadowColor,
          size: shadowSize,
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
    })
  );

  // 准备边数据 - 云边端三层架构的连接关系
  const edges = [];
  const edgeSet = new vis.DataSet(edges);

  // 初始化边 - 云边端三层架构的Agent连接
  const terminalAgents = agentDatabase.filter((a) => a.layer === "terminal");
  const edgeAgents = agentDatabase.filter((a) => a.layer === "edge");
  const cloudAgents = agentDatabase.filter((a) => a.layer === "cloud");

  // 终端层连接到边缘层 - 入口链路
  terminalAgents.forEach((agent, terminalIndex) => {
    edgeAgents.forEach((edgeAgent, edgeIndex) => {
      const isPrimary = edgeIndex === terminalIndex % Math.max(edgeAgents.length, 1);
      edgeSet.add({
        from: agent.id,
        to: edgeAgent.id,
        color: {
          color: isPrimary ? "#8e7cc3" : "#b9a9e0",
          highlight: "#5e35b1",
        },
        width: isPrimary ? 2.6 : 2.1,
        dashes: isPrimary ? false : [6, 5],
        arrows: { to: { enabled: true, scaleFactor: 0.6 } },
        smooth: getSmoothStyle(terminalIndex + edgeIndex, 0.22),
      });
    });
  });

  // 边缘层连接到云层 - 主干链路
  edgeAgents.forEach((agent, edgeIndex) => {
    cloudAgents.forEach((cloudAgent, cloudIndex) => {
      const isPrimary = cloudIndex === edgeIndex % Math.max(cloudAgents.length, 1);
      edgeSet.add({
        from: agent.id,
        to: cloudAgent.id,
        color: {
          color: isPrimary ? "#5aa9f0" : "#b7d0f2",
          highlight: "#1a73e8",
        },
        width: isPrimary ? 3.4 : 2.2,
        dashes: isPrimary ? false : [6, 5],
        arrows: { to: { enabled: true, scaleFactor: 0.7 } },
        smooth: getSmoothStyle(edgeIndex + cloudIndex, isPrimary ? 0.18 : 0.28),
      });
    });
  });

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
      zoomView: true,
      dragView: true,
      hover: true,
      tooltipDelay: 200,
    },
    layout: {
      hierarchical: false, // 手动布局
    },
    edges: {
      shadow: {
        enabled: true,
        color: "rgba(0, 0, 0, 0.12)",
        size: 6,
        x: 0,
        y: 3,
      },
    },
  };

  const network = new vis.Network(container, data, options);
  window.networkInstance = network;
  applyTopologyLayout(container, nodes);
  network.fit({ animation: false });

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
  addNetworkLegend();

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (!window.networkGraph || !window.networkInstance) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      applyTopologyLayout(container, window.networkGraph.nodes);
      window.networkInstance.fit({ animation: false });
    }, 120);
  });
}

/**
 * 初始化资源视图图表
 */
function initializeResourceChart() {
  const chartContainer = document.getElementById("resourceChart");
  const chart = echarts.init(chartContainer);

  // 准备数据
  const names = agentDatabase.map((a) => a.name);
  const cpuData = agentDatabase.map((a) => a.cpu);
  const memoryData = agentDatabase.map((a) => a.memory);

  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      borderColor: "#333",
      textStyle: { color: "#fff" },
    },
    legend: {
      data: ["CPU Usage (%)", "Memory Usage (%)"],
      bottom: 10,
    },
    grid: {
      left: "3%",
      right: "3%",
      top: "5%",
      bottom: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: names,
      axisLabel: {
        rotate: 45,
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLabel: {
        formatter: "{value}%",
      },
    },
    series: [
      {
        name: "CPU Usage (%)",
        type: "line",
        data: cpuData,
        smooth: true,
        itemStyle: { color: "#ea4335" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(234, 67, 53, 0.3)" },
            { offset: 1, color: "rgba(234, 67, 53, 0)" },
          ]),
        },
      },
      {
        name: "Memory Usage (%)",
        type: "line",
        data: memoryData,
        smooth: true,
        itemStyle: { color: "#4285f4" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(66, 133, 244, 0.3)" },
            { offset: 1, color: "rgba(66, 133, 244, 0)" },
          ]),
        },
      },
    ],
  };

  chart.setOption(option);

  // 响应式重绘
  window.addEventListener("resize", () => {
    chart.resize();
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

  function parseRawResult(rawResult) {
    if (!rawResult) return null;
    if (typeof rawResult === "object") return rawResult;
    if (typeof rawResult !== "string") return null;
    const trimmed = rawResult.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return null;
    }
  }

  function extractObservationFromLogs(logs) {
    if (!Array.isArray(logs)) return "";

    for (const entry of logs) {
      if (!entry || typeof entry !== "object") continue;
      for (const value of Object.values(entry)) {
        if (typeof value !== "string") continue;
        const match = value.match(
          /Observation:\s*([\s\S]*?)(?:\n[A-Z][a-zA-Z]+\(|\nKeyframeExtractor|\nQuestion:|\nRaw Answer:|$)/
        );
        if (match && match[1] && match[1].trim()) {
          return match[1].trim();
        }
      }
    }

    return "";
  }

  function extractResultText(parsed) {
    if (!parsed || typeof parsed !== "object") return "";

    const rawAnswer = parsed.raw_answer || parsed.answer || parsed.final_answer;
    if (typeof rawAnswer === "string" && rawAnswer.trim()) {
      return rawAnswer.trim();
    }

    const normalized = parsed.normalized_answer;
    if (typeof normalized === "string" && normalized.trim()) {
      return normalized.trim();
    }

    const observation = extractObservationFromLogs(parsed.logs);
    if (observation) return observation;

    return "";
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

          const payload = msg.data || {};
          const candidates = payload.routing || [];
          if (Array.isArray(candidates)) {
            updateDiscoveryListFromBackend(candidates);
          }

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

    if (typeof data.answer === "object" && data.answer !== null) {
      answerDiv = createAssistantMessage();
      const header = document.createElement("div");
      const headerStrong = document.createElement("strong");
      headerStrong.textContent = "📋 分析结果:";
      header.appendChild(headerStrong);
      answerDiv.appendChild(header);

      // ✅ 1) 优先用后端已清洗好的 answer_text
      const answerText =
      (typeof data.answer_text === "string" && data.answer_text.trim())
        ? data.answer_text.trim()
        : (typeof data.answer?.text === "string" && data.answer.text.trim())
          ? data.answer.text.trim()
          : "";

      // ✅ 2) 如果 answer_text 为空，再兜底从 raw_result 里提取（但只当兜底）
      let fallback = "";
      if (!answerText) {
      const rawResult = data.answer?.raw_result || data.raw_result || "";
      const parsed = parseRawResult(rawResult);
      fallback = extractResultText(parsed) || "";
      }

      const finalText = answerText || fallback || "（无可展示输出）";

      appendStreamBlock(answerDiv, "📌 结果:", finalText, STREAM_SPEED.fast);
      hasAnswer = true;

      if (finalText) {
        appendStreamBlock(answerDiv, "📌 结果:", finalText, STREAM_SPEED.fast);
        hasAnswer = true;
      }

      const images = Array.isArray(data.answer.images)
        ? data.answer.images
        : [];
      const keyframe = data.answer.keyframe ? [data.answer.keyframe] : [];
      const allImages = [...images, ...keyframe];

      allImages.forEach((image) => {
        const src = image?.data_uri || image?.url;
        if (!src) return;

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
    } else if (typeof data.answer === "string" && data.answer) {
      const parsed = parseRawResult(data.answer);
      const parsedText = extractResultText(parsed);
      const finalText = parsedText || data.answer;
      answerDiv = createAssistantMessage();
      appendStreamBlock(answerDiv, "📋 结果:", finalText, STREAM_SPEED.fast);
      hasAnswer = true;
    } else if (data.answer_text) {
      const parsed = parseRawResult(data.answer_text);
      const parsedText = extractResultText(parsed);
      const finalText = parsedText || data.answer_text;
      answerDiv = createAssistantMessage();
      appendStreamBlock(answerDiv, "📋 结果:", finalText, STREAM_SPEED.fast);
      hasAnswer = true;
    } else if (data.message) {
      answerDiv = createAssistantMessage();
      appendStreamBlock(answerDiv, "📋 结果:", data.message, STREAM_SPEED.fast);
      hasAnswer = true;
    } else if (data.result && data.result.normalized_answer) {
      answerDiv = createAssistantMessage();
      appendStreamBlock(
        answerDiv,
        "📋 结果:",
        data.result.normalized_answer,
        STREAM_SPEED.fast
      );
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
    const candidates = data.candidates || data.routing;
    if (candidates && Array.isArray(candidates)) {
      updateDiscoveryListFromBackend(candidates);
    }

    // 4. 高亮拓扑图中被选中的Agent - 兼容多个字段名
    const selectedAgent = data.best_match || data.selected_agent;
    if (selectedAgent && selectedAgent.agent_name) {
      highlightSelectedAgent(selectedAgent.agent_name);
    }

    messages.scrollTop = messages.scrollHeight;
  }

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

      // 从confidence或match_pct或match字段解析百分比（新格式中match_pct已是百分比）
      let matchPercent = 0;
      if (item.match_pct !== undefined && item.match_pct !== null) {
        // 新格式：match_pct 已经是百分比数字如 27.450494730368025
        const num = parseFloat(item.match_pct);
        // 如果数字大于1，说明已经是百分比
        matchPercent = num > 1 ? Math.round(num) : Math.round(num * 100);
      } else if (item.match !== undefined && item.match !== null) {
        // match 是小数形式 0.2745
        const num = parseFloat(item.match);
        matchPercent = num > 1 ? Math.round(num) : Math.round(num * 100);
      } else if (item.confidence !== undefined && item.confidence !== null) {
        // confidence 可能是字符串 "27.45%" 或数字 27.45 或 0.2745
        const confStr = String(item.confidence).trim();

        if (confStr.includes("%")) {
          matchPercent = parseFloat(confStr.replace("%", ""));
        } else {
          const num = parseFloat(confStr);
          matchPercent = num > 1 ? num : Math.round(num * 100);
        }
      }

      // 确保百分比在 0-100 之间
      matchPercent = Math.min(100, Math.max(0, Math.round(matchPercent)));

      // 获取capability（描述中的功能名）
      const capability = item.capability || "未知功能";

      // 从description字段提取描述（可能分隔符为 | 或其他）
      let shortDesc = "";
      if (item.description) {
        const descParts = item.description.split("|");
        shortDesc =
          descParts.length > 2
            ? descParts[2].trim()
            : item.description.substring(0, 50);
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
            <span class="agent-score-value">${matchPercent}%</span>
            <div class="relevance-bar">
              <div class="relevance-fill" style="width: ${matchPercent}%"></div>
            </div>
          </div>
        </div>
      `;

      // 处理checkbox事件
      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          const agentName = e.target.dataset.agentName;
          // 根据agent name找到对应的Agent ID并高亮
          const agent = agentDatabase.find((a) => a.name === agentName);
          if (agent) {
            highlightNodeInNetwork(agent.id);
          }
        }
      });

      discoveryList.appendChild(card);
    });
  }

  // 高亮被选中的Agent
  function highlightSelectedAgent(agentName) {
    const agent = agentDatabase.find((a) => a.name === agentName);
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

    ["cloud", "edge", "terminal"].forEach((layerName) => {
      const band = document.createElement("div");
      band.className = `topology-band topology-band--${layerName}`;
      layers.appendChild(band);
    });

    container.appendChild(layers);
  }

  if (!container.querySelector(".network-legend")) {
    const legend = document.createElement("div");
    legend.className = "network-legend";
    legend.innerHTML = `
      <div class="legend-header">📊 三层架构拓扑</div>
      <div class="legend-item">
        <div class="legend-color" style="background-color: #34a853; border: 3px solid #1a73e8; box-shadow: 0 0 8px rgba(26, 115, 232, 0.3);"></div>
        <span>☁️ Cloud (高算力)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background-color: #34a853; border: 2.5px solid #f57c00; box-shadow: 0 0 8px rgba(245, 124, 0, 0.2);"></div>
        <span>🌐 Edge (中等算力)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background-color: #34a853; border: 2px solid #7b1fa2; box-shadow: 0 0 8px rgba(123, 31, 162, 0.2);"></div>
        <span>📱 Terminal (低算力)</span>
      </div>
    `;
    container.appendChild(legend);
  }

  // 添加三层架构标签（左侧）
  if (!container.querySelector(".layer-label")) {
    const cloudLabel = document.createElement("div");
    cloudLabel.className = "layer-label cloud-label";
    cloudLabel.innerHTML =
      "☁️ <strong>CLOUD LAYER</strong><br><small>高性能计算</small>";
    container.appendChild(cloudLabel);

    const edgeLabel = document.createElement("div");
    edgeLabel.className = "layer-label edge-label";
    edgeLabel.innerHTML =
      "🌐 <strong>EDGE LAYER</strong><br><small>中等处理</small>";
    container.appendChild(edgeLabel);

    const terminalLabel = document.createElement("div");
    terminalLabel.className = "layer-label terminal-label";
    terminalLabel.innerHTML =
      "📱 <strong>TERMINAL LAYER</strong><br><small>本地处理</small>";
    container.appendChild(terminalLabel);
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

  // 高亮该节点
  window.networkGraph.nodes.update({
    id: nodeId,
    size: 50,
    color: {
      background: window.networkGraph.nodes.get(nodeId).color.background,
      border: "#FFD700",
      highlight: {
        background: window.networkGraph.nodes.get(nodeId).color.background,
        border: "#000",
      },
    },
    borderWidth: 4,
    shadow: {
      enabled: true,
      color: "rgba(255, 215, 0, 0.5)",
      size: 15,
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
    // 恢复原始大小和颜色（根据资源和层级）
    const resourceLevel = (agent.cpu + agent.memory) / 2;
    let size = 35 + (resourceLevel / 100) * 20;
    let borderColor = "#333";
    let borderWidth = 2;
    let shadowColor = "rgba(0, 0, 0, 0.1)";

    const layer = agent.layer || "edge";
    if (layer === "cloud") {
      size = Math.max(size, 55);
      borderWidth = 3;
      borderColor = "#1a73e8";
      shadowColor = "rgba(26, 115, 232, 0.3)";
    } else if (layer === "edge") {
      size = Math.max(size, 45);
      borderWidth = 2.5;
      borderColor = "#f57c00";
      shadowColor = "rgba(245, 124, 0, 0.2)";
    } else if (layer === "terminal") {
      size = Math.min(size, 40);
      borderWidth = 2;
      borderColor = "#7b1fa2";
      shadowColor = "rgba(123, 31, 162, 0.2)";
    }

    window.networkGraph.nodes.update({
      id: nodeId,
      size: size,
      color: {
        background: "#34a853",
        border: borderColor,
        highlight: {
          background: "#66bb6a",
          border: "#000",
        },
      },
      borderWidth: borderWidth,
      shadow: {
        enabled: true,
        color: shadowColor,
        size: 10,
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

  // 为不同的Agent定义图标
  const agentIcons = {
    VideoAgent: "🎬",
    KeyframeAgent: "🖼️",
    MapAgent: "🗺️",
    MeteorologyAgent: "🌤️",
    ReportAgent: "📊",
  };

  const layer = agent.layer || "edge";
  const layerAgents = agentDatabase.filter((a) => a.layer === layer);
  const indexInLayer = layerAgents.findIndex((a) => a.id === agent.id);
  const totalAgents = layerAgents.length;
  const container = document.getElementById("networkGraph");
  const position = getLayerPosition(
    layer,
    indexInLayer,
    totalAgents,
    getLayoutMetrics(container)
  );

  // 根据资源大小调整节点大小
  const resourceLevel = (agent.cpu + agent.memory) / 2;
  let size = 35 + (resourceLevel / 100) * 20;
  let borderColor = "#333";
  let borderWidth = 2;
  let shadowColor = "rgba(0, 0, 0, 0.1)";

  if (layer === "cloud") {
    size = Math.max(size, 50);
    borderWidth = 3;
    borderColor = "#1a73e8";
    shadowColor = "rgba(26, 115, 232, 0.4)";
  } else if (layer === "edge") {
    size = Math.max(size, 45);
    borderWidth = 2.5;
    borderColor = "#f57c00";
    shadowColor = "rgba(245, 124, 0, 0.3)";
  } else if (layer === "terminal") {
    size = Math.min(size, 40);
    borderWidth = 2;
    borderColor = "#7b1fa2";
    shadowColor = "rgba(123, 31, 162, 0.35)";
  }

  // 获取图标
  const icon = agentIcons[agent.name] || "⚙️";
  const label = `${icon}\n${agent.name}`;

  // 添加节点
  window.networkGraph.nodes.add({
    id: agent.id,
    label: label,
    color: {
      background: "#34a853",
      border: borderColor,
      highlight: {
        background: "#66bb6a",
        border: "#000",
      },
    },
    x: position.x,
    y: position.y,
    size: size,
    borderWidth: borderWidth,
    physics: false,
    font: {
      size: 12,
      color: "#fff",
      bold: { color: "#fff" },
      multi: true,
    },
    shadow: {
      enabled: true,
      color: shadowColor,
      size: layer === "cloud" ? 8 : layer === "edge" ? 10 : 12,
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

  // 添加边 - 连接相邻层级
  if (layer === "terminal") {
    const edgeAgents = agentDatabase.filter((a) => a.layer === "edge");
    edgeAgents.forEach((edgeAgent, edgeIndex) => {
      const isPrimary = edgeIndex === indexInLayer % Math.max(edgeAgents.length, 1);
      window.networkGraph.edges.add({
        from: agent.id,
        to: edgeAgent.id,
        color: {
          color: isPrimary ? "#8e7cc3" : "#b9a9e0",
          highlight: "#5e35b1",
        },
        width: isPrimary ? 2.6 : 2.1,
        dashes: isPrimary ? false : [6, 5],
        arrows: { to: { enabled: true, scaleFactor: 0.6 } },
        smooth: getSmoothStyle(edgeIndex + indexInLayer, 0.22),
      });
    });
  } else if (layer === "edge") {
    const cloudAgents = agentDatabase.filter((a) => a.layer === "cloud");
    const terminalAgents = agentDatabase.filter((a) => a.layer === "terminal");
    const edgeAgents = agentDatabase.filter((a) => a.layer === "edge");

    terminalAgents.forEach((terminalAgent, terminalIndex) => {
      const isPrimary =
        indexInLayer === terminalIndex % Math.max(edgeAgents.length, 1);
      window.networkGraph.edges.add({
        from: terminalAgent.id,
        to: agent.id,
        color: {
          color: isPrimary ? "#8e7cc3" : "#b9a9e0",
          highlight: "#5e35b1",
        },
        width: isPrimary ? 2.6 : 2.1,
        dashes: isPrimary ? false : [6, 5],
        arrows: { to: { enabled: true, scaleFactor: 0.6 } },
        smooth: getSmoothStyle(terminalIndex + indexInLayer, 0.22),
      });
    });

    cloudAgents.forEach((cloudAgent, cloudIndex) => {
      const isPrimary = cloudIndex === indexInLayer % Math.max(cloudAgents.length, 1);
      window.networkGraph.edges.add({
        from: agent.id,
        to: cloudAgent.id,
        color: {
          color: isPrimary ? "#5aa9f0" : "#b7d0f2",
          highlight: "#1a73e8",
        },
        width: isPrimary ? 3.4 : 2.2,
        dashes: isPrimary ? false : [6, 5],
        arrows: { to: { enabled: true, scaleFactor: 0.7 } },
        smooth: getSmoothStyle(indexInLayer + cloudIndex, isPrimary ? 0.18 : 0.28),
      });
    });
  } else if (layer === "cloud") {
    const edgeAgents = agentDatabase.filter((a) => a.layer === "edge");
    const cloudAgents = agentDatabase.filter((a) => a.layer === "cloud");
    edgeAgents.forEach((edgeAgent, edgeIndex) => {
      const isPrimary =
        indexInLayer === edgeIndex % Math.max(cloudAgents.length, 1);
      window.networkGraph.edges.add({
        from: edgeAgent.id,
        to: agent.id,
        color: {
          color: isPrimary ? "#5aa9f0" : "#b7d0f2",
          highlight: "#1a73e8",
        },
        width: isPrimary ? 3.4 : 2.2,
        dashes: isPrimary ? false : [6, 5],
        arrows: { to: { enabled: true, scaleFactor: 0.7 } },
        smooth: getSmoothStyle(edgeIndex + indexInLayer, isPrimary ? 0.18 : 0.28),
      });
    });
  }

  applyTopologyLayout(container, window.networkGraph.nodes);
  window.networkInstance.fit({ animation: false });

  console.log("Added agent to network:", agent.name);
}
