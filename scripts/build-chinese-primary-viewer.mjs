// input: 读取 viewer/graphdata-marble.json, graphdata-cn-math.json, graphdata-union.json, viewer/i18n-data.json, scripts/curriculum.html
// output: 生成字体深度优化、字色温润高清晰、集成数据源切换器与中英双语的 100% 官方 3D 页面 viewer/index.html
// pos: 核心展示层构建脚本
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import fs from 'node:fs';

const rawHtml = fs.readFileSync('scripts/curriculum.html', 'utf8');
const i18n = JSON.parse(fs.readFileSync('viewer/i18n-data.json', 'utf8'));

// 提取原生 CSS 并融合高级中文字体族、字色调优与数据源切换器样式
const styleMatch = rawHtml.match(/<style>([\s\S]*?)<\/style>/i);
let baseCss = styleMatch ? styleMatch[1] : '';

const enhancedCss = `
:root {
  --font-serif-hero: 'Newsreader', 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', Georgia, serif;
  --font-sans-ui: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  --font-mono-code: 'JetBrains Mono', Consolas, Monaco, monospace;

  /* 调优字色层次 */
  --c-text-primary: #ffffff;
  --c-text-lead: #f1f5f9;
  --c-text-secondary: #cbd5e1;
  --c-text-muted: #94a3b8;
  --c-accent-coral: #fb7185;
  --c-accent-cyan: #38bdf8;
  --c-accent-amber: #fbbf24;
}

body {
  font-family: var(--font-sans-ui) !important;
  color: var(--c-text-secondary) !important;
  background-color: #06080d !important;
}

/* ==================== 悬浮面板与文案布局约束 (严格防遮挡 3D 图谱) ==================== */
#overlay {
  position: absolute;
  top: 32px;
  left: 32px;
  width: min(390px, calc(100vw - 64px));
  max-width: 390px;
  z-index: 10;
  pointer-events: none;
}

#overlay a,
#overlay button,
#overlay select,
#overlay input {
  pointer-events: auto;
}

.hero {
  width: 100%;
  max-width: 390px;
}

/* 经典 Hero 标题排版与字色微调 */
.hero .ht {
  font-family: var(--font-serif-hero) !important;
  font-size: clamp(2.2rem, 3.2vw, 3.2rem) !important;
  font-weight: 600 !important;
  letter-spacing: -0.025em !important;
  line-height: 1.12 !important;
  margin: 0 0 12px 0 !important;
  color: var(--c-text-primary) !important;
  text-shadow: 0 4px 24px rgba(255, 255, 255, 0.12) !important;
}

.hero .ht .coral {
  color: var(--c-accent-coral) !important;
  font-weight: 700 !important;
  text-shadow: 0 0 16px rgba(251, 113, 133, 0.6) !important;
}

/* 导语与描述文本字色清晰度大幅提升 */
.hero .lead {
  font-size: 0.92rem !important;
  font-weight: 500 !important;
  color: var(--c-text-lead) !important;
  line-height: 1.6 !important;
  margin: 0 0 10px 0 !important;
  max-width: 380px !important;
}

.hero .desc {
  font-size: 0.82rem !important;
  color: var(--c-text-secondary) !important;
  line-height: 1.65 !important;
  margin: 0 0 12px 0 !important;
  max-width: 380px !important;
  word-break: break-word !important;
}

.hero .desc strong {
  color: var(--c-text-primary) !important;
  font-weight: 700 !important;
}

.hero .sub {
  font-size: 0.75rem !important;
  color: var(--c-text-muted) !important;
  line-height: 1.55 !important;
  margin: 0 0 14px 0 !important;
  max-width: 380px !important;
}

/* 左侧 Logo 与中英切换胶囊 */
.wordmark-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.wordmark {
  font-family: var(--font-sans-ui) !important;
  font-size: 1.6rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  color: #ffffff !important;
  text-shadow: 0 0 16px rgba(255, 255, 255, 0.25) !important;
}

.lang-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 9999px;
  color: #cbd5e1;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.lang-switch-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.35);
  color: #ffffff;
}
.lang-switch-btn .active-flag {
  color: #ffffff;
  font-weight: 700;
}
.lang-switch-btn .inactive-flag {
  color: #64748b;
}

/* 数据源切换下拉胶囊 (Source Selector) */
.source-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.source-select-dropdown {
  appearance: none;
  -webkit-appearance: none;
  background: rgba(15, 20, 32, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 9999px;
  padding: 7px 28px 7px 14px;
  color: #f1f5f9;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.source-select-dropdown:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: var(--c-accent-cyan);
  color: #ffffff;
}

.source-select-dropdown:focus {
  border-color: var(--c-accent-cyan);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.3);
}

.source-select-dropdown option {
  background: #0d121f;
  color: #f1f5f9;
  padding: 6px;
}

.source-select-arrow {
  position: absolute;
  right: 10px;
  pointer-events: none;
  color: var(--c-text-muted);
  font-size: 0.65rem;
}

/* 顶部搜索框优化 */
.top-search-wrap {
  position: absolute;
  top: 32px;
  left: 450px;
  z-index: 15;
}
.top-search-input {
  height: 34px;
  width: 240px;
  background: rgba(14, 18, 28, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 9999px;
  padding: 0 16px;
  color: #ffffff;
  font-size: 0.78rem;
  outline: none;
  transition: all 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}
.top-search-input:focus {
  width: 320px;
  border-color: var(--c-accent-cyan);
  background: rgba(14, 18, 28, 0.95);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
}
.search-dropdown {
  position: absolute;
  top: 42px;
  left: 0;
  width: 320px;
  max-height: 280px;
  overflow-y: auto;
  background: #0d121f;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
  display: none;
  z-index: 30;
}
.search-dropdown-item {
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.78rem;
}
.search-dropdown-item:hover {
  background: rgba(56, 189, 248, 0.14);
}

/* 左下角学科列表排版与字色微调 */
#legend {
  position: absolute !important;
  left: 32px !important;
  bottom: 24px !important;
  z-index: 10 !important;
  max-height: 42vh !important;
  overflow-y: auto !important;
}

#legend .leg-t {
  font-size: 0.72rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  color: var(--c-text-muted) !important;
  margin-bottom: 12px !important;
}

#legend .chip .nm {
  color: #e2e8f0 !important;
  font-size: 0.8rem !important;
}

#legend .chip .ct {
  font-family: var(--font-mono-code) !important;
  color: var(--c-text-muted) !important;
  font-size: 0.75rem !important;
}

#legend .chip:hover .nm {
  color: #ffffff !important;
}

/* 右上角详情卡片深度优化 */
#card {
  background: rgba(14, 18, 28, 0.9) !important;
  backdrop-filter: blur(28px) !important;
  -webkit-backdrop-filter: blur(28px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 18px !important;
  box-shadow: 0 24px 54px -12px rgba(0, 0, 0, 0.8) !important;
}

#card .cs {
  font-size: 0.72rem !important;
  font-weight: 700 !important;
  color: var(--c-accent-cyan) !important;
  letter-spacing: 0.05em !important;
}

#card .ctl {
  font-size: 1.35rem !important;
  font-weight: 700 !important;
  line-height: 1.3 !important;
  color: #ffffff !important;
  margin: 6px 0 10px 0 !important;
}

#card .cq {
  font-size: 0.86rem !important;
  line-height: 1.6 !important;
  color: #cbd5e1 !important;
  border-left: 2.5px solid var(--c-accent-cyan) !important;
  padding-left: 10px !important;
}

#card .stat .n {
  font-family: var(--font-mono-code) !important;
  font-size: 1.85rem !important;
  font-weight: 800 !important;
  color: #ffffff !important;
}

#card .stat .u {
  font-size: 0.92rem !important;
  color: #f1f5f9 !important;
}

#card .stat .sub {
  font-size: 0.78rem !important;
  color: var(--c-text-muted) !important;
  margin-top: 4px !important;
  line-height: 1.5 !important;
}

#card .sec .k {
  font-size: 0.72rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  color: var(--c-text-muted) !important;
}

#card .row {
  display: flex !important;
  align-items: flex-start !important;
  gap: 10px !important;
  width: 100% !important;
  text-align: left !important;
  background: rgba(255, 255, 255, 0.035) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 8px !important;
  padding: 8px 10px !important;
  color: #e2e8f0 !important;
  transition: all 0.16s ease !important;
}

#card .row:hover {
  background: rgba(56, 189, 248, 0.14) !important;
  border-color: rgba(56, 189, 248, 0.35) !important;
  color: #ffffff !important;
}

#card .row .rdot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  flex: 0 0 auto !important;
  margin-top: 5px !important;
}

#card .row .rcnt {
  flex: 1 !important;
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
}

#card .row .rt-line {
  display: flex !important;
  align-items: baseline !important;
  justify-content: space-between !important;
  gap: 8px !important;
  width: 100% !important;
}

#card .row .rt {
  flex: 1 !important;
  min-width: 0 !important;
  font-size: 0.84rem !important;
  line-height: 1.35 !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  word-break: break-word !important;
}

#card .row .ra {
  font-family: var(--font-mono-code) !important;
  font-size: 0.75rem !important;
  color: var(--c-text-muted) !important;
  flex: 0 0 auto !important;
  white-space: nowrap !important;
}

#card .row .rsub {
  font-size: 0.72rem !important;
  color: #94a3b8 !important;
  line-height: 1.35 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* 右下角提示文案 */
#wrap .hint {
  font-size: 0.75rem !important;
  color: var(--c-text-muted) !important;
  letter-spacing: 0.03em !important;
}
`;

