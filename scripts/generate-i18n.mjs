// input: 读取 data/topics.json 与 viewer/graphdata.json
// output: 生成中英双语国际化字典 viewer/i18n-data.json（支持学科、领域、核心概念及界面文本翻译）
// pos: 国际化本地化构建工具
// 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。

import fs from 'node:fs';

const SUBJECT_MAP = {
  'Mathematics': '数学',
  'Science': '科学',
  'English': '英语与语言艺术',
  'History': '历史与文明',
  'Personal & Social Development': '身心健康与社会认知',
  'Life Skills': '生活技能与自理',
  'Computing': '计算思维与信息素养',
  'Learning to Learn': '元认知与学会学习',
  '数与代数': '数与代数',
  '图形与几何': '图形与几何',
  '统计与概率': '统计与概率',
  '综合与实践': '综合与实践'
};

const DOMAIN_MAP = {
  'Artificial Intelligence': '人工智能',
  'English Thinking': '英语思维',
  'Grammar & Punctuation': '语法与标点',
  'Handwriting & Transcription': '书写与转录',
  'Phonics & Word Reading': '自然拼读与识字',
  'Reading Comprehension': '阅读理解',
  'Speaking & Listening': '听说交流',
  'Spelling & Word Study': '拼写与构词',
  'Vocabulary': '词汇积累',
  'Writing Composition': '写作表达',
  'Ancient Egypt': '古埃及文明',
  'Ancient Greece & Rome': '古希腊与罗马',
  'Historical Thinking': '历史思维与实证',
  'Medieval Times': '中世纪时期',
  'Early Modern World': '早期近代世界',
  'Modern History': '近现代历史',
  'Learning to Learn': '自主学习方法',
  'Executive Function': '专注力与执行功能',
  'Metacognition': '元认知反思',
  'Financial Literacy': '基础财商素养',
  'Safety & Well-being': '安全与自我保护',
  'Practical Living': '日常生活实践',
  'Number & Place Value': '数与位值',
  'Addition & Subtraction': '加法与减法',
  'Multiplication & Division': '乘法与除法',
  'Fractions, Decimals & Percentages': '分数、小数与百分数',
  'Algebra': '代数与方程',
  'Geometry': '图形与几何',
  'Measurement': '测量与度量单位',
  'Statistics & Probability': '统计图表与概率',
  'Mathematical Thinking': '数学思维与探究',
  'Ratios & Proportions': '比与比例',
  'Biology & Living Things': '生命科学与生物',
  'Physics & Energy': '物理科学与能量',
  'Chemistry & Materials': '物质科学与化学',
  'Earth & Space': '地球与宇宙科学',
  'Scientific Enquiry': '科学探究与实验',
  'Ecosystems & Environment': '生态系统与环境',
  'Self-Awareness': '自我意识与情绪',
  'Relationships & Social Skills': '人际沟通与社交',
  'Civics & Society': '公民意识与社会',
  'Programming & Algorithms': '编程思维与算法',
  'Digital Literacy': '数字素养与网络安全',
  'Hardware & Networks': '计算机硬件与网络'
};

