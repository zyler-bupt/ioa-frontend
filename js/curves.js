// 曲线相关功能模块 - 使用三次贝塞尔曲线
// 用于在地图上创建摄像头、基站与边缘服务器之间的连接曲线

/**
 * 创建两点之间的曲线路径 - 使用三次贝塞尔曲线
 * @param {Object} start - 起始点坐标 {lat, lng}
 * @param {Object} end - 终点坐标 {lat, lng}
 * @param {Object} map - Leaflet地图实例
 * @param {String} color - 曲线颜色
 * @param {String} tooltip - 提示文本
 * @return {Object} L.polyline实例
 */
function createCurve(start, end, map, color, tooltip) {
  // 获取两点之间的距离和方向
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 创建控制点，使线条呈现优美的弧度
  // 使用两个控制点创建三次贝塞尔曲线
  const offsetFactor = 0.4; // 控制曲率的因子
  const offset = distance * offsetFactor;

  // 计算垂直于连线的方向
  const perpX = dy;
  const perpY = -dx;

  // 单位化垂直向量
  const length = Math.sqrt(perpX * perpX + perpY * perpY);
  const normPerpX = perpX / length;
  const normPerpY = perpY / length;

  // 计算控制点的基准位置 - 在两点之间的路径上
  const midX = (start.lng + end.lng) / 2;
  const midY = (start.lat + end.lat) / 2;

  // 创建两个控制点，分别在曲线两侧
  // 第一个控制点：靠近起点但偏离直线
  const ctrl1X = start.lng + dx * 0.25 + normPerpX * (offset * 0.7);
  const ctrl1Y = start.lat + dy * 0.25 + normPerpY * (offset * 0.7);

  // 第二个控制点：靠近终点但偏离直线
  const ctrl2X = start.lng + dx * 0.75 + normPerpX * (offset * 0.5);
  const ctrl2Y = start.lat + dy * 0.75 + normPerpY * (offset * 0.5);

  const controlPoint1 = { lat: ctrl1Y, lng: ctrl1X };
  const controlPoint2 = { lat: ctrl2Y, lng: ctrl2X };

  // 生成曲线上的点 - 使用更多点以获得更平滑的曲线
  const curvePoints = [];

  // 使用三次贝塞尔曲线公式生成点
  for (let t = 0; t <= 1; t += 0.01) { // 更小的步长，更平滑的曲线
    // 三次贝塞尔曲线公式
    const lat = Math.pow(1 - t, 3) * start.lat +
      3 * Math.pow(1 - t, 2) * t * controlPoint1.lat +
      3 * (1 - t) * Math.pow(t, 2) * controlPoint2.lat +
      Math.pow(t, 3) * end.lat;

    const lng = Math.pow(1 - t, 3) * start.lng +
      3 * Math.pow(1 - t, 2) * t * controlPoint1.lng +
      3 * (1 - t) * Math.pow(t, 2) * controlPoint2.lng +
      Math.pow(t, 3) * end.lng;

    curvePoints.push([lat, lng]);
  }

  // 创建曲线并添加到地图
  const curve = L.polyline(curvePoints, {
    color: color,
    weight: 5,
    opacity: 0.7,
    smoothFactor: 1
  }).addTo(map);

  // 添加提示文本
  if (tooltip) {
    curve.bindTooltip(tooltip);
  }

  return curve;
}

/**
 * 在地图上创建摄像头到边缘服务器的连接曲线
 * @param {Object} map - Leaflet地图实例
 * @param {Array} cameras - 摄像头数组
 * @param {Object} edgeServer - 边缘服务器对象
 */
function createCameraToEdgeServerCurves(map, cameras, edgeServer) {
  // 获取所有摄像头和边缘服务器的位置
  const camera1Position = cameras.find(camera => camera.id === 'Camera1');
  const camera2Position = cameras.find(camera => camera.id === 'Camera2');
  const camera3Position = cameras.find(camera => camera.id === 'Camera3');

  // 蓝色 - 摄像头连接曲线颜色
  const cameraColor = '#3498DB';

  // 创建并添加曲线到地图，分别连接三个摄像头与边缘服务器
  if (camera1Position && edgeServer) {
    createCurve(camera1Position, edgeServer, map, cameraColor, "Camera1 ↔ Edge Server");
  }

  if (camera2Position && edgeServer) {
    createCurve(camera2Position, edgeServer, map, cameraColor, "Camera2 ↔ Edge Server");
  }

  if (camera3Position && edgeServer) {
    createCurve(camera3Position, edgeServer, map, cameraColor, "Camera3 ↔ Edge Server");
  }
}

/**
 * 在地图上创建基站到边缘服务器的连接曲线
 * @param {Object} map - Leaflet地图实例
 * @param {Array} baseStations - 基站数组
 * @param {Object} edgeServer - 边缘服务器对象
 */
function createBaseStationToEdgeServerCurves(map, baseStations, edgeServer) {
  // 获取所有基站的位置
  const bs01Position = baseStations.find(station => station.id === 'BS01');
  const bs02Position = baseStations.find(station => station.id === 'BS02');
  const bs03Position = baseStations.find(station => station.id === 'BS03');

  // 橙色 - 基站连接曲线颜色
  const bsColor = '#F39C12';

  // 创建并添加曲线到地图，分别连接三个基站与边缘服务器
  if (bs01Position && edgeServer) {
    createCurve(bs01Position, edgeServer, map, bsColor, "BS01 ↔ Edge Server");
  }

  if (bs02Position && edgeServer) {
    createCurve(bs02Position, edgeServer, map, bsColor, "BS02 ↔ Edge Server");
  }

  if (bs03Position && edgeServer) {
    createCurve(bs03Position, edgeServer, map, bsColor, "BS03 ↔ Edge Server");
  }
}

// 导出函数以便在map.js中使用
window.mapCurves = {
  createCurve,
  createCameraToEdgeServerCurves,
  createBaseStationToEdgeServerCurves
}; 