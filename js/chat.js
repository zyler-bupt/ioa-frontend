// 聊天消息管理
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// WebSocket 连接
let ws = null;
let requestIdCounter = 0;

// 初始化 WebSocket 连接
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // 后端在 ngrok
  const wsUrl = `ws://10.200.1.35:8001/ws`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
  };
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleWebSocketMessage(msg);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    addMessage(true, '连接错误，请检查后端服务是否运行');
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
  };
}

// 处理 WebSocket 消息
function handleWebSocketMessage(msg) {
  const { type, request_id, data } = msg;
  
  switch (type) {
    case 'ack':
      console.log('ACK received:', data);
      break;
      
    case 'routing':
      // 显示路由信息
      const routing = data.routing || [];
      const selectedAgent = data.selected_agent || {};
      updateDiscoveryList(routing, selectedAgent);
      break;
      
    case 'thought':
      // 显示思考过程
      addMessage(true, `<div class="thought-content">${data.replace(/\n/g, '<br>')}</div>`);
      break;
      
    case 'rewrite':
      // 显示重写的提示词
      console.log('Rewritten prompt:', data.final_prompt);
      break;
      
    case 'status':
      // 显示状态更新
      addMessage(true, `<div class="status-message">状态: ${data}</div>`);
      break;
      
    case 'final':
      // 显示最终结果
      handleFinalResult(data);
      break;
      
    case 'error':
      // 显示错误信息
      addMessage(true, `<div class="error-message">错误: ${data.message}</div>`);
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
}

// 处理最终结果
function handleFinalResult(data) {
  const { status, answer_text, answer, execution_time } = data;
  
  if (status === 'no_route') {
    addMessage(true, answer_text);
    return;
  }
  
  if (status === 'ok') {
    // 构建响应内容
    const answerInfo = answer || {};
    const accidentType = answerInfo.accident_type || '未知';
    const observation = answerInfo.observation || '(未提取到)';
    const keyframe = answerInfo.keyframe || {};
    const keyframePath = keyframe.path || '(未提取到)';
    const keyframeUrl = keyframe.url || '';
    
    let responseHtml = `
      <div class="final-result">
        <div class="result-item">
          <strong>事故类型:</strong> ${accidentType}
        </div>
        <div class="result-item">
          <strong>描述:</strong> ${observation}
        </div>
        <div class="result-item">
          <strong>关键帧:</strong> ${keyframePath}
    `;
    
    if (keyframeUrl) {
      responseHtml += `<br><img src="${keyframeUrl}" alt="keyframe" style="max-width: 200px; margin-top: 10px;">`;
    }
    
    responseHtml += `
        </div>
        <div class="result-item">
          <strong>执行时间:</strong> ${(execution_time || 0).toFixed(2)}s
        </div>
      </div>
    `;
    
    addMessage(true, responseHtml);
  }
}

// 更新 Discovery 列表
function updateDiscoveryList(candidates, selectedAgent) {
  const discoveryList = document.getElementById('discoveryList');
  if (!discoveryList) return;
  
  discoveryList.innerHTML = '';
  
  candidates.forEach((candidate, index) => {
    const div = document.createElement('div');
    div.className = 'discovery-item';
    if (candidate.agent_name === selectedAgent.agent_name) {
      div.classList.add('selected');
    }
    div.innerHTML = `
      <div class="item-name">${candidate.agent_name}</div>
      <div class="item-detail">
        <span>匹配度: ${(candidate.match_pct || 0).toFixed(2)}%</span>
        <span>能力: ${candidate.capability}</span>
      </div>
    `;
    discoveryList.appendChild(div);
  });
  
  // 更新 Selected Agents
  const selectedList = document.getElementById('selectedList');
  if (selectedList) {
    selectedList.innerHTML = `
      <div class="selected-agent-item">
        <div class="agent-name">${selectedAgent.agent_name || 'N/A'}</div>
        <div class="agent-detail">
          <div>匹配度: ${(selectedAgent.match_pct || 0).toFixed(2)}%</div>
        </div>
      </div>
    `;
  }
}

// 添加消息到聊天界面
function addMessage(isAgent, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  
  if (isAgent) {
    messageDiv.classList.add('assistant');
    // Agent消息
    messageDiv.innerHTML = `
            <div class="header">
                <img src="../img/image.png" alt="Agent">
                <span>CORE Muti-Agent System</span>
            </div>
            <div class="content">
                ${formatAgentResponse(content)}
            </div>
        `;
  } else {
    messageDiv.classList.add('user');
    // 用户消息 - 支持 HTML 内容
    if (typeof content === 'string' && content.includes('<')) {
      messageDiv.innerHTML = `<div class="content">${content}</div>`;
    } else {
      messageDiv.textContent = content;
    }
  }

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 格式化Agent响应 - 修改DAG渲染逻辑
function formatAgentResponse(response) {
  if (typeof response === 'string') {
    return response;
  }

  let html = '';
  if (response.outerloop) {
    // 将outerloop消息按换行符分割，只添加换行而不使用气泡
    const outerloopContent = response.outerloop.split('\n')
      .join('<br>');
    html += `<div class="outerloop">
      <strong>Outerloop:</strong>
      <div class="outerloop-content">${outerloopContent}</div>
    </div>`;
  }
  if (response.innerloop) {
    html += `<div class="innerloop"><strong>Innerloop:</strong><br>${response.innerloop.replace(/\n/g, '<br>')}</div>`;
  }
  if (response.actions) {
    const actionItems = response.actions.split('\n')
      .map(action => `<div class="action-item">${action}</div>`)
      .join('');
    html += `<div class="actions"><strong>Actions:</strong><br>${actionItems}</div>`;
  }
  if (response.dag) {
    html += `<div class="dag-graph">
      <strong>Generating DAG:</strong>
      <div id="dag-container"></div>
    </div>`;

    // 使用延迟加载方式，自动生成DAG图
    setTimeout(() => {
      const dagContainer = document.getElementById('dag-container');
      if (dagContainer) {
        document.body.classList.add('updating-dag');

        // 生成DAG图
        updateDAGStyle();
        generateDAG(response.dag.matrix);

        // 更新完成后
        setTimeout(() => {
          document.body.classList.remove('updating-dag');
          console.log('DAG graph generated successfully in chat');
        }, 500);
      }
    }, 100);
  }
  return html;
}

// 发送消息
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;
  
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addMessage(true, '错误: WebSocket 未连接，请刷新页面重新连接');
    return;
  }

  // 添加用户消息
  addMessage(false, message);
  userInput.value = '';
  
  // 禁用发送按钮
  sendButton.disabled = true;

  try {
    // 生成请求ID
    requestIdCounter++;
    const requestId = `req_${Date.now()}_${requestIdCounter}`;
    
    // 构建请求消息
    const wsMsg = {
      type: 'run',
      request_id: requestId,
      user_input: message,
      top_k: 5
    };
    
    // 发送到 WebSocket
    ws.send(JSON.stringify(wsMsg));
  } catch (error) {
    console.error('Error sending message:', error);
    addMessage(true, `错误: ${error.message}`);
  } finally {
    // 重新启用发送按钮
    sendButton.disabled = false;
  }
}

