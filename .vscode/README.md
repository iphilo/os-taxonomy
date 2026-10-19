一旦我所属的文件夹有所变化，请更新我。

### 架构说明
本目录包含 VS Code / Antigravity IDE 运行时配置。
提供 F5 一键启动知识图谱 Web 服务、核心数据校验与 3D 物理力导向退火仿真调试入口。

### 文件列表与功能说明
| 文件名 | 地位 | 功能 |
|---|---|---|
| `launch.json` | F5 调试配置文件 | 定义 F5 默认启动本地 Web 服务 (`scripts/serve.mjs`)，以及全量图谱校验与物理力导向仿真调试配置 |
| `tasks.json` | 任务系统配置文件 | 配置与 npm scripts 绑定的后台构建与自动化测试任务 (`npm: start`, `npm: validate:all`) |
