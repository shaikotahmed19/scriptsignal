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
  'At the present time of writing, we estimate four hours for the opening segment.',
  'At the present time of each delivery, the team signs a separate receipt.',
  'The annual cost was expressed on a monthly basis to compare the two plans.',
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

for (const input of ['1234567890 '.repeat(30), `\`\`\`js\n${sampleText}\n\`\`\``, 'https://example.org/script/editing '.repeat(22)]) {
  const result = analyzeText(input);
  assert.equal(result.proseWordCount, 0);
  assert.equal(result.score, null);
  assert.equal(result.method, 'insufficient');
}
const english = analyzeText(sampleText);
const englishWithBangla = analyzeText(`${sampleText} লক্ষ্য।`);
assert.equal(englishWithBangla.method, english.method);
assert(Math.abs(englishWithBangla.score - english.score) <= 3);
const bangla = sampleScripts[1];
assert.equal(analyzeText(`${bangla} recap`).method, analyzeText(bangla).method);
const namedDialogue = sampleText.split('\n\n').map((section, index) => `${index % 2 ? 'Mira' : 'Jon'}: ${section}`).join('\n');
assert.equal(analyzeText(namedDialogue).method, 'dialogue-rules');
const dialogue = analyzeText(sampleText, { format: 'dialogue' });
assert.equal(dialogue.method, 'dialogue-rules');
const dialogueBatch = planBulkEdits(sampleText, dialogue.suggestions, { format: 'dialogue' });
assert(dialogueBatch.count > 0);
assert(analyzeText(dialogueBatch.text, { format: 'dialogue' }).score < dialogue.score);

console.log(`Passed ${guarded.length} protected-context cases, ${verifiedEdits} exact edits, 8 batch fixtures, and stale or invalid plan checks.`);
console.log('Passed prose eligibility, bilingual profile stability, and automatic and explicit dialogue checks.');
