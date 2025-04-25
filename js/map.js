// 摄像头位置（示例坐标，需要根据实际情况调整）
const cameras = [
  { id: 'Camera1', lat: 39.924551 - 0.0009, lng: 116.274962 - 0.00944, name: 'Camera1', description: '阜石路定慧桥' },
  { id: 'Camera2', lat: 40.014926 - 0.0018, lng: 116.286736 - 0.00236, name: 'Camera2', description: '北五环肖家河桥' },
  { id: 'Camera3', lat: 39.875493 - 0.0009, lng: 116.277879 - 0.00354, name: 'Camera3', description: '京港澳高速岳各庄桥' }
];

// 基站位置（经过修改后的位置）
const baseStations = [
  { id: 'BS01', lat: 39.989184 - 0.0009, lng: 116.402669 - 0.0059, name: 'BS01', description: '亚运村', relatedCamera: 'Camera1' },
  { id: 'BS02', lat: 40.05512 - 0.0036, lng: 116.329074 - 0.00354, name: 'BS02', description: '西三旗', relatedCamera: 'Camera2' },
  { id: 'BS03', lat: 39.90754, lng: 116.459138, name: 'BS03', description: '北京CBD', relatedCamera: 'Camera3' }
];

// 边缘服务器位置（位于BS01西侧250米处，北侧10米处）
const edgeServer = {
  id: 'Edge01',
  lat: 39.960161 + 0.00009, // 北移10米
  lng: (116.349315 + 0.00118 * 5) - 0.00118 * 2.5, // BS01新位置 - 250米
  name: 'ES01',
  description: '边缘计算服务器',
  location: '北京邮电大学海淀校区',
  relatedBaseStations: ['BS01', 'BS02', 'BS03']
};

// 计算摄像头和基站位置的边界
function calculateBounds() {
  // 合并摄像头、基站和边缘服务器数组用于计算边界
  const allPoints = [...cameras, ...baseStations, edgeServer];

  let minLat = Math.min(...allPoints.map(point => point.lat));
  let maxLat = Math.max(...allPoints.map(point => point.lat));
  let minLng = Math.min(...allPoints.map(point => point.lng));
  let maxLng = Math.max(...allPoints.map(point => point.lng));

  // 添加一些边距
  const padding = 0.005;// 调整边距使显示更合适
  minLat -= padding;
  maxLat += padding;
  minLng -= padding;
  maxLng += padding;

  return [[minLat, minLng], [maxLat, maxLng]];
}

// 初始化地图
const map = L.map('map', {
  // 禁用不必要的地图交互，减少重绘
  fadeAnimation: false,
  zoomAnimation: true,
  markerZoomAnimation: false,
  // 减少地图更新频率
  preferCanvas: true,
  // 禁用自动缩放，减少不必要的动画
  trackResize: false,
  // 允许多个弹出框同时存在
  closePopupOnClick: false,
  // 缩放控制参数 - 使缩放更精细
  zoomDelta: 0.25,           // 减小缩放步长为0.25（默认为1）
  zoomSnap: 0.25,            // 允许非整数缩放级别，最小单位0.25
  wheelPxPerZoomLevel: 120,  // 增加滚动像素数，使缩放更平滑（默认60）
  wheelDebounceTime: 100     // 滚轮事件去抖时间，防止过快缩放
});

// 定义多个底图图层
// OpenStreetMap标准图层
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  updateWhenIdle: true,
  updateWhenZooming: false,
  opacity: 1,
  updateInterval: 500
});

// CartoDB明亮风格图层
const cartodbLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
});

// CartoDB暗黑风格图层
const cartodbDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
});

// Esri卫星图像图层
const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

// 默认使用OpenStreetMap图层
osmLayer.addTo(map);

// 添加图层控制器，允许用户切换不同图层
const baseMaps = {
  "OpenStreetMap": osmLayer,
  "CartoDB亮色": cartodbLight,
  "CartoDB暗色": cartodbDark,
  "卫星图像": esriSatellite
};

L.control.layers(baseMaps, null, {
  position: 'topright'
}).addTo(map);

// 自定义摄像头图标
const cameraIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// 自定义基站图标（与摄像头图标明显不同）
const baseStationIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: null, // 移除阴影
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// 自定义边缘服务器图标
const edgeServerIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'edge-server-icon'
});

// 添加自定义CSS，使基站图标颜色不同
const style = document.createElement('style');
style.textContent = `
  .leaflet-marker-icon.base-station-icon {
    /* 基站图标已使用橙色图标，不再需要CSS颜色过滤 */
  }
`;
document.head.appendChild(style);

