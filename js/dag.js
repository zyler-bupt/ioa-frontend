// DAG图生成和管理
class DAGGenerator {
  constructor() {
    this.network = null;
    this.nodes = new vis.DataSet();
    this.edges = new vis.DataSet();
  }

  // 从关联矩阵生成DAG图
  generateFromMatrix(matrix) {
    this.nodes.clear();
    this.edges.clear();

    // 添加节点
    matrix.forEach((_, index) => {
      this.nodes.add({
        id: index,
        label: '', // 空标签
        shape: 'dot',
        size: 10,
        color: {
          background: '#4CAF50',
          border: '#388E3C'
        }
      });
    });

    // 添加边
    matrix.forEach((row, i) => {
      row.forEach((value, j) => {
        if (value === 1) {
          this.edges.add({
            from: i,
            to: j,
            width: 2,
            color: {
              color: '#2196F3',
              opacity: 0.8
            },
            smooth: {
              type: 'straightCross'
            }
          });
        }
      });
    });

    // 创建网络
    const container = document.getElementById('dag-container');
    const data = {
      nodes: this.nodes,
      edges: this.edges
    };
    const options = {
      layout: {
        hierarchical: {
          direction: 'UD',
          sortMethod: 'directed',
          levelSeparation: 50,
          nodeSpacing: 50
        }
      },
      physics: false,
      interaction: {
        dragNodes: false,
        zoomView: false,
        hover: false,
        selectable: false
      }
    };

    this.network = new vis.Network(container, data, options);
  }
}

// 示例数据
const exampleMatrix = [
  [0, 1, 1, 0, 0],
  [0, 0, 0, 1, 0],
  [0, 0, 0, 1, 1],
  [0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0]
];

// 全局DAG生成器实例
const dagGenerator = new DAGGenerator();

// 更新DAG图容器的样式
function updateDAGStyle() {
  const container = document.getElementById('dag-container');
  if (container) {
    // 只有在容器未初始化时才设置样式，避免重复操作DOM
    if (!container.hasAttribute('data-styled')) {
      container.style.width = '100%';
      container.style.height = '150px';
      container.style.background = '#ffffff';
      container.style.border = '1px solid #ddd';
      container.style.borderRadius = '5px';
      container.setAttribute('data-styled', 'true');
    }
  }
}

// 生成随机DAG矩阵
function generateRandomDAGMatrix(size) {
  const matrix = Array(size).fill().map(() => Array(size).fill(0));

  // 确保是有向无环图，只在下三角区域生成边
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < i; j++) {
      // 50%的概率生成边
      if (Math.random() < 0.5) {
        matrix[j][i] = 1;
      }
    }
  }

  return matrix;
}

// 导出生成DAG的函数
function generateDAG(matrix = exampleMatrix) {
  const container = document.getElementById('dag-container');

  // 如果容器不存在，直接返回
  if (!container) {
    console.error('DAG container element not found!');
    return;
  }

  // 标记开始更新DAG
  document.body.classList.add('updating-dag');

  // 清空已有内容，确保重新生成
  container.innerHTML = '';

  try {
    // 生成DAG图，但禁用动画和物理效果
    dagGenerator.generateFromMatrix(matrix);
    console.log('DAG graph generated successfully with matrix:', matrix);
  } catch (error) {
    console.error('Error generating DAG:', error);
    container.innerHTML = '<div style="color:red;text-align:center;">Error generating DAG</div>';
  }

  // 更新完成后移除标记
  setTimeout(() => {
    document.body.classList.remove('updating-dag');
  }, 300);
}

// 初始化 - 不自动生成，由聊天消息触发
document.addEventListener('DOMContentLoaded', () => {
  console.log('DAG initialization started, waiting for chat message to trigger generation');
}); 