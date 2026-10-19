// input: 读取 sources/cn-math-taxonomy/data/ 下 topics.json, dependencies.json 及 questions.json
// output: 生成高精度拓扑中心度、丰富色彩阶梯与平滑 3D 漏斗分布的 graphdata-cn-math.json 与 graphdata-union.json
// pos: 中国初中数学 3D 视觉与数据格式增强生成器
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import fs from 'node:fs';

const marbleGraphData = JSON.parse(fs.readFileSync('viewer/graphdata-marble.json', 'utf8'));
const cnTopics = JSON.parse(fs.readFileSync('sources/cn-math-taxonomy/data/topics.json', 'utf8'));
const cnDeps = JSON.parse(fs.readFileSync('sources/cn-math-taxonomy/data/dependencies.json', 'utf8'));

// 1. 统计拓扑入度与出度以计算中心度 (Degree Centrality)
const inDegrees = new Map();
const outDegrees = new Map();
cnTopics.forEach(t => {
  inDegrees.set(t.id, 0);
  outDegrees.set(t.id, 0);
});

cnDeps.forEach(d => {
  if (inDegrees.has(d.topicId)) inDegrees.set(d.topicId, inDegrees.get(d.topicId) + 1);
  if (outDegrees.has(d.prerequisiteId)) outDegrees.set(d.prerequisiteId, outDegrees.get(d.prerequisiteId) + 1);
});

// 2. 建立精细化色彩调色板 (按领域与年级学段渐变，告别单一黄色)
function getCnColor(t) {
  const domain = t.domain || '数与代数';
  const grade = t.grade;
  const chapter = t.chapter || '';

  if (domain === '数与代数') {
    if (grade === '小学') return '#F59E0B'; // 基础暖金
    if (chapter.includes('七上') || chapter.includes('七下')) return '#FBBF24'; // 七年级明黄
    if (chapter.includes('八上') || chapter.includes('八下')) return '#60A5FA'; // 八年级函数代数蓝
    return '#818CF8'; // 九年级方程函数紫蓝
  } else if (domain === '图形与几何') {
    if (grade === '小学') return '#38BDF8'; // 浅天蓝
    if (chapter.includes('七上') || chapter.includes('七下')) return '#22D3EE'; // 七年级线角青色
    if (chapter.includes('八上') || chapter.includes('八下')) return '#2DD4BF'; // 八年级全等轴对称绿青
    return '#06B6D4'; // 九年级圆与相似深青
  } else if (domain === '统计与概率') {
    return '#34D399'; // 翡翠翠绿
  } else if (domain === '综合与实践') {
    return '#F472B6'; // 实践探究玫粉
  }
  return '#94A3B8';
}

const cnGroups = ['数与代数', '图形与几何', '统计与概率', '综合与实践'];
const cnGcol = ['#F59E0B', '#06B6D4', '#10B981', '#EC4899'];

// 学段高度区间与倒圆锥映射 (H = 1400)
// 小学 (cnm_ext): 220 ~ 380, r ~ 65
// 七年级 (7): 420 ~ 680, r ~ 160
// 八年级 (8): 720 ~ 950, r ~ 260
// 九年级 (9): 980 ~ 1240, r ~ 360
function getCoords(t, idx) {
  let yBase = 800;
  let radBase = 220;
  let angleSector = 0;

  const domain = t.domain || '数与代数';
  const gIdx = cnGroups.indexOf(domain);
  angleSector = ((gIdx === -1 ? 0 : gIdx) / cnGroups.length) * Math.PI * 2;

  const grade = t.grade;
  const chapter = t.chapter || '';

  if (grade === '小学' || t.external) {
    yBase = 260;
    radBase = 75;
  } else if (grade === 7 || chapter.includes('七')) {
    yBase = chapter.includes('七上') ? 480 : 590;
    radBase = 165;
  } else if (grade === 8 || chapter.includes('八')) {
    yBase = chapter.includes('八上') ? 740 : 860;
    radBase = 255;
  } else if (grade === 9 || chapter.includes('九')) {
    yBase = chapter.includes('九上') ? 1010 : 1150;
    radBase = 350;
  }

  const hash1 = ((idx * 2654435761) >>> 0) / 4294967296;
  const hash2 = (((idx + 23) * 2654435761) >>> 0) / 4294967296;

  const y = yBase + (hash1 - 0.5) * 90;
  const angle = angleSector + (hash1 - 0.5) * 1.05;
  const r = radBase * (0.45 + hash2 * 0.55);

  const x = Math.round(Math.cos(angle) * r * 10) / 10;
  const z = Math.round(Math.sin(angle) * r * 10) / 10;
  return { x, y: Math.round(y * 10) / 10, z };
}

const cnNodeIdMap = new Map();
const cnNodes = cnTopics.map((t, idx) => {
  cnNodeIdMap.set(t.id, idx);
  const domain = t.domain || '数与代数';
  let gIdx = cnGroups.indexOf(domain);
  if (gIdx === -1) gIdx = 0;

  // 拓扑中心度计算：出度度数权重更大（出度大 = 关键先修基石知识点）
  const inD = inDegrees.get(t.id) || 0;
  const outD = outDegrees.get(t.id) || 0;
  const centrality = Math.min(0.24, Math.round((0.012 + inD * 0.007 + outD * 0.014) * 1000) / 1000);

  let age = 13;
  if (t.grade === '小学') age = 10;
  else if (t.grade === 7) age = 12;
  else if (t.grade === 8) age = 13;
  else if (t.grade === 9) age = 14;

  const { x, y, z } = getCoords(t, idx);
  const col = getCnColor(t);

  // 格式化提问/诊断描述
  let prompt = t.description || '';
  if (t.diagnostic_question && t.diagnostic_question.question) {
    prompt = `【核心诊断】${t.diagnostic_question.question}（参考答案：${t.diagnostic_question.answer}）`;
  }

  // 教材章节出处附加在细分领域中
  const fullDomain = t.chapter ? `${domain} · ${t.chapter}` : domain;

  return {
    x,
    y,
    z,
    g: gIdx,
    a: age,
    c: centrality, // 精准拓扑中心度，让大星小星参差有致
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
  H: 1400,
  ageMin: 9,
  ageMax: 15,
  nodes: cnNodes,
  edges: cnEdges
};

fs.writeFileSync('viewer/graphdata-cn-math.json', JSON.stringify(cnGraphData), 'utf8');
console.log('Saved enhanced viewer/graphdata-cn-math.json, nodes:', cnNodes.length, 'edges:', cnEdges.length);

// 3. 构建高品质全量联合图谱 (Union)
const unionGroups = [...marbleGraphData.groups, ...cnGroups];
const unionGcol = [...marbleGraphData.gcol, ...cnGcol];

const unionNodes = [...marbleGraphData.nodes];
const offset = marbleGraphData.nodes.length;

cnNodes.forEach(cnNode => {
  unionNodes.push({
    ...cnNode,
    g: cnNode.g + marbleGraphData.groups.length
  });
});

const unionEdges = [...marbleGraphData.edges];
cnEdges.forEach(e => {
  unionEdges.push([e[0] + offset, e[1] + offset, e[2]]);
});

const unionGraphData = {
  groups: unionGroups,
  gcol: unionGcol,
  H: 1400,
  ageMin: 4,
  ageMax: 15,
  nodes: unionNodes,
  edges: unionEdges
};

fs.writeFileSync('viewer/graphdata-union.json', JSON.stringify(unionGraphData), 'utf8');
console.log('Saved enhanced viewer/graphdata-union.json, nodes:', unionNodes.length, 'edges:', unionEdges.length);