const updatedCss = baseCss + enhancedCss;

// 构建 HTML
const finalHtml = `<!--
input: 包含官方预烘焙 3D 倒圆锥坐标数据、中英双语国际化字典，支持数据源切换与字体质感深度优化
output: 以中文为核心目标、100% 还原官方 3D 交互、集成数据源切换器与思源宋体/Newsreader 高级字体的图谱页面
pos: 核心可视化展示层
一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。
-->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Marble 学习微知识点图谱 — 孩子学习的全部轨迹</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${updatedCss}</style>
</head>
<body>
  <div id="wrap">
    <canvas id="cv"></canvas>

    <!-- 顶部轻量搜索框 -->
    <div class="top-search-wrap">
      <input type="text" id="searchInput" class="top-search-input" placeholder="搜索微知识点... (按 / 聚焦)" autocomplete="off" />
      <div id="searchDropdown" class="search-dropdown"></div>
    </div>

    <!-- 左侧 Hero 文案栏 (独立定位于左上角，严格限制宽度) -->
    <div id="overlay">
      <div class="wordmark-row">
        <span class="wordmark">MARBLE</span>
        <button id="langSwitchBtn" class="lang-switch-btn" title="切换中英文 (Switch Language)">
          <span class="active-flag">中</span> / <span class="inactive-flag">EN</span>
        </button>
      </div>

      <div class="hero">
        <h1 class="ht" id="heroTitle">
          孩子学习的<br>全部轨迹<span class="coral">.</span>
        </h1>
        <p class="lead" id="heroLead">
          基于国际权威与中国国家课程标准构建的基础教育开放知识图谱。
        </p>
        <p class="desc" id="heroDesc">
          <strong>1590 个微知识点，3221 条先修依赖链路</strong>，从最初的识字发音到初中代数。每条连线都标明了知识的先后基石与逻辑支撑。<strong>点击任意圆点</strong>即可立体回溯掌握它之前必须掌握的全部前置知识。
        </p>
        <p class="sub" id="heroNote">
          由 AI 智能体与教研团队联合从权威课程框架提炼，完全开源，供教育工作者、开发者与家长自由探索。
        </p>

        <!-- 操作区：GitHub 按钮 + 数据源切换组件 + 开源许可证徽章 -->
        <div class="cta-row" style="display: flex; align-items: center; gap: 10px; margin-top: 14px; flex-wrap: wrap;">
          <a class="cta" href="https://github.com/marble-seeds/os-taxonomy" target="_blank" rel="noreferrer" id="btnGithub">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span id="btnGithubText">代码仓库</span>
          </a>

          <!-- 数据源切换组件 (恢复并全面升级) -->
          <div class="source-select-wrap">
            <select id="sourceSelectDropdown" class="source-select-dropdown" title="切换图谱数据源 (Switch Dataset)">
              <option value="marble">🌌 Marble 国际图谱 (1590 节点)</option>
              <option value="union">🌐 全量联合图谱 (Union · 1923 节点)</option>
              <option value="cn-math">📐 中国初中数学 (CN Math · 333 节点)</option>
            </select>
            <span class="source-select-arrow">▼</span>
          </div>

          <span class="badge" id="btnLicense">开放数据 · ODBL 1.0</span>
        </div>
      </div>
    </div>

    <!-- 左下角学科切换器 (独立定位于左下角，绝不与上方文案重叠) -->
    <div id="legend">
      <div class="leg-t" id="legendTitle">学科分类 · 点击切换</div>
      <div class="chips" id="chips"></div>
    </div>

    <!-- 鼠标悬停 Tooltip -->
    <div id="tip">
      <div class="bar">
        <span class="sw"></span>
        <span class="ts mono"></span>
      </div>
      <div class="ttl"></div>
      <div class="q"></div>
    </div>

    <!-- 右上角浮动详情卡片 -->
    <div id="card">
      <div class="top-row">
        <button class="back" aria-label="返回上一个概念">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span id="cardBackText">返回</span>
        </button>
        <button class="close" aria-label="关闭卡片">&times;</button>
      </div>

      <div class="bar">
        <span class="sw"></span>
        <span class="cs mono"></span>
      </div>

      <div class="ctl"></div>
      <div class="cq"></div>

      <div class="stat">
        <div class="stat-main">
          <span class="n mono"></span>
          <span class="u" id="cardStatUnit">个先修知识点</span>
        </div>
        <div class="sub" id="cardStatSub">掌握当前概念前必须顺次掌握的所有知识基石，层层可溯。</div>
      </div>

      <div class="sec sec-pre">
        <div class="k mono" id="secPreTitle">直接先修依赖</div>
        <div class="rows-pre"></div>
      </div>

      <div class="sec sec-next">
        <div class="k mono" id="secNextTitle">后续解锁概念</div>
        <div class="rows-next"></div>
      </div>
    </div>

    <!-- 右下角交互提示 -->
    <div class="hint" id="footerHint">
      按住拖拽 3D 旋转 · 滚轮缩放 · 点击任意圆点追溯其先修链路
    </div>
  </div>

  <!-- 国际化对照数据 -->
  <script id="i18ndata" type="application/json">
${JSON.stringify(i18n)}
  </script>

  <!-- 3D Canvas 投影、多数据源切换与中英双语控制引擎 -->
  <script>
  (function(){
    "use strict";

    const I18N = JSON.parse(document.getElementById('i18ndata').textContent);
    const MID = String.fromCharCode(183);
    const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    // 当前语言：默认以中文为核心目标 ('zh')，支持切换英文 ('en')
    let currentLang = localStorage.getItem('user_lang') || 'zh';
    let currentSource = 'marble';

    const wrap = document.getElementById('wrap');
    const cv = document.getElementById('cv');
    const ctx = cv.getContext('2d');
    let DPR = 1, VW = 0, VH = 0;

    function resize(){
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      VW = wrap.clientWidth;
      VH = wrap.clientHeight;
      cv.width = VW * DPR;
      cv.height = VH * DPR;
      cv.style.width = VW + 'px';
      cv.style.height = VH + 'px';
    }

    // 动态数据集状态
    let DATA = null;
    let GROUPS = [], N = [], E = [], H = 1400;
    let GCOL = [];
    let incident = [];
    let directPre = [];
    let directNext = [];
    let active = new Set();
    let P = new Float32Array(0);
    let RGB = [];
    let order = [];

    // 3D 摄影机参数
    let rotY = 0.6, tilt = -0.32, zoom = 1, spin = reduce ? 0 : 0.00018;
    const FOV = 1400;
    let grow = reduce ? 1 : 0;
    let hover = -1, selected = -1, lineage = null;
    const hist = [];
    let rotYTarget = null, tiltTarget = null, zoomTarget = null;
    let START = performance.now();

    // 加载指定数据源
    async function switchSource(sourceKey){
      currentSource = sourceKey;
      const dropdown = document.getElementById('sourceSelectDropdown');
      if (dropdown && dropdown.value !== sourceKey) {
        dropdown.value = sourceKey;
      }
      try {
        const url = new URL(window.location);
        url.searchParams.set('dataset', sourceKey);
        window.history.replaceState({}, '', url);
      } catch (e) {}
      clearSel();
      try {
        const res = await fetch('graphdata-' + sourceKey + '.json');
        DATA = await res.json();

        GROUPS = DATA.groups;
        N = DATA.nodes;
        E = DATA.edges;
        H = DATA.H || 1400;
        GCOL = DATA.gcol;

        N.forEach(n => { n.py = n.y - H / 2; });

        incident = Array.from({length: N.length}, () => []);
        directPre = Array.from({length: N.length}, () => []);
        directNext = Array.from({length: N.length}, () => []);
        E.forEach((e, i) => {
          incident[e[0]].push(i);
          incident[e[1]].push(i);
          directPre[e[0]].push(e[1]);
          directNext[e[1]].push(e[0]);
        });

        N.forEach(n => { n.appear = n.y / H; });

        active = new Set(GROUPS.map((_, i) => i));
        P = new Float32Array(N.length * 3);
        RGB = N.map(n => hex2rgb(n.col));
        order = N.map((_, i) => i);

        START = performance.now();
        applyI18nTexts();
      } catch (err) {
        console.error('加载数据源失败:', err);
      }
    }

    function project(){
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const cx = VW * 0.52, cyy = VH * 0.52;
      const sc = Math.min(VW / 1500, VH / 1780) * zoom;
      for(let i = 0; i < N.length; i++){
        const n = N[i];
        let x = n.x * cy + n.z * sy, z = -n.x * sy + n.z * cy, y = n.py;
        let y2 = y * ct - z * st, z2 = y * st + z * ct;
        const pf = FOV / (FOV + z2 * sc * 1.6);
        P[i * 3] = cx + x * sc * pf;
        P[i * 3 + 1] = cyy - y2 * sc * pf;
        P[i * 3 + 2] = pf;
      }
    }

    function buildLineage(i){
      const nodes = new Set([i]), edges = new Set(), q = [i];
      while(q.length){
        const u = q.shift();
        for(const idx of incident[u]){
          const e = E[idx];
          if(e[0] === u){
            edges.add(idx);
            if(!nodes.has(e[1])){
              nodes.add(e[1]);
              q.push(e[1]);
            }
          }
        }
      }
      lineage = { nodes, edges };
    }

    // 交互拖拽与拾取
    let dragging = false, moved = false, lx = 0, ly = 0;
    wrap.addEventListener('pointerdown', e => {
      dragging = true; moved = false; lx = e.clientX; ly = e.clientY;
      wrap.classList.add('drag'); wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener('pointermove', e => {
      if(dragging){
        const dx = e.clientX - lx, dy = e.clientY - ly;
        if(Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        rotY += dx * 0.0055;
        tilt = Math.max(-1.1, Math.min(0.15, tilt - dy * 0.003));
        lx = e.clientX; ly = e.clientY;
      } else onHover(e);
    });
    wrap.addEventListener('pointerup', e => {
      dragging = false; wrap.classList.remove('drag');
      if(!moved) onClick(e);
    });
    wrap.addEventListener('pointerleave', () => { hideTip(); hover = -1; });
    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      zoom = Math.max(0.5, Math.min(4, zoom * Math.exp(-e.deltaY * 0.0016)));
    }, {passive: false});

    function nodeR(i){
      return (2.3 + Math.sqrt(N[i].c) * 7.5) * P[i * 3 + 2] * Math.min(1.6, Math.max(0.9, zoom));
    }

    function pick(mx, my){
      let best = -1, bd = 20 * 20;
      for(let i = 0; i < N.length; i++){
        if(!active.has(N[i].g)) continue;
        const dx = P[i * 3] - mx, dy = P[i * 3 + 1] - my, d = dx * dx + dy * dy;
        const rr = Math.max(11, nodeR(i) + 6);
        if(d < rr * rr && d < bd){ bd = d; best = i; }
      }
      return best;
    }

    function onHover(e){
      const r = cv.getBoundingClientRect();
      const i = pick(e.clientX - r.left, e.clientY - r.top);
      if(i !== hover){ hover = i; i >= 0 ? showTip(i, e) : hideTip(); }
      else if(i >= 0) placeTip(e);
      spin = (hover >= 0 || selected >= 0 || reduce) ? 0 : 0.00018;
    }

    function focusNode(i){
      const n = N[i];
      let best = null, bestZ = Infinity;
      for(const cand of [Math.atan2(-n.x, n.z), Math.atan2(-n.x, n.z) + Math.PI]){
        const z2 = -n.x * Math.sin(cand) + n.z * Math.cos(cand);
        if(z2 < bestZ){ bestZ = z2; best = cand; }
      }
      rotYTarget = best; tiltTarget = -0.18; zoomTarget = Math.max(zoom, 1.5);
    }

    function onClick(e){
      const r = cv.getBoundingClientRect();
      const i = pick(e.clientX - r.left, e.clientY - r.top);
      if(i < 0){ clearSel(); return; }
      selectNode(i, true);
    }

    function selectNode(i, push){
      if(push && selected >= 0 && selected !== i) hist.push(selected);
      selected = i; buildLineage(i); showCard(i); focusNode(i); spin = 0;
      hideTip();
    }

    function goBack(){
      if(!hist.length) return;
      selectNode(hist.pop(), false);
    }

    function clearSel(){
      selected = -1; lineage = null; hist.length = 0;
      rotYTarget = null; tiltTarget = null; zoomTarget = null;
      document.getElementById('card').classList.remove('on');
      if(!reduce) spin = 0.00018;
    }

    // 辅助文本本地化获取函数：英文缺失下优雅显示中文！
    function getNodeDisplay(n){
      const trans = I18N.nodes[n.t] || {};
      if(currentLang === 'zh'){
        return {
          title: trans.zhTitle || n.t,
          domain: trans.zhDomain || I18N.domainMap[n.dm] || n.dm,
          subject: trans.zhSubject || I18N.subjectMap[GROUPS[n.g]] || GROUPS[n.g],
          question: n.q
        };
      } else {
        // 英文模式：英文缺失下直接显示中文！
        return {
          title: n.t || trans.zhTitle,
          domain: n.dm || trans.zhDomain,
          subject: GROUPS[n.g] || trans.zhSubject,
          question: n.q
        };
      }
    }

    // Tooltip
    const tip = document.getElementById('tip');
    function esc(s){ const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function showTip(i, e){
      const n = N[i];
      const d = getNodeDisplay(n);
      const ageLabel = currentLang === 'zh' ? '适龄 ' + n.a + ' 岁' : 'age ' + n.a;
      tip.querySelector('.sw').style.background = n.col;
      tip.querySelector('.ts').textContent = d.domain + ' ' + MID + ' ' + ageLabel;
      tip.querySelector('.ttl').textContent = d.title;
      tip.querySelector('.q').innerHTML = d.question ? esc(d.question) : '';
      tip.classList.add('on'); placeTip(e);
    }

    function placeTip(e){
      const r = wrap.getBoundingClientRect();
      let x = e.clientX - r.left + 16, y = e.clientY - r.top + 16;
      const w = tip.offsetWidth, h = tip.offsetHeight;
      if(x + w > VW - 8) x = e.clientX - r.left - w - 16;
      if(y + h > VH - 8) y = e.clientY - r.top - h - 16;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    }

    function hideTip(){ tip.classList.remove('on'); }

    // Card 详情卡片
    const card = document.getElementById('card');
    ['pointerdown','pointerup','click','wheel'].forEach(ev => {
      card.addEventListener(ev, e => e.stopPropagation());
      document.getElementById('legend').addEventListener(ev, e => e.stopPropagation());
    });
    card.querySelector('.close').addEventListener('click', clearSel);
    card.querySelector('.back').addEventListener('click', goBack);

    function fillRows(container, idxs){
      container.innerHTML = '';
      if(!idxs.length){
        const d = document.createElement('div');
        d.className = 'empty';
        d.textContent = currentLang === 'zh' ? '基础概念，无前置/后续知识点' : 'nothing yet';
        container.appendChild(d);
        return;
      }
      idxs.slice().sort((a, b) => N[a].a - N[b].a).forEach(j => {
        const m = N[j];
        const disp = getNodeDisplay(m);
        const ageStr = currentLang === 'zh' ? m.a + ' 岁' : 'age ' + m.a;
        const subHtml = disp.domain ? '<div class="rsub" title="' + esc(disp.domain) + '">' + esc(disp.domain) + '</div>' : '';
        const b = document.createElement('button');
        b.className = 'row';
        b.title = disp.title + (disp.domain ? ' (' + disp.domain + ')' : '');
        b.innerHTML = '<span class="rdot" style="background:' + m.col + '"></span>' +
          '<div class="rcnt">' +
            '<div class="rt-line">' +
              '<span class="rt">' + esc(disp.title) + '</span>' +
              '<span class="ra mono">' + ageStr + '</span>' +
            '</div>' +
            subHtml +
          '</div>';
        b.addEventListener('click', () => selectNode(j, true));
        container.appendChild(b);
      });
    }

    function showCard(i){
      const n = N[i], cnt = lineage.nodes.size - 1;
      const disp = getNodeDisplay(n);
      const ageLabel = currentLang === 'zh' ? '适龄 ' + n.a + ' 岁' : 'age ' + n.a;

      card.querySelector('.sw').style.background = n.col;
      card.querySelector('.cs').textContent = disp.domain + ' ' + MID + ' ' + ageLabel;
      card.querySelector('.ctl').textContent = disp.title;
      card.querySelector('.cq').innerHTML = disp.question ? esc(disp.question) : '';

      card.querySelector('.n').textContent = cnt;
      card.querySelector('.u').textContent = currentLang === 'zh' ? '个先修知识点 (全面掌握需达成的基石)' : (cnt === 1 ? 'prerequisite in total' : 'prerequisites in total');
      card.querySelector('.sub').textContent = cnt > 0
        ? (currentLang === 'zh' ? '掌握当前概念前必须顺次掌握的所有知识基石，层层可溯。' : 'Everything a learner must master before this one, traced all the way back.')
        : (currentLang === 'zh' ? '基础起点概念，无需先修。' : 'A starting point. Nothing has to come before it.');

      const pre = directPre[i], nxt = directNext[i];
      card.querySelector('.sec-pre .k').textContent = (currentLang === 'zh' ? '直接先修依赖 (' : 'BUILDS DIRECTLY ON ') + pre.length + (currentLang === 'zh' ? ')' : '');
      card.querySelector('.sec-next .k').textContent = (currentLang === 'zh' ? '后续解锁概念 (' : 'UNLOCKS NEXT ') + nxt.length + (currentLang === 'zh' ? ')' : '');

      fillRows(card.querySelector('.rows-pre'), pre);
      fillRows(card.querySelector('.rows-next'), nxt);

      card.querySelector('.back').classList.toggle('on', hist.length > 0);
      card.scrollTop = 0;
      card.classList.add('on');
    }

    // 渲染左下角学科列表
    const chips = document.getElementById('chips');

    function renderLegendChips(){
      if(!chips || !DATA) return;
      chips.innerHTML = '';
      const counts = GROUPS.map(() => 0);
      N.forEach(n => { if(counts[n.g] !== undefined) counts[n.g]++; });

      GROUPS.forEach((s, i) => {
        const displayName = currentLang === 'zh' ? (I18N.subjectMap[s] || s) : s;
        const el = document.createElement('div');
        el.className = 'chip' + (active.has(i) ? '' : ' off');
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-pressed', active.has(i) ? 'true' : 'false');
        el.innerHTML = '<span class="sw" style="background:' + (GCOL[i] || '#94a3b8') + '"></span>' +
          '<span class="nm">' + esc(displayName) + '</span><span class="ct mono">' + counts[i] + '</span>';

        const toggle = () => {
          if(active.has(i)){
            active.delete(i); el.classList.add('off'); el.setAttribute('aria-pressed', 'false');
          } else {
            active.add(i); el.classList.remove('off'); el.setAttribute('aria-pressed', 'true');
          }
        };
        el.addEventListener('click', toggle);
        el.addEventListener('keydown', ev => {
          if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); toggle(); }
        });
        chips.appendChild(el);
      });
    }

    // 刷新全站文案（中英切换 + 数据集数量联动）
    function applyI18nTexts(){
      if(!DATA) return;
      const t = I18N.ui[currentLang];
      document.title = currentLang === 'zh'
        ? 'Marble 学习微知识点图谱 — 孩子学习的全部轨迹'
        : 'Marble Skill Taxonomy — Everything a child learns';

      document.getElementById('heroTitle').innerHTML = t.heroTitlePrefix + '<br>' + t.heroTitleSuffix + '<span class="coral">.</span>';
      document.getElementById('heroLead').textContent = t.heroLead;
      document.getElementById('heroDesc').innerHTML = t.heroDesc.replace('{concepts}', N.length).replace('{links}', E.length);
      document.getElementById('heroNote').textContent = t.heroNote;
      document.getElementById('legendTitle').textContent = t.subjectsTitle;
      document.getElementById('footerHint').textContent = t.dragHint;
      document.getElementById('btnGithubText').textContent = t.viewOnGithub;
      document.getElementById('btnLicense').textContent = t.openData;
      document.getElementById('cardBackText').textContent = t.backBtn;

      // 更新按钮指示状态
      const btn = document.getElementById('langSwitchBtn');
      if(currentLang === 'zh'){
        btn.innerHTML = '<span class="active-flag">中</span> / <span class="inactive-flag">EN</span>';
      } else {
        btn.innerHTML = '<span class="inactive-flag">中</span> / <span class="active-flag">EN</span>';
      }

      // 更新数据源下拉框的文字
      const optMarble = document.querySelector('#sourceSelectDropdown option[value="marble"]');
      const optUnion = document.querySelector('#sourceSelectDropdown option[value="union"]');
      const optCnMath = document.querySelector('#sourceSelectDropdown option[value="cn-math"]');
      if(optMarble && optUnion && optCnMath){
        optMarble.textContent = t.sourceMarble;
        optUnion.textContent = t.sourceUnion;
        optCnMath.textContent = t.sourceCnMath;
      }

      renderLegendChips();
      if(selected >= 0) showCard(selected);
    }

    // 绑定数据源切换器
    document.getElementById('sourceSelectDropdown').addEventListener('change', (e) => {
      switchSource(e.target.value);
    });

    // 语言切换事件
    document.getElementById('langSwitchBtn').addEventListener('click', () => {
      currentLang = currentLang === 'zh' ? 'en' : 'zh';
      localStorage.setItem('user_lang', currentLang);
      applyI18nTexts();
    });

    // 搜索输入框与中英模糊联想
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if(!q){
        searchDropdown.style.display = 'none';
        return;
      }
      const matches = [];
      for(let i = 0; i < N.length; i++){
        const n = N[i];
        const disp = getNodeDisplay(n);
        if(disp.title.toLowerCase().includes(q) || disp.domain.toLowerCase().includes(q) || n.t.toLowerCase().includes(q)){
          matches.push({ idx: i, disp, age: n.a });
          if(matches.length >= 8) break;
        }
      }

      if(matches.length === 0){
        searchDropdown.innerHTML = '<div style="padding: 6px 10px; color: #64748b; font-size: 0.75rem;">无匹配微知识点 / No matches</div>';
      } else {
        searchDropdown.innerHTML = matches.map(m => \`
          <div class="search-dropdown-item" data-idx="\${m.idx}">
            <div style="font-weight: 600; color: #fff;">\${esc(m.disp.title)}</div>
            <div style="font-size: 0.7rem; color: #64748b;">\${esc(m.disp.domain)} · \${currentLang === 'zh' ? '适龄 ' + m.age + ' 岁' : 'age ' + m.age}</div>
          </div>
        \`).join('');

        searchDropdown.querySelectorAll('.search-dropdown-item').forEach(el => {
          el.addEventListener('click', () => {
            const idx = parseInt(el.getAttribute('data-idx'), 10);
            searchDropdown.style.display = 'none';
            searchInput.value = '';
            selectNode(idx, true);
          });
        });
      }
      searchDropdown.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if(!searchInput.contains(e.target) && !searchDropdown.contains(e.target)){
        searchDropdown.style.display = 'none';
      }
    });

    window.addEventListener('keydown', (e) => {
      if(e.key === '/' && document.activeElement !== searchInput){
        e.preventDefault();
        searchInput.focus();
      } else if(e.key === 'Escape'){
        searchDropdown.style.display = 'none';
        clearSel();
      }
    });

    function hex2rgb(h){
      if(!h || !h.startsWith('#')) return '148,163,184';
      const n = parseInt(h.slice(1), 16);
      return (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    }

    // 官方原生 Canvas 3D 渲染主循环
    function draw(){
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, VW, VH);
      if(!N.length) return;
      project();

      const hasSel = !!lineage;

      // 1. 连线 (Edges)
      for(let k = 0; k < E.length; k++){
        const e = E[k], a = e[0], b = e[1];
        if(!N[a] || !N[b]) continue;
        if(!active.has(N[a].g) || !active.has(N[b].g)) continue;
        if(!reduce && (N[a].appear > grow || N[b].appear > grow)) continue;

        let alpha, col = null, lw = 1;
        if(hasSel){
          if(lineage.edges.has(k)){
            alpha = 0.75; col = RGB[b]; lw = 1.6;
          } else {
            alpha = 0.04;
          }
        } else {
          alpha = e[2] ? 0.10 : 0.05;
        }

        const depth = (P[a * 3 + 2] + P[b * 3 + 2]) / 2;
        ctx.strokeStyle = col ? 'rgba(' + col + ',' + alpha + ')' : 'rgba(150,165,205,' + (alpha * depth) + ')';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(P[a * 3], P[a * 3 + 1]);
        ctx.lineTo(P[b * 3], P[b * 3 + 1]);
        ctx.stroke();
      }

      // 2. 节点粒子 (Dots, 画家算法深度排序)
      order.sort((a, b) => P[a * 3 + 2] - P[b * 3 + 2]);
      for(const i of order){
        const n = N[i];
        if(!n || !active.has(n.g)) continue;
        if(!reduce && n.appear > grow) continue;

        const inLin = hasSel ? lineage.nodes.has(i) : true;
        const isFocus = (i === selected) || (i === hover);
        let dim = 1;
        if(hasSel && !inLin) dim = 0.10;

        const sx = P[i * 3], sy = P[i * 3 + 1], pf = P[i * 3 + 2];
        const r = nodeR(i) * (isFocus ? 1.6 : 1);
        const rgb = RGB[i] || '148,163,184';
        const a = dim * (0.55 + 0.45 * Math.min(1, pf * pf));

        if(isFocus || (hasSel && inLin)){
          ctx.shadowColor = 'rgb(' + rgb + ')';
          ctx.shadowBlur = isFocus ? 18 : 9;
        } else ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(' + rgb + ',' + a + ')';
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(8,10,18,' + (0.5 * dim) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.2832); ctx.stroke();

        // 选中同心白光圈
        if(isFocus){
          ctx.strokeStyle = 'rgba(255,255,255,.95)';
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(sx, sy, r + 2.5, 0, 6.2832); ctx.stroke();
        }
      }
    }

    function frame(ts){
      if(!reduce) grow = Math.min(1.02, (ts - START) / 2800 * 1.02);
      const dt = Math.min(64, ts - (lastTs || START));
      lastTs = ts;
      rotY += spin * dt;

      if(rotYTarget !== null){
        let d = ((rotYTarget - rotY + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        rotY += d * 0.12;
        if(tiltTarget !== null) tilt += (tiltTarget - tilt) * 0.12;
        if(zoomTarget !== null) zoom += (zoomTarget - zoom) * 0.12;
        if(Math.abs(d) < 0.008){ rotYTarget = null; tiltTarget = null; zoomTarget = null; }
      }

      draw();
      requestAnimationFrame(frame);
    }
    let lastTs = START;

    window.addEventListener('resize', () => { resize(); });
    resize();
    const urlParams = new URLSearchParams(window.location.search);
    const initDataset = urlParams.get('dataset') || 'marble';
    const initDropdown = document.getElementById('sourceSelectDropdown');
    if (initDropdown) initDropdown.value = initDataset;
    switchSource(initDataset);
    requestAnimationFrame(frame);
  })();
  </script>
</body>
</html>
`;

fs.writeFileSync('viewer/index.html', finalHtml, 'utf8');
console.log('Saved viewer/index.html with Typography & Source Selector enhancements, length:', finalHtml.length);
