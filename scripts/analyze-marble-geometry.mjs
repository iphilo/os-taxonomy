// input: 读取 viewer/graphdata-marble.json
// output: 输出 Marble 原生节点的立体几何分布、四条边/脊柱特征分析
// pos: 几何规律分析脚本
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import fs from 'node:fs';

const marbleData = JSON.parse(fs.readFileSync('viewer/graphdata-marble.json', 'utf8'));
const nodes = marbleData.nodes;
console.log('Marble 节点总数:', nodes.length);

let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
nodes.forEach(n => {
  minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
  minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
  minZ = Math.min(minZ, n.z); maxZ = Math.max(maxZ, n.z);
});
console.log('坐标范围:', { minX, maxX, minY, maxY, minZ, maxZ });

// 统计极角分布 theta = atan2(z, x)
const bins = 36;
const hist = new Array(bins).fill(0);
nodes.forEach(n => {
  const theta = Math.atan2(n.z, n.x); // [-PI, PI]
  let deg = theta * 180 / Math.PI;
  if (deg < 0) deg += 360;
  const bin = Math.floor(deg / (360 / bins)) % bins;
  hist[bin]++;
});

console.log('\n=== 极角直方图 (每10度一个bin) ===');
hist.forEach((count, i) => {
  const deg = i * 10;
  const bar = '#'.repeat(Math.round(count / 2));
  console.log(`${String(deg).padStart(3, ' ')}° - ${String(deg + 10).padStart(3, ' ')}°: ${String(count).padStart(3, ' ')} ${bar}`);
});

// 分析 4 个脊线角度附近的节点的 R (径向距离) 分布
// 脊线角度: 37°, 133°, 228°, 315°
const ridges = [37, 133, 228, 315];

nodes.forEach(n => {
  let deg = Math.atan2(n.z, n.x) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  n.deg = deg;
  n.r = Math.hypot(n.x, n.z);
});

console.log('\n=== 四条主脊线 vs 鞍部数据特征 ===');
ridges.forEach((ridgeDeg, idx) => {
  const ridgeNodes = nodes.filter(n => {
    let diff = Math.abs(n.deg - ridgeDeg);
    if (diff > 180) diff = 360 - diff;
    return diff <= 15;
  });
  const avgR = ridgeNodes.reduce((s, n) => s + n.r, 0) / ridgeNodes.length;
  const maxR = Math.max(...ridgeNodes.map(n => n.r));
  const avgY = ridgeNodes.reduce((s, n) => s + n.y, 0) / ridgeNodes.length;
  console.log('脊线 ' + (idx + 1) + ' (' + ridgeDeg + '°): 节点数 ' + ridgeNodes.length + ', 平均 R=' + avgR.toFixed(1) + ', 最大 R=' + maxR.toFixed(1) + ', 平均 Y=' + avgY.toFixed(1));
});

// 鞍部节点 (距离任何一条脊线 > 20°)
const saddleNodes = nodes.filter(n => {
  return ridges.every(ridgeDeg => {
    let diff = Math.abs(n.deg - ridgeDeg);
    if (diff > 180) diff = 360 - diff;
    return diff > 20;
  });
});
const saddleAvgR = saddleNodes.reduce((s, n) => s + n.r, 0) / saddleNodes.length;
const saddleMaxR = Math.max(...saddleNodes.map(n => n.r));
console.log('鞍部区域 (非脊线): 节点数 ' + saddleNodes.length + ', 平均 R=' + saddleAvgR.toFixed(1) + ', 最大 R=' + saddleMaxR.toFixed(1));

// 分析边 links 在脊线内部 vs 脊线之间的连接比例
const links = marbleData.links || [];
console.log('\n=== 原生边的连通特征 (总边数: ' + links.length + ') ===');
const nodeMap = new Map();
nodes.forEach(n => nodeMap.set(n.id, n));

let ridgeInternalLinks = 0;
let crossRidgeLinks = 0;
links.forEach(l => {
  const s = nodeMap.get(l.source);
  const t = nodeMap.get(l.target);
  if (!s || !t) return;
  // 找 s 和 t 各自属于哪条脊线 (如果在 20 度以内)
  const getRidge = (deg) => {
    for (let i = 0; i < ridges.length; i++) {
      let diff = Math.abs(deg - ridges[i]);
      if (diff > 180) diff = 360 - diff;
      if (diff <= 22) return i;
    }
    return -1;
  };
  const rs = getRidge(s.deg);
  const rt = getRidge(t.deg);
  if (rs !== -1 && rt !== -1) {
    if (rs === rt) ridgeInternalLinks++;
    else crossRidgeLinks++;
  }
});
console.log('脊线内部连边 (同向脊线向上生长): ' + ridgeInternalLinks);
console.log('跨脊线连边 (横向网络拉紧): ' + crossRidgeLinks);


// 分析 Marble 的 group (领域) 与极角的关系
console.log('\n=== Marble 原生分组与空间极角/象限的关系 ===');
const groupStats = {};
nodes.forEach(n => {
  const g = n.group || 'unknown';
  if (!groupStats[g]) groupStats[g] = [];
  let deg = Math.atan2(n.z, n.x) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  groupStats[g].push({ x: n.x, y: n.y, z: n.z, deg });
});

Object.keys(groupStats).forEach(g => {
  const pts = groupStats[g];
  const avgY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const avgDeg = pts.reduce((s, p) => s + p.deg, 0) / pts.length;
  // 极角方差或者聚类
  console.log(`组 ${g} (数量: ${pts.length}): 平均 Y: ${avgY.toFixed(1)}, 平均极角: ${avgDeg.toFixed(1)}°`);
});
