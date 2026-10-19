// input: 读取 scripts/curriculum.html
// output: 提取官方完整的 graphdata.json、原生 HTML 模板与内联 CSS
// pos: 官方原生资源提取器
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import fs from 'node:fs';

const html = fs.readFileSync('scripts/curriculum.html', 'utf8');

// 1. 提取 graphdata
const graphDataMatch = html.match(/<script\s+id="graphdata"\s+type="application\/json">([\s\S]*?)<\/script>/i);
if (graphDataMatch) {
  const jsonStr = graphDataMatch[1].trim();
  fs.writeFileSync('viewer/graphdata.json', jsonStr, 'utf8');
  console.log('Saved viewer/graphdata.json, length:', jsonStr.length);
} else {
  console.error('graphdata script not found!');
}

// 2. 提取内联 style
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
if (styleMatch) {
  const css = styleMatch[1].trim();
  fs.writeFileSync('viewer/official-style.css', css, 'utf8');
  console.log('Saved viewer/official-style.css, length:', css.length);
} else {
  console.error('style not found!');
}

// 3. 提取 body 内的 DOM 结构（去除 script）
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
  let bodyContent = bodyMatch[1];
  // 移除 script 标签
  bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '');
  fs.writeFileSync('viewer/official-body.html', bodyContent.trim(), 'utf8');
  console.log('Saved viewer/official-body.html, length:', bodyContent.length);
}
