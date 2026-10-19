// input: 读取 sources/cn-math-taxonomy/data/topics.json, dependencies.json 及 viewer/graphdata-marble.json
// output: 严格依照真实学龄梯度重构坐标：小学居于下部，初中（七/八/九年级，12~15岁）整体居于上部与穹顶
// pos: 学龄梯度 3D 几何重构构建脚本
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import fs from 'node:fs';

const marbleData = JSON.parse(fs.readFileSync('viewer/graphdata-marble.json', 'utf8'));
const cnTopics = JSON.parse(fs.readFileSync('sources/cn-math-taxonomy/data/topics.json', 'utf8'));
const cnDeps = JSON.parse(fs.readFileSync('sources/cn-math-taxonomy/data/dependencies.json', 'utf8'));

console.log('=== 依照真实学龄梯度重构初中数学 3D 坐标（初中整体居于上部） ===');

// 1. 统计并排序所有 34 个章节前缀
const chapterList = [];
cnTopics.forEach(t => {
  if (t.chapter) {
    const prefix = t.chapter.split(' ').slice(0, 2).join(' ');
    if (!chapterList.includes(prefix)) chapterList.push(prefix);
  }
});

// 2. 拓扑中心度计算
const inDegree = new Map();
const outDegree = new Map();
cnTopics.forEach(t => {
  inDegree.set(t.id, 0);
  outDegree.set(t.id, 0);
});
cnDeps.forEach(d => {
  if (inDegree.has(d.topicId)) inDegree.set(d.topicId, inDegree.get(d.topicId) + 1);
  if (outDegree.has(d.prerequisiteId)) outDegree.set(d.prerequisiteId, outDegree.get(d.prerequisiteId) + 1);
});

// 3. 颜色系统与 Marble 保持一致调性
const DOMAIN_COLOR_PALETTE = {
  '数与代数': '#3D63D8',   // 官方经典 Mathematics 纯正深蓝
  '图形与几何': '#9DB8DC', // 官方淡青蓝
  '统计与概率': '#E8B08A', // 官方柔杏金
  '综合与实践': '#E76D95'  // 官方粉红
};

const cnGroups = ['数与代数', '图形与几何', '统计与概率', '综合与实践'];
const cnGcol = ['#3D63D8', '#9DB8DC', '#E8B08A', '#E76D95'];

// 4. 核心：初中部分（12~15岁）整体居于上部与穹顶！
// 基准总高度标尺 H = 1500
// - 小学衔接节点 (18个外部前置): age 10~11岁, Y in [320, 520], 作为向上的支撑底座
// - 七年级 (七上/七下, 104个): age 12~13岁, Y in [860, 1060], 正式迈入高阶上部
// - 八年级 (八上/八下, 109个): age 13~14岁, Y in [1080, 1280], 稳居上层大部
// - 九年级 (九上/九下, 100个): age 14~15岁, Y in [1300, 1500], 傲立于倒圆锥顶层穹顶
const H = 1500;

function computeNativeCoords(t, idx) {
  let age = 13;
  let yMean = 1100;
  let baseTheta = 0;
  const isExternal = t.grade === '小学' || t.external;
  const ch = t.chapter || '';

  if (isExternal) {
    // 小学衔接概念：作为初中图谱的前置底座基石
    age = 10;
    yMean = 340 + (idx / 18) * 160;
    baseTheta = (idx / 18) * Math.PI * 2;
  } else {
    // 初中各年级知识点：整体位于中上部与顶层！
    if (ch.includes('七上')) {
      age = 12;
      yMean = 840 + ((idx % 30) * 5);
    } else if (ch.includes('七下')) {
      age = 12;
      yMean = 960 + ((idx % 30) * 5);
    } else if (ch.includes('八上')) {
      age = 13;
      yMean = 1080 + ((idx % 30) * 5);
    } else if (ch.includes('八下')) {
      age = 13;
      yMean = 1190 + ((idx % 30) * 5);
    } else if (ch.includes('九上')) {
      age = 14;
      yMean = 1300 + ((idx % 30) * 5);
    } else { // 九下
      age = 15;
      yMean = 1410 + ((idx % 30) * 5);
    }

    const chPrefix = ch.split(' ').slice(0, 2).join(' ');
    const chIdx = chapterList.indexOf(chPrefix);
    const progress = chIdx !== -1 ? (chIdx / chapterList.length) : (idx / cnTopics.length);
    baseTheta = progress * Math.PI * 2 * 2.2;
  }

  // 伪随机扰动 (保证平滑、自然、确定性)
  const h1 = ((idx * 1664525 + 1013904223) >>> 0) / 4294967296;
  const h2 = (((idx + 43) * 1664525 + 1013904223) >>> 0) / 4294967296;
  const h3 = (((idx + 89) * 1664525 + 1013904223) >>> 0) / 4294967296;

  // 真实高度 Y (带自然微层厚度)
  const yJitter = (h1 + h2 - 1.0) * 35;
  const y = Math.min(1495, Math.max(300, yMean + yJitter));

  // 倒圆锥漏斗半径函数：随高度平滑放大
  // 底部 R ~ 180, 顶部穹顶 R ~ 540
  const yRatio = y / H;
  const envelopeR = 140 + 400 * Math.pow(yRatio, 0.85);

  // 空心壳层采样
  const rRatio = 0.46 + 0.54 * Math.sqrt(h2);
  const r = envelopeR * rRatio;

  // 极角微发散
  const theta = baseTheta + (h3 - 0.5) * 0.45;

  const x = Math.round(Math.cos(theta) * r * 10) / 10;
  const z = Math.round(Math.sin(theta) * r * 10) / 10;

  // 中心度计算
  const inD = inDegree.get(t.id) || 0;
  const outD = outDegree.get(t.id) || 0;
  const c = Math.min(0.24, Math.max(0.015, Math.round((0.018 + inD * 0.009 + outD * 0.018) * 1000) / 1000));

  return { x, y: Math.round(y * 10) / 10, z, age, c };
}

