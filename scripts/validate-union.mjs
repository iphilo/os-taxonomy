/**
 * Input: data/union indices and their Marble/CN source data.
 * Output: Non-zero exit on count, namespace, or edge-integrity failures.
 * Pos: Validation gate for the federated data layer.
 *
 * Update this header only when the script's input, output, or responsibility changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const union = path.join(root, 'data', 'union');
const topics = readJson(path.join(union, 'topics.json'));
const dependencies = readJson(path.join(union, 'dependencies.json'));
const manifest = readJson(path.join(union, 'manifest.json'));

const ids = new Set();
const errors = [];
for (const topic of topics.topics) {
  if (ids.has(topic.id)) errors.push(`Duplicate topic ID: ${topic.id}`);
  ids.add(topic.id);
  if (!/^(marble:mt_|cn-math:cnm_)/.test(topic.id)) errors.push(`Unexpected namespace: ${topic.id}`);
}
for (const dependency of dependencies.dependencies) {
  if (!ids.has(dependency.topicId)) errors.push(`Missing edge topic: ${dependency.topicId}`);
  if (!ids.has(dependency.prerequisiteId)) errors.push(`Missing edge prerequisite: ${dependency.prerequisiteId}`);
  if (dependency.strength !== 'hard' && dependency.strength !== 'soft') errors.push(`Invalid strength: ${dependency.strength}`);
}
const inDegree = new Map([...ids].map((id) => [id, 0]));
const unlocked = new Map([...ids].map((id) => [id, []]));
for (const dependency of dependencies.dependencies) {
  inDegree.set(dependency.topicId, inDegree.get(dependency.topicId) + 1);
  unlocked.get(dependency.prerequisiteId).push(dependency.topicId);
}
const queue = [...ids].filter((id) => inDegree.get(id) === 0);
let visited = 0;
while (queue.length) {
  const id = queue.shift();
  visited++;
  for (const unlockedId of unlocked.get(id)) {
    inDegree.set(unlockedId, inDegree.get(unlockedId) - 1);
    if (inDegree.get(unlockedId) === 0) queue.push(unlockedId);
  }
}
if (visited !== ids.size) errors.push('Dependency index contains a cycle.');
if (topics.topicCount !== topics.topics.length) errors.push('Topic count does not match topic records.');
if (dependencies.edgeCount !== dependencies.dependencies.length) errors.push('Edge count does not match dependency records.');
if (manifest.counts.topics !== topics.topicCount) errors.push('Manifest topic count does not match topic index.');
if (manifest.counts.dependencies !== dependencies.edgeCount) errors.push('Manifest edge count does not match dependency index.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`UNION VALIDATION PASSED: ${topics.topicCount} topics, ${dependencies.edgeCount} dependencies.`);
