/**
 * clusterMonitor.js
 * - 单图双Y轴监控（X轴使用拓扑节点名）
 */

(function () {
  const TOPOLOGY_NODES = [
    "cloud-cluster-01",
    "edge-bj-01",
    "edge-bj-02",
    "edge-sh-01",
    "edge-gz-01",
  ];

  const LATENCY = { min: 30, max: 240, step: 20 };
  const LOAD = { min: 20, max: 100, step: 10 };

  let monitorState = null;
  let monitorTimer = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function toPercent(value, range) {
    const span = range.max - range.min;
    if (span <= 0) return 0;
    return clamp(((value - range.min) / span) * 100, 4, 100);
  }

  function stepValue(current, range) {
    const delta = (Math.random() * 2 - 1) * range.step;
    return clamp(current + delta, range.min, range.max);
  }

  function formatLatency(value) {
    return `${Math.round(value)}ms`;
  }

  function formatLoad(value) {
    return `${Math.round(value)}%`;
  }

  function buildInitialValues() {
    const values = {};
    TOPOLOGY_NODES.forEach((nodeName, index) => {
      const ratio = 0.36 + index * 0.1;
      values[nodeName] = {
        latencyMs: LATENCY.min + (LATENCY.max - LATENCY.min) * ratio,
        loadPct: LOAD.min + (LOAD.max - LOAD.min) * (0.4 + index * 0.08),
      };
    });
    return values;
  }

  function buildAxisTicks(values, unit) {
    return values
      .map((value) => `<span class="monitor-axis__tick">${value}${unit}</span>`)
      .join("");
  }

  function buildTemplate(container) {
    const leftTicks = buildAxisTicks([240, 180, 120, 60, 0], "");
    const rightTicks = buildAxisTicks([100, 75, 50, 25, 0], "%");

    container.innerHTML = `
      <div class="monitor-unified">
        <div class="monitor-unified__legend">
          <span class="monitor-legend-chip monitor-legend-chip--latency">Latency (ms)</span>
          <span class="monitor-legend-chip monitor-legend-chip--load">Load (%)</span>
        </div>
        <div class="monitor-unified__plot">
          <div class="monitor-axis monitor-axis--left">
            <span class="monitor-axis__title">Latency</span>
            <div class="monitor-axis__ticks">${leftTicks}</div>
          </div>
          <div class="monitor-plot-area">
            <div class="monitor-nodes" id="monitorNodes"></div>
          </div>
          <div class="monitor-axis monitor-axis--right">
            <span class="monitor-axis__title">Load</span>
            <div class="monitor-axis__ticks">${rightTicks}</div>
          </div>
        </div>
        <div class="monitor-summary" id="monitorSummary"></div>
      </div>
    `;
  }

  function buildNodeBars() {
    const wrapper = document.getElementById("monitorNodes");
    if (!wrapper) return {};

    wrapper.innerHTML = "";
    const refs = {};

    TOPOLOGY_NODES.forEach((nodeName) => {
      const node = document.createElement("div");
      node.className = "monitor-node";

      const bars = document.createElement("div");
      bars.className = "monitor-node-bars";

      const latencyColumn = document.createElement("div");
      latencyColumn.className = "monitor-bar-column";
      const latencyBar = document.createElement("div");
      latencyBar.className = "monitor-bar monitor-bar--latency";
      latencyColumn.appendChild(latencyBar);

      const loadColumn = document.createElement("div");
      loadColumn.className = "monitor-bar-column";
      const loadBar = document.createElement("div");
      loadBar.className = "monitor-bar monitor-bar--load";
      loadColumn.appendChild(loadBar);

      bars.appendChild(latencyColumn);
      bars.appendChild(loadColumn);

      const label = document.createElement("div");
      label.className = "monitor-node-label";
      label.textContent = nodeName;

      node.appendChild(bars);
      node.appendChild(label);
      wrapper.appendChild(node);

      refs[nodeName] = { latencyBar, loadBar };
    });

    return refs;
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

  function renderSummary(values) {
    const summary = document.getElementById("monitorSummary");
    if (!summary) return;

    summary.innerHTML = TOPOLOGY_NODES.map((nodeName) => {
      const nodeMetrics = values[nodeName];
      if (!nodeMetrics) return "";
      return `
        <div class="monitor-summary-item">
          <div class="monitor-summary-item__name">${nodeName}</div>
          <div class="monitor-summary-item__metrics">
            <span>${formatLatency(nodeMetrics.latencyMs)}</span>
            <span>${formatLoad(nodeMetrics.loadPct)}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  function render() {
    if (!monitorState) return;
    TOPOLOGY_NODES.forEach((nodeName) => {
      const refs = monitorState.refs[nodeName];
      const values = monitorState.values[nodeName];
      if (!refs || !values) return;

      refs.latencyBar.style.height = `${toPercent(values.latencyMs, LATENCY)}%`;
      refs.loadBar.style.height = `${toPercent(values.loadPct, LOAD)}%`;
    });

    renderSummary(monitorState.values);
    updateTimestamp();
  }

  function simulateStep() {
    if (!monitorState) return;
    TOPOLOGY_NODES.forEach((nodeName) => {
      const current = monitorState.values[nodeName];
      current.latencyMs = stepValue(current.latencyMs, LATENCY);
      current.loadPct = stepValue(current.loadPct, LOAD);
    });
  }

  function initializeClusterMonitor() {
    const container = document.getElementById("clusterMonitorChart");
    if (!container) return;

    if (monitorTimer) {
      window.clearInterval(monitorTimer);
      monitorTimer = null;
    }

    buildTemplate(container);

    monitorState = {
      values: buildInitialValues(),
      refs: buildNodeBars(),
    };

    render();

    monitorTimer = window.setInterval(() => {
      simulateStep();
      render();
    }, 2000);
  }

  window.initializeClusterMonitor = initializeClusterMonitor;
})();
