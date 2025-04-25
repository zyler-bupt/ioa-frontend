// 防止自动刷新脚本
(function () {
  console.log("防止自动刷新脚本已加载");

  // 保存原始的计时器函数
  const originalSetTimeout = window.setTimeout;
  const originalSetInterval = window.setInterval;
  const originalClearTimeout = window.clearTimeout;
  const originalClearInterval = window.clearInterval;
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  // 跟踪所有定时器
  const allTimers = {
    timeouts: new Map(),
    intervals: new Map()
  };

  // 白名单函数名列表
  const whitelistedFunctions = [
    'updateLoadData',
    'requestAnimationFrame',
    '_updateOpacity',
    'GridLayer',
    'TileLayer',
    'Util.js',
    'DomUtil',
    '_tileReady',
    'DomEvent',
    '_tileOnLoad',
    'camera.js'
  ];

  // 检查调用堆栈是否包含白名单函数
  function isWhitelisted(stack) {
    if (!stack) return false;
    return whitelistedFunctions.some(funcName => stack.includes(funcName));
  }

  // 劫持setTimeout
  window.setTimeout = function (callback, delay, ...args) {
    const stack = new Error().stack;
    const isAllowed = isWhitelisted(stack);

    if (!isAllowed) {
      console.log(`检测到setTimeout调用，延迟: ${delay}ms`);
    }

    // 如果延迟接近10秒(9000-11000ms)，打印堆栈并阻止执行
    if (delay >= 9000 && delay <= 11000 && !isAllowed) {
      console.warn('检测到可疑的10秒定时器!');
      console.trace('计时器堆栈:');
      return -1; // 返回无效的计时器ID
    }

    // 创建新的包装回调
    const wrappedCallback = function () {
      if (!isAllowed) {
        console.log(`执行延迟${delay}ms的计时器回调`);
      }
      allTimers.timeouts.delete(timerId);
      callback.apply(this, args);
    };

    // 调用原始setTimeout
    const timerId = originalSetTimeout(wrappedCallback, delay);
    if (!isAllowed) {
      allTimers.timeouts.set(timerId, {
        callback: wrappedCallback,
        delay,
        stack
      });
    }

    return timerId;
  };

  // 劫持setInterval
  window.setInterval = function (callback, delay, ...args) {
    const stack = new Error().stack;
    const isAllowed = isWhitelisted(stack);

    if (!isAllowed) {
      console.log(`检测到setInterval调用，延迟: ${delay}ms`);
    }

    // 如果延迟接近10秒(9000-11000ms)，打印堆栈并阻止执行
    if (delay >= 9000 && delay <= 11000 && !isAllowed) {
      console.warn('检测到可疑的10秒周期定时器!');
      console.trace('计时器堆栈:');
      return -1; // 返回无效的计时器ID
    }

    // 创建新的包装回调
    const wrappedCallback = function () {
      if (!isAllowed) {
        console.log(`执行周期${delay}ms的计时器回调`);
      }
      callback.apply(this, args);
    };

    // 调用原始setInterval
    const timerId = originalSetInterval(wrappedCallback, delay);
    if (!isAllowed) {
      allTimers.intervals.set(timerId, {
        callback: wrappedCallback,
        delay,
        stack
      });
    }

    return timerId;
  };

  // 劫持requestAnimationFrame
  window.requestAnimationFrame = function (callback) {
    // requestAnimationFrame是UI更新的关键，不进行拦截，直接传递
    return originalRequestAnimationFrame(callback);
  };

  // 劫持clearTimeout
  window.clearTimeout = function (id) {
    allTimers.timeouts.delete(id);
    return originalClearTimeout(id);
  };

  // 劫持clearInterval
  window.clearInterval = function (id) {
    allTimers.intervals.delete(id);
    return originalClearInterval(id);
  };

  // 调试函数 - 列出所有活动的计时器
  window.listAllTimers = function () {
    console.log('===== 活动的超时计时器 =====');
    allTimers.timeouts.forEach((info, id) => {
      console.log(`ID: ${id}, 延迟: ${info.delay}ms`);
      console.log(`堆栈: ${info.stack}`);
    });

    console.log('===== 活动的周期计时器 =====');
    allTimers.intervals.forEach((info, id) => {
      console.log(`ID: ${id}, 延迟: ${info.delay}ms`);
      console.log(`堆栈: ${info.stack}`);
    });
  };

  // 自动防刷新
  const checkDocument = function () {
    console.log("检查页面刷新行为");
    // 禁用meta refresh
    const metaTags = document.getElementsByTagName('meta');
    for (let i = 0; i < metaTags.length; i++) {
      const meta = metaTags[i];
      if (meta.httpEquiv && meta.httpEquiv.toLowerCase() === 'refresh') {
        console.warn("检测到meta refresh标签，正在禁用");
        meta.content = '';
        meta.httpEquiv = '';
      }
    }

    // 监视location修改
    const originalAssign = window.location.assign;
    window.location.assign = function (url) {
      console.warn(`阻止页面跳转到: ${url}`);
      return false;
    };

    const originalReplace = window.location.replace;
    window.location.replace = function (url) {
      console.warn(`阻止页面替换到: ${url}`);
      return false;
    };

    const originalReload = window.location.reload;
    window.location.reload = function () {
      console.warn(`阻止页面刷新`);
      return false;
    };
  };

  // 执行一次性的初始化检查
  document.addEventListener('DOMContentLoaded', checkDocument);

  // 10秒后列出所有计时器
  originalSetTimeout(function () {
    console.warn("10秒已过，正在检查可疑计时器:");
    window.listAllTimers();
  }, 10000);
})(); 