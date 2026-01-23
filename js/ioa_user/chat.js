/**
 * chat.js
 * - 聊天框 UI
 * - WebSocket 调后端
 * - processBackendResponse 渲染
 * - DOMContentLoaded 总入口
 */

(function () {
    function initializeChatSystem() {
      const userInput = document.getElementById("userInput");
      const sendButton = document.getElementById("sendButton");
      const messages = document.getElementById("messages");
  
      function escapeHtml(text) {
        return String(text ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }
  
      function formatMultilineText(text) {
        return escapeHtml(text).replace(/\n/g, "<br>");
      }
  
      const STREAM_SPEED = { slow: 100, fast: 60 };
      const streamTimers = new WeakMap();
  
      function streamText(target, text, speed = STREAM_SPEED.slow) {
        const content = text === undefined || text === null ? "" : String(text);
        const existingTimer = streamTimers.get(target);
        if (existingTimer) {
          window.clearInterval(existingTimer);
          streamTimers.delete(target);
        }
  
        target.textContent = "";
        if (!content) return Promise.resolve();
  
        let index = 0;
        return new Promise((resolve) => {
          const timer = window.setInterval(() => {
            target.textContent += content[index];
            index += 1;
            messages.scrollTop = messages.scrollHeight;
            if (index >= content.length) {
              window.clearInterval(timer);
              streamTimers.delete(target);
              resolve();
            }
          }, speed);
  
          streamTimers.set(target, timer);
        });
      }
  
      function createAssistantMessage() {
        const messageDiv = document.createElement("div");
        messageDiv.className = "message assistant";
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
        return messageDiv;
      }
  
      function appendStreamBlock(container, labelText, valueText, speed = STREAM_SPEED.fast) {
        const label = document.createElement("div");
        const labelStrong = document.createElement("strong");
        labelStrong.textContent = labelText;
        label.appendChild(labelStrong);
        container.appendChild(label);
  
        const box = document.createElement("div");
        box.style.backgroundColor = "#f5f5f5";
        box.style.padding = "10px";
        box.style.borderRadius = "4px";
        box.style.marginTop = "8px";
        box.style.fontSize = "0.9em";
        box.style.lineHeight = "1.5";
  
        const valueSpan = document.createElement("span");
        valueSpan.style.whiteSpace = "pre-wrap";
        box.appendChild(valueSpan);
        container.appendChild(box);
  
        streamText(valueSpan, valueText, speed);
      }
  
      function appendExecutionTime(container, timeStr) {
        const timeLine = document.createElement("small");
        timeLine.style.color = "#999";
        timeLine.style.marginTop = "8px";
        timeLine.style.display = "block";
        timeLine.textContent = `⏱️ 执行时间: ${timeStr}ms`;
        container.appendChild(timeLine);
      }
  
      function appendStepMessage(label, content, styleClass, speed = STREAM_SPEED.slow) {
        const messageDiv = createAssistantMessage();
        const inner = document.createElement("div");
        if (styleClass) inner.className = styleClass;
  
        const labelEl = document.createElement("strong");
        labelEl.textContent = `${label}:`;
        inner.appendChild(labelEl);
        inner.appendChild(document.createElement("br"));
  
        const contentSpan = document.createElement("span");
        contentSpan.style.whiteSpace = "pre-wrap";
        inner.appendChild(contentSpan);
        messageDiv.appendChild(inner);
  
        streamText(contentSpan, content, speed);
      }
  
      function displayMessage(text, type) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = text;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
      }
  
      function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;
  
        window.appState.messages.push({ type: "user", text });
        displayMessage(text, "user");
        userInput.value = "";
  
        callBackendAPI(text);
      }
  
      // ====== WS ======
      let ws = null;
      let wsReadyPromise = null;
  
      function getWSUrl() {
        const proto = location.protocol === "https:" ? "wss" : "ws";
        return `${proto}://10.200.1.35:8001/ws`;
      }
  
      function ensureWSConnection() {
        if (ws && ws.readyState === WebSocket.OPEN) return Promise.resolve(ws);
        if (wsReadyPromise) return wsReadyPromise;
  
        wsReadyPromise = new Promise((resolve, reject) => {
          ws = new WebSocket(getWSUrl());
  
          ws.onopen = () => {
            console.log("[WS] ✅ connected");
            resolve(ws);
          };
  
          ws.onerror = (e) => {
            console.error("[WS] ❌ error", e);
            wsReadyPromise = null;
            reject(new Error("WebSocket 连接失败：请确认后端已启动 & ngrok 域名未过期"));
          };
  
          ws.onclose = () => {
            console.warn("[WS] ⚠️ closed");
            ws = null;
            wsReadyPromise = null;
          };
        });
  
        return wsReadyPromise;
      }
  
      async function callBackendAPI(userInputText) {
        const loadingDiv = document.createElement("div");
        loadingDiv.className = "message assistant";
        loadingDiv.id = "loading-message";
        loadingDiv.innerHTML = "🔄 正在建立实时连接...";
        messages.appendChild(loadingDiv);
        messages.scrollTop = messages.scrollHeight;
  
        let progressContent = null;
        let spinnerRow = null;
        let progressQueue = Promise.resolve();
  
        function ensureProgressContent() {
          if (!progressContent) {
            progressContent = document.createElement("div");
            progressContent.className = "progress-content";
            loadingDiv.innerHTML = "";
            loadingDiv.appendChild(progressContent);
          }
          return progressContent;
        }
  
        function appendProgressStep(label, content, variant) {
          progressQueue = progressQueue.then(() => {
            const container = ensureProgressContent();
            const step = document.createElement("div");
            step.className = variant ? `progress-step progress-step--${variant}` : "progress-step";
  
            const labelEl = document.createElement("strong");
            labelEl.textContent = `${label}:`;
            step.appendChild(labelEl);
            step.appendChild(document.createElement("br"));
  
            const contentSpan = document.createElement("span");
            contentSpan.style.whiteSpace = "pre-wrap";
            step.appendChild(contentSpan);
            container.appendChild(step);
  
            return streamText(contentSpan, content, STREAM_SPEED.slow);
          });
          return progressQueue;
        }
  
        function showSpinnerRow() {
          progressQueue = progressQueue.then(() => {
            const container = ensureProgressContent();
            if (spinnerRow) return null;
  
            spinnerRow = document.createElement("div");
            spinnerRow.className = "progress-step progress-step--spinner";
  
            const spinner = document.createElement("span");
            spinner.className = "inline-spinner";
            spinnerRow.appendChild(spinner);
  
            const text = document.createElement("span");
            text.textContent = "正在生成结果...";
            spinnerRow.appendChild(text);
  
            container.appendChild(spinnerRow);
            return null;
          });
          return progressQueue;
        }
  
        try {
          const socket = await ensureWSConnection();
          const requestId = `req_${Date.now()}`;
  
          const handleMessage = (ev) => {
            let msg;
            try {
              msg = JSON.parse(ev.data);
            } catch (e) {
              console.warn("[WS] 非JSON消息：", ev.data);
              return;
            }
            if (msg.request_id !== requestId) return;
  
            console.log(`[WS] ${msg.type}`, msg.data);
  
            if (msg.type === "ack") {
              if (!progressContent) loadingDiv.innerHTML = "✅ 服务器已确认，正在调度 Agent...";
              return;
            }
  
            if (msg.type === "routing") {
              if (!progressContent) loadingDiv.innerHTML = "🧭 正在路由最匹配的 Agent...";
              const payload = msg.data;
              const selected = payload.selected_agent;
          if (selected?.agent_name) {
            window.highlightSelectedAgent(selected.agent_name);
            appendProgressStep("路由结果", `已选择 Agent：${selected.agent_name}`, "routing");
          }
          const routingCandidates =
            (Array.isArray(payload?.candidates) && payload.candidates) ||
            (Array.isArray(payload?.routing?.candidates) && payload.routing.candidates) ||
            (Array.isArray(payload?.routing) && payload.routing) ||
            [];
          if (routingCandidates.length) {
            window.updateDiscoveryListFromBackend(routingCandidates);
          }
          return;
        }
  
            if (msg.type === "thought") {
              appendProgressStep("思考", msg.data, "thought");
              return;
            }
  
            if (msg.type === "rewrite") {
              if (!progressContent) loadingDiv.innerHTML = "✍️ 正在改写提示词并准备执行...";
              if (msg.data?.final_prompt) {
                appendProgressStep("改写提示词", msg.data.final_prompt, "rewrite");
              }
              return;
            }
  
            if (msg.type === "status") {
              showSpinnerRow();
              return;
            }
  
            if (msg.type === "log") {
              appendStepMessage("日志", msg.data, "thought-content");
              return;
            }
  
            if (msg.type === "final") {
              progressQueue = progressQueue.then(() => {
                if (spinnerRow) {
                  spinnerRow.remove();
                  spinnerRow = null;
                }
                if (loadingDiv && !progressContent) loadingDiv.remove();
                processBackendResponse(msg.data, { formatMultilineText, createAssistantMessage, appendStreamBlock, appendExecutionTime });
              });
              socket.removeEventListener("message", handleMessage);
              return;
            }
  
            if (msg.type === "error") {
              if (loadingDiv) loadingDiv.remove();
              const errorDiv = document.createElement("div");
              errorDiv.className = "message assistant";
              const message = msg.data?.message || msg.message || "unknown";
              errorDiv.innerHTML = `❌ 后端错误: ${message}`;
              messages.appendChild(errorDiv);
              messages.scrollTop = messages.scrollHeight;
              socket.removeEventListener("message", handleMessage);
            }
          };
  
          socket.addEventListener("message", handleMessage);
  
          socket.send(JSON.stringify({ type: "run", request_id: requestId, user_input: userInputText, top_k: 5 }));
        } catch (error) {
          if (loadingDiv) loadingDiv.remove();
          const errorDiv = document.createElement("div");
          errorDiv.className = "message assistant";
          errorDiv.innerHTML = `❌ 连接失败: ${error.message}`;
          messages.appendChild(errorDiv);
          messages.scrollTop = messages.scrollHeight;
        }
      }
  
      function processBackendResponse(data, helpers) {
        const { formatMultilineText, createAssistantMessage, appendStreamBlock, appendExecutionTime } = helpers;
  
        console.log("Backend response:", data);
  
        if (data.status === "error" || (data.status && data.status !== "ok" && data.status !== "success")) {
          displayMessage("❌ 后端返回错误状态", "assistant");
          return;
        }
  
        const thoughtContent = data.thought || data.final_prompt || "";
        if (thoughtContent) {
          const thoughtDiv = document.createElement("div");
          thoughtDiv.className = "message assistant";
          thoughtDiv.innerHTML = `<div class="thought-content"><strong>🧠 处理逻辑:</strong><br>${formatMultilineText(thoughtContent)}</div>`;
          messages.appendChild(thoughtDiv);
        }
  
        let hasAnswer = false;
        let answerDiv = null;
  
        const answerText =
          (typeof data.answer?.text === "string" && data.answer.text.trim()) ||
          (typeof data.answer_text === "string" && data.answer_text.trim()) ||
          "";
  
        if (typeof data.answer === "object" && data.answer !== null) {
          const images = Array.isArray(data.answer.images) ? data.answer.images : [];
          const keyframe = data.answer.keyframe ? [data.answer.keyframe] : [];
          const structuredImages = Array.isArray(data.structured?.images) ? data.structured.images : [];
          const allImages = [...images, ...keyframe, ...structuredImages].filter(Boolean);
  
          if (answerText || allImages.length) {
            answerDiv = createAssistantMessage();
            const header = document.createElement("div");
            const headerStrong = document.createElement("strong");
            headerStrong.textContent = "📋 分析结果:";
            header.appendChild(headerStrong);
            answerDiv.appendChild(header);
          }
  
          if (answerText && answerDiv) {
            appendStreamBlock(answerDiv, "📌 结果:", answerText, 60);
            hasAnswer = true;
          }
  
          allImages.forEach((image) => {
            const src = image?.data_uri || image?.url;
            if (!src || !answerDiv) return;
  
            let imageUrl = src;
            if (!imageUrl.startsWith("data:") && !imageUrl.startsWith("http")) {
              imageUrl = "https://andree-unwistful-ilene.ngrok-free.dev" + (imageUrl.startsWith("/") ? "" : "/") + imageUrl;
            }
  
            const img = document.createElement("img");
            img.src = imageUrl;
            img.alt = "结果图片";
            img.style.maxWidth = "100%";
            img.style.maxHeight = "300px";
            img.style.borderRadius = "6px";
            img.style.margin = "8px 0";
            img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
            img.onerror = () => {
              img.src = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctext x=%2220%22 y=%2235%22 font-size=%2220%22%3E图片加载失败%3C/text%3E%3C/svg%3E";
            };
            answerDiv.appendChild(img);
            hasAnswer = true;
          });
        } else if (answerText) {
          answerDiv = createAssistantMessage();
          appendStreamBlock(answerDiv, "📋 结果:", answerText, 60);
          hasAnswer = true;
        }
  
        if (hasAnswer && answerDiv) {
          const executionTime = data.execution_time || (data.result && data.result.execution_time) || "N/A";
          const timeStr = typeof executionTime === "number" ? executionTime.toFixed(2) : executionTime;
          appendExecutionTime(answerDiv, timeStr);
        }
  
        const candidates =
          (Array.isArray(data.candidates) && data.candidates) ||
          (Array.isArray(data.routing?.candidates) && data.routing.candidates) ||
          (Array.isArray(data.routing) && data.routing) ||
          [];
  
        if (candidates.length) window.updateDiscoveryListFromBackend(candidates);
  
        const selectedAgentName =
          data.best_match?.agent_name ||
          data.selected_agent?.agent_name ||
          data.agent?.selected ||
          data.agent_name ||
          "";
  
        if (selectedAgentName) window.highlightSelectedAgent(selectedAgentName);
  
        messages.scrollTop = messages.scrollHeight;
      }
  
      sendButton.addEventListener("click", sendMessage);
      userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
      });
  
      displayMessage(
        "👋 欢迎使用 IOA 平台！\n\n• 使用<strong>Discovery Process</strong>来搜索和选择 Agent\n• 点击<strong>Register Agent</strong>注册新的 Agent\n• 在此与 Orchestrator Agent 进行交互",
        "assistant"
      );
    }
  
    // ====== 总入口：放到 chat.js 里统一启动 ======
    document.addEventListener("DOMContentLoaded", function () {
      console.log("IOA Application Initializing...");
  
      window.initializeStats();
      window.initializeNetworkGraph();
      window.initializeDiscoveryProcess();
      initializeChatSystem();
  
      window.loadNewAgents();
  
      console.log("IOA Application Ready!");
    });
  
    window.initializeChatSystem = initializeChatSystem;
  })();
  
