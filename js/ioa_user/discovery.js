/**
 * discovery.js
 * - Discovery 列表渲染（右侧卡片）
 * - Selected Agents 列表维护
 * - 后端 candidates 渲染（updateDiscoveryListFromBackend）
 * - loadNewAgents（从 localStorage 加载并更新拓扑）
 *
 * ✅ 新增：
 * 1) “匹配度”展示为：包含网络拥塞后的总分百分比（final_pct 优先）
 * 2) 卡片名称旁边增加网络拥塞指示灯（红/黄/绿）
 *    - 使用后端返回 net_pct / net_score（越大越好、越不拥塞）
 *    - 拥塞 = 100 - netPctGood
 */

(function () {
    // 保险：如果 core.js 还没初始化，就给一个默认壳
    window.appState = window.appState || {
      selectedAgents: [],
      filteredAgents: [],
      messages: [],
      filterType: "",
      filterStatus: "active",
      currentRequest: "",
    };
  
    // ========== 工具函数：百分比解析 ==========
    function _parsePercentLike(v) {
      if (v === undefined || v === null) return NaN;
      const s = String(v).trim();
      if (!s) return NaN;
      const num = s.includes("%") ? Number(s.replace("%", "")) : Number(s);
      return Number.isFinite(num) ? num : NaN;
    }
  
    // ========== 工具函数：网络拥塞计算 ==========
    // net_score: 0~1 (越大越好、越不拥塞)
    // net_pct  : 0~100 (越大越好、越不拥塞)
    // 返回：{ netPctGood, congestionPct, level }
    function _calcCongestion(obj) {
      let netPctGood = _parsePercentLike(obj?.net_pct); // 0~100 (good)
  
      if (!Number.isFinite(netPctGood)) {
        const ns = Number(obj?.net_score);
        if (Number.isFinite(ns)) netPctGood = ns * 100;
      }
  
      // 本地 agentDatabase 通常没有网络字段：默认 100%（不拥塞）
      if (!Number.isFinite(netPctGood)) netPctGood = 100;
  
      netPctGood = Math.max(0, Math.min(100, netPctGood));
  
      // 拥塞程度：0~100（越大越拥塞）
      const congestionPct = 100 - netPctGood;
  
      // 红黄绿阈值（按需调整）
      let level = "green";
      if (congestionPct >= 70) level = "red";
      else if (congestionPct >= 40) level = "yellow";
  
      return { netPctGood, congestionPct, level };
    }
  
  function _netTitle(net) {
    return `网络拥塞：${net.congestionPct.toFixed(0)}%（网络评分：${net.netPctGood.toFixed(0)}%）`;
  }

  function _netColor(level) {
    if (level === "red") return "#ef4444";
    if (level === "yellow") return "#f59e0b";
    return "#22c55e";
  }
  
    // ========== 初始化 ==========
    function initializeDiscoveryProcess() {
      // 默认渲染全部 agentDatabase
      renderDiscoveryList(window.agentDatabase || []);
      updateSelectedAgentsList();
    }
  
    // ========== 渲染 Discovery 列表（基于本地 agentDatabase） ==========
    function renderDiscoveryList(agents) {
      const discoveryList = document.getElementById("discoveryList");
      if (!discoveryList) return;
  
      discoveryList.innerHTML = "";
      const list = Array.isArray(agents) ? agents : [];
  
      list.forEach((agent) => {
        const card = document.createElement("div");
        card.className = "agent-card";
  
        const typeLabel = agent.type
          ? agent.type.charAt(0).toUpperCase() + agent.type.slice(1)
          : "Agent";
  
        const capabilities = Array.isArray(agent.capabilities)
          ? agent.capabilities.slice(0, 2).join(", ")
          : "";
        const displayName = agent.displayName || agent.name || agent.id;
  
        const matchScore = agent.matchScore || agent.relevance || 0;
        const relevancePercent = Math.max(0, Math.min(100, Number(matchScore) || 0));
  
        // ✅ 本地列表也展示网络灯（无数据时默认绿）
      const net = _calcCongestion(agent);
      const netTitle = _netTitle(net);
      const netColor = _netColor(net.level);
      const netPercent = `${net.congestionPct.toFixed(0)}%`;
  
        card.innerHTML = `
          <div class="agent-card-left">
            <input type="checkbox" class="agent-card-checkbox" id="checkbox-${agent.id}" data-agent-id="${agent.id}">
            <div class="agent-card-info">
              <div class="agent-card-name">
                ${displayName}
                <span class="net-lamp net-${net.level}" title="${netTitle}"></span>
              </div>
              <div>
                <span class="agent-card-type ${agent.type || "agent"}">${typeLabel}</span>
                <span class="agent-card-status ${agent.status || ""}">
                  ${(agent.status || "active").toString().replace(/^\w/, (c) => c.toUpperCase())}
                </span>
              </div>
              <div class="agent-card-capabilities">${capabilities}</div>
            </div>
          </div>
          <div class="agent-card-right">
            <div class="agent-score">
              <span class="agent-score-label">匹配度</span>
              <span class="agent-score-value">${relevancePercent}%</span>
              <div class="relevance-bar">
                <div class="relevance-fill" style="width: ${relevancePercent}%"></div>
              </div>
              <span class="agent-score-label">网络拥塞</span>
              <span class="agent-score-value" style="color: ${netColor}; -webkit-text-fill-color: ${netColor};">${netPercent}</span>
            </div>
          </div>
        `;
  
        const checkbox = card.querySelector('input[type="checkbox"]');
  
        // 同步 checkbox 初始状态：如果已选过，就勾上
        const alreadySelected = window.appState.selectedAgents.some((a) => a.id === agent.id);
        checkbox.checked = alreadySelected;
  
        checkbox.addEventListener("change", (e) => {
          if (e.target.checked) {
            // 加入 selected
            if (!window.appState.selectedAgents.find((a) => a.id === agent.id)) {
              window.appState.selectedAgents.push(agent);
            }
            // 高亮拓扑
            window.highlightNodeInNetwork?.(agent.id);
          } else {
            // 移除 selected
            window.appState.selectedAgents = window.appState.selectedAgents.filter((a) => a.id !== agent.id);
          }
          updateSelectedAgentsList();
        });
  
        discoveryList.appendChild(card);
      });
    }
  
    // ========== Selected Agents 渲染 ==========
    function updateSelectedAgentsList() {
      const selectedList = document.getElementById("selectedList");
      if (!selectedList) return;
  
      selectedList.innerHTML = "";
  
      window.appState.selectedAgents.forEach((agent) => {
        const tag = document.createElement("div");
        tag.className = "selected-tag";
        tag.innerHTML = `
          ${agent.displayName || agent.name || agent.id}
          <button type="button" data-agent-id="${agent.id}">×</button>
        `;
  
        tag.querySelector("button").addEventListener("click", () => {
          removeSelectedAgent(agent.id);
        });
  
        selectedList.appendChild(tag);
      });
    }
  
    function removeSelectedAgent(agentId) {
      window.appState.selectedAgents = window.appState.selectedAgents.filter((a) => a.id !== agentId);
  
      // 取消对应 checkbox
      const checkbox = document.getElementById(`checkbox-${agentId}`);
      if (checkbox) checkbox.checked = false;
  
      updateSelectedAgentsList();
    }
  
    // ========== 后端 candidates 渲染（你 chat.js 会调用） ==========
    function updateDiscoveryListFromBackend(candidates) {
      const discoveryList = document.getElementById("discoveryList");
      if (!discoveryList) return;
  
      discoveryList.innerHTML = "";
  
      if (!Array.isArray(candidates)) {
        console.warn("candidates is not an array:", candidates);
        return;
      }
  
      candidates.forEach((item) => {
        const card = document.createElement("div");
        card.className = "agent-card";
  
        // ✅ 总分百分比（含网络）优先：final_pct -> match_pct -> match -> confidence
        let matchPercent = NaN;
  
        if (item.final_pct !== undefined && item.final_pct !== null) {
          matchPercent = _parsePercentLike(item.final_pct);
        } else if (item.match_pct !== undefined && item.match_pct !== null) {
          matchPercent = _parsePercentLike(item.match_pct);
        } else if (item.match !== undefined && item.match !== null) {
          const m = Number(item.match);
          matchPercent = Number.isFinite(m) ? m * 100 : NaN;
        } else if (item.confidence !== undefined && item.confidence !== null) {
          matchPercent = _parsePercentLike(item.confidence);
        }
  
        if (!Number.isFinite(matchPercent)) matchPercent = 0;
        matchPercent = Math.max(0, Math.min(100, matchPercent));
  
        const matchLabel = matchPercent.toFixed(2).replace(/\.00$/, "");
        const agentName = item.agent_name || item.name || "";
        const hit = window.agentDatabase?.find(
          (a) => a.name === agentName || a.displayName === agentName || a.id === agentName
        );
        const displayName = hit?.displayName || hit?.name || agentName;
        const capability =
          item.capability ||
          (Array.isArray(hit?.capabilities) && hit.capabilities.length ? hit.capabilities[0] : "未知功能");

        let shortDesc = "";
        if (item.description) {
          const descParts = String(item.description).split("|");
          shortDesc = descParts.length > 2 ? descParts[2].trim() : String(item.description).slice(0, 60);
        } else if (Array.isArray(hit?.capabilities) && hit.capabilities.length) {
          shortDesc = hit.capabilities.join(", ");
        }
  
        // ✅ 网络灯（用后端返回的 net_pct/net_score）
      const net = _calcCongestion(item);
      const netTitle = _netTitle(net);
      const netColor = _netColor(net.level);
      const netPercent = `${net.congestionPct.toFixed(0)}%`;
  
        card.innerHTML = `
          <input type="checkbox" class="agent-card-checkbox" data-agent-name="${agentName}">
          <div class="agent-card-info">
            <div class="agent-card-name">
              ${displayName}
              <span class="net-lamp net-${net.level}" title="${netTitle}"></span>
            </div>
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
            <span class="agent-score-label">网络拥塞</span>
            <span class="agent-score-value" style="color: ${netColor}; -webkit-text-fill-color: ${netColor};">${netPercent}</span>
          </div>
        </div>
      `;
  
        const checkbox = card.querySelector('input[type="checkbox"]');
  
        // 如果这个候选已在 selectedAgents 里，也勾上
        if (hit) {
          checkbox.checked = window.appState.selectedAgents.some((a) => a.id === hit.id);
        }
  
        checkbox.addEventListener("change", (e) => {
          if (!hit) return;
  
          if (e.target.checked) {
            if (!window.appState.selectedAgents.find((a) => a.id === hit.id)) {
              window.appState.selectedAgents.push(hit);
            }
            window.highlightNodeInNetwork?.(hit.id);
          } else {
            window.appState.selectedAgents = window.appState.selectedAgents.filter((a) => a.id !== hit.id);
          }
          updateSelectedAgentsList();
        });
  
        discoveryList.appendChild(card);
      });
    }
  
    // ========== chat.js 会用：高亮选中 agent，并同步 Selected ==========
    function highlightSelectedAgent(agentName) {
      const agent = window.agentDatabase?.find(
        (a) => a.name === agentName || a.displayName === agentName || a.id === agentName
      );
      if (!agent) return;
  
      // 高亮拓扑
      window.highlightNodeInNetwork?.(agent.id);
  
      // 进入 selected
      if (!window.appState.selectedAgents.find((a) => a.id === agent.id)) {
        window.appState.selectedAgents.push(agent);
        updateSelectedAgentsList();
      }
  
      // 同步 checkbox（两种列表里都尽量同步）
      const checkbox1 = document.getElementById(`checkbox-${agent.id}`);
      if (checkbox1) checkbox1.checked = true;
    }
  
    // ========== localStorage 新增 agent ==========
    function loadNewAgents() {
      const newAgentsData = localStorage.getItem("newAgents");
      if (!newAgentsData) return;
  
      try {
        const newAgents = JSON.parse(newAgentsData);
        (newAgents || []).forEach((agent) => {
          const exists = window.agentDatabase.some((a) => a.id === agent.id);
          if (!exists) {
            window.agentDatabase.push(agent);
  
            // 动态加入拓扑
            if (window.networkGraph && window.networkInstance) {
              window.addAgentToNetwork?.(agent);
            }
          }
        });
  
        // 更新统计
        window.initializeStats?.();
  
        // 清掉缓存
        localStorage.removeItem("newAgents");
  
        // 重新渲染 Discovery
        renderDiscoveryList(window.agentDatabase);
  
        console.log("Loaded", newAgents.length, "new agents from localStorage");
      } catch (e) {
        console.error("Error loading new agents:", e);
      }
    }
  
    // ========== exports（关键！否则 chat.js 找不到） ==========
    window.initializeDiscoveryProcess = initializeDiscoveryProcess;
    window.renderDiscoveryList = renderDiscoveryList;
    window.updateSelectedAgentsList = updateSelectedAgentsList;
    window.removeSelectedAgent = removeSelectedAgent;
  
    window.updateDiscoveryListFromBackend = updateDiscoveryListFromBackend;
    window.highlightSelectedAgent = highlightSelectedAgent;
  
    window.loadNewAgents = loadNewAgents;
  })();
  
