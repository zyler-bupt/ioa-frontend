// 添加页面刷新监控
let lastRefreshTime = Date.now();
let refreshCount = 0;

// 监听重绘事件
document.addEventListener('DOMContentLoaded', () => {
  // 使用MutationObserver监测DOM变化
  const observer = new MutationObserver((mutations) => {
    // 检查变更是否发生在地图区域内
    const isMapChange = mutations.some(mutation => {
      // 检查该元素或其父元素是否是地图容器
      let node = mutation.target;
      while (node) {
        if (node.id === 'map' ||
          (node.classList &&
            (node.classList.contains('leaflet-container') ||
              node.classList.contains('map-container')))) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    });

    // 如果是地图区域的变更，则忽略
    if (isMapChange) {
      return;
    }

    const now = Date.now();
    if (now - lastRefreshTime < 1000) {
      refreshCount++;
      if (refreshCount > 5) {
        console.warn('检测到频繁DOM更新！');
      }
    } else {
      refreshCount = 0;
    }
    lastRefreshTime = now;
  });

  // 监控整个body，但排除地图区域
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
});

// 摄像头状态管理
const cameraStates = {
  Camera1: { status: 'normal', feed: null, lastAnomalyTime: 0, videoFile: 'video/1.mp4' },
  Camera2: { status: 'normal', feed: null, lastAnomalyTime: 0, videoFile: 'video/2.mp4' },
  Camera3: { status: 'normal', feed: null, lastAnomalyTime: 0, videoFile: 'video/3.mp4' }
};

// 当前活动摄像头
let activeCamera = 'Camera1';

// 摄像头ID和状态元素ID的映射
const cameraStatusMap = {
  Camera1: 'pos1-status',
  Camera2: 'pos2-status',
  Camera3: 'pos3-status'
};

// 添加全局变量用于定时显示异常消息和恢复消息
let anomalyAlertTimer = null;
let dismissAlertTimer = null;
const ANOMALY_ALERT_INTERVAL = 10000; // 每10秒显示一次异常警报
const DISMISS_DELAY = 5000; // 异常警报后5秒显示恢复消息

// 当前显示异常的摄像头
let lastAnomalyCamera = null;
// 记录上一次出现异常的摄像头（用于避免连续选择同一摄像头）
let previousAnomalyCamera = null;

// 初始化摄像头状态指示灯
function initializeCameraStatus() {
  Object.keys(cameraStates).forEach(cameraId => {
    const statusLight = document.getElementById(cameraStatusMap[cameraId]);
    statusLight.classList.add('green');
  });
}

// 更新摄像头状态 - 优化DOM操作
function updateCameraStatus(cameraId, status) {
  const statusLight = document.getElementById(cameraStatusMap[cameraId]);
  const prevStatus = cameraStates[cameraId].status;

  // 如果状态没有变化，则不进行DOM操作
  if (prevStatus === status) return;

  cameraStates[cameraId].status = status;

  // 通过直接操作样式属性而不是修改类名，减少重排
  if (status === 'normal') {
    statusLight.style.backgroundColor = '#28a745'; // 绿色
  } else {
    statusLight.style.backgroundColor = '#dc3545'; // 红色
  }

  // 注意：我们不在这里显示任何警报消息，所有警报消息都由定时器控制
}

// 显示异常摄像头警报
function showAnomalyAlert() {
  // 获取当前处于异常状态的摄像头
  const cameras = ['Camera1', 'Camera2', 'Camera3'];

  // 如果没有异常摄像头，先设置一个随机摄像头为异常状态
  const anomalyCameras = cameras.filter(camId => cameraStates[camId].status === 'anomaly');
  if (anomalyCameras.length === 0) {
    // 获取可选的摄像头（排除上一次的异常摄像头）
    let availableCameras = cameras;
    if (previousAnomalyCamera) {
      availableCameras = cameras.filter(camId => camId !== previousAnomalyCamera);
    }

    // 从可用摄像头中随机选择一个
    const randomIndex = Math.floor(Math.random() * availableCameras.length);
    const selectedCamera = availableCameras[randomIndex];

    // 更新状态（不触发Alert消息）
    cameraStates[selectedCamera].status = 'anomaly';
    const statusLight = document.getElementById(cameraStatusMap[selectedCamera]);
    statusLight.style.backgroundColor = '#dc3545'; // 红色

    lastAnomalyCamera = selectedCamera;
  } else {
    // 如果已有异常摄像头，使用第一个
    lastAnomalyCamera = anomalyCameras[0];
  }

  // 显示异常警报
  addOptimizedAlertMessage(`Anomalies detected：${lastAnomalyCamera} has detected anomalies`, 'danger');

  // 自动切换视频播放窗口到异常摄像头的视频
  updateCameraDisplay(lastAnomalyCamera);

  // 设置5秒后显示恢复消息的定时器
  if (dismissAlertTimer) {
    clearTimeout(dismissAlertTimer);
  }

  dismissAlertTimer = setTimeout(() => {
    // 显示恢复通知
    if (lastAnomalyCamera) {
      // 更新状态（不触发Alert消息）
      cameraStates[lastAnomalyCamera].status = 'normal';
      const statusLight = document.getElementById(cameraStatusMap[lastAnomalyCamera]);
      statusLight.style.backgroundColor = '#28a745'; // 绿色

      // 记录此次异常的摄像头，以便下次避免选择
      previousAnomalyCamera = lastAnomalyCamera;

      // 显示恢复消息
      addOptimizedAlertMessage(`Alert dismissed：${lastAnomalyCamera} has returned to normal`, 'success');
      lastAnomalyCamera = null;
    }
  }, DISMISS_DELAY);
}

// 更新摄像头视频显示
function updateCameraDisplay(cameraId) {
  const cameraFeed = document.getElementById('cameraFeed');
  const videoFile = cameraStates[cameraId].videoFile;
  activeCamera = cameraId;

  // 创建视频元素并设置属性
  const videoElement = document.createElement('video');
  videoElement.style.width = '100%';
  videoElement.style.height = '100%';
  videoElement.style.objectFit = 'cover';
  videoElement.autoplay = true;
  videoElement.muted = true;
  videoElement.loop = true;
  videoElement.playsInline = true; // 对于iOS设备
  videoElement.id = 'cameraVideo';

  // 为视频添加错误处理
  videoElement.onerror = (e) => {
    console.error(`视频${videoFile}加载错误:`, e);
    cameraFeed.innerHTML = `<div style="color: white; padding: 10px;">摄像头${cameraId}视频加载失败，请检查路径</div>`;
  };

  // 在视频元数据加载后强制播放
  videoElement.onloadedmetadata = () => {
    videoElement.play()
      .catch(e => console.error('自动播放失败:', e));
  };

  // 创建视频源
  const source = document.createElement('source');
  source.src = videoFile;
  source.type = 'video/mp4';

  // 组装视频元素
  videoElement.appendChild(source);
  cameraFeed.innerHTML = ''; // 清空之前的内容
  cameraFeed.appendChild(videoElement);

  // 添加摄像头切换提示
  addOptimizedAlertMessage(`The view has changed to ${cameraId}`, 'info');
}

// 添加优化后的警报消息函数 - 减少DOM操作
function addOptimizedAlertMessage(message, type) {
  const alertList = document.getElementById('alertList');

  // 如果找不到alertList元素，则记录错误并返回
  if (!alertList) {
    console.error('错误: 无法添加警报消息，找不到alertList元素');
    return;
  }

  // 缓存DOM字符串而不是直接创建许多DOM元素
  const alertHtml = `
    <div class="alert-message ${type === 'danger' ? 'alert-danger' : type === 'success' ? 'alert-success' : ''}">
      <div class="alert-time">${new Date().toLocaleTimeString()}</div>
      <div class="alert-content">${message}</div>
    </div>
  `;

  try {
    // 使用insertAdjacentHTML减少DOM操作
    alertList.insertAdjacentHTML('afterbegin', alertHtml);
    console.log('成功添加警报消息: ' + message);

    // 批量处理多余的警报
    const maxAlerts = 50;
    const alerts = alertList.children;
    if (alerts.length > maxAlerts) {
      // 一次性删除所有多余的警报
      for (let i = maxAlerts; i < alerts.length; i++) {
        alertList.removeChild(alerts[i]);
      }
    }
  } catch (error) {
    console.error('添加警报消息时发生错误:', error);
  }
}

// 将函数导出到window对象，使其可以从其他JS文件调用
window.addOptimizedAlertMessage = addOptimizedAlertMessage;

// 初始化时保留原有的addAlertMessage函数以兼容其他地方的调用
function addAlertMessage(message) {
  // 根据消息内容确定类型
  let type = 'info';
  if (message.includes('Anomalies detected')) {
    type = 'danger';
  } else if (message.includes('Alert dismissed')) {
    type = 'success';
  }

  // 调用优化版本
  addOptimizedAlertMessage(message, type);
}

// 模拟摄像头异常检测 - 这个函数不再控制摄像头状态
function simulateCameraAnomaly() {
  // 空函数 - 不再需要这个函数的逻辑，因为所有状态变化都由定时器控制
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 立即设置初始样式避免闪烁
  document.getElementById('pos1-status').style.backgroundColor = '#28a745';
  document.getElementById('pos2-status').style.backgroundColor = '#28a745';
  document.getElementById('pos3-status').style.backgroundColor = '#28a745';

  // 验证alertList元素是否存在
  const alertList = document.getElementById('alertList');
  if (!alertList) {
    console.error('警告: 找不到alertList元素!');
  } else {
    console.log('成功找到alertList元素');
  }

  // 添加初始的欢迎消息
  addOptimizedAlertMessage('The surveillance system has been activated and the camera status is being monitored....', 'info');

  // 初始化右上角视频播放 - 默认显示Camera1的视频
  updateCameraDisplay('Camera1');

  // 添加全局函数，让地图可以调用切换摄像头
  window.switchCamera = function (cameraId) {
    if (cameraStates[cameraId]) {
      updateCameraDisplay(cameraId);
    } else {
      console.error(`摄像头 ${cameraId} 不存在`);
    }
  };

  // 设置定时器，每10秒显示一次异常警报
  anomalyAlertTimer = setInterval(showAnomalyAlert, ANOMALY_ALERT_INTERVAL);
}); 