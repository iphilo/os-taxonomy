// input: 读取 scripts/inline-script-0.js 与 inline-script-1.js
// output: 输出官网 3D 渲染器的完整算法、着色器和布局逻辑
// pos: 逆向解析工具脚本
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import fs from 'node:fs';

const code0 = fs.readFileSync('scripts/inline-script-0.js', 'utf8');
const code1 = fs.readFileSync('scripts/inline-script-1.js', 'utf8');

console.log('Script 0 size:', code0.length);
console.log('Script 1 size:', code1.length);

// 提取与 3D 相关的核心代码段
function searchSnippets(code, target, radius = 200) {
  let pos = 0;
  let matches = [];
  while ((pos = code.indexOf(target, pos)) !== -1) {
    const start = Math.max(0, pos - radius);
    const end = Math.min(code.length, pos + target.length + radius);
    matches.push(code.slice(start, end));
    pos += target.length;
    if (matches.length >= 5) break;
  }
  return matches;
}

const terms = ['PerspectiveCamera', 'ShaderMaterial', 'OrbitControls', 'prerequisiteId', 'ageRangeStart', 'geometry', 'lineSegments', 'LineSegments', 'AdditiveBlending'];
for (const t of terms) {
  const res = searchSnippets(code0, t, 120);
  console.log(`=== Matches for [${t}] (${res.length}) ===`);
  res.slice(0, 2).forEach((snip, i) => {
    console.log(`[#${i}]`, snip.replace(/[\r\n]+/g, ' '));
  });
}
