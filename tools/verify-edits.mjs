import assert from 'node:assert/strict';
import { analyzeText, planBulkEdits, sampleText } from '../analysis-engine.mjs';
import { sampleScripts } from '../sample-scripts.mjs';

const guarded = [
  'Has the ability to focus improved since the switch?',
  'Do we and they have the ability to appeal the decision?',
  'The delay is due to the fact that a fuse broke.',
  'She felt unable to, but she did not have the ability to leave.',
  'He read the book In Conclusion before the show.',
  '# In Order To Grow',
  '[On a daily basis](https://example.org/resource) has the full schedule.',
  '“We work on a daily basis,\nand in conclusion we stay late,” Lee said.',
  '```md\nFurthermore, write these words exactly.\n```',
  '[Stage direction: commence the speech after the light goes out.]',
  '“অত্যন্ত গুরুত্বপূর্ণ” লেখাটির নাম উনি বোর্ডে লিখেছেন।',
  '“প্রতিদিনের ভিত্তিতে নথি রাখবেন,\nপরিশেষে ফল জানাবেন।”',
];

for (const snippet of guarded) {
  const text = `${sampleText}\n\n${snippet}`;
  const start = text.length - snippet.length;
  const { suggestions } = analyzeText(text);
  assert.equal(suggestions.some((edit) => edit.replacement !== null && edit.end > start), false, snippet);
}

let verifiedEdits = 0;
for (const text of sampleScripts) {
  const { score, suggestions } = analyzeText(text);
  const ready = suggestions.filter(({ replacement }) => replacement !== null);
  for (const { start, end, original, replacement, impact } of ready) {
    const edited = text.slice(0, start) + replacement + text.slice(end);
    assert.equal(text.slice(start, end), original);
    assert.equal(score - analyzeText(edited).score, impact);
    assert(impact > 0);
    verifiedEdits += 1;
  }
  const plan = planBulkEdits(text, suggestions);
  assert.equal(plan.count, ready.length);
  if (ready.length) assert(analyzeText(plan.text).score < score);
}

const { suggestions } = analyzeText(sampleText);
const edit = suggestions.find(({ replacement }) => replacement !== null);
assert(edit);
assert.deepEqual(planBulkEdits(sampleText, [edit, edit]), { text: sampleText, count: 0 });
assert.deepEqual(planBulkEdits(sampleText, [{ ...edit, replacement: 'tampered' }]), { text: sampleText, count: 0 });
assert.deepEqual(planBulkEdits(sampleText, [undefined]), { text: sampleText, count: 0 });
const varied = `A new line. ${sampleText}`;
assert.deepEqual(planBulkEdits(varied, suggestions), { text: varied, count: 0 });
assert.equal(analyzeText('A short excerpt.').score, null);
console.log(`Passed ${guarded.length} protected-context cases, ${verifiedEdits} exact edits, 8 batch fixtures, and stale or invalid plan checks.`);
