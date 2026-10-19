// input: 读取 data/topics.json, dependencies.json, sources/cn-math-taxonomy/data/, data/union/
// output: 为 marble, cn-math, union 三大数据集分别生成统一格式的 graphdata JSON 文件
// pos: 统一 3D 坐标烘焙生成工具
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import fs from 'node:fs';
import path from 'node:path';

// 读取官方已经烘焙好的 marble graphdata 作为参考与基准
const marbleGraphData = JSON.parse(fs.readFileSync('viewer/graphdata.json', 'utf8'));

// 1. 保存独立的 graphdata-marble.json
fs.writeFileSync('viewer/graphdata-marble.json', JSON.stringify(marbleGraphData), 'utf8');
console.log('Saved viewer/graphdata-marble.json');

// 2. 为 cn-math 生成 graphdata-cn-math.json
const cnTopics = JSON.parse(fs.readFileSync('sources/cn-math-taxonomy/data/topics.json', 'utf8'));
const cnDeps = JSON.parse(fs.readFileSync('sources/cn-math-taxonomy/data/dependencies.json', 'utf8'));

const cnGroups = ['数与代数', '图形与几何', '统计与概率', '综合与实践'];
const cnGcol = ['#F59E0B', '#06B6D4', '#10B981', '#EC4899'];
const domainColors = {
  '数与代数': '#FBBF24',
  '图形与几何': '#22D3EE',
  '统计与概率': '#34D399',
  '综合与实践': '#F472B6'
};

const cnNodeIdMap = new Map();
const cnNodes = cnTopics.map((t, idx) => {
  cnNodeIdMap.set(t.id, idx);
  const domain = t.domain || '数与代数';
  let gIdx = cnGroups.indexOf(domain);
  if (gIdx === -1) gIdx = 0;

  // 年龄映射：小学 5-11 岁，七年级 12 岁，八年级 13 岁，九年级 14-15 岁
  let age = 13;
  if (t.grade === '小学') age = 10;
  else if (t.grade === '七年级上' || t.grade === '七年级下') age = 12;
  else if (t.grade === '八年级上' || t.grade === '八年级下') age = 13;
  else if (t.grade === '九年级上' || t.grade === '九年级下') age = 14;

  // 倒圆锥几何分布 (H = 1400)
  // 年龄 9 岁在下部 (y ~ 300), 15 岁在上部 (y ~ 1100)
  const normAge = (age - 8) / 8; // 0.1 ~ 0.9
  const y = 200 + normAge * 950 + ((idx % 7) - 3) * 8;

  // 漏斗半径：从底部 60 到顶部 380
  const radius = 60 + Math.pow(normAge, 1.3) * 320;

  // 学科分布角度
  const baseAngle = (gIdx / cnGroups.length) * Math.PI * 2;
  const hash = ((idx * 1664525 + 1013904223) >>> 0) / 4294967296;
  const hash2 = (((idx + 17) * 1664525 + 1013904223) >>> 0) / 4294967296;

  const angle = baseAngle + (hash - 0.5) * 1.1;
  const r = radius * (0.4 + hash2 * 0.6);

  const x = Math.round(Math.cos(angle) * r * 10) / 10;
  const z = Math.round(Math.sin(angle) * r * 10) / 10;

  return {
    x,
    y: Math.round(y * 10) / 10,
    z,
    g: gIdx,
    a: age,
    c: 0.035,
    col: domainColors[domain] || '#FBBF24',
    dm: domain,
    t: t.name,
    q: t.description || ''
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
console.log('Saved viewer/graphdata-cn-math.json, nodes:', cnNodes.length, 'edges:', cnEdges.length);

// 3. 为 union 生成 graphdata-union.json (融合 Marble + cn-math)
// 合并分组：Marble 8个 + cn-math 4个
const unionGroups = [...marbleGraphData.groups, ...cnGroups];
const unionGcol = [...marbleGraphData.gcol, ...cnGcol];

// 将 cnNodes 偏移索引并追加
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
console.log('Saved viewer/graphdata-union.json, nodes:', unionNodes.length, 'edges:', unionEdges.length);
