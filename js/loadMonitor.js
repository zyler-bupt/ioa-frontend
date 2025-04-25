// 初始化图表对象
let resourceChart = null;

// 创建柱状图函数
function createResourceChart() {
  const ctx = document.getElementById('resourceChart').getContext('2d');

  if (!ctx) {
    console.error('Cannot get 2D context from resourceChart canvas element');
    return null;
  }

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['BS01-CPU', 'BS01-GPU', 'BS02-CPU', 'BS02-GPU', 'BS03-CPU', 'BS03-GPU', 'ES-CPU', 'ES-GPU'],
      datasets: [
        {
          label: 'Used',
          data: [50, 50, 50, 50, 50, 50, 50, 50],
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: 'Free',
          data: [50, 50, 50, 50, 50, 50, 50, 50],
          backgroundColor: 'rgba(211, 211, 211, 0.8)',
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 10
            }
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            stepSize: 25,
            font: {
              size: 10
            },
            callback: function (value) {
              return value + '%';
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 10,
            padding: 6,
            font: {
              size: 10
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.dataset.label + ': ' + context.parsed.y + '%';
            }
          }
        }
      }
    }
  });
}

// 更新图表数据
function updateChartData(data) {
  if (!resourceChart) {
    console.error('Cannot update resource data: chart not initialized');
    return;
  }

  // 标记开始更新图表
  document.body.classList.add('updating-chart');

  // 提取所有使用数据
  const usedValues = [
    data.bs01.cpu,
    data.bs01.gpu,
    data.bs02.cpu,
    data.bs02.gpu,
    data.bs03.cpu,
    data.bs03.gpu,
    data.es.cpu,
    data.es.gpu
  ];

  // 计算空闲值（总和为100%）
  const freeValues = usedValues.map(val => 100 - val);

  // 使用requestAnimationFrame来合并多次更新
  requestAnimationFrame(() => {
    // 更新数据
    resourceChart.data.datasets[0].data = usedValues;
    resourceChart.data.datasets[1].data = freeValues;

    // 更新图表
    resourceChart.update({
      duration: 300,
      easing: 'easeOutQuad'
    });

    // 更新完成后移除标记
    setTimeout(() => {
      document.body.classList.remove('updating-chart');
    }, 350); // 略大于动画时长，确保动画完成
  });
}

// 生成随机资源使用数据
function generateResourceData() {
  return {
    bs01: {
      cpu: Math.floor(Math.random() * 60) + 20, // 20-80之间的随机数
      gpu: Math.floor(Math.random() * 70) + 15  // 15-85之间的随机数
    },
    bs02: {
      cpu: Math.floor(Math.random() * 65) + 15, // 15-80之间的随机数
      gpu: Math.floor(Math.random() * 70) + 10  // 10-80之间的随机数
    },
    bs03: {
      cpu: Math.floor(Math.random() * 60) + 20, // 20-80之间的随机数
      gpu: Math.floor(Math.random() * 65) + 15  // 15-80之间的随机数
    },
    es: {
      cpu: Math.floor(Math.random() * 75) + 15, // 15-90之间的随机数
      gpu: Math.floor(Math.random() * 80) + 10  // 10-90之间的随机数
    }
  };
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 初始化图表
  resourceChart = createResourceChart();

  // 立即更新一次数据
  updateChartData(generateResourceData());

  // 定时更新数据
  setInterval(() => {
    if (!document.body.classList.contains('updating-cameras') &&
      !document.body.classList.contains('updating-chart')) {
      updateChartData(generateResourceData());
    }
  }, 2000);
}); 