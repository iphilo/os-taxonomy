// input: 读取 viewer/graphdata-marble.json
// output: 输出 Marble 原生正四棱中空倒锥壳体的严格数学几何方程与分布参数
// pos: 四面中空薄壳几何精确定量拟合脚本
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import fs from 'node:fs';

const nodes = JSON.parse(fs.readFileSync('viewer/graphdata-marble.json', 'utf8')).nodes;

console.log('=== 精密拟合 Marble 原生四面中空薄壳几何方程 ===');

// 提取每个节点的主轴坐标 (major = max(|x|, |z|)) 与副轴坐标 (minor = min(|x|, |z|))
const pts = nodes.map(n => {
  const ax = Math.abs(n.x);
  const az = Math.abs(n.z);
  return {
    x: n.x,
    y: n.y,
    z: n.z,
    major: Math.max(ax, az),
    minor: Math.min(ax, az),
    face: ax >= az ? (n.x >= 0 ? '+X' : '-X') : (n.z >= 0 ? '+Z' : '-Z')
  };
});

// 1. 统计 4 个面的节点数量分配
const faceCounts = { '+X': 0, '-X': 0, '+Z': 0, '-Z': 0 };
pts.forEach(p => faceCounts[p.face]++);
console.log('四面节点数量分布:', faceCounts);

// 2. 最小二乘法拟合 W(Y) 表面半宽方程
// 选取 Y 从 200 到 1300 的主要层级
const yPts = pts.filter(p => p.y >= 100 && p.y <= 1350);
const n = yPts.length;
const sumY = yPts.reduce((s,p)=>s+p.y, 0);
const sumW = yPts.reduce((s,p)=>s+p.major, 0);
const sumYW = yPts.reduce((s,p)=>s+p.y*p.major, 0);
const sumY2 = yPts.reduce((s,p)=>s+p.y*p.y, 0);

const slope = (n * sumYW - sumY * sumW) / (n * sumY2 - sumY * sumY);
const intercept = (sumW - slope * sumY) / n;

console.log(`\n四面表面半宽中轴方程: W_mid(Y) = ${slope.toFixed(4)} * Y + ${intercept.toFixed(1)}`);

// 3. 计算壳体厚度 (Shell Thickness: major - W_mid(Y) 的分布)
const residuals = yPts.map(p => p.major - (slope * p.y + intercept));
residuals.sort((a,b)=>a-b);
const p5 = residuals[Math.floor(n * 0.05)];
const p95 = residuals[Math.floor(n * 0.95)];
const std = Math.sqrt(residuals.reduce((s,r)=>s+r*r,0)/n);
console.log(`表面壳体法向厚度分布: 5%分位=${p5.toFixed(1)}, 95%分位=${p95.toFixed(1)}, 标准差=${std.toFixed(1)}`);
console.log(`表面壳层半厚度 delta_W ≈ ${( (p95 - p5) / 2 ).toFixed(1)}`);

// 4. 分析副轴坐标 minor (点在面上的横向分布: 是均匀还是向棱角聚集?)
// normalized_minor = minor / major (范围 0 到 1: 0 表示面中心, 1 表示在四条边棱上)
const normMinors = yPts.map(p => p.minor / p.major);
const histBins = 5;
const minorHist = new Array(histBins).fill(0);
normMinors.forEach(m => {
  const b = Math.min(histBins - 1, Math.floor(m * histBins));
  minorHist[b]++;
});
console.log('\n节点在面内的横向位置分布 (0=面中心, 1=边棱角部):');
minorHist.forEach((c, i) => {
  const from = (i * 0.2).toFixed(1);
  const to = ((i + 1) * 0.2).toFixed(1);
  const pct = (c / n * 100).toFixed(1);
  console.log(`  [${from} ~ ${to}]: ${c} 个 (${pct}%) ${'#'.repeat(Math.round(c / 20))}`);
});
