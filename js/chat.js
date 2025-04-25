// 聊天消息管理
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// 添加消息到聊天界面
function addMessage(isAgent, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';

  if (isAgent) {
    // Agent消息
    messageDiv.innerHTML = `
            <div class="header">
                <img src="img/agent图标.png" alt="Agent">
                <span>GuardianAgent</span>
            </div>
            <div class="content">
                ${formatAgentResponse(content)}
            </div>
        `;
  } else {
    // 用户消息
    messageDiv.innerHTML = `
            <div class="content">
                ${content}
            </div>
        `;
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

  // 添加用户消息
  addMessage(false, message);
  userInput.value = '';

  try {
    // 这里应该是向后端发送请求
    // 目前使用模拟响应
    const response = {
      outerloop: '分析视频内容并拦截关键帧',
      innerloop: '正在分析视频...\n正在拦截关键帧...\n正在进行特征分析...',
      actions: 'analyzing the video\nintercepting the key frames\nprocessing features\nanalyzing results',
      dag: {
        matrix: [
          [0, 1, 0],
          [0, 0, 1],
          [0, 0, 0]
        ]
      }
    };

    // 添加Agent响应
    setTimeout(() => {
      addMessage(true, response);
    }, 1000);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// 初始化示例对话
function initializeChat() {
  const initialMessage = {
    outerloop: "1. videoagent analyzes the video content and intercepts the key frames\n2. keyframeagent analyzes the vehicles in the key frames and conducts feature extraction",
    innerloop: "The videoagent is analyzing the video.\nThe videoagent is intercepting the key frames.\nThe keyframeagent is conducting feature analysis.",
    actions: "initializing video analysis\nstarting frame extraction\npreparing feature detection\nbeginning analysis process",
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
document.addEventListener('DOMContentLoaded', () => {
  initializeChat(); // 添加初始化对话
  sendButton.addEventListener('click', sendMessage);

  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}); 