// 初始化示例对话
function initializeChat() {
  const initialMessage = {
    outerloop: "1. Videoagent analyzes the video content and intercepts the key frames\n2. Keyframeagent analyzes the vehicles in the key frames and conducts feature extraction",
    innerloop: "The videoagent is analyzing the video.\nThe videoagent is intercepting the key frames.\nThe keyframeagent is conducting feature analysis.",
    actions: "Initializing video analysis\nStarting frame extraction\nPreparing feature detection\nBeginning analysis process",
    dag: {
      matrix: [
        [0, 1, 1, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 1, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0]
      ]
    }
  };
  addMessage(true, initialMessage);
}

// 事件监听
function bootIOA() {
  console.log("IOA Application Initializing...");

  // ✅ 先启动聊天（欢迎语必出）
  initializeChatSystem();

  // ✅ 其他模块不影响 chat
  try { window.initializeStats?.(); } catch (e) { console.error(e); }
  try { window.initializeNetworkGraph?.(); } catch (e) { console.error(e); }
  try { window.initializeDiscoveryProcess?.(); } catch (e) { console.error(e); }
  try { window.loadNewAgents?.(); } catch (e) { console.error(e); }

  console.log("IOA Application Ready!");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootIOA, { once: true });
} else {
  bootIOA();
}
