// input: 依赖 Three.js 与 OrbitControls，接收微知识点节点与依赖边数据
// output: 1:1 复刻 withmarble.com 倒圆锥漏斗 3D 几何结构（Height is Age）、同心环选中点与象牙金发光先修丝线
// pos: 核心 3D 图形可视化引擎，驱动全景 3D 交互
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

class TaxonomyGraph3DEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.options = Object.assign({
      onNodeSelect: null,
      onNodeHover: null
    }, options);

    this.nodes = [];
    this.edges = [];
    this.nodeMap = new Map();
    this.adjacencyIn = new Map();  // targetId -> set of prerequisiteIds
    this.adjacencyOut = new Map(); // sourceId -> set of unlockIds

    this.selectedNode = null;
    this.hoveredNode = null;
    this.ancestorIds = new Set();
    this.descendantIds = new Set();
    this.disabledSubjects = new Set();

    this.autoRotate = true;
    this.isTransitioningCamera = false;

    // 学科主题颜色 (对标 withmarble 截图原生配色)
    this.subjectColorsHex = {
      'Mathematics': 0x4a88e8, // 纯正科技蓝
      'Science': 0x38bdf8,     // 浅青蓝
      'English': 0xfef08a,     // 米白 / 淡黄
      'History': 0xf472b6,     // 柔粉色
      'Personal & Social Development': 0xef4444, // 亮红橙
      'Life Skills': 0xa3e635, // 黄绿色
      'Computing': 0x818cf8,   // 紫蓝色
      'Learning to Learn': 0xa855f7, // 紫色
      '数与代数': 0xfacc15,     // 金黄 (CN Math)
      '图形与几何': 0x22d3ee,   // 青色 (CN Math)
      '统计与概率': 0x4ade80,   // 翠绿 (CN Math)
      '综合与实践': 0xe879f9,   // 瑰粉 (CN Math)
      'default': 0x94a3b8
    };

    this.initScene();
    this.initEvents();
    this.animate();
  }

  initScene() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    // 深空黑色雾化
    this.scene.fog = new THREE.FogExp2(0x06080d, 0.00075);

    // 摄影机微俯角对准漏斗中心，让漏斗居中偏右（留出左侧 Hero 文字区）
    this.camera = new THREE.PerspectiveCamera(46, width / height, 1, 5000);
    this.camera.position.set(160, 260, 780);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x06080d, 1);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.8;
    this.controls.maxDistance = 2400;
    this.controls.minDistance = 80;
    this.controls.target.set(80, 40, 0); // 焦点微偏右，完美呈现中间偏右的漏斗图
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 0.45; // 慢速优雅巡航

    // 环境光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    // 星尘层与分组
    this.createStarfield();

    this.nodeGroup = new THREE.Group();
    this.edgeGroup = new THREE.Group();
    this.highlightGroup = new THREE.Group();
    this.scene.add(this.nodeGroup);
    this.scene.add(this.edgeGroup);
    this.scene.add(this.highlightGroup);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 12;
    this.mouse = new THREE.Vector2(-999, -999);
  }

  createStarfield() {
    const count = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4500;

      const c = Math.random() * 0.25 + 0.15;
      colors[i * 3] = c * 0.6;
      colors[i * 3 + 1] = c * 0.8;
      colors[i * 3 + 2] = c;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.35
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  getSubjectColor(subject) {
    if (!subject) return this.subjectColorsHex.default;
    for (const key of Object.keys(this.subjectColorsHex)) {
      if (subject.toLowerCase().includes(key.toLowerCase())) {
        return this.subjectColorsHex[key];
      }
    }
    return this.subjectColorsHex.default;
  }

  setData(topics, dependencies) {
    this.clearGraph();

    this.nodes = [];
    this.edges = [];
    this.nodeMap.clear();
    this.adjacencyIn.clear();
    this.adjacencyOut.clear();
    this.selectedNode = null;
    this.ancestorIds.clear();
    this.descendantIds.clear();

    const subjectList = ['Mathematics', 'Science', 'English', 'History', 'Personal & Social Development', 'Life Skills', 'Computing', 'Learning to Learn', '数与代数', '图形与几何', '统计与概率', '综合与实践'];
    const subjectAngles = new Map();
    subjectList.forEach((s, idx) => {
      subjectAngles.set(s, (idx / subjectList.length) * Math.PI * 2);
    });

    // 核心几何：构造倒圆锥漏斗 (Inverted Funnel / Cone)
    // 底部（年龄约 4 岁）：Y = -220，漏斗半径 R = 35（紧凑聚合）
    // 顶部（年龄 16 岁）：Y = 260，漏斗半径 R = 360（广阔铺开）
    const yMin = -240;
    const yMax = 280;
    const rMin = 28;
    const rMax = 370;

    topics.forEach((t, i) => {
      const ageStart = t.ageRangeStart ?? 5;
      const ageEnd = t.ageRangeEnd ?? 16;
      const avgAge = (ageStart + ageEnd) / 2;

      // 归一化年龄 (0.0 ~ 1.0)
      const ageNorm = Math.min(Math.max((avgAge - 4) / 12, 0), 1);

      // Y 轴线性映射
      const y = yMin + ageNorm * (yMax - yMin) + ((i % 5) - 2) * 5;

      // 倒圆锥截面半径 (漏斗膨胀曲线)
      const funnelRadius = rMin + Math.pow(ageNorm, 1.25) * (rMax - rMin);

      // 学科角度
      const subject = t.subject || t.domain || 'Mathematics';
      let baseAngle = 0;
      for (const [key, angle] of subjectAngles.entries()) {
        if (subject.includes(key)) {
          baseAngle = angle;
          break;
        }
      }

      // 截面内微离散分布
      const hash1 = ((i * 1664525 + 1013904223) >>> 0) / 4294967296;
      const hash2 = (((i + 13) * 1664525 + 1013904223) >>> 0) / 4294967296;

      const angle = baseAngle + (hash1 - 0.5) * 0.95;
      const rad = funnelRadius * (0.45 + hash2 * 0.55);

      const x = Math.cos(angle) * rad;
      const z = Math.sin(angle) * rad;

      const colorHex = this.getSubjectColor(subject);
      const color = new THREE.Color(colorHex);

      const node = {
        id: t.id,
        name: t.name || t.id,
        subject: subject,
        domain: t.domain || '',
        ageRangeStart: ageStart,
        ageRangeEnd: ageEnd,
        type: t.type || 'CONCEPTUAL',
        centrality: t.centrality || 0.1,
        raw: t,
        x, y, z,
        colorHex,
        color,
        index: i,
        visible: true
      };

      this.nodes.push(node);
      this.nodeMap.set(node.id, node);
      this.adjacencyIn.set(node.id, new Set());
      this.adjacencyOut.set(node.id, new Set());
    });

    dependencies.forEach((d) => {
      const target = this.nodeMap.get(d.topicId);
      const source = this.nodeMap.get(d.prerequisiteId);
      if (source && target) {
        this.edges.push({ source, target, strength: d.strength || 'hard', reason: d.reason || '' });
        this.adjacencyOut.get(source.id).add(target.id);
        this.adjacencyIn.get(target.id).add(source.id);
      }
    });

    this.build3DNodes();
    this.build3DEdges();
  }

  build3DNodes() {
    const count = this.nodes.length;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const n = this.nodes[i];
      positions[i * 3] = n.x;
      positions[i * 3 + 1] = n.y;
      positions[i * 3 + 2] = n.z;

      colors[i * 3] = n.color.r;
      colors[i * 3 + 1] = n.color.g;
      colors[i * 3 + 2] = n.color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 高质感点光晕贴图
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 13,
      vertexColors: true,
      map: texture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.pointsMesh = new THREE.Points(geometry, material);
    this.nodeGroup.add(this.pointsMesh);
  }

  build3DEdges() {
    const edgeCount = this.edges.length;
    const positions = new Float32Array(edgeCount * 6);
    const colors = new Float32Array(edgeCount * 6);

    for (let i = 0; i < edgeCount; i++) {
      const e = this.edges[i];
      const i6 = i * 6;

      positions[i6] = e.source.x;
      positions[i6 + 1] = e.source.y;
      positions[i6 + 2] = e.source.z;

      positions[i6 + 3] = e.target.x;
      positions[i6 + 4] = e.target.y;
      positions[i6 + 5] = e.target.z;

      // 默认背景丝线：极细深海蓝暗光
      colors[i6] = 0.12;
      colors[i6 + 1] = 0.18;
      colors[i6 + 2] = 0.28;

      colors[i6 + 3] = 0.12;
      colors[i6 + 4] = 0.18;
      colors[i6 + 5] = 0.28;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.edgesMesh = new THREE.LineSegments(geometry, material);
    this.edgeGroup.add(this.edgesMesh);
  }

  clearGraph() {
    while (this.nodeGroup.children.length > 0) {
      const obj = this.nodeGroup.children.pop();
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
    while (this.edgeGroup.children.length > 0) {
      const obj = this.edgeGroup.children.pop();
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
    while (this.highlightGroup.children.length > 0) {
      const obj = this.highlightGroup.children.pop();
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  }

  // 点击选择节点：1:1 对齐 withmarble 高亮先修象牙金发光丝线与同心圆环
  selectNode(node) {
    this.selectedNode = node;
    this.ancestorIds.clear();
    this.descendantIds.clear();

    while (this.highlightGroup.children.length > 0) {
      const obj = this.highlightGroup.children.pop();
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }

    if (!node) {
      this.updateNodeColors(null);
      if (this.edgesMesh) this.edgesMesh.material.opacity = 0.16;
      if (this.options.onNodeSelect) this.options.onNodeSelect(null);
      return;
    }

    // 1. 递归向下追溯所有先修链路（Ancestors）
    const queueUp = [node.id];
    const visitedUp = new Set([node.id]);
    const ancestorEdges = [];
    while (queueUp.length > 0) {
      const currId = queueUp.shift();
      const prereqs = this.adjacencyIn.get(currId);
      if (prereqs) {
        prereqs.forEach((prereqId) => {
          ancestorEdges.push({ sourceId: prereqId, targetId: currId });
          if (!visitedUp.has(prereqId)) {
            visitedUp.add(prereqId);
            this.ancestorIds.add(prereqId);
            queueUp.push(prereqId);
          }
        });
      }
    }

    // 2. 递归查找后置解锁（Descendants）
    const queueDown = [node.id];
    const visitedDown = new Set([node.id]);
    const descendantEdges = [];
    while (queueDown.length > 0) {
      const currId = queueDown.shift();
      const unlocks = this.adjacencyOut.get(currId);
      if (unlocks) {
        unlocks.forEach((unlockId) => {
          descendantEdges.push({ sourceId: currId, targetId: unlockId });
          if (!visitedDown.has(unlockId)) {
            visitedDown.add(unlockId);
            this.descendantIds.add(unlockId);
            queueDown.push(unlockId);
          }
        });
      }
    }

    // 3. 颜色更新：压暗非相关节点，高亮核心与先修
    this.updateNodeColors(node);
    if (this.edgesMesh) {
      this.edgesMesh.material.opacity = 0.04;
    }

    // 4. 生成 1:1 对标的光效（同心环 + 象牙金发光先修连线）
    this.createMarbleHighlight(node, ancestorEdges, descendantEdges);

    // 5. 平滑过渡摄影机视角
    this.focusCameraOn(node);

    if (this.options.onNodeSelect) {
      this.options.onNodeSelect(node, {
        ancestorsCount: this.ancestorIds.size,
        descendantsCount: this.descendantIds.size
      });
    }
  }

  updateNodeColors(selectedNode) {
    if (!this.pointsMesh) return;
    const colors = this.pointsMesh.geometry.attributes.color.array;
    const isTracing = selectedNode !== null;

    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const i3 = i * 3;

      if (!isTracing) {
        colors[i3] = n.color.r;
        colors[i3 + 1] = n.color.g;
        colors[i3 + 2] = n.color.b;
      } else {
        const isSelected = n.id === selectedNode.id;
        const isAncestor = this.ancestorIds.has(n.id);
        const isDescendant = this.descendantIds.has(n.id);

        if (isSelected) {
          // 选中节点纯白亮光
          colors[i3] = 1.0;
          colors[i3 + 1] = 1.0;
          colors[i3 + 2] = 1.0;
        } else if (isAncestor) {
          // 先修节点：象牙金/亮白发光
          colors[i3] = 1.0;
          colors[i3 + 1] = 0.95;
          colors[i3 + 2] = 0.8;
        } else if (isDescendant) {
          // 解锁后置：淡蓝紫光
          colors[i3] = 0.6;
          colors[i3 + 1] = 0.75;
          colors[i3 + 2] = 1.0;
        } else {
          // 其余全部暗化为深海背景蓝微粒
          colors[i3] = 0.06;
          colors[i3 + 1] = 0.09;
          colors[i3 + 2] = 0.14;
        }
      }
    }
    this.pointsMesh.geometry.attributes.color.needsUpdate = true;
  }

  createMarbleHighlight(centerNode, ancestorEdges, descendantEdges) {
    // 1. 选中微知识点的同心白圈（对标 withmarble 截图：同心大圆点）
    const ringGeo = new THREE.RingGeometry(8, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.position.set(centerNode.x, centerNode.y, centerNode.z);
    this.selectionRing.lookAt(this.camera.position);
    this.highlightGroup.add(this.selectionRing);

    // 2. 先修发光丝线（象牙金 / 亮黄白色发光丝线，向上支撑）
    if (ancestorEdges.length > 0) {
      const pos = [];
      ancestorEdges.forEach(e => {
        const s = this.nodeMap.get(e.sourceId);
        const t = this.nodeMap.get(e.targetId);
        if (s && t) {
          pos.push(s.x, s.y, s.z, t.x, t.y, t.z);
        }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xfffae6, // 象牙金发光
        linewidth: 2.2,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending
      });
      this.highlightGroup.add(new THREE.LineSegments(geo, mat));
    }

    // 3. 后置解锁丝线（浅红粉光）
    if (descendantEdges.length > 0) {
      const pos = [];
      descendantEdges.forEach(e => {
        const s = this.nodeMap.get(e.sourceId);
        const t = this.nodeMap.get(e.targetId);
        if (s && t) {
          pos.push(s.x, s.y, s.z, t.x, t.y, t.z);
        }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xf472b6,
        linewidth: 1.8,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      });
      this.highlightGroup.add(new THREE.LineSegments(geo, mat));
    }
  }

  focusCameraOn(node) {
    const startCamPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();

    // 目标视角微聚焦
    const targetLookAt = new THREE.Vector3(node.x, node.y, node.z);
    const offsetDir = new THREE.Vector3(node.x, node.y, node.z).normalize();
    if (offsetDir.lengthSq() === 0) offsetDir.set(0, 0, 1);
    const endCamPos = targetLookAt.clone().add(offsetDir.multiplyScalar(220)).add(new THREE.Vector3(60, 40, 150));

    let progress = 0;
    this.isTransitioningCamera = true;

    const animateTransition = () => {
      progress += 0.045;
      const t = Math.min(progress, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(startCamPos, endCamPos, ease);
      this.controls.target.lerpVectors(startTarget, targetLookAt, ease);

      if (t < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        this.isTransitioningCamera = false;
      }
    };
    animateTransition();
  }

  focusNode(nodeId) {
    const node = this.nodeMap.get(nodeId);
    if (node) this.selectNode(node);
  }

  resetView() {
    this.selectNode(null);
    const startCam = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endCam = new THREE.Vector3(160, 260, 780);
    const endTarget = new THREE.Vector3(80, 40, 0);

    let progress = 0;
    const animateReset = () => {
      progress += 0.05;
      const t = Math.min(progress, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(startCam, endCam, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      if (t < 1) requestAnimationFrame(animateReset);
    };
    animateReset();
  }

  initEvents() {
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });

    this.container.addEventListener('mousemove', (e) => {
      const cRect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - cRect.left) / this.container.clientWidth) * 2 - 1;
      this.mouse.y = -((e.clientY - cRect.top) / this.container.clientHeight) * 2 + 1;
      this.checkRaycast();
    });

    this.container.addEventListener('click', (e) => {
      const cRect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - cRect.left) / this.container.clientWidth) * 2 - 1;
      this.mouse.y = -((e.clientY - cRect.top) / this.container.clientHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      if (this.pointsMesh) {
        const intersects = this.raycaster.intersectObject(this.pointsMesh);
        if (intersects.length > 0) {
          const idx = intersects[0].index;
          const node = this.nodes[idx];
          this.selectNode(node);
        }
      }
    });
  }

  checkRaycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (!this.pointsMesh) return;

    const intersects = this.raycaster.intersectObject(this.pointsMesh);
    if (intersects.length > 0) {
      const idx = intersects[0].index;
      const node = this.nodes[idx];
      if (node !== this.hoveredNode) {
        this.hoveredNode = node;
        this.container.style.cursor = 'pointer';
        if (this.options.onNodeHover) this.options.onNodeHover(node);
      }
    } else {
      if (this.hoveredNode !== null) {
        this.hoveredNode = null;
        this.container.style.cursor = 'default';
        if (this.options.onNodeHover) this.options.onNodeHover(null);
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();

    if (this.selectionRing) {
      this.selectionRing.lookAt(this.camera.position);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.TaxonomyGraph3DEngine = TaxonomyGraph3DEngine;