// 5. 烘焙 cn-math nodes
const cnNodeIdMap = new Map();
const cnNodes = cnTopics.map((t, idx) => {
  cnNodeIdMap.set(t.id, idx);
  const domain = t.domain || '数与代数';
  let gIdx = cnGroups.indexOf(domain);
  if (gIdx === -1) gIdx = 0;

  const { x, y, z, age, c } = computeNativeCoords(t, idx);
  const col = DOMAIN_COLOR_PALETTE[domain] || '#3D63D8';

  let prompt = t.description || '';
  if (t.diagnostic_question && t.diagnostic_question.question) {
    prompt = `【核心诊断】${t.diagnostic_question.question}（参考答案：${t.diagnostic_question.answer}）`;
  }

  const fullDomain = t.chapter ? `${domain} · ${t.chapter}` : domain;

  return {
    x,
    y,
    z,
    g: gIdx,
    a: age,
    c: c,
    col: col,
    dm: fullDomain,
    t: t.name,
    q: prompt
  };
});

const cnEdges = [];
cnDeps.forEach(d => {
  const targetIdx = cnNodeIdMap.get(d.topicId);
  const prereqIdx = cnNodeIdMap.get(d.prerequisiteId);
  if (targetIdx !== undefined && prereqIdx !== undefined) {
    cnEdges.push([targetIdx, prereqIdx, d.strength === 'hard' ? 1 : 0]);
  }
});

const cnGraphData = {
  groups: cnGroups,
  gcol: cnGcol,
  H: 1500,
  ageMin: 10,
  ageMax: 15,
  nodes: cnNodes,
  edges: cnEdges
};

fs.writeFileSync('viewer/graphdata-cn-math.json', JSON.stringify(cnGraphData), 'utf8');
console.log('✓ 已生成初中在上部的 viewer/graphdata-cn-math.json');
console.log(`  节点数: ${cnNodes.length}, 边数: ${cnEdges.length}`);
console.log(`  小学基石 Y 范围: [${Math.min(...cnNodes.slice(0, 18).map(n=>n.y))}, ${Math.max(...cnNodes.slice(0, 18).map(n=>n.y))}], 初中主体 Y 范围: [${Math.min(...cnNodes.slice(18).map(n=>n.y))}, ${Math.max(...cnNodes.slice(18).map(n=>n.y))}]`);

// 6. 烘焙全量联合图谱 (Union Index)
// Marble 小学部分自然位于 [50, 1000] 的下部与中部
// 中国初中数学自然耸立在 [840, 1500] 的整个上部与穹顶！
const unionGroups = [...marbleData.groups, ...cnGroups];
const unionGcol = [...marbleData.gcol, ...cnGcol];

const unionNodes = [...marbleData.nodes];
const offset = marbleData.nodes.length;

cnNodes.forEach(cnNode => {
  unionNodes.push({
    ...cnNode,
    g: cnNode.g + marbleData.groups.length
  });
});

const unionEdges = [...marbleData.edges];
cnEdges.forEach(e => {
  unionEdges.push([e[0] + offset, e[1] + offset, e[2]]);
});

const unionGraphData = {
  groups: unionGroups,
  gcol: unionGcol,
  H: 1500,
  ageMin: 4,
  ageMax: 15,
  nodes: unionNodes,
  edges: unionEdges
};

fs.writeFileSync('viewer/graphdata-union.json', JSON.stringify(unionGraphData), 'utf8');
console.log('✓ 已生成完美分层的全量联合图谱 viewer/graphdata-union.json');
console.log(`  Marble (小学): Y in [${Math.min(...marbleData.nodes.map(n=>n.y))}, ${Math.max(...marbleData.nodes.map(n=>n.y))}]`);
console.log(`  CN Math (初中): Y in [${Math.min(...cnNodes.slice(18).map(n=>n.y))}, ${Math.max(...cnNodes.slice(18).map(n=>n.y))}] (初中整体在上部！)`);