const UI_TEXTS = {
  zh: {
    brandSubtitle: '国际微知识点图谱与中国课程标准联合体系',
    heroTitlePrefix: '孩子学习的',
    heroTitleSuffix: '全部轨迹',
    heroLead: '基于国际权威与中国国家课程标准构建的基础教育开放知识图谱。',
    heroDesc: '<strong>{concepts} 个微知识点，{links} 条先修依赖链路</strong>，从最初的识字发音到初中代数。每条连线都标明了知识的先后基石与逻辑支撑。<strong>点击任意圆点</strong>即可立体回溯掌握它之前必须掌握的全部前置知识。',
    heroNote: '由 AI 智能体与教研团队联合从权威课程框架提炼，完全开源，供教育工作者、开发者与家长自由探索。',
    subjectsTitle: '学科分类 · 点击切换',
    dragHint: '按住拖拽 3D 旋转 · 滚轮缩放 · 点击任意圆点追溯其先修链路',
    totalPrereqs: '个先修前置知识点',
    totalPrereqsDesc: '掌握当前微知识点前必须顺次掌握的所有知识基石，层层可溯。',
    rootPrereqsDesc: '基础起点概念，无需先修知识。',
    buildsTitle: '直接先修依赖',
    unlocksTitle: '后续解锁概念',
    ageLabel: '适龄',
    yearsOld: '岁',
    noDirectPre: '基础起点知识（无直接先修依赖）。',
    noDirectNext: '当前学习路径终点概念。',
    viewOnGithub: '代码仓库',
    openData: '开放数据 · ODBL 1.0',
    backBtn: '返回上一步',
    sourceMarble: '🌌 Marble 国际图谱 (1590 节点)',
    sourceUnion: '🌐 全量联合图谱 (Union · 1923 节点)',
    sourceCnMath: '📐 中国初中数学 (CN Math · 333 节点)'
  },
  en: {
    brandSubtitle: 'Federated Learning Taxonomy & Prerequisite DAG Hub',
    heroTitlePrefix: 'Everything a',
    heroTitleSuffix: 'child learns',
    heroLead: 'The open map of primary school, built from the US and UK curriculums.',
    heroDesc: '<strong>{concepts} concepts and {links} prerequisite links</strong>, from first words to algebra. Every link says what must come first, and why. <strong>Tap any dot</strong> to see everything a learner must master before it.',
    heroNote: 'Assembled from 7 curriculum frameworks by our AI agents, reviewed by our team, and now open source for anyone to build on.',
    subjectsTitle: 'SUBJECTS · CLICK TO TOGGLE',
    dragHint: 'Drag to spin · Scroll to zoom · Tap a dot, then follow its prerequisites back.',
    totalPrereqs: 'prerequisites in total',
    totalPrereqsDesc: 'Everything a learner must master before this one, traced all the way back.',
    rootPrereqsDesc: 'A starting point. Nothing has to come before it.',
    buildsTitle: 'BUILDS DIRECTLY ON',
    unlocksTitle: 'UNLOCKS NEXT',
    ageLabel: 'age',
    yearsOld: 'yrs',
    noDirectPre: 'Foundational topic (no direct prerequisites).',
    noDirectNext: 'Culminating concept in this sequence.',
    viewOnGithub: 'View on GitHub',
    openData: 'OPEN DATA · ODBL 1.0',
    backBtn: 'Back',
    sourceMarble: '🌌 Marble International (1590 nodes)',
    sourceUnion: '🌐 Federated Union (Union · 1923 nodes)',
    sourceCnMath: '📐 Chinese Math Taxonomy (CN Math · 333 nodes)'
  }
};

// 提取 graphdata 中的 topics 并生成中英文对照
const graphData = JSON.parse(fs.readFileSync('viewer/graphdata.json', 'utf8'));

