// input: 接收图节点与边数组，依托 HTML5 Canvas 2D 绘图环境
// output: 输出高性能力导向图谱渲染、平移缩放视口控制与先修链路高亮拓扑计算
// pos: 核心图形渲染引擎层，驱动前端可视化的物理计算与图形绘制
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

class TaxonomyGraphEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = Object.assign({
      onNodeSelect: null,
      onNodeHover: null
    }, options);

    this.nodes = [];
    this.edges = [];
    this.nodeMap = new Map();
    this.adjacencyIn = new Map();  // targetId -> set of prerequisiteIds
    this.adjacencyOut = new Map(); // sourceId -> set of dependentIds

    // 变换矩阵参数
    this.transform = { x: 0, y: 0, scale: 0.65 };
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.hoveredNode = null;
    this.selectedNode = null;

    // 追踪高亮集合
    this.ancestorIds = new Set();
    this.descendantIds = new Set();
    this.highlightEdgeSet = new Set();

    // 物理模拟参数
    this.alpha = 1.0;
    this.alphaMin = 0.005;
    this.alphaDecay = 0.025;
    this.isRunning = false;

    // 学科主题配色
    this.subjectColors = {
      'Mathematics': '#38bdf8',
      'Science': '#c084fc',
      'English': '#f59e0b',
      'History': '#34d399',
      'Computing': '#60a5fa',
      'Personal & Social Development': '#fb7185',
      'Life Skills': '#a3e635',
      'Learning to Learn': '#f472b6',
      '数与代数': '#facc15',
      '图形与几何': '#22d3ee',
      '统计与概率': '#4ade80',
      '综合与实践': '#e879f9',
      'default': '#94a3b8'
    };

    this.initEvents();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
    this.requestRender();
  }

  setData(topics, dependencies) {
    this.nodes = [];
    this.edges = [];
    this.nodeMap.clear();
    this.adjacencyIn.clear();
    this.adjacencyOut.clear();
    this.selectedNode = null;
    this.ancestorIds.clear();
    this.descendantIds.clear();
    this.highlightEdgeSet.clear();

    const count = topics.length;
    // 使用螺旋分布初始化节点散布，避免初始重叠与剧烈震荡
    topics.forEach((t, i) => {
      const angle = i * 0.35;
      const radius = 35 * Math.sqrt(i) + 40;
      const node = {
        id: t.id,
        name: t.name || t.id,
        subject: t.subject || t.domain || 'default',
        domain: t.domain || '',
        ageRangeStart: t.ageRangeStart ?? 5,
        ageRangeEnd: t.ageRangeEnd ?? 16,
        type: t.type || 'CONCEPTUAL',
        centrality: t.centrality || 0.1,
        raw: t,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 5 + Math.min(10, Math.sqrt(t.centrality ? t.centrality * 100 : 3)),
        color: this.getSubjectColor(t.subject || t.domain),
        visible: true
      };
      this.nodes.push(node);
      this.nodeMap.set(node.id, node);
      this.adjacencyIn.set(node.id, new Set());
      this.adjacencyOut.set(node.id, new Set());
    });

    dependencies.forEach((d) => {
      // 在当前仓库中：topicId 依赖 prerequisiteId
      const target = this.nodeMap.get(d.topicId);
      const source = this.nodeMap.get(d.prerequisiteId);
      if (source && target) {
        const edge = {
          source,
          target,
          strength: d.strength || 'hard',
          reason: d.reason || '',
          key: `${source.id}->${target.id}`
        };
        this.edges.push(edge);
        this.adjacencyOut.get(source.id).add(target.id);
        this.adjacencyIn.get(target.id).add(source.id);
      }
    });

    // 预热模拟计算 60 轮，使拓扑结构快速收敛
    this.alpha = 1.0;
    for (let step = 0; step < 60; step++) {
      this.stepSimulation(0.35);
    }

    this.fitView();
    this.startSimulation();
  }

  getSubjectColor(subject) {
    if (!subject) return this.subjectColors.default;
    for (const key of Object.keys(this.subjectColors)) {
      if (subject.toLowerCase().includes(key.toLowerCase())) {
        return this.subjectColors[key];
      }
    }
    return this.subjectColors.default;
  }

  // 物理模拟迭代步骤
  stepSimulation(speed = 1.0) {
    const kRepel = 2400;
    const kSpring = 0.045;
    const centerStrength = 0.015;
    const damping = 0.88;

    // 1. 简易网格/邻近排斥力（针对大规模节点采样）
    const n = this.nodes.length;
    for (let i = 0; i < n; i++) {
      const u = this.nodes[i];
      if (!u.visible) continue;

      // 采样排斥计算，保证 2000+ 节点下的 60FPS 帧率
      const sampleStep = n > 800 ? 3 : 1;
      for (let j = i + 1; j < n; j += sampleStep) {
        const v = this.nodes[j];
        if (!v.visible) continue;

        let dx = v.x - u.x;
        let dy = v.y - u.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = u.radius + v.radius + 15;

        if (dist < 420) {
          const force = (kRepel / (dist * dist)) * speed;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          u.vx -= fx;
          u.vy -= fy;
          v.vx += fx;
          v.vy += fy;
        }
      }

      // 居中引力
      u.vx -= u.x * centerStrength * speed;
      u.vy -= u.y * centerStrength * speed;
    }

    // 2. 依赖边弹簧弹力
    for (let i = 0; i < this.edges.length; i++) {
      const e = this.edges[i];
      if (!e.source.visible || !e.target.visible) continue;

      const dx = e.target.x - e.source.x;
      const dy = e.target.y - e.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = 70;
      const force = (dist - targetDist) * kSpring * speed;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      e.source.vx += fx;
      e.source.vy += fy;
      e.target.vx -= fx;
      e.target.vy -= fy;
    }

    // 3. 应用速度并衰减
    for (let i = 0; i < n; i++) {
      const u = this.nodes[i];
      u.vx *= damping;
      u.vy *= damping;
      u.x += u.vx;
      u.y += u.vy;
    }
  }

  startSimulation() {
    if (this.isRunning) return;
    this.isRunning = true;

    const tick = () => {
      if (this.alpha > this.alphaMin) {
        this.stepSimulation(this.alpha);
        this.alpha *= (1 - this.alphaDecay);
      }
      this.render();
      if (this.isRunning) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  requestRender() {
    if (!this.isRunning) {
      this.render();
    }
  }

  // 坐标转换工具函数
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.width / 2 - this.transform.x) / this.transform.scale,
      y: (sy - this.height / 2 - this.transform.y) / this.transform.scale
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.transform.scale + this.width / 2 + this.transform.x,
      y: wy * this.transform.scale + this.height / 2 + this.transform.y
    };
  }

  initEvents() {
    let lastX = 0;
    let lastY = 0;

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      this.dragStart = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        this.transform.x += dx;
        this.transform.y += dy;
        this.requestRender();
      } else {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.checkHover(mouseX, mouseY);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const moved = Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y);
      if (moved < 5) {
        // 视为点击
        const rect = this.canvas.getBoundingClientRect();
        this.handleClick(e.clientX - rect.left, e.clientY - rect.top);
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldPos = this.screenToWorld(mouseX, mouseY);
      const newScale = Math.min(Math.max(0.12, this.transform.scale * zoomFactor), 4.5);

      this.transform.scale = newScale;
      // 以鼠标光标处为中心平滑缩放
      this.transform.x = mouseX - this.width / 2 - worldPos.x * newScale;
      this.transform.y = mouseY - this.height / 2 - worldPos.y * newScale;
      this.requestRender();
    }, { passive: false });
  }

  checkHover(sx, sy) {
    const world = this.screenToWorld(sx, sy);
    let found = null;

    // 从后往前检测节点拾取
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (!node.visible) continue;
      const dx = node.x - world.x;
      const dy = node.y - world.y;
      if (dx * dx + dy * dy <= (node.radius + 4) * (node.radius + 4)) {
        found = node;
        break;
      }
    }

    if (found !== this.hoveredNode) {
      this.hoveredNode = found;
      this.canvas.style.cursor = found ? 'pointer' : (this.isDragging ? 'grabbing' : 'grab');
      this.requestRender();
      if (this.options.onNodeHover) {
        this.options.onNodeHover(found);
      }
    }
  }

  handleClick(sx, sy) {
    const world = this.screenToWorld(sx, sy);
    let clicked = null;

    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (!node.visible) continue;
      const dx = node.x - world.x;
      const dy = node.y - world.y;
      if (dx * dx + dy * dy <= (node.radius + 6) * (node.radius + 6)) {
        clicked = node;
        break;
      }
    }

    this.selectNode(clicked);
  }

  // 核心：选择节点并追踪其全部先修链路与后置解锁链路
  selectNode(node) {
    this.selectedNode = node;
    this.ancestorIds.clear();
    this.descendantIds.clear();
    this.highlightEdgeSet.clear();

    if (node) {
      // 1. 递归查找所有先修先辈（Ancestors / Prerequisites）
      const queueUp = [node.id];
      const visitedUp = new Set([node.id]);
      while (queueUp.length > 0) {
        const currId = queueUp.shift();
        const prereqs = this.adjacencyIn.get(currId);
        if (prereqs) {
          prereqs.forEach((prereqId) => {
            this.highlightEdgeSet.add(`${prereqId}->${currId}`);
            if (!visitedUp.has(prereqId)) {
              visitedUp.add(prereqId);
              this.ancestorIds.add(prereqId);
              queueUp.push(prereqId);
            }
          });
        }
      }

      // 2. 递归查找所有解锁后辈（Descendants / Unlocked by this）
      const queueDown = [node.id];
      const visitedDown = new Set([node.id]);
      while (queueDown.length > 0) {
        const currId = queueDown.shift();
        const unlocks = this.adjacencyOut.get(currId);
        if (unlocks) {
          unlocks.forEach((unlockId) => {
            this.highlightEdgeSet.add(`${currId}->${unlockId}`);
            if (!visitedDown.has(unlockId)) {
              visitedDown.add(unlockId);
              this.descendantIds.add(unlockId);
              queueDown.push(unlockId);
            }
          });
        }
      }
    }

    this.requestRender();

    if (this.options.onNodeSelect) {
      this.options.onNodeSelect(node, {
        ancestorsCount: this.ancestorIds.size,
        descendantsCount: this.descendantIds.size
      });
    }
  }

  focusNode(nodeId) {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;
    this.selectNode(node);

    // 平滑将视口居中到该节点
    this.transform.x = -node.x * this.transform.scale;
    this.transform.y = -node.y * this.transform.scale;
    this.requestRender();
  }

  fitView() {
    if (this.nodes.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of this.nodes) {
      if (!n.visible) continue;
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }

    const graphWidth = maxX - minX || 800;
    const graphHeight = maxY - minY || 600;
    const padding = 120;
    const scaleX = (this.width - padding) / graphWidth;
    const scaleY = (this.height - padding) / graphHeight;

    this.transform.scale = Math.min(Math.max(0.2, Math.min(scaleX, scaleY)), 1.2);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    this.transform.x = -centerX * this.transform.scale;
    this.transform.y = -centerY * this.transform.scale;
    this.requestRender();
  }

  render() {
    const { ctx, width, height, transform } = this;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + transform.x, height / 2 + transform.y);
    ctx.scale(transform.scale, transform.scale);

    const isTracing = this.selectedNode !== null;

    // 1. 绘制背景参考微妙网格
    if (transform.scale > 0.4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 160;
      const bound = 3000;
      ctx.beginPath();
      for (let x = -bound; x <= bound; x += gridSize) {
        ctx.moveTo(x, -bound);
        ctx.lineTo(x, bound);
      }
      for (let y = -bound; y <= bound; y += gridSize) {
        ctx.moveTo(-bound, y);
        ctx.lineTo(bound, y);
      }
      ctx.stroke();
    }

    // 2. 绘制依赖连线（Edges）
    for (let i = 0; i < this.edges.length; i++) {
      const e = this.edges[i];
      if (!e.source.visible || !e.target.visible) continue;

      const isHighlight = isTracing && this.highlightEdgeSet.has(e.key);

      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);

      if (isHighlight) {
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0; // 重置光晕
      } else {
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = isTracing ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.12)';
        ctx.stroke();
      }
    }

    // 3. 绘制节点（Nodes）
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (!node.visible) continue;

      const isSelected = this.selectedNode === node;
      const isAncestor = this.ancestorIds.has(node.id);
      const isDescendant = this.descendantIds.has(node.id);
      const isHovered = this.hoveredNode === node;
      const isRelated = isSelected || isAncestor || isDescendant;

      // 透明度控制
      let alpha = 1.0;
      if (isTracing) {
        alpha = isRelated ? 1.0 : 0.12;
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      // 绘制选中节点的外发光光环
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (isAncestor) {
        // 先修节点外发绿色光圈
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else if (isDescendant) {
        // 后置解锁节点外发紫色光圈
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      // 节点实体圆球
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#ffffff' : node.color;
      ctx.fill();

      // 4. 文字标签渲染（视口放大或高亮相关时展示）
      const shouldDrawLabel = isHovered || isSelected || isAncestor || (transform.scale > 1.2 && !isTracing);
      if (shouldDrawLabel) {
        ctx.font = isSelected ? '600 13px Plus Jakarta Sans, sans-serif' : '500 11px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = isSelected ? '#ffffff' : (isRelated ? '#e2e8f0' : '#94a3b8');
        ctx.textAlign = 'center';
        ctx.fillText(node.name, node.x, node.y + node.radius + 15);
      }

      ctx.restore();
    }

    ctx.restore();
  }
}

window.TaxonomyGraphEngine = TaxonomyGraphEngine;
