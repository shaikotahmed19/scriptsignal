import { readFileSync } from 'node:fs';
import { styleFeatures } from '../analysis-features.mjs';

const [file, language = 'en'] = process.argv.slice(2);
if (!file || !['en', 'bn'].includes(language)) {
  throw new Error('Usage: node tools/fit-style-model.mjs <labeled-jsonl> en|bn');
}

const rows = readFileSync(file, 'utf8').trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const samples = rows.flatMap(({ text, label }) => {
  if (![0, 1, 'ai', 'human'].includes(label)) throw new Error(`Unsupported label ${label}.`);
  const features = styleFeatures(text, language);
  const target = label === 1 || label === 'ai' ? 1 : 0;
  return features ? [{ features, target }] : [];
});
if (new Set(samples.map(({ target }) => target)).size !== 2) throw new Error('Both labels are required.');

const names = Object.keys(samples[0].features);
const columns = names.map((name) => {
  const mean = samples.reduce((sum, row) => sum + row.features[name], 0) / samples.length;
  const variance = samples.reduce((sum, row) => sum + (row.features[name] - mean) ** 2, 0) / samples.length;
  return { name, mean, scale: Math.max(1e-5, Math.sqrt(variance)) };
});
const standardize = (value, mean, scale) => Math.max(-5, Math.min(5, (value - mean) / scale));
const vectors = samples.map(({ features, target }) => ({
  values: columns.map(({ name, mean, scale }) => standardize(features[name], mean, scale)),
  target,
}));

// A regularized logistic model keeps browser inference small and deterministic.
const weights = names.map(() => 0);
let bias = 0;
const step = .24;
const penalty = .035;
for (let epoch = 0; epoch < 500; epoch += 1) {
  const gradient = names.map(() => 0);
  let biasGradient = 0;
  for (const { values, target } of vectors) {
    const logit = weights.reduce((total, weight, index) => total + weight * values[index], bias);
    const error = 1 / (1 + Math.exp(-logit)) - target;
    biasGradient += error;
    for (let index = 0; index < weights.length; index += 1) gradient[index] += error * values[index];
  }
  bias -= step * biasGradient / vectors.length;
  for (let index = 0; index < weights.length; index += 1) {
    weights[index] -= step * (gradient[index] / vectors.length + penalty * weights[index]);
  }
}

const round = (value) => Number(value.toFixed(7));
const model = {
  bias: round(bias),
  features: columns.map(({ name, mean, scale }, index) => [name, round(mean), round(scale), round(weights[index])]),
};
process.stdout.write(`${JSON.stringify(model)}\n`);