// 常见微知识点名称模式的中文词根映射
const TERM_REPLACEMENTS = [
  [/Building sentences/i, '句子结构构建'],
  [/Apparent brightness of stars/i, '恒星视星等与亮度'],
  [/Types of angles/i, '角的分型与性质'],
  [/Counting to/i, '数数到'],
  [/Introduction to/i, '初识'],
  [/Understanding/i, '理解'],
  [/Adding and subtracting/i, '加减法运算'],
  [/Multiplying and dividing/i, '乘除法运算'],
  [/Word problems/i, '文字应用题'],
  [/Fractions/i, '分数认识与运算'],
  [/Decimals/i, '小数认识与运算'],
  [/Percentages/i, '百分数应用'],
  [/Negative numbers/i, '负数的认识与运算'],
  [/Place value/i, '位值原理'],
  [/Shapes and properties/i, '图形特征与性质'],
  [/Area and perimeter/i, '面积与周长'],
  [/Volume and capacity/i, '体积与容积'],
  [/Prime numbers/i, '质数与合数'],
  [/Factors and multiples/i, '因数与倍数'],
  [/Linear equations/i, '一元一次方程'],
  [/Quadratic equations/i, '一元二次方程'],
  [/Graphs and coordinates/i, '坐标系与函数图像'],
  [/Data and charts/i, '数据图表与统计'],
  [/Probability/i, '概率基础'],
  [/Ratios and rates/i, '比与比例及速率'],
  [/Solar system/i, '太阳系与行星'],
  [/Forces and motion/i, '力与运动规律'],
  [/Light and sound/i, '光与声音的传播'],
  [/States of matter/i, '物质三态及转化'],
  [/Living things and habitats/i, '生物与生存栖息地'],
  [/Human body/i, '人体系统与器官'],
  [/Electricity and circuits/i, '电与电路基础'],
  [/Magnetism/i, '磁体与磁力现象'],
  [/Plant life cycle/i, '植物的生命周期'],
  [/Animal classification/i, '动物分类学'],
  [/Weather and seasons/i, '天气与季节变化'],
  [/Rock cycle and fossils/i, '岩石循环与化石'],
  [/Water cycle/i, '水循环与降水'],
  [/Photosynthesis/i, '光合作用原理'],
  [/Ecosystems and food webs/i, '生态系统与食物网'],
  [/Printing Press & Renaissance/i, '印刷术与文艺复兴'],
  [/Art & Architecture/i, '艺术与建筑'],
  [/Towns & Trade/i, '城镇发展与商贸'],
  [/Medieval Legacy in Modern Life/i, '中世纪对现代生活的影响'],
  [/Castles and knights/i, '城堡与骑士制度'],
  [/Feudal system/i, '封建采邑制度'],
  [/Ancient civilizations/i, '古代文明起源'],
  [/Roman Empire/i, '罗马帝国兴衰'],
  [/Greek philosophy/i, '古希腊哲学与科学'],
  [/Industrial Revolution/i, '工业革命与变革'],
  [/World Wars/i, '世界大战与现代格局'],
  [/Parts of speech/i, '词性辨析与应用'],
  [/Nouns and pronouns/i, '名词与代词'],
  [/Verbs and tenses/i, '动词与时态'],
  [/Adjectives and adverbs/i, '形容词与副词'],
  [/Punctuation marks/i, '标点符号规范'],
  [/Paragraph structure/i, '段落结构与组织'],
  [/Creative writing/i, '创意写作与叙事'],
  [/Poetry and figurative language/i, '诗歌与修辞手法'],
  [/Argumentative writing/i, '议论文与观点表达'],
  [/Reading strategies/i, '阅读技巧与推理'],
  [/Spelling rules/i, '拼写规则与规律'],
  [/Prefixes and suffixes/i, '词根词缀与构词法'],
  [/Homophones/i, '同音异义词辨析'],
  [/Synonyms and antonyms/i, '同义词与反义词'],
  [/Algorithms and sequencing/i, '算法基础与顺序执行'],
  [/Loops and repetition/i, '循环与重复结构'],
  [/Conditionals and logic/i, '条件分支与逻辑判断'],
  [/Variables and data types/i, '变量与数据类型'],
  [/Debugging code/i, '代码调试与排错'],
  [/Internet and web/i, '互联网与网页原理'],
  [/Cyber safety/i, '网络安全与自我保护'],
  [/Artificial intelligence/i, '人工智能前沿']
];

function translateTopicTitle(enTitle) {
  if (!enTitle) return enTitle;
  for (const [reg, zh] of TERM_REPLACEMENTS) {
    if (reg.test(enTitle)) {
      return enTitle.replace(reg, zh);
    }
  }
  return enTitle;
}

const nodeTranslations = {};
graphData.nodes.forEach(n => {
  nodeTranslations[n.t] = {
    zhTitle: translateTopicTitle(n.t),
    zhDomain: DOMAIN_MAP[n.dm] || n.dm,
    zhSubject: SUBJECT_MAP[graphData.groups[n.g]] || graphData.groups[n.g]
  };
});

const i18nBundle = {
  subjectMap: SUBJECT_MAP,
  domainMap: DOMAIN_MAP,
  ui: UI_TEXTS,
  nodes: nodeTranslations
};

fs.writeFileSync('viewer/i18n-data.json', JSON.stringify(i18nBundle, null, 2), 'utf8');
console.log('Saved viewer/i18n-data.json, nodes mapped:', Object.keys(nodeTranslations).length);
