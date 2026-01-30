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
  const agentListTitle = document.getElementById('agentListTitle');
  const agentTabRegistered = document.getElementById('agentTabRegistered');
  const agentTabDiscovered = document.getElementById('agentTabDiscovered');
  const registeredControls = document.getElementById('registeredControls');
  const selectedAgentIds = new Set();
  let selectionMode = false;
  let currentAgents = [];
  let currentView = 'registered';

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

  const seedDiscoveredAgents = [
    {
      id: 'disc-edge-nj-01',
      name: 'EdgeSensor-NJ-01',
      type: 'agent',
      layer: 'edge',
      node_id: 'edge-bj-01',
      agentDns: 'acrg://org/perception/EdgeSensor-NJ-01@edge-bj-01',
      endpoint: '10.200.1.120',
      description: '边缘传感聚合节点，负责实时采集与上报。',
      capabilities: ['TelemetryProbe', 'StreamObserver'],
      status: 'discovered',
      category: 'perception',
      summary: '待注册：边缘传感聚合',
      tools: ['TelemetryProbe', 'StreamObserver']
    },
    {
      id: 'disc-cloud-xa-02',
      name: 'LogSense-XA',
      type: 'agent',
      layer: 'cloud',
      node_id: 'cloud-hz-03',
      agentDns: 'acrg://org/service/LogSense-XA@cloud-hz-03',
      endpoint: '10.200.2.44',
      description: '日志侧向解析与异常检测服务。',
      capabilities: ['LogProbe', 'AnomalyScan'],
      status: 'discovered',
      category: 'service',
      summary: '待注册：日志侧向解析',
      tools: ['LogProbe', 'AnomalyScan']
    },
    {
      id: 'disc-terminal-sz-01',
      name: 'DispatchTerminal-SZ',
      type: 'agent',
      layer: 'edge',
      node_id: 'edge-gz-01',
      agentDns: 'acrg://org/execution/DispatchTerminal-SZ@edge-gz-01',
      endpoint: '10.200.3.16',
      description: '现场调度终端，支持指令下发与执行回执。',
      capabilities: ['DispatchQueue', 'CommandRelay'],
      status: 'discovered',
      category: 'execution',
      summary: '待注册：现场调度终端',
      tools: ['DispatchQueue', 'CommandRelay']
    }
  ];

  let registeredAgents = loadRegisteredAgents();
  let discoveredAgents = loadDiscoveredAgents(registeredAgents);
  setAgentView('registered');
  if (typeof window.initializeNetworkGraph === 'function') {
    window.initializeNetworkGraph();
  }

  if (agentTabRegistered) {
    agentTabRegistered.addEventListener('click', () => setAgentView('registered'));
  }
  if (agentTabDiscovered) {
    agentTabDiscovered.addEventListener('click', () => setAgentView('discovered'));
  }

  if (bulkToggleButton) {
    bulkToggleButton.addEventListener('click', () => {
      if (currentView !== 'registered') return;
      setSelectionMode(!selectionMode);
    });
  }

  if (bulkDeleteButton) {
    bulkDeleteButton.addEventListener('click', () => {
      if (currentView !== 'registered') return;
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
  
  if (agentList) {
    agentList.addEventListener('click', (event) => {
      const registerButton = event.target.closest('.agent-item-register');
      if (!registerButton) return;
      const agentId = registerButton.getAttribute('data-agent-id');
      if (!agentId) return;
      const target = discoveredAgents.find(agent => agent.id === agentId);
      if (!target) return;
      applyDiscoveredToForm(target);
    });
  }

  function parseToolList(rawValue) {
    return String(rawValue || '')
      .split(/[,，\n]/)
      .map(item => item.replace(/^['"]+|['"]+$/g, '').trim())
      .filter(Boolean);
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
    const discoveredId = registerForm.dataset.discoveredId;
    const toolList = parseToolList(agentData.capabilities);
    const newAgent = {
      id: discoveredId || `${agentData.type}-${createdAt}`,
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
      capabilities: toolList,
      tools: toolList,
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
    registeredAgents = updatedRegisteredAgents;
    discoveredAgents = loadDiscoveredAgents(updatedRegisteredAgents);
    if (currentView === 'registered') {
      renderAgentList(updatedRegisteredAgents, { mode: 'registered' });
    } else {
      renderAgentList(discoveredAgents, { mode: 'discovered' });
    }

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
    if (registerForm.dataset.discoveredId) {
      delete registerForm.dataset.discoveredId;
    }
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

  function applyDiscoveredToForm(agent) {
    if (!agent || !registerForm) return;
    registerForm.dataset.discoveredId = agent.id || '';
    const nameInput = document.getElementById('agentName');
    const dnsInput = document.getElementById('agentDns');
    const endpointInput = document.getElementById('agentEndpoint');
    const descriptionInput = document.getElementById('agentDescription');
    const capabilitiesInput = document.getElementById('agentCapabilities');

    if (nameInput) nameInput.value = agent.name || '';
    if (descriptionInput) descriptionInput.value = agent.description || '';
    if (capabilitiesInput) {
      const capabilityList = Array.isArray(agent.capabilities) && agent.capabilities.length
        ? agent.capabilities
        : (Array.isArray(agent.tools) ? agent.tools : []);
      capabilitiesInput.value = capabilityList.join(', ');
    }
    if (endpointInput) endpointInput.value = agent.endpoint || '';

    const nodeValue = agent.node_id || agent.nodeId || '';
    if (nodeSelect && nodeValue) {
      ensureNodeOption(nodeValue, agent.layer || nodeSelect.selectedOptions[0]?.getAttribute('data-layer'));
      nodeSelect.value = nodeValue;
    }

    if (dnsInput) {
      const defaultDns = agent.agentDns || formatAgentAddress(agent);
      dnsInput.value = defaultDns;
    }

    registerForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function ensureNodeOption(value, layer) {
    if (!nodeSelect || !value) return;
    const exists = Array.from(nodeSelect.options).some(option => option.value === value);
    if (exists) return;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    if (layer) {
      option.setAttribute('data-layer', layer);
    }
    nodeSelect.appendChild(option);
  }

  function setAgentView(view) {
    currentView = view === 'discovered' ? 'discovered' : 'registered';
    const isRegistered = currentView === 'registered';
    if (agentListCard) {
      agentListCard.dataset.view = currentView;
    }
    if (agentTabRegistered) {
      agentTabRegistered.classList.toggle('is-active', isRegistered);
      agentTabRegistered.setAttribute('aria-selected', isRegistered ? 'true' : 'false');
    }
    if (agentTabDiscovered) {
      agentTabDiscovered.classList.toggle('is-active', !isRegistered);
      agentTabDiscovered.setAttribute('aria-selected', !isRegistered ? 'true' : 'false');
    }
    if (agentListTitle) {
      agentListTitle.textContent = isRegistered ? 'Registered Agents' : 'Discovered Agents';
    }
    if (registeredControls) {
      registeredControls.classList.toggle('agent-list-controls--compact', !isRegistered);
    }
    if (bulkToggleButton) {
      bulkToggleButton.hidden = !isRegistered;
    }
    if (bulkDeleteButton) {
      bulkDeleteButton.hidden = !isRegistered;
    }
    if (!isRegistered) {
      setSelectionMode(false);
    }

    registeredAgents = loadRegisteredAgents();
    discoveredAgents = loadDiscoveredAgents(registeredAgents);
    const list = isRegistered ? registeredAgents : discoveredAgents;
    renderAgentList(list, { mode: currentView });
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

  function loadDiscoveredAgents(registeredList) {
    const stored = localStorage.getItem('discoveredAgents');
    let storedAgents = [];

    if (stored) {
      try {
        storedAgents = JSON.parse(stored);
      } catch (error) {
        storedAgents = [];
      }
    }

    let mergedAgents = mergeAgents(seedDiscoveredAgents, storedAgents);
    if (seedDiscoveredAgents.length) {
      const seedMap = new Map(seedDiscoveredAgents.map(agent => [agent.id, agent]));
      mergedAgents = mergedAgents.map(agent => {
        const seed = seedMap.get(agent.id);
        if (!seed) return agent;
        return {
          ...agent,
          node_id: seed.node_id,
          agentDns: seed.agentDns,
          layer: seed.layer
        };
      });
    }
    const registeredIds = new Set((registeredList || []).map(agent => agent.id));
    const filteredAgents = mergedAgents.filter(agent => {
      if (!agent) return false;
      return !registeredIds.has(agent.id);
    });
    localStorage.setItem('discoveredAgents', JSON.stringify(mergedAgents));
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
        tools: Array.isArray(agent.tools) ? agent.tools : [],
        capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : []
      });
      localStorage.setItem('registeredAgents', JSON.stringify(mergedAgents));
    }
    return mergedAgents;
  }

  function updateCountLabels(count) {
    if (agentCountLabel) {
      agentCountLabel.textContent = count;
    }
  }

  function renderAgentList(agents, options = {}) {
    if (!agentList) return;
    const mode = options.mode || currentView || 'registered';
    const isRegistered = mode === 'registered';

    agentList.innerHTML = '';
    if (agentListCard) {
      agentListCard.classList.toggle('is-selecting', selectionMode && isRegistered);
    }
    const safeAgents = Array.isArray(agents) ? agents : [];
    const sortedAgents = [...safeAgents].sort((a, b) => {
      const aName = (a.name || a.id || '').toLowerCase();
      const bName = (b.name || b.id || '').toLowerCase();
      return aName.localeCompare(bName);
    });

    updateCountLabels(sortedAgents.length);
    currentAgents = sortedAgents;

    if (sortedAgents.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'agent-empty';
      empty.textContent = isRegistered ? 'No agents registered yet.' : 'No agents discovered yet.';
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

      const titleRow = document.createElement('div');
      titleRow.className = 'agent-item-title';
      if (isRegistered) {
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
        titleRow.appendChild(selectBox);
      }
      titleRow.appendChild(name);

      const status = document.createElement('span');
      const statusValue = (agent.status || (isRegistered ? 'active' : 'discovered')).toLowerCase();
      status.className = `agent-item-status ${statusValue}`;
      status.textContent = statusValue;

      const actions = document.createElement('div');
      actions.className = 'agent-item-actions';
      if (!isRegistered) {
        actions.classList.add('agent-item-actions--stack');
      }

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
      if (!isRegistered) {
        const registerButton = document.createElement('button');
        registerButton.type = 'button';
        registerButton.className = 'agent-item-register';
        registerButton.textContent = 'Register';
        registerButton.setAttribute('data-agent-id', agent.id);
        actions.appendChild(registerButton);
      }
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

    registeredAgents = loadRegisteredAgents();
    if (currentView === 'registered') {
      renderAgentList(registeredAgents, { mode: 'registered' });
    }
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
      agentListCard.classList.toggle('is-selecting', enabled && currentView === 'registered');
    }
    if (bulkToggleButton) {
      bulkToggleButton.textContent = enabled ? 'Cancel' : 'Remove';
    }
    clearSelection();
  }

  function updateBulkDeleteState() {
    if (!bulkDeleteButton) return;
    if (currentView !== 'registered') {
      bulkDeleteButton.disabled = true;
      bulkDeleteButton.textContent = 'Delete';
      return;
    }
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
