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
    const fileInput = document.getElementById("fileInput");
    const fileButton = document.getElementById("fileButton");
    const attachmentPreview = document.getElementById("attachmentPreview");
    const imageModal = document.getElementById("imageModal");
    const imageModalImage = document.getElementById("imageModalImage");
    const alertModal = document.getElementById("alertModal");
    const alertModalMessage = document.getElementById("alertModalMessage");
    const alertModalMeta = document.getElementById("alertModalMeta");
    const messages = document.getElementById("messages");

    const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

    // ✅ 统一：后端 HTTP 基址（图片/上传走 HTTP；聊天走 WS）
    const BACKEND_HTTP = "http://10.200.1.35:8001";

    let pendingFile = null;

    // --------------------------------
    // Backend URL helpers
    // --------------------------------
    const BACKEND_ORIGIN = (() => {
      try {
        return new URL(BACKEND_HTTP).origin; // e.g. http://10.200.1.35:8001
      } catch (e) {
        return String(BACKEND_HTTP || "").replace(/\/+$/, "");
      }
    })();

    function resolveBackendUrl(maybePathOrUrl) {
      const s = String(maybePathOrUrl || "").trim();
      if (!s) return "";
      if (s.startsWith("data:")) return s;
      if (/^https?:\/\//i.test(s)) return s;
      if (s.startsWith("/")) return BACKEND_ORIGIN + s;
      return BACKEND_ORIGIN + "/" + s;
    }

    // --------------------------------
    // Text helpers
    // --------------------------------
    function escapeHtml(text) {
      return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function formatMultilineText(text) {
      return escapeHtml(text).replace(/\n/g, "<br>");
    }

    function formatBytes(bytes) {
      if (!Number.isFinite(bytes)) return "0 B";
      if (bytes < 1024) return `${bytes} B`;
      const units = ["KB", "MB", "GB"];
      let size = bytes;
      let unitIndex = -1;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
      }
      return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
    }

    // --------------------------------
    // Attachment UI
    // --------------------------------
    function clearPendingFile() {
      pendingFile = null;
      if (!attachmentPreview) return;
      attachmentPreview.innerHTML = "";
      attachmentPreview.classList.remove("is-visible");
    }

    function renderAttachmentPreview(file) {
      if (!attachmentPreview) return;
      attachmentPreview.innerHTML = "";
      if (!file) {
        attachmentPreview.classList.remove("is-visible");
        return;
      }

      const chip = document.createElement("div");
      chip.className = "attachment-chip";

      const label = document.createElement("span");
      label.textContent = `${file.name} (${formatBytes(file.size)})`;
      chip.appendChild(label);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "attachment-remove";
      removeButton.setAttribute("aria-label", "Remove attachment");
      removeButton.textContent = "✕";
      removeButton.addEventListener("click", clearPendingFile);
      chip.appendChild(removeButton);

      attachmentPreview.appendChild(chip);
      attachmentPreview.classList.add("is-visible");
    }

    function isVideoFile(file) {
      return Boolean(file && typeof file.type === "string" && file.type.startsWith("video/"));
    }

    async function uploadVideo(file) {
      if (!file) throw new Error("未选择文件");
      if (!isVideoFile(file)) throw new Error(`不是视频文件：${file?.type || "unknown"}`);
      if (file.size > MAX_VIDEO_BYTES) throw new Error(`文件过大：${formatBytes(file.size)}，超过限制`);

      const form = new FormData();
      form.append("file", file, file.name);

      const resp = await fetch(`${BACKEND_ORIGIN}/upload/video`, {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        let detail = "";
        try {
          detail = (await resp.json())?.detail || "";
        } catch (e) {}
        throw new Error(`上传失败：HTTP ${resp.status} ${detail}`);
      }

      const data = await resp.json();
      if (data.status !== "ok" || !data.path) {
        throw new Error(`上传返回异常：${JSON.stringify(data)}`);
      }

      return data; // {status, filename, path, url, size}
    }

    // --------------------------------
    // Streaming UI helpers
    // --------------------------------
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

    function appendExecutionTime(container, timeValue) {
      const timeLine = document.createElement("small");
      timeLine.style.color = "#999";
      timeLine.style.marginTop = "8px";
      timeLine.style.display = "block";
      let label = "";
      if (typeof timeValue === "number" && Number.isFinite(timeValue)) {
        label = `${timeValue.toFixed(2)}s`;
      } else {
        const raw = String(timeValue ?? "").trim();
        if (raw) {
          label = /^\d+(\.\d+)?$/.test(raw) ? `${raw}s` : raw;
        } else {
          label = "N/A";
        }
      }
      timeLine.textContent = `⏱️ 执行时间: ${label}`;
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

    // --------------------------------
    // Image modal (fix aria-hidden warning)
    // --------------------------------
    let lastFocusedEl = null;

    function openImageModal(src, altText) {
      if (!imageModal || !imageModalImage) return;

      lastFocusedEl = document.activeElement;

      imageModalImage.src = src;
      imageModalImage.alt = altText || "Preview";

      imageModal.classList.add("is-open");
      imageModal.setAttribute("aria-hidden", "false");

      const closeBtn = imageModal.querySelector(".image-modal__close");
      if (closeBtn) closeBtn.focus();
    }

    function closeImageModal() {
      if (!imageModal || !imageModalImage) return;

      // 关键：先把焦点移出 modal，再 aria-hidden
      if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
        lastFocusedEl.focus();
      }

      imageModal.classList.remove("is-open");
      imageModal.setAttribute("aria-hidden", "true");
      imageModalImage.src = "";
    }

    // --------------------------------
    // Alert modal
    // --------------------------------
    function openAlertModal(options = {}) {
      if (!alertModal) return;
      const message = options.message || "事故/火情已上报，正在联动附近救援力量。";
      const meta = options.meta || "";
      if (alertModalMessage) alertModalMessage.textContent = message;
      if (alertModalMeta) {
        alertModalMeta.textContent = meta;
        alertModalMeta.style.display = meta ? "block" : "none";
      }
      alertModal.classList.add("is-open");
      alertModal.setAttribute("aria-hidden", "false");
    }

    function closeAlertModal() {
      if (!alertModal) return;
      alertModal.classList.remove("is-open");
      alertModal.setAttribute("aria-hidden", "true");
    }

    // --------------------------------
    // User message UI
    // --------------------------------
    function displayUserMessage(text, fileMeta) {
      if (!text && !fileMeta) return;

      const messageDiv = document.createElement("div");
      messageDiv.className = "message user";

      if (fileMeta) {
        const chip = document.createElement("div");
        chip.className = "attachment-chip";
        const label = document.createElement("span");
        label.textContent = `${fileMeta.name} (${formatBytes(fileMeta.size)})`;
        chip.appendChild(label);
        messageDiv.appendChild(chip);
      }

      if (text) {
        const textDiv = document.createElement("div");
        textDiv.className = "user-text";
        textDiv.textContent = text;
        messageDiv.appendChild(textDiv);
      }

      messages.appendChild(messageDiv);
      messages.scrollTop = messages.scrollHeight;
    }

    // --------------------------------
    // Send message
    // --------------------------------
    async function sendMessage() {
      const text = userInput.value.trim();
      if (!text && !pendingFile) return;

      const fileToSend = pendingFile;
      const fileMeta = fileToSend
        ? { name: fileToSend.name, size: fileToSend.size, type: fileToSend.type }
        : null;

      displayUserMessage(text, fileMeta);

      // appState 保护
      window.appState = window.appState || { messages: [] };
      window.appState.messages = window.appState.messages || [];
      window.appState.messages.push({ type: "user", text, file: fileMeta });

      userInput.value = "";
      clearPendingFile();

      const messageText = text || (fileToSend ? `[File] ${fileToSend.name}` : "");
      let uploadedVideoPath = null;

      if (fileToSend) {
        if (!isVideoFile(fileToSend)) {
          displayMessage("❌ 仅支持视频文件上传", "assistant");
          return;
        }
        if (fileToSend.size > MAX_VIDEO_BYTES) {
          displayMessage(`❌ 文件过大，最大支持 ${formatBytes(MAX_VIDEO_BYTES)}`, "assistant");
          return;
        }

        try {
          displayMessage("⬆️ 正在上传视频到服务器...", "assistant");
          const uploadResp = await uploadVideo(fileToSend);
          uploadedVideoPath = uploadResp.path;
          displayMessage(`✅ 视频上传完成：${escapeHtml(uploadResp.filename || fileToSend.name)}`, "assistant");
        } catch (error) {
          displayMessage(`❌ 视频上传失败: ${escapeHtml(error.message)}`, "assistant");
          return;
        }
      }

      callBackendAPI(messageText, uploadedVideoPath ? { uploadedVideoPath } : {});
    }

    // --------------------------------
    // WebSocket
    // --------------------------------
    let ws = null;
    let wsReadyPromise = null;

    function getWSUrl() {
      // 用 BACKEND_HTTP 的 host/port，协议按页面 http/https 走 ws/wss
      const proto = location.protocol === "https:" ? "wss" : "ws";
      let hostPort = "10.200.1.35:8001";
      try {
        const u = new URL(BACKEND_HTTP);
        hostPort = u.host; // includes port
      } catch (e) {}
      return `${proto}://${hostPort}/ws`;
    }

    function ensureWSConnection() {
      if (ws && ws.readyState === WebSocket.OPEN) return Promise.resolve(ws);
      if (wsReadyPromise) return wsReadyPromise;

      wsReadyPromise = new Promise((resolve, reject) => {
        ws = new WebSocket(getWSUrl());

        ws.onopen = () => {
          console.log("[WS] ✅ connected", ws.url);
          resolve(ws);
        };

        ws.onerror = (e) => {
          console.error("[WS] ❌ error", e);
          wsReadyPromise = null;
          reject(new Error("WebSocket 连接失败：请确认后端已启动 / 网络可达"));
        };

        ws.onclose = (ev) => {
          console.warn("[WS] ⚠️ closed", {
            code: ev.code,
            reason: ev.reason,
            wasClean: ev.wasClean,
            url: ws?.url,
          });
          ws = null;
          wsReadyPromise = null;
        };
      });

      return wsReadyPromise;
    }

    async function callBackendAPI(userInputText, options = {}) {
      const { uploadedVideoPath } = options;

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

      function formatStatusPayload(payload) {
        if (!payload) return "";
        if (typeof payload === "string") return payload;
        const phase = payload.phase || payload.stage || "";
        const workflow = payload.workflow_id || payload.workflowId || payload.workflow || "";
        const agent = payload.agent || payload.agent_name || payload.name || "";
        const stepIndexRaw = payload.step_index ?? payload.stepIndex;
        const stepTotalRaw = payload.step_total ?? payload.stepTotal;
        const stepIndex = Number(stepIndexRaw);
        const stepTotal = Number(stepTotalRaw);
        const stepPart =
          Number.isFinite(stepIndex) && Number.isFinite(stepTotal)
            ? `步骤 ${stepIndex}/${stepTotal}`
            : "";
        const message = payload.message || payload.status || "";
        return [phase && `阶段:${phase}`, workflow && `流程:${workflow}`, stepPart, agent && `Agent:${agent}`, message]
          .filter(Boolean)
          .join(" · ");
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

      let flowTriggered = false;
      const triggerFlow = (agentNameOrList, options = {}) => {
        const shouldForce = options.force === true;
        if (flowTriggered && !shouldForce) return;
        if (!agentNameOrList) return;

        const agentList = Array.isArray(agentNameOrList)
          ? agentNameOrList.filter(Boolean)
          : [];
        if (agentList.length > 1 && typeof window.triggerTopologyFlows === "function") {
          window.triggerTopologyFlows(agentList);
          flowTriggered = true;
          return;
        }

        const agentName = agentList.length === 1 ? agentList[0] : agentNameOrList;
        if (!agentName || typeof window.triggerTopologyFlow !== "function") return;
        window.triggerTopologyFlow(agentName);
        flowTriggered = true;
      };

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
            const selectedName = selected?.agent_name || selected?.name || selected?.id || "";
            if (selectedName) {
              if (typeof window.highlightSelectedAgent === "function") window.highlightSelectedAgent(selectedName);
              triggerFlow(selectedName);
              appendProgressStep("路由结果", `已选择 Agent：${selectedName}`, "routing");
            }

            const routingCandidates =
              (Array.isArray(payload?.candidates) && payload.candidates) ||
              (Array.isArray(payload?.routing?.candidates) && payload.routing.candidates) ||
              (Array.isArray(payload?.routing) && payload.routing) ||
              [];

            if (routingCandidates.length && typeof window.updateDiscoveryListFromBackend === "function") {
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
            const statusText = formatStatusPayload(msg.data);
            if (statusText) {
              appendProgressStep("状态", statusText, "status");
            }
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

              const stepAgents =
                (Array.isArray(msg.data?.trace?.steps) && msg.data.trace.steps.map((step) => step?.agent).filter(Boolean)) ||
                (Array.isArray(msg.data?.answer?.structured?.steps) &&
                  msg.data.answer.structured.steps.map((step) => step?.agent).filter(Boolean)) ||
                [];
              const finalSelected =
                msg.data?.agent?.selected ||
                msg.data?.selected?.agent ||
                msg.data?.selected?.agent_name ||
                msg.data?.best_match?.agent_name ||
                msg.data?.selected_agent?.agent_name ||
                msg.data?.agent?.selected ||
                msg.data?.agent_name ||
                "";
              if (stepAgents.length > 1) {
                triggerFlow(stepAgents, { force: true });
              } else {
                triggerFlow(stepAgents[0] || finalSelected, { force: true });
              }

              processBackendResponse(msg.data, {
                formatMultilineText,
                createAssistantMessage,
                appendStreamBlock,
                appendExecutionTime,
                resolveBackendUrl,
              });
            });
            socket.removeEventListener("message", handleMessage);
            return;
          }

          if (msg.type === "error") {
            if (loadingDiv) loadingDiv.remove();
            const errorDiv = document.createElement("div");
            errorDiv.className = "message assistant";
            const message = msg.data?.message || msg.message || "unknown";
            errorDiv.innerHTML = `❌ 后端错误: ${escapeHtml(message)}`;
            messages.appendChild(errorDiv);
            messages.scrollTop = messages.scrollHeight;
            socket.removeEventListener("message", handleMessage);
          }
        };

        socket.addEventListener("message", handleMessage);

        const payload = {
          type: "run",
          request_id: requestId,
          user_input: userInputText,
          top_k: 5,
        };
        if (uploadedVideoPath) payload.uploaded_video_path = uploadedVideoPath;

        console.log("[WS send] payload:", payload);
        socket.send(JSON.stringify(payload));
      } catch (error) {
        if (loadingDiv) loadingDiv.remove();
        const errorDiv = document.createElement("div");
        errorDiv.className = "message assistant";
        errorDiv.innerHTML = `❌ 连接失败: ${escapeHtml(error.message)}`;
        messages.appendChild(errorDiv);
        messages.scrollTop = messages.scrollHeight;
      }
    }

    // --------------------------------
    // Render final answer (text + images)
    // --------------------------------
    function processBackendResponse(data, helpers) {
      const { createAssistantMessage, appendStreamBlock, appendExecutionTime, resolveBackendUrl } = helpers;

      console.log("Backend response:", data);

      if (data.status === "error" || (data.status && data.status !== "ok" && data.status !== "success")) {
        displayMessage("❌ 后端返回错误状态", "assistant");
        return;
      }

      // ✅ 默认不再额外渲染 thought（你们目标是“最靠谱的一句话”）
      // 如果你要开调试再显示，可加一个开关：
      // const SHOW_DEBUG_THOUGHT = false;

      let hasAnswer = false;
      let answerDiv = null;

      const answerText =
        (typeof data.answer?.text === "string" && data.answer.text.trim()) ||
        (typeof data.answer_text === "string" && data.answer_text.trim()) ||
        "";

      const answerImages = Array.isArray(data.answer?.images) ? data.answer.images : [];
      const answerAttachments = Array.isArray(data.answer?.attachments) ? data.answer.attachments : [];

      // 兼容旧字段
      const legacyImages =
        (Array.isArray(data.images) && data.images) ||
        [];
      const keyframe = data.answer?.keyframe ? [data.answer.keyframe] : [];
      const structuredImages = Array.isArray(data.structured?.images) ? data.structured.images : [];
      const allImages = [...answerImages, ...legacyImages, ...keyframe, ...structuredImages].filter(Boolean);

      const traceSteps =
        (Array.isArray(data.trace?.steps) && data.trace.steps) ||
        (Array.isArray(data.answer?.structured?.steps) && data.answer.structured.steps) ||
        [];

      const selectedAgent =
        data.agent?.selected ||
        data.selected?.agent ||
        data.selected?.agent_name ||
        data.best_match?.agent_name ||
        data.selected_agent?.agent_name ||
        data.agent?.selected ||
        data.agent_name ||
        "";

      const selectedCapability =
        data.agent?.capability || data.selected?.capability || data.workflow_id || data.workflowId || "";
      const confidence = data.agent?.confidence || data.selected?.confidence || {};
      let finalPct = Number(confidence.final_pct);
      if (!Number.isFinite(finalPct)) {
        const finalScore = Number(confidence.final_score);
        if (Number.isFinite(finalScore)) finalPct = finalScore * 100;
      }
      if (Number.isFinite(finalPct)) {
        finalPct = Math.max(0, Math.min(100, finalPct));
      }

      function appendMetaLine(container, text) {
        const line = document.createElement("div");
        line.style.marginTop = "6px";
        line.style.fontSize = "0.9em";
        line.style.color = "#3b4b64";
        line.textContent = text;
        container.appendChild(line);
      }

      function appendImageList(container, images, labelText) {
        if (!images.length) return;
        const wrap = document.createElement("div");
        wrap.className = "trace-step-media";
        if (labelText) {
          const label = document.createElement("div");
          label.textContent = labelText;
          label.style.fontWeight = "600";
          label.style.marginTop = "6px";
          container.appendChild(label);
        }
        images.forEach((image) => {
          const src = image?.data_uri || image?.url || image?.url_rel || image?.path;
          if (!src) return;
          const imageUrl = resolveBackendUrl(src);
          if (!imageUrl) return;
          const img = document.createElement("img");
          img.src = imageUrl;
          img.alt = "结果图片";
          img.className = "chat-image";
          img.addEventListener("click", () => openImageModal(imageUrl, "结果图片"));
          img.onerror = () => {
            img.src =
              "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctext x=%2220%22 y=%2235%22 font-size=%2220%22%3E图片加载失败%3C/text%3E%3C/svg%3E";
          };
          wrap.appendChild(img);
        });
        container.appendChild(wrap);
      }

      function getAttachmentLabel(item) {
        const url = item?.url || item?.path || "";
        const nameFromPath = String(url).split("/").pop();
        return nameFromPath || item?.type || "attachment";
      }

      function appendAttachmentList(container, attachments, labelText) {
        if (!attachments.length) return;
        const block = document.createElement("div");
        if (labelText) {
          const label = document.createElement("div");
          label.textContent = labelText;
          label.style.fontWeight = "600";
          label.style.marginTop = "8px";
          block.appendChild(label);
        }
        const list = document.createElement("div");
        list.className = "trace-step-attachments";
        attachments.forEach((att) => {
          const url = resolveBackendUrl(att?.url || att?.url_rel || att?.path || "");
          const label = getAttachmentLabel(att);
          if (url) {
            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = label;
            list.appendChild(link);
          } else {
            const span = document.createElement("span");
            span.textContent = label;
            list.appendChild(span);
          }
        });
        block.appendChild(list);
        container.appendChild(block);
      }

      function appendTraceSteps(container, steps) {
        if (!Array.isArray(steps) || !steps.length) return;
        const header = document.createElement("div");
        const strong = document.createElement("strong");
        strong.textContent = "🧩 执行步骤:";
        header.appendChild(strong);
        header.style.marginTop = "10px";
        container.appendChild(header);

        const list = document.createElement("div");
        list.className = "trace-steps";

        steps.forEach((step, idx) => {
          const details = document.createElement("details");
          details.className = "trace-step";
          details.open = idx === steps.length - 1;

          const summary = document.createElement("summary");
          const agentName =
            step?.agent || step?.agent_name || step?.name || step?.id || `Step ${idx + 1}`;
          const statusText = step?.status ? ` · ${step.status}` : "";
          summary.textContent = `${idx + 1}. ${agentName}${statusText}`;
          details.appendChild(summary);

          if (step?.text) {
            const textDiv = document.createElement("div");
            textDiv.className = "trace-step-text";
            textDiv.innerHTML = formatMultilineText(step.text);
            details.appendChild(textDiv);
          }

          const stepImages = Array.isArray(step?.images) ? step.images : [];
          appendImageList(details, stepImages, "");

          const stepAttachments = Array.isArray(step?.attachments) ? step.attachments : [];
          appendAttachmentList(details, stepAttachments, "");

          list.appendChild(details);
        });

        container.appendChild(list);
      }

      if (answerText || allImages.length || answerAttachments.length || traceSteps.length || selectedAgent) {
        answerDiv = createAssistantMessage();

        const header = document.createElement("div");
        const headerStrong = document.createElement("strong");
        headerStrong.textContent = "📋 分析结果:";
        header.appendChild(headerStrong);
        answerDiv.appendChild(header);
      }

      if (answerDiv && selectedAgent) {
        const capabilityText = selectedCapability ? `（${selectedCapability}）` : "";
        appendMetaLine(answerDiv, `🤖 选择 Agent: ${selectedAgent}${capabilityText}`);
      }

      if (answerDiv && Number.isFinite(finalPct)) {
        appendMetaLine(answerDiv, `🎯 匹配准确度: ${finalPct.toFixed(0)}%`);
      }

      if (answerText && answerDiv) {
        appendStreamBlock(answerDiv, "📌 结果:", answerText, 60);
        hasAnswer = true;
      }

      if (answerDiv) {
        appendImageList(answerDiv, allImages, allImages.length ? "🖼️ 图片:" : "");
        appendAttachmentList(answerDiv, answerAttachments, "📎 附件:");
        appendTraceSteps(answerDiv, traceSteps);
        if (allImages.length || answerAttachments.length || traceSteps.length) {
          hasAnswer = true;
        }
      }

      if (hasAnswer && answerDiv) {
        const executionTime = data.execution_time || (data.result && data.result.execution_time) || "N/A";
        appendExecutionTime(answerDiv, executionTime);
        openAlertModal({
          message: "🚨 已报警：事故/火情信息已同步至应急平台。",
          meta: `报警时间：${new Date().toLocaleString()}`,
        });
      }

      // 更新 discovery
      const candidates =
        (Array.isArray(data.candidates) && data.candidates) ||
        (Array.isArray(data.routing?.candidates) && data.routing.candidates) ||
        (Array.isArray(data.routing) && data.routing) ||
        [];

      if (candidates.length && typeof window.updateDiscoveryListFromBackend === "function") {
        window.updateDiscoveryListFromBackend(candidates);
      }

      const selectedAgentName =
        data.agent?.selected ||
        data.selected?.agent ||
        data.selected?.agent_name ||
        data.best_match?.agent_name ||
        data.selected_agent?.agent_name ||
        data.agent?.selected ||
        data.agent_name ||
        "";

      if (selectedAgentName && typeof window.highlightSelectedAgent === "function") {
        const hasMultiSteps = traceSteps.length > 1;
        window.highlightSelectedAgent(selectedAgentName, { skipFlow: hasMultiSteps });
      }

      messages.scrollTop = messages.scrollHeight;
    }

    // --------------------------------
    // Bind events
    // --------------------------------
    sendButton.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    if (fileButton && fileInput) {
      fileButton.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        fileInput.value = "";

        if (!isVideoFile(file)) {
          displayMessage("❌ 仅支持视频文件上传", "assistant");
          return;
        }

        if (file.size > MAX_VIDEO_BYTES) {
          displayMessage(`❌ 文件过大，最大支持 ${formatBytes(MAX_VIDEO_BYTES)}`, "assistant");
          return;
        }

        pendingFile = file;
        renderAttachmentPreview(file);
      });
    }

    if (imageModal) {
      imageModal.addEventListener("click", (event) => {
        const target = event.target;
        if (target && (target.matches(".image-modal__close") || target.dataset.close === "true")) {
          closeImageModal();
        }
      });
    }

    if (alertModal) {
      alertModal.addEventListener("click", (event) => {
        const target = event.target;
        if (target && (target.classList.contains("alert-modal__close") || target.dataset.close === "true")) {
          closeAlertModal();
        }
      });
    }

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeImageModal();
        closeAlertModal();
      }
    });

    // --------------------------------
    // Welcome
    // --------------------------------
    displayMessage(
      "👋 欢迎使用 IOA 平台！\n\n• 使用<strong>Discovery Process</strong>来搜索和选择 Agent\n• 点击<strong>Register Agent</strong>注册新的 Agent\n• 在此与 Orchestrator Agent 进行交互",
      "assistant"
    );
  }

  // ====== 总入口：放到 chat.js 里统一启动 ======
  document.addEventListener("DOMContentLoaded", function () {
    console.log("IOA Application Initializing...");

    if (typeof window.initializeStats === "function") window.initializeStats();
    if (typeof window.initializeNetworkGraph === "function") window.initializeNetworkGraph();
    if (typeof window.initializeDiscoveryProcess === "function") window.initializeDiscoveryProcess();

    initializeChatSystem();

    if (typeof window.loadNewAgents === "function") window.loadNewAgents();

    console.log("IOA Application Ready!");
  });

  window.initializeChatSystem = initializeChatSystem;
})();
