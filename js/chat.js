// 聊天消息管理
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// WebSocket 连接
let ws = null;
let requestIdCounter = 0;
const fileButton = document.getElementById('fileButton');
const fileInput = document.getElementById('fileInput');

let pendingFile = null; // 选中的待上传视频

// 后端基址（HTTP 上传 & WS 调度）
const BACKEND_HTTP = 'http://10.200.1.35:8001';
const BACKEND_WS = 'ws://10.200.1.35:8001/ws';

// 可选：限制大小（例如 200MB）
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

// 初始化 WebSocket 连接
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // 后端在 ngrok
  const wsUrl = BACKEND_WS;
  
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
      
      case 'routing': {
        // ✅ 兼容你后端：data.candidates / data.routing.candidates / data.routing
        const candidates =
          (Array.isArray(data?.candidates) && data.candidates) ||
          (Array.isArray(data?.routing?.candidates) && data.routing.candidates) ||
          (Array.isArray(data?.routing) && data.routing) ||
          [];
      
        const selectedAgent = data?.selected_agent || data?.selectedAgent || {};
        updateDiscoveryList(candidates, selectedAgent);
        break;
      }
      
      
      case 'thought': {
        const text = (typeof data === 'string') ? data : JSON.stringify(data, null, 2);
        addMessage(true, `<div class="thought-content">${text.replace(/\n/g, '<br>')}</div>`);
        break;
      }
      
      
    case 'rewrite':
      // 显示重写的提示词
      console.log('Rewritten prompt:', data.final_prompt);
      break;
      
    case 'status': {
      const statusText = formatStatusPayload(data);
      const text = statusText || (typeof data === 'string' ? data : JSON.stringify(data));
      addMessage(true, `<div class="status-message">状态: ${text}</div>`);
      break;
    }
      
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

function formatStatusPayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  const phase = payload.phase || payload.stage || '';
  const workflow = payload.workflow_id || payload.workflowId || payload.workflow || '';
  const agent = payload.agent || payload.agent_name || payload.name || '';
  const stepIndexRaw = payload.step_index ?? payload.stepIndex;
  const stepTotalRaw = payload.step_total ?? payload.stepTotal;
  const stepIndex = Number(stepIndexRaw);
  const stepTotal = Number(stepTotalRaw);
  const stepPart =
    Number.isFinite(stepIndex) && Number.isFinite(stepTotal)
      ? `步骤 ${stepIndex}/${stepTotal}`
      : '';
  const message = payload.message || payload.status || '';
  return [phase && `阶段:${phase}`, workflow && `流程:${workflow}`, stepPart, agent && `Agent:${agent}`, message]
    .filter(Boolean)
    .join(' · ');
}

