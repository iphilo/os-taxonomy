// input: 依赖 node:http, node:fs, node:path, node:url, node:child_process 等 Node.js 原生内置模块
// output: 启动本地 HTTP 静态服务器并提供知识图谱数据与可视化静态页面托管
// pos: 本地运行工具脚本，为用户提供一键本地查看知识图谱的服务端环境
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 默认路由重定向到 viewer 页面
  if (pathname === '/' || pathname === '') {
    res.writeHead(302, { Location: '/viewer/' });
    res.end();
    return;
  }

  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  const safePath = path.normalize(path.join(ROOT_DIR, pathname));

  // 防止目录穿透
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 允许跨域以便本地灵活调用
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

const DEFAULT_PORT = 3000;

function startServer(port) {
  server.listen(port, () => {
    const url = `http://localhost:${port}/viewer/`;
    console.log('\n======================================================');
    console.log('🚀 Learning Taxonomy Hub - 本地知识图谱可视化服务已启动');
    console.log(`🌐 访问地址: ${url}`);
    console.log('💡 按 Ctrl + C 即可停止服务');
    console.log('======================================================\n');

    // 尝试在 Windows / macOS / Linux 打开默认浏览器
    const startCmd = process.platform === 'win32' ? 'start' :
                     process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${startCmd} ${url}`, (cmdErr) => {
      // 浏览器打开失败不影响服务运行
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`端口 ${port} 已被占用，尝试使用端口 ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('服务启动失败:', err);
    }
  });
}

startServer(DEFAULT_PORT);
