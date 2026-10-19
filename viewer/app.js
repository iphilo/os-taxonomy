// input: 依赖 viewer/graph3d.js 引擎，异步加载 data/topics.json 与 dependencies.json
// output: 1:1 驱动 withmarble.com 交互界面、左下角学科切换器与右上角浮动卡片详情
// pos: 前端应用业务逻辑与控制器层
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

(function () {
  'use strict';

  const state = {
    currentSource: 'marble', // 默认优先匹配 Marble 原版体验
    topics: [],
    dependencies: [],
    nodeMap: new Map(),
    disabledSubjects: new Set(),
    marbleDetailMap: new Map()
  };

  const container3D = document.getElementById('container-3d');
  const datasetSelect = document.getElementById('dataset-select');
  const heroCounts = document.getElementById('hero-counts');
  const subjectListContainer = document.getElementById('subject-list-container');
  const floatingInspector = document.getElementById('floating-inspector');
  const closeCardBtn = document.getElementById('close-card-btn');
  const nodeTooltip = document.getElementById('node-tooltip');
  const loadingOverlay = document.getElementById('loading-overlay');

  // 卡片内部元素
  const cardDot = document.getElementById('card-dot');
  const cardCategoryAge = document.getElementById('card-category-age');
  const cardTitle = document.getElementById('card-title');
  const cardPrompt = document.getElementById('card-prompt');
  const cardPrereqCount = document.getElementById('card-prereq-count');
  const buildsTitle = document.getElementById('builds-title');
  const buildsList = document.getElementById('builds-list');
  const unlocksTitle = document.getElementById('unlocks-title');
  const unlocksList = document.getElementById('unlocks-list');
  const evidenceSection = document.getElementById('evidence-section');
  const evidenceList = document.getElementById('evidence-list');

  // 搜索相关
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  // 初始化 3D 倒圆锥星系引擎
  const engine3D = new TaxonomyGraph3DEngine(container3D, {
    onNodeSelect: handleNodeSelect,
    onNodeHover: handleNodeHover
  });

  async function loadDataset(sourceKey) {
    if (loadingOverlay) loadingOverlay.classList.remove('fade-out');
    state.currentSource = sourceKey;

    try {
      let rawTopics = [];
      let rawDeps = [];

      // 预先缓存 marble 原生详情
      if (state.marbleDetailMap.size === 0) {
        try {
          const mRes = await fetch('/data/topics.json');
          if (mRes.ok) {
            const data = await mRes.json();
            (data.topics || []).forEach(t => state.marbleDetailMap.set(t.id, t));
          }
        } catch (e) {
          console.warn('Marble 数据预缓存失败:', e);
        }
      }

      if (sourceKey === 'marble') {
        const [tRes, dRes] = await Promise.all([
          fetch('/data/topics.json'),
          fetch('/data/dependencies.json')
        ]);
        const tData = await tRes.json();
        const dData = await dRes.json();
        rawTopics = tData.topics || [];
        rawDeps = dData.dependencies || [];
      } else if (sourceKey === 'union') {
        const [tRes, dRes] = await Promise.all([
          fetch('/data/union/topics.json'),
          fetch('/data/union/dependencies.json')
        ]);
        const tData = await tRes.json();
        const dData = await dRes.json();
        rawTopics = tData.topics || [];
        rawDeps = dData.dependencies || [];
      } else if (sourceKey === 'cn-math') {
        const [tRes, dRes] = await Promise.all([
          fetch('/sources/cn-math-taxonomy/data/topics.json'),
          fetch('/sources/cn-math-taxonomy/data/dependencies.json')
        ]);
        rawTopics = await tRes.json();
        const dData = await dRes.json();
        rawDeps = dData.dependencies || [];
      }

      state.topics = rawTopics;
      state.dependencies = rawDeps;
      state.nodeMap.clear();
      rawTopics.forEach(t => state.nodeMap.set(t.id, t));

      // 更新左侧标语数字
      if (heroCounts) {
        heroCounts.textContent = `${rawTopics.length} concepts and ${rawDeps.length} prerequisite links`;
      }

      // 渲染左下角 SUBJECTS · CLICK TO TOGGLE
      renderSubjectsList();

      // 构建 3D 倒圆锥图谱
      engine3D.setData(rawTopics, rawDeps);

      if (loadingOverlay) {
        setTimeout(() => loadingOverlay.classList.add('fade-out'), 300);
      }
    } catch (err) {
      console.error('加载数据集失败:', err);
      if (loadingOverlay) loadingOverlay.classList.add('fade-out');
    }
  }

  // 渲染左下角学科列表
  function renderSubjectsList() {
    const subjectCounts = new Map();
    state.topics.forEach(t => {
      const s = t.subject || t.domain || 'Other';
      subjectCounts.set(s, (subjectCounts.get(s) || 0) + 1);
    });

    // 优先顺序对齐 withmarble 截图
    const sortOrder = ['Mathematics', 'Science', 'English', 'History', 'Personal & Social Development', 'Life Skills', 'Computing', 'Learning to Learn', '数与代数', '图形与几何', '统计与概率', '综合与实践'];
    const sortedSubjects = Array.from(subjectCounts.keys()).sort((a, b) => {
      const ia = sortOrder.indexOf(a);
      const ib = sortOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return (subjectCounts.get(b) || 0) - (subjectCounts.get(a) || 0);
    });

    let html = '';
    sortedSubjects.forEach(s => {
      const colorHex = engine3D.getSubjectColor(s);
      const hexStr = '#' + colorHex.toString(16).padStart(6, '0');
      const count = subjectCounts.get(s);
      const isMuted = state.disabledSubjects.has(s);

      html += `
        <div class="subject-row ${isMuted ? 'muted' : ''}" data-subject="${s}">
          <div class="subject-row-left">
            <span class="subject-dot" style="background-color: ${hexStr}; box-shadow: 0 0 6px ${hexStr}88;"></span>
            <span>${s}</span>
          </div>
          <span class="subject-count">${count}</span>
        </div>
      `;
    });

    subjectListContainer.innerHTML = html;

    // 绑定学科切换
    subjectListContainer.querySelectorAll('.subject-row').forEach(row => {
      row.addEventListener('click', () => {
        const sub = row.getAttribute('data-subject');
        if (state.disabledSubjects.has(sub)) {
          state.disabledSubjects.delete(sub);
        } else {
          state.disabledSubjects.add(sub);
        }
        renderSubjectsList();
        // 过滤显示
        const visibleTopics = state.topics.filter(t => !state.disabledSubjects.has(t.subject || t.domain));
        engine3D.setData(visibleTopics, state.dependencies);
      });
    });
  }

  // 节点点击选中与右上角卡片 1:1 展示
  function handleNodeSelect(node, traceMeta) {
    if (!node) {
      floatingInspector.classList.add('hidden');
      return;
    }

    const raw = node.raw;
    const marbleDetail = state.marbleDetailMap.get(raw.id) || state.marbleDetailMap.get(raw.sourceTopicId);
    const detail = Object.assign({}, raw, marbleDetail);

    // 1. 副标题：DOMAIN · AGE X
    const category = (detail.domain || detail.subject || 'GENERAL').toUpperCase();
    const age = detail.ageRangeStart ?? detail.grade ?? 9;
    cardCategoryAge.textContent = `${category} · AGE ${age}`;

    const subColor = engine3D.getSubjectColor(node.subject);
    const hexStr = '#' + subColor.toString(16).padStart(6, '0');
    cardDot.style.backgroundColor = hexStr;

    // 2. 标题
    cardTitle.textContent = node.name;

    // 3. 启发式提问 / 概念说明
    const promptText = detail.assessmentPrompt
      ? detail.assessmentPrompt.replace(/\{\{name\}\}/g, 'your child')
      : (detail.description || 'Understand the core foundations of this concept.');
    cardPrompt.textContent = promptText;

    // 4. XX prerequisites in total
    const totalPrereqs = traceMeta?.ancestorsCount || 0;
    cardPrereqCount.textContent = totalPrereqs;

    // 5. BUILDS DIRECTLY ON (直接先修依赖)
    const directPrereqs = Array.from(engine3D.adjacencyIn.get(node.id) || []);
    buildsTitle.textContent = `BUILDS DIRECTLY ON ${directPrereqs.length}`;
    if (directPrereqs.length === 0) {
      buildsList.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); padding: 4px 6px;">Foundational topic (no direct prerequisites).</div>';
    } else {
      buildsList.innerHTML = directPrereqs.map(pId => {
        const pNode = engine3D.nodeMap.get(pId);
        const name = pNode ? pNode.name : pId;
        const pAge = pNode ? (pNode.ageRangeStart || 7) : 7;
        const pColor = pNode ? ('#' + engine3D.getSubjectColor(pNode.subject).toString(16).padStart(6, '0')) : '#cbd5e1';
        return `
          <div class="card-list-item" data-jump-id="${pId}">
            <div class="card-list-item-left">
              <span class="subject-dot" style="background-color: ${pColor};"></span>
              <span title="${name}">${name}</span>
            </div>
            <span class="card-list-item-right">age ${pAge}</span>
          </div>
        `;
      }).join('');
    }

    // 6. UNLOCKS NEXT (直接解锁后置)
    const directUnlocks = Array.from(engine3D.adjacencyOut.get(node.id) || []);
    unlocksTitle.textContent = `UNLOCKS NEXT ${directUnlocks.length}`;
    if (directUnlocks.length === 0) {
      unlocksList.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); padding: 4px 6px;">Culminating concept in this sequence.</div>';
    } else {
      unlocksList.innerHTML = directUnlocks.slice(0, 6).map(uId => {
        const uNode = engine3D.nodeMap.get(uId);
        const name = uNode ? uNode.name : uId;
        const uAge = uNode ? (uNode.ageRangeStart || 9) : 9;
        const uColor = uNode ? ('#' + engine3D.getSubjectColor(uNode.subject).toString(16).padStart(6, '0')) : '#cbd5e1';
        return `
          <div class="card-list-item" data-jump-id="${uId}">
            <div class="card-list-item-left">
              <span class="subject-dot" style="background-color: ${uColor};"></span>
              <span title="${name}">${name}</span>
            </div>
            <span class="card-list-item-right">age ${uAge}</span>
          </div>
        `;
      }).join('');
    }

    // 7. 掌握证据
    if (detail.evidence && Array.isArray(detail.evidence) && detail.evidence.length > 0) {
      evidenceSection.style.display = 'block';
      evidenceList.innerHTML = detail.evidence.slice(0, 3).map(e => `<li class="evidence-li">${e}</li>`).join('');
    } else {
      evidenceSection.style.display = 'none';
    }

    // 绑定卡片列表跳转点击
    floatingInspector.querySelectorAll('.card-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const jumpId = item.getAttribute('data-jump-id');
        engine3D.focusNode(jumpId);
      });
    });

    floatingInspector.classList.remove('hidden');
  }

  function handleNodeHover(node) {
    if (!node) {
      nodeTooltip.style.display = 'none';
      return;
    }

    const pos = new THREE.Vector3(node.x, node.y, node.z);
    pos.project(engine3D.camera);

    const hw = container3D.clientWidth / 2;
    const hh = container3D.clientHeight / 2;
    const sx = (pos.x * hw) + hw;
    const sy = -(pos.y * hh) + hh;

    nodeTooltip.style.left = `${sx}px`;
    nodeTooltip.style.top = `${sy}px`;
    nodeTooltip.innerHTML = `${node.name} <span style="opacity: 0.6; font-size: 0.72rem;">· age ${node.ageRangeStart || 5}</span>`;
    nodeTooltip.style.display = 'block';
  }

  function initListeners() {
    closeCardBtn.addEventListener('click', () => {
      floatingInspector.classList.add('hidden');
      engine3D.selectNode(null);
    });

    datasetSelect.addEventListener('change', (e) => {
      loadDataset(e.target.value);
    });

    // 搜索输入
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        searchResults.style.display = 'none';
        return;
      }

      const matches = state.topics
        .filter(t => (t.name && t.name.toLowerCase().includes(q)) || (t.domain && t.domain.toLowerCase().includes(q)))
        .slice(0, 6);

      if (matches.length === 0) {
        searchResults.innerHTML = '<div style="padding: 6px 10px; color: #64748b; font-size: 0.75rem;">无匹配微知识点</div>';
      } else {
        searchResults.innerHTML = matches.map(m => `
          <div class="search-res-item" data-id="${m.id}">
            <div style="font-weight: 600; color: #fff;">${m.name}</div>
            <div style="font-size: 0.7rem; color: #64748b;">${m.subject || m.domain} · age ${m.ageRangeStart || 5}</div>
          </div>
        `).join('');

        searchResults.querySelectorAll('.search-res-item').forEach(item => {
          item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            searchResults.style.display = 'none';
            searchInput.value = '';
            engine3D.focusNode(id);
          });
        });
      }
      searchResults.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      } else if (e.key === 'Escape') {
        searchResults.style.display = 'none';
        floatingInspector.classList.add('hidden');
        engine3D.selectNode(null);
      }
    });
  }

  initListeners();
  loadDataset('marble');

})();
