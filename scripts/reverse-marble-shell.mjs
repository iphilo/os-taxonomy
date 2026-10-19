// input: 读取 viewer/graphdata-marble.json 官方原生 1,590 节点数据
// output: 输出官方原生 3D 几何的空心度、表面壳层方程、四面与四边分布规则
// pos: 官方原生 3D 知识图谱几何与壳体深度逆向分析脚本
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import fs from 'node:fs';

const marbleData = JSON.parse(fs.readFileSync('viewer/graphdata-marble.json', 'utf8'));
const nodes = marbleData.nodes;

console.log('=== Marble 原生 1,590 节点 3D 壳体与中空规则深度逆向 ===');

// 1. 分析每一个节点的极坐标: R = hypot(x, z), theta = atan2(z, x)
nodes.forEach(n => {
  n.r = Math.hypot(n.x, n.z);
  let deg = Math.atan2(n.z, n.x) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  n.deg = deg;
});

// 2. 统计各高度 Y 下的半径 R 分布，测定中空内径 (Inner Radius) 与外径 (Outer Radius)
console.log('\n=== 各高度层级 Y 的半径 R 分布 (测试中空度) ===');
for (let y = 100; y <= 1300; y += 150) {
  const layer = nodes.filter(n => n.y >= y - 75 && n.y < y + 75);
  if (layer.length === 0) continue;
  const rs = layer.map(n => n.r).sort((a,b)=>a-b);
  const minR = rs[0];
  const p10R = rs[Math.floor(rs.length * 0.1)];
  const medianR = rs[Math.floor(rs.length * 0.5)];
  const p90R = rs[Math.floor(rs.length * 0.9)];
  const maxR = rs[rs.length - 1];
  
  // 统计 r < 0.5 * maxR 的节点比例 (内部节点比例)
  const innerCount = rs.filter(r => r < 0.5 * maxR).length;
  const innerRatio = (innerCount / layer.length * 100).toFixed(1);

  console.log(`Y=${String(y).padStart(4, ' ')} (节点数 ${String(layer.length).padStart(3, ' ')}): minR=${minR.toFixed(1)}, p10R=${p10R.toFixed(1)}, medianR=${medianR.toFixed(1)}, maxR=${maxR.toFixed(1)} | 内部点(r<0.5*maxR): ${innerRatio}%`);
}

// 3. 逆向四面的平面方程或曼哈顿距离 (|X| + |Z| 或旋转后的坐标)
// 观察原生四个脊线在 37°, 133°, 228°, 315°
// 这相当于将坐标系旋转约 40° 之后的正方形/四边形边界！
console.log('\n=== 坐标旋转测试：探寻四面平面的法线方向 ===');
// 尝试旋转角度 alpha，使得四个角对齐坐标轴 (X, Z) 或使四个面对齐坐标轴
// 脊线在 37°、133°、228°、315°，大约对齐对角线 45°, 135°, 225°, 315°
// 如果四个角是对角线，那么四个面的法线方向就是 0°, 90°, 180°, 270°！
// 即四个面分别平行于 X 轴或 Z 轴！即 |X| <= L, |Z| <= L (正方形/长方形截面)！
// 或者截面是菱形/旋转正方形？
// 让我们计算 |x| 与 |z| 的分布，以及旋转 alpha 之后的坐标分布！

for (let y = 300; y <= 1100; y += 200) {
  const layer = nodes.filter(n => n.y >= y - 100 && n.y < y + 100);
  if (layer.length === 0) continue;
  
  // 测试两种距离范数：
  // 范数 1: 曼哈顿范数 L1 = |x| + |z| (如果是菱形)
  // 范数 2: 切比雪夫范数 L_inf = max(|x|, |z|) (如果是正方形面)
  // 范数 3: 旋转 45° 后的切比雪夫范数
  
  const l_inf_list = layer.map(n => Math.max(Math.abs(n.x), Math.abs(n.z)));
  const l1_list = layer.map(n => Math.abs(n.x) + Math.abs(n.z));
  
  // 旋转 -37° 后的坐标 (使脊线 1 对齐 X 轴)
  const rad = -37 * Math.PI / 180;
  const rot_l_inf = layer.map(n => {
    const rx = n.x * Math.cos(rad) - n.z * Math.sin(rad);
    const rz = n.x * Math.sin(rad) + n.z * Math.cos(rad);
    return Math.max(Math.abs(rx), Math.abs(rz));
  });
  
  console.log(`\n高度层 Y=${y} (节点 ${layer.length}):`);
  console.log(`  原坐标 |x| 范围: [${Math.min(...layer.map(n=>Math.abs(n.x))).toFixed(1)}, ${Math.max(...layer.map(n=>Math.abs(n.x))).toFixed(1)}]`);
  console.log(`  原坐标 |z| 范围: [${Math.min(...layer.map(n=>Math.abs(n.z))).toFixed(1)}, ${Math.max(...layer.map(n=>Math.abs(n.z))).toFixed(1)}]`);
  console.log(`  原坐标 max(|x|,|z|) 平均值: ${(l_inf_list.reduce((a,b)=>a+b,0)/l_inf_list.length).toFixed(1)}`);
}

// 4. 分析任意点到四面平面的距离 (Shell Thickness)
// 如果图形是一个四棱倒锥体，它由 4 个平面围成：
// 面 1 (东): n1 · (x, y, z) + d1 = 0
// 面 2 (北): n2 · (x, y, z) + d2 = 0
// 面 3 (西): n3 · (x, y, z) + d3 = 0
// 面 4 (南): n4 · (x, y, z) + d4 = 0
// 让我们测试 4 个脊柱之间的 4 个面上的节点分布！
