一旦我所属的文件夹有所变化，请更新我。

### 架构说明
本目录包含项目的 CLI 运维、构建、逆向提取及本地运行工具脚本。
负责数据集校验、多源联合索引构建、官网静态资产逆向分析及本地 HTTP 服务启动。

### 文件列表与功能说明
| 文件名 | 地位 | 功能 |
|---|---|---|
| `relax-cn-math-physics.mjs` | 3D 物理仿真与四面中空薄壳构建器 | 严格逆向并对齐 Marble 官方正四面中空薄壳方程（$W(Y)=0.1859Y+106.1$）与边棱 33.4% 聚集规律，通过中空核心排斥壁垒与四面薄壳吸附势能，生成与原生完全同构的四面薄壳知识星云 |
| `reverse-marble-shell.mjs` | 3D 壳体与中空规则逆向工具 | 定量逆向 Marble 原生 1,590 个节点的各高度中空度（内部点为 0.0%）、外表面半宽分布与壳体厚度 |
| `fit-marble-pyramid-shell.mjs` | 四面中空薄壳方程精确定量拟合器 | 最小二乘法精密拟合原生四面中轴方程、法向壳层厚度分布及边缘棱角聚集概率直方图 |
| `analyze-marble-geometry.mjs` | 3D 几何规律与脊柱分析工具 | 定量分析 Marble 原生节点的极坐标角向直方图、四棱脊柱密度与空间分布 |
| `bake-enhanced-graphdata.mjs` | 拓扑中心度与视觉色彩梯级增强器 | 计算拓扑入度/出度中心度，注入初中数学精细领域调色板与平滑 3D 漏斗分布 |
| `bake-graphdata-for-all-sources.mjs` | 多源图谱数据统一烘焙器 | 为 Marble、初中数学及联合图谱分别生成统一标准格式的 3D 图谱 JSON 文件 |
| `bake-native-geometry-cn-math.mjs` | 学龄梯度 3D 几何重构工具 | 严格依照真实学龄梯度重构初中数学 3D 坐标，小学居下部，初中居上部穹顶 |
| `generate-i18n.mjs` | 国际化双语字典构建器 | 构建包含 8 大学科、54 个细分领域、核心概念及界面文本的中英双语本地化字典 |
| `build-chinese-primary-viewer.mjs` | 核心图谱展示层构建器 | 生成 100% 像素级复刻官方 3D 交互、防遮挡排版、思源宋体/Newsreader 高级字体与数据源切换器的 index.html |
| `validate.mjs` | 核心校验器 | 零外部依赖校验 Marble 基础数据集的完整性、引用有效性及哈希 |
| `validate-union.mjs` | 联合校验器 | 校验合并后的聚合图谱（Union Index）的参照完整性与命名空间规则 |
| `build-union-index.mjs` | 联合索引构建器 | 从 Marble 及中国数学等各子源构建全量命名空间聚合索引 `data/union/` |
| `serve.mjs` | 本地 Web 服务器 | 启动零依赖轻量 HTTP 服务，托管本地 3D 知识图谱查看器 |
| `reverse-engineer.mjs` | 逆向工程分析脚本 | 从 withmarble.com 抓取页面并解析内嵌 3D 渲染器与坐标算法 |
| `extract-official-assets.mjs` | 官方资产提取器 | 提取官网的 graphdata.json、原生 CSS 与 HTML 骨架 |
| `build-pixel-perfect-viewer.mjs` | 官方页面构建器 | 将提取的官方代码注入规范头并生成 100% 像素级复刻的 viewer/index.html |
| `curriculum.html` | 官方原始页面快照 | 抓取自 withmarble.com 官方主站的完整前端 HTML 原始快照，供逆向提取分析使用 |
| `official-engine.js` | 官网原生 3D 渲染引擎源码 | 逆向提取出的官方原生 Three.js 倒圆锥渲染逻辑与交互控制器源码 |
| `inline-script-0.js` | 官方内联数据脚本快照 | 官方主页内嵌的完整微知识点数据脚本临时备份 |
| `inline-script-1.js` | 官方内联交互脚本快照 | 官方主页内嵌的交互与动画逻辑脚本临时备份 |

