/**
 * clusterMonitor.js
 * Node-level cluster monitoring with scrollable node list, metric cards,
 * sparklines, and a live task stack display.
 */

(function () {
  const MONITOR_NODE_IDS = [
    "cloud-cluster-01",
    "cloud-cluster-02",
    "cloud-cluster-03",
    "edge-bj-01",
    "edge-bj-02",
    "edge-sh-01",
    "edge-gz-01",
    "edge-cd-01",
    "edge-cd-02",
    "edge-wh-01",
    "edge-wh-02",
  ];

  const NODE_LABELS = {
    "cloud-cluster-01": "Cloud 01",
    "cloud-cluster-02": "Cloud 02",
    "cloud-cluster-03": "Cloud 03",
    "edge-bj-01": "Edge BJ-01",
    "edge-bj-02": "Edge BJ-02",
    "edge-sh-01": "Edge SH-01",
    "edge-gz-01": "Edge GZ-01",
    "edge-cd-01": "Edge CD-01",
    "edge-cd-02": "Edge CD-02",
    "edge-wh-01": "Edge WH-01",
    "edge-wh-02": "Edge WH-02",
  };

  // Simulated task names per layer
  const CLOUD_TASKS = [
    "ModelTraining-v3", "DataSync-replica", "IndexRebuild", "PolicyAudit",
    "CacheWarm", "SchemaValidation", "ClusterRebalance", "BackupSnapshot",
    "TokenRefresh", "MetricAggregation",
  ];
  const EDGE_TASKS = [
    "FrameExtract-HD", "SensorPoll-batch", "StreamEncode", "AnomalyCheck",
    "GeoFence-eval", "PacketInspect", "NLP-tokenize", "AudioSegment",
    "TrafficShape", "TelemetryFlush", "DevicePing", "HeatmapGen",
  ];

  const LATENCY = { min: 8, max: 240, step: 7 };
  const LOAD = { min: 20, max: 100, step: 8 };
  const GPU = { min: 0, max: 100, step: 9 };
  const HISTORY_SIZE = 30;
  const MAX_TASK_QUEUE = 4;

  let monitorState = null;
  let monitorTimer = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function stepValue(current, range) {
    const delta = (Math.random() * 2 - 1) * range.step;
    return clamp(current + delta, range.min, range.max);
  }

  function formatLatency(value) {
    if (!Number.isFinite(value)) return "-";
    return `${Math.round(value)}ms`;
  }

  function formatPct(value) {
    if (!Number.isFinite(value)) return "-";
    return `${Math.round(value)}%`;
  }

  function nodeLabel(nodeId) {
    return NODE_LABELS[nodeId] || nodeId;
  }

  function nodeLayer(nodeId) {
    return nodeId.startsWith("cloud") ? "cloud" : "edge";
  }

  function edgeKey(from, to) {
    return from < to ? `${from}|${to}` : `${to}|${from}`;
  }

  // ── Task simulation helpers ──

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function buildInitialTasks(nodeId) {
    const pool = nodeId.startsWith("cloud") ? CLOUD_TASKS : EDGE_TASKS;
    const running = pickRandom(pool);
    const queueCount = 1 + Math.floor(Math.random() * 3);
    const queued = [];
    const used = new Set([running]);
    for (let i = 0; i < queueCount; i++) {
      let t = pickRandom(pool);
      let tries = 0;
      while (used.has(t) && tries < 10) { t = pickRandom(pool); tries++; }
      used.add(t);
      queued.push(t);
    }
    return { running, progress: Math.floor(Math.random() * 80) + 10, queued };
  }

  function simulateTaskStep(taskState, nodeId) {
    const pool = nodeId.startsWith("cloud") ? CLOUD_TASKS : EDGE_TASKS;
    taskState.progress += Math.floor(Math.random() * 15) + 3;
    if (taskState.progress >= 100) {
      // Current task done, promote from queue
      taskState.progress = Math.floor(Math.random() * 20);
      if (taskState.queued.length) {
        taskState.running = taskState.queued.shift();
      } else {
        taskState.running = pickRandom(pool);
      }
      // Maybe add a new task to the queue
      if (taskState.queued.length < MAX_TASK_QUEUE && Math.random() > 0.3) {
        let t = pickRandom(pool);
        const used = new Set([taskState.running, ...taskState.queued]);
        let tries = 0;
        while (used.has(t) && tries < 10) { t = pickRandom(pool); tries++; }
        taskState.queued.push(t);
      }
    }
    // Occasionally add to queue
    if (taskState.queued.length < MAX_TASK_QUEUE && Math.random() > 0.85) {
      let t = pickRandom(pool);
      const used = new Set([taskState.running, ...taskState.queued]);
      let tries = 0;
      while (used.has(t) && tries < 10) { t = pickRandom(pool); tries++; }
      if (!used.has(t)) taskState.queued.push(t);
    }
  }

  // ── Topology edge helpers ──

  function fallbackTopologyEdges() {
    return [
      { from: "cloud-cluster-01", to: "edge-bj-01" },
      { from: "cloud-cluster-01", to: "edge-bj-02" },
      { from: "cloud-cluster-02", to: "edge-sh-01" },
      { from: "cloud-cluster-02", to: "edge-gz-01" },
      { from: "cloud-cluster-03", to: "edge-cd-01" },
      { from: "cloud-cluster-03", to: "edge-cd-02" },
      { from: "cloud-cluster-01", to: "edge-wh-01" },
      { from: "cloud-cluster-02", to: "edge-wh-02" },
      { from: "edge-bj-01", to: "edge-bj-02" },
      { from: "edge-sh-01", to: "edge-gz-01" },
      { from: "edge-cd-01", to: "edge-cd-02" },
      { from: "edge-wh-01", to: "edge-wh-02" },
      { from: "edge-bj-02", to: "edge-sh-01" },
      { from: "edge-gz-01", to: "edge-cd-01" },
    ];
  }

  function collectTopologyEdges() {
    const dataSet = window.networkGraph?.edges;
    if (!dataSet || typeof dataSet.get !== "function") {
      return fallbackTopologyEdges();
    }
    const all = dataSet.get();
    const edges = [];
    const seen = new Set();
    all.forEach((edge) => {
      const from = typeof edge?.from === "string" ? edge.from : "";
      const to = typeof edge?.to === "string" ? edge.to : "";
      if (!from || !to || from === to) return;
      const key = edgeKey(from, to);
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ from, to });
    });
    return edges.length ? edges : fallbackTopologyEdges();
  }

  function buildLinkLatencyMap(edges) {
    const latencies = {};
    edges.forEach(({ from, to }) => {
      const key = edgeKey(from, to);
      if (latencies[key] !== undefined) return;
      let base = null;
      if (typeof window.getEdgeLatency === "function") {
        const sampled = Number(window.getEdgeLatency(from, to));
        if (Number.isFinite(sampled)) base = sampled;
      }
      if (!Number.isFinite(base)) {
        base = LATENCY.min + Math.round(Math.random() * (LATENCY.max - LATENCY.min));
      }
      latencies[key] = clamp(base, LATENCY.min, LATENCY.max);
    });
    return latencies;
  }

  function computeNodeAvgLatency(nodeId, edges, linkLatencyByKey) {
    const values = [];
    edges.forEach(({ from, to }) => {
      if (from !== nodeId && to !== nodeId) return;
      const value = linkLatencyByKey[edgeKey(from, to)];
      if (Number.isFinite(value)) values.push(value);
    });
    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  // ── Trend helpers ──

  function getTrend(history) {
    if (!history || history.length < 3) return "stable";
    const recent = history.slice(-5);
    const diff = recent[recent.length - 1] - recent[0];
    if (Math.abs(diff) < 3) return "stable";
    return diff > 0 ? "up" : "down";
  }

  function getTrendArrow(trend) {
    if (trend === "up") return '<span class="monitor-trend monitor-trend--up">&#9650;</span>';
    if (trend === "down") return '<span class="monitor-trend monitor-trend--down">&#9660;</span>';
    return '<span class="monitor-trend monitor-trend--stable">&#9644;</span>';
  }

  // ── Initial data ──

  function buildInitialMetrics(edges, linkLatencyByKey) {
    const metricsByNode = {};
    MONITOR_NODE_IDS.forEach((nodeId, index) => {
      const avgLatencyMs = computeNodeAvgLatency(nodeId, edges, linkLatencyByKey);
      const loadRatio = 0.3 + (index % 5) * 0.1;
      const isCloud = nodeId.startsWith("cloud");
      const gpuRatio = isCloud ? 0.65 + (index % 3) * 0.08 : 0.3 + (index % 5) * 0.1;
      metricsByNode[nodeId] = {
        avgLatencyMs,
        loadPct: LOAD.min + (LOAD.max - LOAD.min) * loadRatio,
        gpuPct: GPU.min + (GPU.max - GPU.min) * clamp(gpuRatio, 0.05, 0.95),
      };
    });
    return metricsByNode;
  }

  function buildInitialHistory(metricsByNode) {
    const historyByNode = {};
    MONITOR_NODE_IDS.forEach((nodeId) => {
      const m = metricsByNode[nodeId];
      historyByNode[nodeId] = {
        latency: [m.avgLatencyMs || 0],
        load: [m.loadPct || 0],
        gpu: [m.gpuPct || 0],
      };
    });
    return historyByNode;
  }

  // ── Sparkline drawing ──

  function drawSparkline(canvas, dataPoints, color) {
    if (!canvas || !dataPoints || !dataPoints.length) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const points = dataPoints.slice(-HISTORY_SIZE);
    if (points.length < 2) return;

    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = max - min || 1;
    const stepX = w / (HISTORY_SIZE - 1);

    ctx.beginPath();
    points.forEach((value, i) => {
      const x = i * stepX;
      const y = h - ((value - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const lastX = (points.length - 1) * stepX;
    ctx.lineTo(lastX, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.12)`;
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
    }
    ctx.fill();
  }

  // ── Template ──

  function buildTemplate(container) {
    container.innerHTML = `
      <div class="monitor-node-dashboard">
        <div class="monitor-layout">
          <div class="monitor-node-list" id="monitorNodeList">
            <div class="monitor-node-list__header">
              <span class="monitor-node-list__title">Nodes</span>
              <span class="monitor-node-list__count" id="monitorNodeCount">${MONITOR_NODE_IDS.length}</span>
            </div>
            <div class="monitor-node-list__scroll" id="monitorNodeListScroll"></div>
          </div>

          <div class="monitor-detail-panel">
            <header class="monitor-node-detail__header">
              <strong class="monitor-node-detail__name" id="monitorSelectedNodeName">-</strong>
              <span class="monitor-node-detail__id" id="monitorSelectedNodeId">-</span>
            </header>

            <div class="monitor-metric-grid">
              <article class="monitor-metric-card monitor-metric-card--latency">
                <span class="monitor-metric-card__label">AVG Latency <span class="monitor-pill">AVG</span></span>
                <div class="monitor-metric-card__row">
                  <strong class="monitor-metric-card__value" id="monitorMetricLatency">-</strong>
                  <span id="monitorTrendLatency"></span>
                </div>
                <div class="monitor-metric-bar"><div class="monitor-metric-bar__fill monitor-metric-bar__fill--latency" id="monitorBarLatency"></div></div>
                <canvas class="monitor-sparkline" id="monitorSparkLatency" width="200" height="36"></canvas>
              </article>
              <article class="monitor-metric-card monitor-metric-card--load">
                <span class="monitor-metric-card__label">Task Load</span>
                <div class="monitor-metric-card__row">
                  <strong class="monitor-metric-card__value" id="monitorMetricLoad">-</strong>
                  <span id="monitorTrendLoad"></span>
                </div>
                <div class="monitor-metric-bar"><div class="monitor-metric-bar__fill monitor-metric-bar__fill--load" id="monitorBarLoad"></div></div>
                <canvas class="monitor-sparkline" id="monitorSparkLoad" width="200" height="36"></canvas>
              </article>
              <article class="monitor-metric-card monitor-metric-card--gpu">
                <span class="monitor-metric-card__label">GPU Utilization</span>
                <div class="monitor-metric-card__row">
                  <strong class="monitor-metric-card__value" id="monitorMetricGpu">-</strong>
                  <span id="monitorTrendGpu"></span>
                </div>
                <div class="monitor-metric-bar"><div class="monitor-metric-bar__fill monitor-metric-bar__fill--gpu" id="monitorBarGpu"></div></div>
                <canvas class="monitor-sparkline" id="monitorSparkGpu" width="200" height="36"></canvas>
              </article>
            </div>

            <div class="monitor-task-stack" id="monitorTaskStack">
              <div class="monitor-task-stack__header">
                <span class="monitor-task-stack__title">Task Stack</span>
              </div>
              <div class="monitor-task-stack__running" id="monitorTaskRunning"></div>
              <div class="monitor-task-stack__queue-header">
                <span>Queued</span>
                <span class="monitor-task-stack__queue-count" id="monitorTaskQueueCount">0</span>
              </div>
              <div class="monitor-task-stack__queue" id="monitorTaskQueue"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function collectRefs() {
    return {
      nodeListScroll: document.getElementById("monitorNodeListScroll"),
      nodeName: document.getElementById("monitorSelectedNodeName"),
      nodeId: document.getElementById("monitorSelectedNodeId"),
      latencyValue: document.getElementById("monitorMetricLatency"),
      loadValue: document.getElementById("monitorMetricLoad"),
      gpuValue: document.getElementById("monitorMetricGpu"),
      trendLatency: document.getElementById("monitorTrendLatency"),
      trendLoad: document.getElementById("monitorTrendLoad"),
      trendGpu: document.getElementById("monitorTrendGpu"),
      barLatency: document.getElementById("monitorBarLatency"),
      barLoad: document.getElementById("monitorBarLoad"),
      barGpu: document.getElementById("monitorBarGpu"),
      sparkLatency: document.getElementById("monitorSparkLatency"),
      sparkLoad: document.getElementById("monitorSparkLoad"),
      sparkGpu: document.getElementById("monitorSparkGpu"),
      taskRunning: document.getElementById("monitorTaskRunning"),
      taskQueue: document.getElementById("monitorTaskQueue"),
      taskQueueCount: document.getElementById("monitorTaskQueueCount"),
    };
  }

  function populateNodeList(scrollEl, selectedNodeId) {
    if (!scrollEl) return;
    const cloudNodes = MONITOR_NODE_IDS.filter((id) => id.startsWith("cloud"));
    const edgeNodes = MONITOR_NODE_IDS.filter((id) => !id.startsWith("cloud"));
    let html = '';
    if (cloudNodes.length) {
      html += '<div class="monitor-node-list__group-label">Cloud</div>';
      cloudNodes.forEach((nodeId) => {
        const active = nodeId === selectedNodeId ? " monitor-node-item--active" : "";
        html += `<button class="monitor-node-item monitor-node-item--cloud${active}" data-node-id="${nodeId}">
          <span class="monitor-node-item__dot monitor-node-item__dot--cloud"></span>
          <span class="monitor-node-item__name">${nodeLabel(nodeId)}</span>
        </button>`;
      });
    }
    if (edgeNodes.length) {
      html += '<div class="monitor-node-list__group-label">Edge</div>';
      edgeNodes.forEach((nodeId) => {
        const active = nodeId === selectedNodeId ? " monitor-node-item--active" : "";
        html += `<button class="monitor-node-item monitor-node-item--edge${active}" data-node-id="${nodeId}">
          <span class="monitor-node-item__dot monitor-node-item__dot--edge"></span>
          <span class="monitor-node-item__name">${nodeLabel(nodeId)}</span>
        </button>`;
      });
    }
    scrollEl.innerHTML = html;
  }

  function updateTimestamp() {
    const timestampEl = document.getElementById("clusterMonitorUpdatedAt");
    if (!timestampEl) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    timestampEl.textContent = `Updated ${hh}:${mm}:${ss}`;
  }

  // ── Render ──

  function renderTaskStack(refs, taskState) {
    if (!taskState) return;

    if (refs.taskRunning) {
      const pct = clamp(taskState.progress, 0, 100);
      refs.taskRunning.innerHTML = `
        <div class="monitor-task-running">
          <div class="monitor-task-running__info">
            <span class="monitor-task-running__icon">&#9654;</span>
            <span class="monitor-task-running__name">${taskState.running}</span>
            <span class="monitor-task-running__pct">${pct}%</span>
          </div>
          <div class="monitor-task-running__bar">
            <div class="monitor-task-running__bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    }

    if (refs.taskQueueCount) {
      refs.taskQueueCount.textContent = taskState.queued.length;
    }

    if (refs.taskQueue) {
      if (!taskState.queued.length) {
        refs.taskQueue.innerHTML = '<div class="monitor-task-queue__empty">No tasks queued</div>';
      } else {
        refs.taskQueue.innerHTML = taskState.queued.map((name, i) => `
          <div class="monitor-task-queue__item">
            <span class="monitor-task-queue__pos">#${i + 1}</span>
            <span class="monitor-task-queue__name">${name}</span>
            <span class="monitor-task-queue__status">waiting</span>
          </div>
        `).join("");
      }
    }
  }

  function render() {
    if (!monitorState) return;
    const { selectedNodeId, metricsByNode, historyByNode, tasksByNode, refs } = monitorState;

    const selectedMetrics = metricsByNode[selectedNodeId] || {
      avgLatencyMs: null, loadPct: null, gpuPct: null,
    };
    const selectedHistory = historyByNode[selectedNodeId] || { latency: [], load: [], gpu: [] };

    // Node detail header
    if (refs.nodeName) refs.nodeName.textContent = nodeLabel(selectedNodeId);
    if (refs.nodeId) refs.nodeId.textContent = selectedNodeId;

    // Metric values
    if (refs.latencyValue) refs.latencyValue.textContent = formatLatency(selectedMetrics.avgLatencyMs);
    if (refs.loadValue) refs.loadValue.textContent = formatPct(selectedMetrics.loadPct);
    if (refs.gpuValue) refs.gpuValue.textContent = formatPct(selectedMetrics.gpuPct);

    // Trend arrows
    if (refs.trendLatency) refs.trendLatency.innerHTML = getTrendArrow(getTrend(selectedHistory.latency));
    if (refs.trendLoad) refs.trendLoad.innerHTML = getTrendArrow(getTrend(selectedHistory.load));
    if (refs.trendGpu) refs.trendGpu.innerHTML = getTrendArrow(getTrend(selectedHistory.gpu));

    // Progress bars
    const latencyPct = Number.isFinite(selectedMetrics.avgLatencyMs)
      ? clamp((selectedMetrics.avgLatencyMs / LATENCY.max) * 100, 0, 100) : 0;
    const loadPct = Number.isFinite(selectedMetrics.loadPct) ? clamp(selectedMetrics.loadPct, 0, 100) : 0;
    const gpuPct = Number.isFinite(selectedMetrics.gpuPct) ? clamp(selectedMetrics.gpuPct, 0, 100) : 0;
    if (refs.barLatency) refs.barLatency.style.width = `${latencyPct}%`;
    if (refs.barLoad) refs.barLoad.style.width = `${loadPct}%`;
    if (refs.barGpu) refs.barGpu.style.width = `${gpuPct}%`;

    // Sparklines
    drawSparkline(refs.sparkLatency, selectedHistory.latency, "#3b82f6");
    drawSparkline(refs.sparkLoad, selectedHistory.load, "#22c55e");
    drawSparkline(refs.sparkGpu, selectedHistory.gpu, "#8b5cf6");

    // Task stack
    renderTaskStack(refs, tasksByNode[selectedNodeId]);

    // Active node in list
    if (refs.nodeListScroll) {
      refs.nodeListScroll.querySelectorAll(".monitor-node-item").forEach((item) => {
        item.classList.toggle("monitor-node-item--active", item.dataset.nodeId === selectedNodeId);
      });
    }

    updateTimestamp();
  }

  // ── Simulation ──

  function simulateStep() {
    if (!monitorState) return;

    Object.keys(monitorState.linkLatencyByKey).forEach((key) => {
      monitorState.linkLatencyByKey[key] = stepValue(monitorState.linkLatencyByKey[key], LATENCY);
    });

    MONITOR_NODE_IDS.forEach((nodeId) => {
      const current = monitorState.metricsByNode[nodeId];
      if (!current) return;
      current.avgLatencyMs = computeNodeAvgLatency(nodeId, monitorState.topologyEdges, monitorState.linkLatencyByKey);
      current.loadPct = stepValue(current.loadPct, LOAD);
      current.gpuPct = stepValue(current.gpuPct, GPU);

      const h = monitorState.historyByNode[nodeId];
      if (h) {
        h.latency.push(current.avgLatencyMs || 0);
        h.load.push(current.loadPct || 0);
        h.gpu.push(current.gpuPct || 0);
        if (h.latency.length > HISTORY_SIZE) h.latency.shift();
        if (h.load.length > HISTORY_SIZE) h.load.shift();
        if (h.gpu.length > HISTORY_SIZE) h.gpu.shift();
      }

      // Simulate task progression
      const ts = monitorState.tasksByNode[nodeId];
      if (ts) simulateTaskStep(ts, nodeId);
    });
  }

  // ── Events ──

  function bindEvents() {
    const scrollEl = monitorState?.refs?.nodeListScroll;
    if (!scrollEl) return;
    scrollEl.addEventListener("click", (event) => {
      const item = event.target.closest(".monitor-node-item");
      if (!item) return;
      const next = item.dataset.nodeId;
      if (!next || !MONITOR_NODE_IDS.includes(next)) return;
      monitorState.selectedNodeId = next;
      render();
    });
  }

  // ── Init ──

  function initializeClusterMonitor() {
    const container = document.getElementById("clusterMonitorChart");
    if (!container) return;

    if (monitorTimer) {
      window.clearInterval(monitorTimer);
      monitorTimer = null;
    }

    buildTemplate(container);

    const topologyEdges = collectTopologyEdges();
    const linkLatencyByKey = buildLinkLatencyMap(topologyEdges);
    const selectedNodeId = MONITOR_NODE_IDS[0];
    const metricsByNode = buildInitialMetrics(topologyEdges, linkLatencyByKey);
    const historyByNode = buildInitialHistory(metricsByNode);
    const refs = collectRefs();

    const tasksByNode = {};
    MONITOR_NODE_IDS.forEach((nodeId) => {
      tasksByNode[nodeId] = buildInitialTasks(nodeId);
    });

    monitorState = {
      selectedNodeId,
      metricsByNode,
      historyByNode,
      tasksByNode,
      topologyEdges,
      linkLatencyByKey,
      refs,
    };

    populateNodeList(refs.nodeListScroll, selectedNodeId);
    bindEvents();
    render();

    monitorTimer = window.setInterval(() => {
      simulateStep();
      render();
    }, 2000);
  }

  window.initializeClusterMonitor = initializeClusterMonitor;
})();