// 添加自定义CSS，使边缘服务器图标颜色不同
const edgeServerStyle = document.createElement('style');
edgeServerStyle.textContent = `
  .leaflet-marker-icon.edge-server-icon {
    filter: hue-rotate(240deg); /* 改变图标颜色为蓝紫色 */
  }
`;
document.head.appendChild(edgeServerStyle);

// 添加摄像头标记
cameras.forEach(camera => {
  const marker = L.marker([camera.lat, camera.lng], { icon: cameraIcon })
    .bindPopup(`编号：${camera.name}<br>位置：${camera.description}`, { autoClose: false, closeOnClick: false })
    .addTo(map);

  // 点击标记时更新摄像头视频显示
  marker.on('click', () => {
    updateCameraFeed(camera.id);
  });

  // 为摄像头添加永久可见的标签
  const label = L.divIcon({
    className: 'camera-label',
    html: `<div>${camera.name}</div>`,
    iconSize: [80, 20],
    iconAnchor: [40, -5]
  });

  L.marker([camera.lat, camera.lng], { icon: label, interactive: false })
    .addTo(map);
});

// 添加基站标记
baseStations.forEach((station, index) => {
  const marker = L.marker([station.lat, station.lng], { icon: baseStationIcon })
    .bindPopup(`编号：${station.name}<br>位置：${station.description}<br>关联摄像头：${station.relatedCamera}`, { autoClose: false, closeOnClick: false })
    .addTo(map);

  // 点击基站时，可以关联到对应的摄像头
  marker.on('click', () => {
    if (typeof window.addOptimizedAlertMessage === 'function') {
      window.addOptimizedAlertMessage(`The camera associated with base station ${station.name} is ${station.relatedCamera}`, 'info');
    } else {
      console.log(`基站${station.name}关联的摄像头是${station.relatedCamera}`);
    }
  });

  // 为基站添加永久可见的标签
  const baseStationLabel = L.divIcon({
    className: 'station-label',
    html: `<div>Base Station${index + 1}</div>`,
    iconSize: [120, 20],
    iconAnchor: [60, -5]
  });

  L.marker([station.lat, station.lng], { icon: baseStationLabel, interactive: false })
    .addTo(map);
});

// 添加边缘服务器标记
const edgeServerMarker = L.marker([edgeServer.lat, edgeServer.lng], { icon: edgeServerIcon })
  .bindPopup(`编号：${edgeServer.name}<br>位置：${edgeServer.location}<br>关联基站：${edgeServer.relatedBaseStations}`, { autoClose: false, closeOnClick: false })
  .addTo(map);

// 点击边缘服务器时显示信息
edgeServerMarker.on('click', () => {
  if (typeof window.addOptimizedAlertMessage === 'function') {
    window.addOptimizedAlertMessage(`Edge Server is processing data from nearby base stations`, 'info');
  } else {
    console.log('Edge Server is processing data from nearby base stations');
  }
});

// 为边缘服务器添加永久可见的标签
const edgeServerLabel = L.divIcon({
  className: 'edge-server-label',
  html: `<div>Edge Server</div>`,
  iconSize: [100, 20],
  iconAnchor: [50, -5]
});

L.marker([edgeServer.lat, edgeServer.lng], { icon: edgeServerLabel, interactive: false })
  .addTo(map);

/* 删除已注释的曲线相关代码 */

// 设置地图视图以显示所有摄像头
map.fitBounds(calculateBounds());

