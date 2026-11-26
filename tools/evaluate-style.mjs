import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [file, cutoff = '50', enginePath = 'analysis-engine.mjs'] = process.argv.slice(2);
const threshold = Number(cutoff);
if (!file || !Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
  throw new Error('Usage: node tools/evaluate-style.mjs <labeled-jsonl> [threshold] [engine-path]');
}
const { analyzeText, planBulkEdits } = await import(pathToFileURL(resolve(enginePath)).href);
const rows = readFileSync(file, 'utf8').trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const humanScores = Array(101).fill(0);
const modelScores = Array(101).fill(0);
let untallied = 0;
let withSuggestions = 0;
let withReadyEdits = 0;
let safeBatches = 0;

for (const { text, label } of rows) {
  if (![0, 1, 'human', 'ai'].includes(label)) throw new Error(`Unsupported label ${label}.`);
  const result = analyzeText(text);
  if (result.score === null) {
    untallied += 1;
    continue;
  }
  const histogram = label === 1 || label === 'ai' ? modelScores : humanScores;
  histogram[result.score] += 1;
  if (result.suggestions.length > 0) withSuggestions += 1;
  const ready = result.suggestions.filter(({ replacement }) => replacement !== null).length;
  if (ready > 0) {
    withReadyEdits += 1;
    if (planBulkEdits?.(text, result.suggestions).count === ready) safeBatches += 1;
  }
}

const sum = (values) => values.reduce((total, value) => total + value, 0);
const humans = sum(humanScores);
const models = sum(modelScores);
if (!humans || !models) throw new Error('Both labels must have scored texts.');
const truePositives = sum(modelScores.slice(threshold));
const falsePositives = sum(humanScores.slice(threshold));
let rankedPairs = 0;
let lowerHumans = 0;
for (let score = 0; score <= 100; score += 1) {
  rankedPairs += modelScores[score] * (lowerHumans + .5 * humanScores[score]);
  lowerHumans += humanScores[score];
}

const round = (value) => Number(value.toFixed(4));
console.log(JSON.stringify({
  humans, models, untallied, threshold, truePositives, falsePositives,
  auroc: round(rankedPairs / (humans * models)),
  balancedAccuracy: round((truePositives / models + 1 - falsePositives / humans) / 2),
  withSuggestions, withReadyEdits, safeBatches: planBulkEdits ? safeBatches : null,
}, null, 2));
