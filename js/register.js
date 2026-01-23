/**
 * Agent Registration Page
 */

document.addEventListener('DOMContentLoaded', function() {
  const registerForm = document.getElementById('registerForm');
  const nodeSelect = document.getElementById('agentNodeId');
  const agentList = document.getElementById('agentList');
  const agentCountLabel = document.getElementById('agentCountLabel');
  const agentListCard = agentList ? agentList.closest('.agent-list-card') : null;
  const bulkToggleButton = document.getElementById('agentBulkToggle');
  const bulkDeleteButton = document.getElementById('agentBulkDelete');
  const selectedAgentIds = new Set();
  let selectionMode = false;
  let currentAgents = [];

  const seedAgents = [
    {
      id: 'agent-video',
      name: 'VideoAgent',
      type: 'agent',
      layer: 'cloud',
      node_id: 'cloud-bj-01',
      status: 'active',
      category: 'perception',
      summary: '视频分析',
      tools: ['VideoUnderstanding', 'KeyframeExtractor', 'ImageRecognition']
    },
    {
      id: 'agent-registry',
      name: 'RegistryAgent',
      type: 'agent',
      layer: 'cloud',
      node_id: 'cloud-sh-01',
      status: 'active',
      category: 'service',
      summary: '',
      tools: []
    },
    {
      id: 'agent-discovery',
      name: 'DiscoveryAgent',
      type: 'agent',
      layer: 'cloud',
      node_id: 'cloud-hz-03',
      status: 'active',
      category: 'planning',
      summary: '',
      tools: []
    },
    {
      id: 'agent-meteorology',
      name: 'MeteorologyAgent',
      type: 'agent',
      layer: 'edge',
      node_id: 'edge-bj-01',
      status: 'active',
      category: 'perception',
      summary: '气象风险评估',
      tools: ['AnalyzeWeather', 'EvaluateRescueImpact', 'AnalyzeRescueImpact']
    },
    {
      id: 'agent-keyframe',
      name: 'KeyframeAgent',
      type: 'agent',
      layer: 'edge',
      node_id: 'edge-bj-02',
      status: 'active',
      category: 'perception',
      summary: '关键帧细节识别',
      tools: ['KeyframeRecognition', 'ReadFile', 'GetImagePaths']
    },
    {
      id: 'agent-map',
      name: 'MapAgent',
      type: 'agent',
      layer: 'edge',
      node_id: 'edge-sh-01',
      status: 'active',
      category: 'perception',
      summary: '地理信息与路况检索',
      tools: ['Map', 'FindNearestContact', 'Dial']
    },
    {
      id: 'agent-report',
      name: 'ReportAgent',
      type: 'agent',
      layer: 'edge',
      node_id: 'edge-gz-01',
      status: 'active',
      category: 'execution',
      summary: '应急报告自动化生成',
      tools: ['ReadFile', 'GetImagePaths', 'GenerateReport']
    }
  ];

  const registeredAgents = loadRegisteredAgents();
  renderAgentList(registeredAgents);
  if (typeof window.initializeNetworkGraph === 'function') {
    window.initializeNetworkGraph();
  }

  if (bulkToggleButton) {
    bulkToggleButton.addEventListener('click', () => {
      setSelectionMode(!selectionMode);
    });
  }

  if (bulkDeleteButton) {
    bulkDeleteButton.addEventListener('click', () => {
      if (!selectionMode) return;
      const targets = currentAgents.filter(agent => selectedAgentIds.has(agent.id));
      if (!targets.length) return;
      const label = targets.length === 1 ? (targets[0].name || targets[0].id) : `${targets.length} agents`;
      if (!window.confirm(`Remove ${label}?`)) {
        return;
      }
      deleteAgents(targets);
      clearSelection();
    });
  }
  
  registerForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const selectedNode = nodeSelect.selectedOptions[0];
    const selectedLayer = selectedNode ? selectedNode.getAttribute('data-layer') : '';

    // 收集表单数据
    const agentData = {
      name: document.getElementById('agentName').value.trim(),
      type: 'agent',
      layer: selectedLayer || 'edge',
      description: document.getElementById('agentDescription').value.trim(),
      capabilities: document.getElementById('agentCapabilities').value.trim(),
      nodeId: document.getElementById('agentNodeId').value,
      agentDns: document.getElementById('agentDns').value.trim(),
      endpoint: document.getElementById('agentEndpoint').value.trim(),
      autoStart: document.getElementById('agentAutoStart').checked
    };

    // 验证数据
    if (!agentData.name || !agentData.description || !agentData.capabilities || !agentData.nodeId || !agentData.agentDns || !agentData.endpoint) {
      alert('Please fill in all required fields');
      return;
    }

    const dnsInfo = parseAgentDns(agentData.agentDns);
    if (!dnsInfo) {
      alert('Agent DNS must follow: acrg://org/{category}/{name}@{serverId}');
      return;
    }
    if (dnsInfo.name !== agentData.name) {
      alert('Agent DNS name must match the Agent Name field');
      return;
    }
    if (dnsInfo.serverId !== agentData.nodeId) {
      alert('Agent DNS serverId must match the selected node_id');
      return;
    }
    if (!isValidEndpoint(agentData.endpoint)) {
      alert('Agent Endpoint must be a valid IPv4 address');
      return;
    }
    
    // 保存到localStorage以供主页使用
    const createdAt = Date.now();
    const newAgent = {
      id: `${agentData.type}-${createdAt}`,
      name: agentData.name,
      type: agentData.type,
      layer: agentData.layer,
      node_id: agentData.nodeId,
      nodeLabel: agentData.nodeId,
      isExtension: true,
      status: 'active',
      cpu: 50,
      memory: 50,
      description: agentData.description,
      capabilities: agentData.capabilities.split(',').map(c => c.trim()).filter(Boolean),
      endpoint: agentData.endpoint,
      relevance: 0,
      category: dnsInfo.category,
      createdAt
    };
    
    // 将新Agent信息保存到localStorage
    const newAgents = localStorage.getItem('newAgents');
    const agentsList = newAgents ? JSON.parse(newAgents) : [];
    agentsList.push(newAgent);
    localStorage.setItem('newAgents', JSON.stringify(agentsList));

    const updatedRegisteredAgents = addRegisteredAgent(newAgent);
    renderAgentList(updatedRegisteredAgents);

    if (Array.isArray(window.agentDatabase)) {
      const exists = window.agentDatabase.some(agent => agent.id === newAgent.id);
      if (!exists) {
        window.agentDatabase.push(newAgent);
      }
      if (typeof window.addAgentToNetwork === 'function') {
        window.addAgentToNetwork(newAgent);
      }
      if (typeof window.initializeStats === 'function') {
        window.initializeStats();
      }
    }
    
    // 显示成功消息
    showSuccessMessage('Agent registered successfully!');
    alert('Agent registered successfully!');
  });
  
  /**
   * 显示成功消息
   */
  function showSuccessMessage(message) {
    let successDiv = document.querySelector('.success-message');
    
    if (!successDiv) {
      successDiv = document.createElement('div');
      successDiv.className = 'success-message';
      document.body.appendChild(successDiv);
    }
    
    successDiv.textContent = message;
    successDiv.classList.add('show');
    
    setTimeout(() => {
      successDiv.classList.remove('show');
    }, 3000);
  }

  function loadRegisteredAgents() {
    const stored = localStorage.getItem('registeredAgents');
    let storedAgents = [];

    if (stored) {
      try {
        storedAgents = JSON.parse(stored);
      } catch (error) {
        storedAgents = [];
      }
    }

    const mergedAgents = mergeAgents(seedAgents, storedAgents);
    const deletedIds = getDeletedAgentIds();
    const filteredAgents = mergedAgents.filter(agent => !deletedIds.has(agent.id));
    localStorage.setItem('registeredAgents', JSON.stringify(filteredAgents));
    return filteredAgents;
  }

  function mergeAgents(baseAgents, storedAgents) {
    const merged = new Map();
    baseAgents.forEach(agent => {
      merged.set(agent.id, { ...agent });
    });
    storedAgents.forEach(agent => {
      if (!agent || !agent.id) return;
      const base = merged.get(agent.id) || {};
      merged.set(agent.id, { ...base, ...agent });
    });
    return Array.from(merged.values());
  }

  function addRegisteredAgent(agent) {
    const stored = localStorage.getItem('registeredAgents');
    let storedAgents = [];
    if (stored) {
      try {
        storedAgents = JSON.parse(stored);
      } catch (error) {
        storedAgents = [];
      }
    }

    const mergedAgents = mergeAgents(seedAgents, storedAgents);
    const deletedIds = getDeletedAgentIds();
    if (deletedIds.has(agent.id)) {
      deletedIds.delete(agent.id);
      saveDeletedAgentIds(deletedIds);
    }
    const exists = mergedAgents.some(item => item.id === agent.id);
    if (!exists) {
      const category = resolveAgentCategory(agent);
      mergedAgents.push({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        layer: agent.layer,
        node_id: agent.node_id,
        status: agent.status || 'active',
        category,
        summary: agent.summary || '',
        tools: Array.isArray(agent.tools) ? agent.tools : []
      });
      localStorage.setItem('registeredAgents', JSON.stringify(mergedAgents));
    }
    return mergedAgents;
  }

  function renderAgentList(agents) {
    if (!agentList || !agentCountLabel) return;

    agentList.innerHTML = '';
    if (agentListCard) {
      agentListCard.classList.toggle('is-selecting', selectionMode);
    }
    const sortedAgents = [...agents].sort((a, b) => {
      const aName = (a.name || a.id || '').toLowerCase();
      const bName = (b.name || b.id || '').toLowerCase();
      return aName.localeCompare(bName);
    });

    agentCountLabel.textContent = sortedAgents.length;
    currentAgents = sortedAgents;

    if (sortedAgents.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'agent-empty';
      empty.textContent = 'No agents registered yet.';
      agentList.appendChild(empty);
      return;
    }

    sortedAgents.forEach(agent => {
      const item = document.createElement('div');
      item.className = 'agent-item';

      const header = document.createElement('div');
      header.className = 'agent-item-header';

      const left = document.createElement('div');
      left.className = 'agent-item-left';

      const name = document.createElement('div');
      name.className = 'agent-item-name';
      name.textContent = agent.name || agent.id;

      const selectBox = document.createElement('input');
      selectBox.type = 'checkbox';
      selectBox.className = 'agent-select';
      selectBox.checked = selectedAgentIds.has(agent.id);
      selectBox.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      selectBox.addEventListener('change', () => {
        if (selectBox.checked) {
          selectedAgentIds.add(agent.id);
        } else {
          selectedAgentIds.delete(agent.id);
        }
        updateBulkDeleteState();
      });

      const titleRow = document.createElement('div');
      titleRow.className = 'agent-item-title';
      titleRow.appendChild(selectBox);
      titleRow.appendChild(name);

      const status = document.createElement('span');
      const statusValue = (agent.status || 'active').toLowerCase();
      status.className = `agent-item-status ${statusValue}`;
      status.textContent = statusValue;

      const actions = document.createElement('div');
      actions.className = 'agent-item-actions';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'agent-item-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<span class="agent-toggle-icon">▾</span>';

      left.appendChild(titleRow);
      if (agent.summary) {
        const summary = document.createElement('div');
        summary.className = 'agent-item-summary';
        summary.textContent = agent.summary;
        left.appendChild(summary);
      }

      actions.appendChild(status);
      actions.appendChild(toggle);

      header.appendChild(left);
      header.appendChild(actions);

      const meta = document.createElement('div');
      meta.className = 'agent-item-meta';

      meta.textContent = formatAgentAddress(agent);

      const tools = getAgentTools(agent);
      const toolsBlock = document.createElement('div');
      toolsBlock.className = 'agent-item-tools';

      const toolsLabel = document.createElement('span');
      toolsLabel.className = 'agent-item-tools-label';
      toolsLabel.textContent = 'Tools:';

      const toolsValue = document.createElement('span');
      toolsValue.className = 'agent-item-tools-value';
      toolsValue.textContent = tools.length ? tools.join(', ') : '—';

      toolsBlock.appendChild(toolsLabel);
      toolsBlock.appendChild(toolsValue);

      toggle.addEventListener('click', () => {
        const isOpen = item.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      item.appendChild(header);
      item.appendChild(meta);
      item.appendChild(toolsBlock);
      agentList.appendChild(item);
    });

    updateBulkDeleteState();
  }

  function getAgentTools(agent) {
    if (Array.isArray(agent.tools) && agent.tools.length) {
      return agent.tools;
    }
    if (Array.isArray(agent.capabilities) && agent.capabilities.length) {
      return agent.capabilities;
    }
    return [];
  }

  function formatAgentAddress(agent) {
    const name = agent.name || agent.id || 'agent';
    const serverId = agent.node_id || 'unknown';
    const category = resolveAgentCategory(agent);
    return `acrg://org/${category}/${name}@${serverId}`;
  }

  function parseAgentDns(value) {
    const regex = /^acrg:\/\/org\/(perception|planning|execution|service)\/([A-Za-z0-9._-]+)@([A-Za-z0-9._-]+)$/;
    const match = value.match(regex);
    if (!match) return null;
    return {
      category: match[1],
      name: match[2],
      serverId: match[3]
    };
  }

  function isValidEndpoint(value) {
    return isValidIPv4(value);
  }

  function isValidIPv4(value) {
    const match = value.match(/^(\d{1,3}\.){3}\d{1,3}$/);
    if (!match) return false;
    return value.split('.').every((part) => {
      const num = Number(part);
      return num >= 0 && num <= 255;
    });
  }

  function resolveAgentCategory(agent) {
    const allowed = ['perception', 'planning', 'execution', 'service'];
    if (agent.category && allowed.includes(agent.category)) {
      return agent.category;
    }

    const typeMap = {
      llm: 'planning',
      tool: 'service',
      compute: 'service'
    };
    if (agent.type && typeMap[agent.type]) {
      return typeMap[agent.type];
    }

    const text = [
      agent.name,
      ...(Array.isArray(agent.capabilities) ? agent.capabilities : []),
      agent.description
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const hasAny = (keywords) => keywords.some((keyword) => text.includes(keyword));

    if (hasAny(['vision', 'image', 'video', 'sensor', 'camera', 'map', 'perception', 'detect'])) {
      return 'perception';
    }
    if (hasAny(['plan', 'route', 'strategy', 'optimiz', 'search', 'decide'])) {
      return 'planning';
    }
    if (hasAny(['execute', 'control', 'run', 'deploy', 'operate', 'action'])) {
      return 'execution';
    }
    if (hasAny(['registry', 'service', 'report', 'api', 'tool', 'monitor', 'gateway'])) {
      return 'service';
    }

    return 'service';
  }

  function deleteAgent(agent) {
    if (!agent) return;
    const label = agent.name || agent.id;
    if (!window.confirm(`Remove ${label}?`)) {
      return;
    }

    deleteAgents([agent]);
  }

  function getDeletedAgentIds() {
    const stored = localStorage.getItem('deletedAgents');
    if (!stored) return new Set();
    try {
      const parsed = JSON.parse(stored);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveDeletedAgentIds(ids) {
    localStorage.setItem('deletedAgents', JSON.stringify(Array.from(ids)));
  }

  function deleteAgents(agents) {
    const ids = new Set(agents.map(agent => agent.id));
    if (!ids.size) return;

    const deletedIds = getDeletedAgentIds();
    ids.forEach(id => deletedIds.add(id));
    saveDeletedAgentIds(deletedIds);

    const stored = localStorage.getItem('registeredAgents');
    let storedAgents = [];
    if (stored) {
      try {
        storedAgents = JSON.parse(stored);
      } catch (error) {
        storedAgents = [];
      }
    }
    storedAgents = storedAgents.filter(item => item && !ids.has(item.id));
    localStorage.setItem('registeredAgents', JSON.stringify(storedAgents));

    const newAgents = localStorage.getItem('newAgents');
    if (newAgents) {
      try {
        const parsed = JSON.parse(newAgents);
        const updated = Array.isArray(parsed) ? parsed.filter(item => item && !ids.has(item.id)) : [];
        localStorage.setItem('newAgents', JSON.stringify(updated));
      } catch (error) {
        localStorage.setItem('newAgents', JSON.stringify([]));
      }
    }

    agents.forEach(agent => removeAgentFromTopology(agent));

    const refreshed = loadRegisteredAgents();
    renderAgentList(refreshed);
  }

  function clearSelection() {
    selectedAgentIds.clear();
    updateBulkDeleteState();
    if (agentList) {
      const checkboxes = agentList.querySelectorAll('.agent-select');
      checkboxes.forEach(box => {
        box.checked = false;
      });
    }
  }

  function setSelectionMode(enabled) {
    selectionMode = enabled;
    if (agentListCard) {
      agentListCard.classList.toggle('is-selecting', enabled);
    }
    if (bulkToggleButton) {
      bulkToggleButton.textContent = enabled ? 'Cancel' : 'Remove';
    }
    clearSelection();
  }

  function updateBulkDeleteState() {
    if (!bulkDeleteButton) return;
    const count = selectedAgentIds.size;
    bulkDeleteButton.disabled = !selectionMode || count === 0;
    bulkDeleteButton.textContent = count > 0 ? `Delete (${count})` : 'Delete';
  }

  function removeAgentFromTopology(agent) {
    if (!agent || !Array.isArray(window.agentDatabase)) return;

    const agentId = agent.id;
    const nodeKey = agent.node_id || agent.nodeId || agent.nodeLabel;
    const targetIds = new Set([agentId]);
    const liveEntry = window.agentDatabase.find(item => item.id === agentId);
    const isExtension = liveEntry ? !!liveEntry.isExtension : false;

    if (!isExtension && nodeKey) {
      window.agentDatabase.forEach(item => {
        const itemKey = item.node_id || item.nodeId || item.nodeLabel;
        if (item.isExtension && itemKey === nodeKey) {
          targetIds.add(item.id);
        }
      });
    }

    for (let i = window.agentDatabase.length - 1; i >= 0; i -= 1) {
      if (targetIds.has(window.agentDatabase[i].id)) {
        window.agentDatabase.splice(i, 1);
      }
    }

    if (window.networkGraph && window.networkGraph.nodes) {
      targetIds.forEach((id) => {
        if (window.networkGraph.nodes.get(id)) {
          window.networkGraph.nodes.remove(id);
        }
      });
    }

    if (window.networkGraph && window.networkGraph.edges) {
      const edgesToRemove = window.networkGraph.edges.get({
        filter: (edge) => targetIds.has(edge.from) || targetIds.has(edge.to),
      });
      if (edgesToRemove.length) {
        window.networkGraph.edges.remove(edgesToRemove.map(edge => edge.id));
      }
    }

    if (window.networkGraph && window.networkInstance && typeof window.buildTopologyEdges === 'function') {
      window.buildTopologyEdges(window.networkGraph.edges, window.networkGraph.nodes);
      if (typeof window.syncTopologyLayout === 'function') {
        const container = document.getElementById('networkGraph');
        if (container) {
          window.syncTopologyLayout(container, window.networkInstance);
        }
      }
    }

    if (typeof window.initializeStats === 'function') {
      window.initializeStats();
    }
  }
});