// 处理最终结果
function handleFinalResult(data) {
  const { status, answer, execution_time } = data;

  if (status !== 'ok') {
    addMessage(true, `❌ ${answer?.text || data.answer_text || '任务失败'}`);
    return;
  }

  const text = answer?.text || '';
  const observation = answer?.structured?.observation || '';

  const answerImages = Array.isArray(answer?.images) ? answer.images : [];
  const legacyImages = Array.isArray(data?.images) ? data.images : [];
  const allImages = [...answerImages, ...legacyImages].filter(Boolean);
  const attachments = Array.isArray(answer?.attachments) ? answer.attachments : [];
  const traceSteps =
    (Array.isArray(data?.trace?.steps) && data.trace.steps) ||
    (Array.isArray(data?.answer?.structured?.steps) && data.answer.structured.steps) ||
    [];

  const selectedAgent =
    data?.agent?.selected ||
    data?.selected?.agent ||
    data?.selected?.agent_name ||
    data?.best_match?.agent_name ||
    data?.selected_agent?.agent_name ||
    data?.agent?.selected ||
    data?.agent_name ||
    '';
  const selectedCapability = data?.agent?.capability || data?.selected?.capability || data?.workflow_id || '';
  const confidence = data?.agent?.confidence || data?.selected?.confidence || {};
  let finalPct = Number(confidence.final_pct);
  if (!Number.isFinite(finalPct)) {
    const finalScore = Number(confidence.final_score);
    if (Number.isFinite(finalScore)) finalPct = finalScore * 100;
  }
  if (Number.isFinite(finalPct)) {
    finalPct = Math.max(0, Math.min(100, finalPct));
  }

  let html = `<div class="final-result">`;

  if (selectedAgent) {
    const cap = selectedCapability ? `（${selectedCapability}）` : '';
    html += `<div class="result-item"><strong>选择 Agent:</strong> ${selectedAgent}${cap}</div>`;
  }
  if (Number.isFinite(finalPct)) {
    html += `<div class="result-item"><strong>匹配准确度:</strong> ${finalPct.toFixed(0)}%</div>`;
  }

  if (text) {
    html += `<div class="result-item"><strong>结果:</strong> ${String(text).replace(/\n/g, '<br>')}</div>`;
  }
  if (observation) {
    html += `<div class="result-item"><strong>Observation:</strong> ${String(observation).replace(/\n/g, '<br>')}</div>`;
  }

  if (allImages.length) {
    html += `<div class="result-item"><strong>图片:</strong><br>`;
    allImages.forEach(img => {
      const raw = img.data_uri || img.url || img.url_rel || img.path || '';
      const src = raw
        ? (raw.startsWith('http') || raw.startsWith('data:') ? raw : `${BACKEND_HTTP}${raw.startsWith('/') ? '' : '/'}${raw}`)
        : '';
      if (src) html += `<img src="${src}" style="max-width:220px;margin:8px 8px 0 0;border-radius:6px;">`;
    });
    html += `</div>`;
  }

  if (attachments.length) {
    html += `<div class="result-item"><strong>附件:</strong><br>`;
    attachments.forEach(att => {
      const raw = att.url || att.url_rel || att.path || '';
      const label = String(raw).split('/').pop() || att.type || 'attachment';
      const href = raw
        ? (raw.startsWith('http') ? raw : `${BACKEND_HTTP}${raw.startsWith('/') ? '' : '/'}${raw}`)
        : '';
      if (href) {
        html += `<a href="${href}" target="_blank" rel="noopener">${label}</a><br>`;
      } else {
        html += `<span>${label}</span><br>`;
      }
    });
    html += `</div>`;
  }

  if (traceSteps.length) {
    html += `<div class="result-item"><strong>步骤:</strong>`;
    traceSteps.forEach((step, idx) => {
      const agent = step.agent || step.agent_name || step.name || step.id || `Step ${idx + 1}`;
      const statusText = step.status ? ` · ${step.status}` : '';
      html += `<details style="margin-top:6px;"><summary>${idx + 1}. ${agent}${statusText}</summary>`;
      if (step.text) {
        html += `<div style="margin-top:6px;">${String(step.text).replace(/\n/g, '<br>')}</div>`;
      }
      const stepImages = Array.isArray(step.images) ? step.images : [];
      if (stepImages.length) {
        html += `<div style="margin-top:6px;">`;
        stepImages.forEach(img => {
          const raw = img.data_uri || img.url || img.url_rel || img.path || '';
          const src = raw
            ? (raw.startsWith('http') || raw.startsWith('data:') ? raw : `${BACKEND_HTTP}${raw.startsWith('/') ? '' : '/'}${raw}`)
            : '';
          if (src) html += `<img src="${src}" style="max-width:200px;margin:6px 6px 0 0;border-radius:6px;">`;
        });
        html += `</div>`;
      }
      const stepAttachments = Array.isArray(step.attachments) ? step.attachments : [];
      if (stepAttachments.length) {
        html += `<div style="margin-top:6px;">`;
        stepAttachments.forEach(att => {
          const raw = att.url || att.url_rel || att.path || '';
          const label = String(raw).split('/').pop() || att.type || 'attachment';
          const href = raw
            ? (raw.startsWith('http') ? raw : `${BACKEND_HTTP}${raw.startsWith('/') ? '' : '/'}${raw}`)
            : '';
          if (href) {
            html += `<a href="${href}" target="_blank" rel="noopener">${label}</a><br>`;
          } else {
            html += `<span>${label}</span><br>`;
          }
        });
        html += `</div>`;
      }
      html += `</details>`;
    });
    html += `</div>`;
  }

  html += `<div class="result-item"><strong>执行时间:</strong> ${Number(execution_time || 0).toFixed(2)}s</div>`;
  html += `</div>`;

  addMessage(true, html);
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
    let matchPct = Number(candidate.final_pct ?? candidate.match_pct ?? candidate.match ?? candidate.confidence ?? null);
    if (!Number.isFinite(matchPct)) {
      const score = Number(candidate.score);
      if (Number.isFinite(score)) matchPct = score * 100;
    }
    if (!Number.isFinite(matchPct)) matchPct = 0;
    div.innerHTML = `
      <div class="item-name">${candidate.agent_name}</div>
      <div class="item-detail">
        <span>匹配度: ${Number.isFinite(matchPct) ? matchPct.toFixed(2) : '0.00'}%</span>
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
          <div>匹配度: ${Number(selectedAgent.final_pct ?? selectedAgent.match_pct ?? 0).toFixed(2)}%</div>
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
async function uploadVideo(file) {
  if (!file) throw new Error('未选择文件');
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`文件过大：${(file.size / 1024 / 1024).toFixed(1)}MB，超过限制`);
  }

  // 只让视频走这个上传
  if (!(file.type || '').startsWith('video/')) {
    throw new Error(`不是视频文件：${file.type || 'unknown'}`);
  }

  const form = new FormData();
  form.append('file', file, file.name);

  const resp = await fetch(`${BACKEND_HTTP}/upload/video`, {
    method: 'POST',
    body: form,
  });

  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.json())?.detail || ''; } catch (e) {}
    throw new Error(`上传失败：HTTP ${resp.status} ${detail}`);
  }

  const data = await resp.json();
  if (data.status !== 'ok' || !data.path) {
    throw new Error(`上传返回异常：${JSON.stringify(data)}`);
  }

  return data; // {status, filename, path, url, size}
}

// 发送消息
async function sendMessage() {
  const message = userInput.value.trim();

  // ✅ 允许 “只发视频不打字”
  if (!message && !pendingFile) return;

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addMessage(true, '错误: WebSocket 未连接，请刷新页面重新连接');
    return;
  }

  // 显示用户消息（文字）
  if (message) addMessage(false, message);
  userInput.value = '';
  sendButton.disabled = true;

  try {
    requestIdCounter++;
    const requestId = `req_${Date.now()}_${requestIdCounter}`;

    // 1) 如果有视频：先 HTTP 上传拿到服务器 path
    let uploadedVideoPath = null;
    if (pendingFile) {
      addMessage(true, '⬆️ 正在上传视频到服务器...');
      const uploadResp = await uploadVideo(pendingFile);
      uploadedVideoPath = uploadResp.path;
      addMessage(true, `✅ 视频上传完成：${uploadResp.filename}`);
      pendingFile = null;
    }

    // 2) WS 触发任务（带 uploaded_video_path）
    const wsMsg = {
      type: 'run',
      request_id: requestId,
      user_input: message || '请分析该视频内容并输出报告', // 没文字时给个默认
      top_k: 5,
    };

    if (uploadedVideoPath) {
      wsMsg.uploaded_video_path = uploadedVideoPath;
    }

    console.log('[WS send] payload:', wsMsg);
    ws.send(JSON.stringify(wsMsg));
  } catch (error) {
    console.error('Error sending message:', error);
    addMessage(true, `错误: ${error.message}`);
  } finally {
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
if (fileButton && fileInput) {
  fileButton.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;

    if (!(file.type || '').startsWith('video/')) {
      addMessage(true, `请选择视频文件（当前：${file.type || 'unknown'}）`);
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      addMessage(true, `视频过大：${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    pendingFile = file;
    addMessage(false, `📎 已选择视频：${file.name}（${(file.size / 1024 / 1024).toFixed(1)}MB）`);
  });
}

// 事件监听
function bootIOA() {
  console.log("IOA Application Initializing...");

  // ✅ 1) 先连 WS（不然 ws 永远是 null）
  initWebSocket();

  // ✅ 2) 绑定发送事件
  sendButton?.addEventListener('click', sendMessage);
  userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // ✅ 3) 其他模块（有就跑，没有不影响）
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