// 在地图左下角添加"Computing Network"按钮
L.Control.ComputingNetwork = L.Control.extend({
  onAdd: function (map) {
    const button = L.DomUtil.create('button', 'computing-network-button');
    button.innerHTML = 'Computing Network';
    button.style.padding = '8px 15px';
    button.style.backgroundColor = '#fff';
    button.style.border = '2px solid rgba(0,0,0,0.2)';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';

    // 创建模态窗口
    this._createModalWindow();

    // 防止点击事件冒泡到地图
    L.DomEvent.disableClickPropagation(button);

    // 添加点击事件处理
    const self = this;
    L.DomEvent.on(button, 'click', function () {
      // 显示模态窗口
      self._showModal();
    });

    return button;
  },

  _createModalWindow: function () {
    // 创建模态窗口容器
    const modal = document.createElement('div');
    modal.className = 'network-modal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.6)';

    // 创建模态内容
    const modalContent = document.createElement('div');
    modalContent.className = 'network-modal-content';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.margin = '10% auto';
    modalContent.style.padding = '20px';
    modalContent.style.width = '70%';
    modalContent.style.maxWidth = '800px';
    modalContent.style.borderRadius = '5px';
    modalContent.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';

    // 创建关闭按钮
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.color = '#888';
    closeBtn.style.float = 'right';
    closeBtn.style.fontSize = '28px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.cursor = 'pointer';

    // 关闭按钮点击事件
    closeBtn.onclick = function () {
      modal.style.display = 'none';
    };

    // 创建标题
    const title = document.createElement('h2');
    title.textContent = 'Computing Network';
    title.style.marginTop = '10px';

    // 创建图片容器
    const imageContainer = document.createElement('div');
    imageContainer.className = 'network-image-container';
    imageContainer.style.textAlign = 'center';
    imageContainer.style.margin = '20px 0';

    // 图片暂未提供，添加占位信息
    const placeholderText = document.createElement('p');
    placeholderText.textContent = '网络拓扑图将在此显示';
    placeholderText.style.padding = '80px 0';
    placeholderText.style.backgroundColor = '#f5f5f5';
    placeholderText.style.border = '1px dashed #ccc';
    placeholderText.style.borderRadius = '4px';

    // 组装模态窗口
    imageContainer.appendChild(placeholderText);
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(imageContainer);
    modal.appendChild(modalContent);

    // 当用户点击模态窗口外部时关闭
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = 'none';
      }
    };

    // 将模态窗口添加到页面
    document.body.appendChild(modal);

    // 保存模态窗口引用
    this._modal = modal;
  },

  _showModal: function () {
    if (this._modal) {
      this._modal.style.display = 'block';
    }
  },

  onRemove: function (map) {
    // 如果需要，处理按钮移除逻辑
    if (this._modal && this._modal.parentNode) {
      this._modal.parentNode.removeChild(this._modal);
    }
  }
});

// 创建按钮实例并添加到地图的左下角
new L.Control.ComputingNetwork({ position: 'bottomleft' }).addTo(map);

// 更新摄像头视频显示的函数
function updateCameraFeed(cameraId) {
  console.log(`Switching to camera: ${cameraId}`);
  // 调用camera.js中定义的全局函数来切换摄像头
  if (window.switchCamera) {
    window.switchCamera(cameraId);
  } else {
    console.error('switchCamera函数未定义，请确保camera.js已正确加载');
  }
}

// 添加对曲线功能的引用
// 注意：确保在HTML中已经引入了curves.js文件
// 如果curves.js的函数可用，则创建曲线
document.addEventListener('DOMContentLoaded', () => {
  // 延迟执行以确保curves.js已加载
  setTimeout(() => {
    if (window.mapCurves) {
      // 启用曲线绘制
      window.mapCurves.createCameraToEdgeServerCurves(map, cameras, edgeServer);
      window.mapCurves.createBaseStationToEdgeServerCurves(map, baseStations, edgeServer);
    } else {
      console.error('曲线功能未加载，请确保curves.js已正确引入');
    }
  }, 1000); // 增加延迟时间确保加载完成
});

// 删除手动刷新地图按钮
// document.addEventListener('DOMContentLoaded', () => {
//   const mapContainer = document.getElementById('map');
//   const refreshMapButton = document.createElement('button');
//   refreshMapButton.textContent = '手动刷新地图';
//   refreshMapButton.style.cssText = `
//     position: absolute;
//     z-index: 1000;
//     top: 10px;
//     right: 10px;
//     padding: 5px 10px;
//     background-color: white;
//     border: 1px solid #ccc;
//     border-radius: 4px;
//     font-size: 12px;
//   `;
//   refreshMapButton.onclick = function() {
//     // 强制地图重绘但控制频率
//     if(!this.disabled) {
//       this.disabled = true;
//       map.invalidateSize();
//       setTimeout(() => { this.disabled = false; }, 2000);
//     }
//   };
//   mapContainer.appendChild(refreshMapButton);
// });

// 添加CSS样式以美化摄像头、基站和边缘服务器标签
const labelStyle = document.createElement('style');
labelStyle.textContent = `
  .camera-label, .station-label, .edge-server-label {
    background: transparent;
    border: none;
    box-shadow: none;
  }
  .camera-label div, .station-label div, .edge-server-label div {
    color: #000000;
    font-weight: bold;
    text-shadow: 1px 1px 1px white, -1px -1px 1px white, 1px -1px 1px white, -1px 1px 1px white;
    font-size: 12px;
    white-space: nowrap;
    text-align: center;
  }
  .station-label div {
    /* color: #e67e22; */ /* 橙色，与基站图标颜色相匹配 */
  }
  .edge-server-label div {
    /* color: #3498db; */ /* 蓝色，与边缘服务器图标颜色相匹配 */
    font-size: 14px; /* 稍大一点的字体 */
  }
`;
document.head.appendChild(labelStyle);

// 删除旧的独立的摄像头标签样式
const oldCameraLabelStyle = document.getElementById('camera-label-style');
if (oldCameraLabelStyle) {
  oldCameraLabelStyle.remove();
} 