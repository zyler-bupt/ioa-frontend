/**
 * topology.js
 * - 网络拓扑图初始化（vis-network）
 * - 布局计算 + infra nodes
 * - 边生成 + 高亮 + 动态添加新 agent
 */

(function () {
    const CLOUD_INFRA_MAP = {
      "agent-video": "infra-cloud-bot-left",
      "agent-registry": "infra-cloud-bot-mid",
      "agent-discovery": "infra-cloud-server",
    };
    const CLOUD_INFRA_IDS = new Set(Object.values(CLOUD_INFRA_MAP));
    const EDGE_AGENT01_MAP = {
      "agent-meteorology": "edge-agent-meteorology-agent01",
      "agent-keyframe": "edge-agent-keyframe-agent01",
      "agent-map": "edge-agent-map-agent01",
      "agent-report": "edge-agent-report-agent01",
    };
    const EDGE_AGENT01_IDS = new Set(Object.values(EDGE_AGENT01_MAP));

    function isCloudInfraNode(id) {
      return CLOUD_INFRA_IDS.has(id);
    }

    function isEdgeAgentExtension(id) {
      return EDGE_AGENT01_IDS.has(id);
    }
    // ====== 统计 ======
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
  
    function getLayerPosition(layer, indexInLayer, totalAgents, metrics) {
      const layerY = getLayerRowCenters(metrics);
      const bandWidth = metrics.width - metrics.paddingX * 2;
  
      if (layer === "edge" && totalAgents === 4) {
        const span = Math.min(bandWidth * 0.68, bandWidth - 80);
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
        const span = Math.min(bandWidth * 0.78, bandWidth - 72);
        const rowGap = Math.max(70, Math.min(120, getLayerRowMetrics(metrics).rowHeight * 0.5));
        const positions = [
          { x: -span / 2, y: rowGap / 2 },
          { x: 0, y: -rowGap / 2 },
          { x: span / 2, y: rowGap / 2 },
        ];
        const fallback = positions[indexInLayer] ?? { x: 0, y: 0 };
        return { x: fallback.x, y: fallback.y + (layerY.cloud ?? layerY.edge) };
      }
  
      const availableWidth = metrics.width - metrics.paddingX * 2;
      const spacing =
        totalAgents > 1
          ? Math.min(metrics.maxSpacing, Math.max(metrics.minSpacing, availableWidth / (totalAgents - 1)))
          : 0;
      const startX = (-(totalAgents - 1) * spacing) / 2;
      const tiltBase = layer === "cloud" ? -12 : layer === "edge" ? 12 : 0;
      const tilt = totalAgents > 1 ? tiltBase : 0;
      const y = (layerY[layer] ?? layerY.edge) + (indexInLayer - (totalAgents - 1) / 2) * tilt;
      return { x: startX + indexInLayer * spacing, y };
    }
  
    function getLayerDomPosition(layer, indexInLayer, totalAgents, metrics) {
      const position = getLayerPosition(layer, indexInLayer, totalAgents, metrics);
      return { x: position.x + metrics.width / 2, y: position.y + metrics.height / 2 };
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
  
      return { x: domPosition.x - metrics.width / 2, y: domPosition.y - metrics.height / 2 };
    }
  
    function getInfraNodesLayout(metrics) {
      const { rowHeight } = getLayerRowMetrics(metrics);
      const rowCenters = getLayerRowCenters(metrics);
      const cloudPositions = [0, 1, 2].map((index) => getLayerPosition("cloud", index, 3, metrics));
      const edgePositions = [0, 1, 2, 3].map((index) => getLayerPosition("edge", index, 4, metrics));
      const terminalBase = getLayerPosition("terminal", 0, 1, metrics).y;
  
      const widthHalf = metrics.width / 2 - 24;
      const heightHalf = metrics.height / 2 - 24;
      const bandHalf = (metrics.width - metrics.paddingX * 2) / 2;
  
      const bandPaddingX = Math.max(42, metrics.width * 0.08);
      const bandMinX = -bandHalf + bandPaddingX;
      const bandMaxX = bandHalf - bandPaddingX;
      const bandPaddingY = Math.max(18, rowHeight * 0.18);
  
      const cloudOffsetLimit = Math.max(40, widthHalf - Math.abs(cloudPositions[0].x));
      const cloudOffsetX = Math.min(Math.max(bandHalf * 0.22, metrics.width * 0.07), cloudOffsetLimit);
      const cloudOffsetY = Math.max(8, rowHeight * 0.14);
  
      const edgeOffsetLimit = Math.max(
        50,
        Math.min(widthHalf - Math.abs(edgePositions[0].x), widthHalf - Math.abs(edgePositions[2].x))
      );
      const edgeOffsetX = Math.min(Math.max(bandHalf * 0.26, metrics.width * 0.08), edgeOffsetLimit);
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
      const edgeXValues = edgePositions.map((pos) => pos.x);
      const edgeMinX = Math.min(...edgeXValues);
      const edgeMaxX = Math.max(...edgeXValues);
      const gatewaySideOffset = Math.max(32, gatewayOffsetX) + 20;
      const edgeMidY = (edgePositions[0].y + edgePositions[3].y) / 2;
  
      const terminalTopCount = 4;
      const terminalTopSpacing = Math.min(
        Math.max(96, metrics.width * 0.16),
        (metrics.width - 64) / Math.max(terminalTopCount - 1, 1)
      );
      const terminalTopStartX = -((terminalTopCount - 1) * terminalTopSpacing) / 2;
      const terminalRowOffset = Math.min(Math.max(22, rowHeight * 0.18), 40);
      const terminalTopY = terminalBase - terminalRowOffset;
      const terminalBottomY = Math.min(terminalBase + terminalRowOffset, heightHalf - 10);
  
      const rowBounds = {
        cloud: { min: rowCenters.cloud - rowHeight / 2 + bandPaddingY, max: rowCenters.cloud + rowHeight / 2 - bandPaddingY },
        edge: { min: rowCenters.edge - rowHeight / 2 + bandPaddingY, max: rowCenters.edge + rowHeight / 2 - bandPaddingY },
        terminal: { min: rowCenters.terminal - rowHeight / 2 + bandPaddingY, max: rowCenters.terminal + rowHeight / 2 - bandPaddingY },
      };
  
      const clampToLayer = (layout) => {
        const layer = layout.id.includes("cloud") ? "cloud" : layout.id.includes("edge") ? "edge" : "terminal";
        const bounds = rowBounds[layer];
        return {
          ...layout,
          x: window.clampValue(layout.x, bandMinX, bandMaxX),
          y: window.clampValue(layout.y, bounds.min, bounds.max),
        };
      };
  
      const cloudServer = { x: cloudPositions[2].x + cloudOffsetX, y: cloudPositions[2].y - cloudOffsetY * 1.4 };

      return [
        { id: "infra-cloud-bot-left", x: cloudPositions[0].x - cloudOffsetX, y: cloudPositions[0].y - cloudOffsetY * 1.4 },
        { id: "infra-cloud-bot-mid", x: cloudPositions[1].x - cloudOffsetX * 1.1, y: cloudPositions[1].y - cloudOffsetY * 1.4 },
        { id: "infra-cloud-server", x: cloudServer.x, y: cloudServer.y },

        { id: "infra-edge-gateway-left", x: edgeMinX - gatewaySideOffset, y: edgeMidY },
        { id: "infra-edge-gateway-right", x: edgeMaxX + gatewaySideOffset, y: edgeMidY },
  
        { id: "infra-terminal-phone-left", x: terminalTopStartX, y: terminalTopY },
        { id: "infra-terminal-desktop-left", x: terminalTopStartX + terminalTopSpacing, y: terminalTopY },
        { id: "infra-terminal-desktop-right", x: terminalTopStartX + terminalTopSpacing * 2, y: terminalTopY },
        { id: "infra-terminal-phone-right", x: terminalTopStartX + terminalTopSpacing * 3, y: terminalTopY },
        { id: "infra-terminal-user-left", x: 0, y: terminalBottomY },
      ].map(clampToLayer);
    }
  
    function createInfraNodes(metrics) {
      return getInfraNodesLayout(metrics).map((layout) => {
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
          selectable: false,
          hover: false,
          hidden: isCloudInfraNode(layout.id),
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
      window.agentDatabase.forEach((agent) => {
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
  
      const infraUpdates = getInfraNodesLayout(metrics).map((layout) => ({ id: layout.id, x: layout.x, y: layout.y }));
      nodes.update(infraUpdates);
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
  
    // ====== edges ======
    function getSmoothStyle(index, roundness) {
      return { type: index % 2 === 0 ? "curvedCW" : "curvedCCW", roundness };
    }
  
    function buildTopologyEdges(edgeSet) {
      edgeSet.clear();
  
      const terminalAgents = window.agentDatabase.filter((a) => a.layer === "terminal");
      const edgeAgents = window.agentDatabase.filter((a) => a.layer === "edge");
      const cloudAgents = window.agentDatabase.filter((a) => a.layer === "cloud");
  
      const addEdge = (from, to, options) => {
        edgeSet.add({
          from,
          to,
          color: { color: options.color, highlight: window.LINK_COLORS.highlight },
          width: options.width,
          dashes: options.dashes,
          smooth: options.smooth,
        });
      };
  
      if (edgeAgents.length === 4) {
        const [topLeft, bottomLeft, topRight, bottomRight] = edgeAgents;
        [
          [topLeft, topRight],
          [bottomLeft, bottomRight],
          [topLeft, bottomLeft],
          [topRight, bottomRight],
        ].forEach(([from, to], index) => {
          addEdge(from.id, to.id, { color: window.IN_LAYER_COLOR, width: 2.4, dashes: [6, 6], smooth: false });
        });
        [
          [topLeft, bottomRight],
          [bottomLeft, topRight],
        ].forEach(([from, to], index) => {
          addEdge(from.id, to.id, { color: window.IN_LAYER_COLOR, width: 2.2, dashes: [6, 6], smooth: getSmoothStyle(index, 0.12) });
        });
      } else if (edgeAgents.length > 1) {
        edgeAgents.slice(0, -1).forEach((agent, index) => {
          addEdge(agent.id, edgeAgents[index + 1].id, { color: window.IN_LAYER_COLOR, width: 2.2, dashes: [6, 6], smooth: false });
        });
      }
  
      if (terminalAgents.length && edgeAgents.length) {
        terminalAgents.forEach((agent, index) => {
          const target = edgeAgents[index % edgeAgents.length];
          addEdge(agent.id, target.id, { color: window.LINK_COLORS.primary, width: 2.2, dashes: [6, 8], smooth: getSmoothStyle(index, 0.18) });
        });
      }
  
      if (cloudAgents.length && edgeAgents.length) {
        const targets =
          cloudAgents.length === 3 && edgeAgents.length >= 3 ? [1, 2, 3] : cloudAgents.map((_, index) => index % edgeAgents.length);
  
        cloudAgents.forEach((agent, index) => {
          const edgeIndex = targets[index % targets.length] % edgeAgents.length;
          const target = edgeAgents[edgeIndex];
          addEdge(agent.id, target.id, { color: window.LINK_COLORS.primary, width: 3.2, dashes: false, smooth: getSmoothStyle(index, 0.24) });
        });
      }
  
      const infraLinks = [
        { from: "infra-cloud-bot-left", to: "agent-video", color: window.IN_LAYER_COLOR },
        { from: "infra-cloud-bot-mid", to: "agent-registry", color: window.IN_LAYER_COLOR },
        { from: "infra-cloud-server", to: "agent-discovery", color: window.IN_LAYER_COLOR },
      ];
  
      infraLinks.forEach((link, index) => {
        addEdge(link.from, link.to, { color: link.color, width: 2, dashes: [6, 6], smooth: getSmoothStyle(index, 0.1) });
      });

      if (edgeAgents.length >= 4) {
        const [topLeft, bottomLeft, topRight, bottomRight] = edgeAgents;
        [
          ["infra-edge-gateway-left", topLeft],
          ["infra-edge-gateway-left", bottomLeft],
          ["infra-edge-gateway-right", topRight],
          ["infra-edge-gateway-right", bottomRight],
        ].forEach(([gatewayId, agent], index) => {
          addEdge(gatewayId, agent.id, {
            color: window.IN_LAYER_COLOR,
            width: 2,
            dashes: [6, 6],
            smooth: getSmoothStyle(index, 0.14),
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
            color: window.IN_LAYER_COLOR,
            width: 2,
            dashes: [6, 6],
            smooth: getSmoothStyle(index, 0.14),
          });
        });
      }

      const edgeAgentExtensions = Object.entries(EDGE_AGENT01_MAP).map(([agentId, extensionId]) => ({
        from: agentId,
        to: extensionId,
        color: window.IN_LAYER_COLOR,
      }));

      edgeAgentExtensions.forEach((link, index) => {
        addEdge(link.from, link.to, { color: link.color, width: 1.8, dashes: [4, 6], smooth: getSmoothStyle(index, 0.08) });
      });

  
      const terminalDevices = [
        "infra-terminal-phone-left",
        "infra-terminal-desktop-left",
        "infra-terminal-desktop-right",
        "infra-terminal-phone-right",
        "infra-terminal-user-left",
      ];
  
      if (edgeAgents.length) {
        terminalDevices.forEach((id, index) => {
          const target = edgeAgents[index % edgeAgents.length];
          addEdge(id, target.id, { color: window.LINK_COLORS.primary, width: 2, dashes: [6, 8], smooth: getSmoothStyle(index, 0.18) });
        });
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
  
    // ====== UI: legend ======
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
  
    // ====== main init ======
    function initializeNetworkGraph() {
      const container = document.getElementById("networkGraph");
      const layoutMetrics = getLayoutMetrics(container);
      const infraCloudVisibility = {};
      CLOUD_INFRA_IDS.forEach((id) => {
        infraCloudVisibility[id] = false;
      });
      const edgeAgentVisibility = {};
      EDGE_AGENT01_IDS.forEach((id) => {
        edgeAgentVisibility[id] = false;
      });
  
      const nodeItems = window.agentDatabase.map((agent) => {
        const layer = agent.layer || "edge";
        const style = getNodeStyleForLayer(layer);
        const baseColor = "#1d3f8f";
        const agentImage =
          layer === "cloud"
            ? window.TOPOLOGY_ICONS.rack01
            : layer === "edge"
              ? window.TOPOLOGY_ICONS.server01
              : window.TOPOLOGY_ICONS.agent;
  
        const layerAgents = window.agentDatabase.filter((a) => a.layer === layer);
        const indexInLayer = layerAgents.findIndex((a) => a.id === agent.id);
        const totalAgents = layerAgents.length;
  
        const position = getLayerPosition(layer, indexInLayer, totalAgents, layoutMetrics);
  
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
          shadow: { enabled: true, color: style.shadowColor, size: style.shadowSize, x: 0, y: 5 },
          title: `<b>${agent.name}</b><br>Layer: ${layer.toUpperCase()}<br>CPU: ${agent.cpu}%<br>Memory: ${agent.memory}%<br>Resources: ${(((agent.cpu + agent.memory) / 2)).toFixed(0)}%`,
          layer,
        };
      });
  
      const edgeAgentExtensions = window.agentDatabase
        .filter((agent) => (agent.layer || "edge") === "edge")
        .map((agent) => {
          const extensionId = EDGE_AGENT01_MAP[agent.id];
          if (!extensionId) return null;
          const layerAgents = window.agentDatabase.filter((a) => a.layer === "edge");
          const indexInLayer = layerAgents.findIndex((a) => a.id === agent.id);
          const totalAgents = layerAgents.length;
          const position = getLayerPosition("edge", indexInLayer, totalAgents, layoutMetrics);
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
  
      nodeItems.push(...createInfraNodes(layoutMetrics));
  
      const nodes = new vis.DataSet(nodeItems);
      const edgeSet = new vis.DataSet();
      buildTopologyEdges(edgeSet);
  
      window.networkGraph = { nodes, edges: edgeSet };

      const toggleInfraCloudNode = (infraId) => {
        const nextVisible = !infraCloudVisibility[infraId];
        infraCloudVisibility[infraId] = nextVisible;
        nodes.update({ id: infraId, hidden: !nextVisible });
      };
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
          keyboard: true,
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
      observeTopologyLayout(container, network);
      requestAnimationFrame(() => syncTopologyLayout(container, network));
  
      network.on("click", function (params) {
        if (params.nodes.length > 0) {
          const selectedNodeId = params.nodes[0];
          const infraId = CLOUD_INFRA_MAP[selectedNodeId];
          if (infraId) {
            toggleInfraCloudNode(infraId);
            return;
          }
          const isEdgeAgent = window.agentDatabase.some(
            (agent) => agent.id === selectedNodeId && (agent.layer || "edge") === "edge"
          );
          if (isEdgeAgent) {
            toggleEdgeAgentExtension(selectedNodeId);
            return;
          }
          highlightNodeInNetwork(selectedNodeId);
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
  
    // ====== highlight ======
    function highlightNodeInNetwork(nodeId) {
      if (!window.networkInstance) return;
  
      const agent = window.agentDatabase.find((a) => a.id === nodeId);
      if (!agent) return;
  
      const layer = agent.layer || "edge";
      const baseStyle = getNodeStyleForLayer(layer);
      const highlightSize = Math.max(baseStyle.size * 1.6, baseStyle.size + 8);
  
      window.networkGraph.nodes.update({
        id: nodeId,
        size: highlightSize,
        color: {
          background: window.networkGraph.nodes.get(nodeId).color.background,
          border: "#FFD700",
          highlight: { background: window.networkGraph.nodes.get(nodeId).color.background, border: "#000" },
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
  
    // ====== dynamic add ======
    function addAgentToNetwork(agent) {
      if (!window.networkGraph || !window.networkInstance) {
        console.error("Network graph not initialized");
        return;
      }
  
      const layer = agent.layer || "edge";
      const style = getNodeStyleForLayer(layer);
      const baseColor = "#1d3f8f";
      const agentImage =
        layer === "cloud"
          ? window.TOPOLOGY_ICONS.rack01
          : layer === "edge"
            ? window.TOPOLOGY_ICONS.server01
            : window.TOPOLOGY_ICONS.agent;
  
      const layerAgents = window.agentDatabase.filter((a) => a.layer === layer);
      const indexInLayer = layerAgents.findIndex((a) => a.id === agent.id);
      const totalAgents = layerAgents.length;
  
      const container = document.getElementById("networkGraph");
      const position = resolveAgentPosition(container, window.networkInstance, agent, indexInLayer, totalAgents);
  
      window.networkGraph.nodes.add({
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
        shadow: { enabled: true, color: style.shadowColor, size: style.shadowSize, x: 0, y: 4 },
        title: `<b>${agent.name}</b><br>Layer: ${layer.toUpperCase()}<br>CPU: ${agent.cpu}%<br>Memory: ${agent.memory}%<br>Resources: ${(((agent.cpu + agent.memory) / 2)).toFixed(0)}%`,
        layer,
      });
  
      buildTopologyEdges(window.networkGraph.edges);
      syncTopologyLayout(container, window.networkInstance);
      console.log("Added agent to network:", agent.name);
    }
  
    // ====== exports ======
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
  })();
  
