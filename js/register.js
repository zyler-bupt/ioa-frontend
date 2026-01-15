/**
 * Agent Registration Page
 */

document.addEventListener('DOMContentLoaded', function() {
  const registerForm = document.getElementById('registerForm');
  const layerSelect = document.getElementById('agentLayer');
  const nodeSelect = document.getElementById('agentNodeId');
  
  // 保存所有原始的 node 选项 - 使用 getAttribute 确保获取 data-layer
  const allNodeOptions = Array.from(nodeSelect.options)
    .filter(option => option.value)
    .map(option => ({
      value: option.value,
      label: option.textContent,
      layer: option.getAttribute('data-layer')  // 使用 getAttribute 替代 dataset.layer
    }));

  console.log('=== Register.js Initialized ===');
  console.log('All node options:', allNodeOptions);
  console.log('Layer select:', layerSelect);
  console.log('Node select:', nodeSelect);

  // 根据选择的 layer 过滤 node ID
  function filterNodesByLayer(layer) {
    console.log('Filtering nodes for layer:', layer);
    
    // 清空所有现有选项
    nodeSelect.innerHTML = '';
    
    // 添加占位符选项
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = layer ? `Select ${layer} Node` : 'Select Node';
    nodeSelect.appendChild(placeholder);
    
    // 根据 layer 过滤选项
    if (layer) {
      const filteredNodes = allNodeOptions.filter(option => {
        console.log(`Checking ${option.value}: layer=${option.layer}, matches=${option.layer === layer}`);
        return option.layer === layer;
      });
      
      console.log(`Filtered nodes for ${layer}:`, filteredNodes);
      
      if (filteredNodes.length === 0) {
        const noOption = document.createElement('option');
        noOption.disabled = true;
        noOption.textContent = `No nodes available for ${layer}`;
        nodeSelect.appendChild(noOption);
      } else {
        filteredNodes.forEach(option => {
          const opt = document.createElement('option');
          opt.value = option.value;
          opt.textContent = option.label;
          opt.setAttribute('data-layer', option.layer);
          nodeSelect.appendChild(opt);
        });
      }
      nodeSelect.disabled = false;
    } else {
      // 如果没有选择 layer，禁用 node 选择
      nodeSelect.disabled = true;
      const hint = document.createElement('option');
      hint.disabled = true;
      hint.textContent = 'Please select a layer first';
      nodeSelect.appendChild(hint);
    }
    
    nodeSelect.value = '';
  }

  // Layer 变化时触发过滤
  function handleLayerChange(e) {
    const selectedLayer = layerSelect.value;
    console.log('🔄 Layer change event fired:', selectedLayer);
    filterNodesByLayer(selectedLayer);
  }

  // 绑定事件监听
  layerSelect.addEventListener('change', handleLayerChange);
  
  // 初始化
  if (layerSelect.value) {
    filterNodesByLayer(layerSelect.value);
  }
  
  console.log('✅ Event listeners attached');
  
  registerForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 收集表单数据
    const agentData = {
      name: document.getElementById('agentName').value.trim(),
      type: document.getElementById('agentType').value,
      layer: document.getElementById('agentLayer').value,
      description: document.getElementById('agentDescription').value.trim(),
      capabilities: document.getElementById('agentCapabilities').value.trim(),
      cpu: parseInt(document.getElementById('agentCpu').value),
      memory: parseInt(document.getElementById('agentMemory').value),
      nodeId: document.getElementById('agentNodeId').value,
      endpoint: document.getElementById('agentEndpoint').value.trim(),
      autoStart: document.getElementById('agentAutoStart').checked
    };
    
    // 验证数据
    if (!agentData.name || !agentData.type || !agentData.layer || !agentData.description || !agentData.capabilities || !agentData.nodeId || !agentData.endpoint) {
      alert('Please fill in all required fields');
      return;
    }
    
    // 保存到localStorage以供主页使用
    const newAgent = {
      id: `${agentData.type}-${Date.now()}`,
      name: agentData.name,
      type: agentData.type,
      layer: agentData.layer,
      node_id: agentData.nodeId,
      status: 'active',
      cpu: agentData.cpu,
      memory: agentData.memory,
      description: agentData.description,
      capabilities: agentData.capabilities.split(',').map(c => c.trim()),
      endpoint: agentData.endpoint,
      relevance: 0
    };
    
    // 将新Agent信息保存到localStorage
    const newAgents = localStorage.getItem('newAgents');
    const agentsList = newAgents ? JSON.parse(newAgents) : [];
    agentsList.push(newAgent);
    localStorage.setItem('newAgents', JSON.stringify(agentsList));
    
    // 显示成功消息
    showSuccessMessage('Agent registered successfully! Redirecting...');
    
    // 2秒后跳转回主页
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
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
});
