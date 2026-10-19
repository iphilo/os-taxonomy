/**
 * Input: Marble data/*.json and sources/cn-math-taxonomy/data/*.json.
 * Output: Deterministic, source-namespaced union indices in data/union/.
 * Pos: Build step for the federated data layer; it never rewrites source data.
 *
 * Update this header only when the script's input, output, or responsibility changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const marbleData = path.join(root, 'data');
const cnData = path.join(root, 'sources', 'cn-math-taxonomy', 'data');
const output = path.join(root, 'data', 'union');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const marbleTopics = readJson(path.join(marbleData, 'topics.json'));
const marbleDependencies = readJson(path.join(marbleData, 'dependencies.json'));
const cnTopics = readJson(path.join(cnData, 'topics.json'));
const cnDependencies = readJson(path.join(cnData, 'dependencies.json'));

const topics = [
  ...marbleTopics.topics.map((topic) => ({
    id: `marble:${topic.id}`,
    sourceId: 'marble-v1',
    sourceTopicId: topic.id,
    language: 'en',
    subject: topic.subject,
    domain: topic.domain,
    name: topic.name,
    ageRangeStart: topic.ageRangeStart,
    ageRangeEnd: topic.ageRangeEnd,
  })),
  ...cnTopics.map((topic) => ({
    id: `cn-math:${topic.id}`,
    sourceId: 'cn-math-taxonomy-2026-10-19',
    sourceTopicId: topic.id,
    language: 'zh-CN',
    subject: 'Mathematics',
    domain: topic.domain,
    name: topic.name,
    grade: topic.grade,
    external: topic.external,
  })),
];

const dependencies = [
  ...marbleDependencies.dependencies.map((dependency) => ({
    topicId: `marble:${dependency.topicId}`,
    prerequisiteId: `marble:${dependency.prerequisiteId}`,
    sourceId: 'marble-v1',
    strength: dependency.strength,
    reason: dependency.reason,
  })),
  ...cnDependencies.map((dependency) => ({
    topicId: `cn-math:${dependency.topicId}`,
    prerequisiteId: `cn-math:${dependency.prerequisiteId}`,
    sourceId: 'cn-math-taxonomy-2026-10-19',
    strength: dependency.strength,
    reason: dependency.reason,
  })),
];

writeJson(path.join(output, 'topics.json'), {
  version: 'union-v0.1.0',
  topicCount: topics.length,
  topics,
});
writeJson(path.join(output, 'dependencies.json'), {
  version: 'union-v0.1.0',
  edgeCount: dependencies.length,
  dependencies,
});
writeJson(path.join(output, 'manifest.json'), {
  version: 'union-v0.1.0',
  aggregation: 'federated-source-preserving',
  counts: { topics: topics.length, dependencies: dependencies.length },
  sources: [
    {
      id: 'marble-v1',
      revision: '96a7933754af672e1bfdbf7ecb05c325860c6e0d',
      topics: marbleTopics.topicCount,
      dependencies: marbleDependencies.edgeCount,
      topicPath: 'data/topics.json',
      dependencyPath: 'data/dependencies.json',
      license: 'ODbL-1.0 database; CC-BY-SA-4.0 Marble-authored text',
    },
    {
      id: 'cn-math-taxonomy-2026-10-19',
      revision: 'e47d9d1330a319b55ce7755792f75c45b3849330',
      topics: cnTopics.length,
      dependencies: cnDependencies.length,
      questions: readJson(path.join(cnData, 'questions.json')).length,
      topicPath: 'sources/cn-math-taxonomy/data/topics.json',
      dependencyPath: 'sources/cn-math-taxonomy/data/dependencies.json',
      license: 'CC-BY-NC-4.0; see sources/cn-math-taxonomy/LICENSE',
    },
  ],
});

console.log(`Built union index: ${topics.length} topics, ${dependencies.length} dependencies.`);
