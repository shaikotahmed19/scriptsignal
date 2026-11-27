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
  'In the event that our crew hosted last week, a guest asked to see a longer cut.',
  'We met in the event that follows the opening ceremony.',
  'At a later date of your choosing, please bring the original ledger.',
  'Commander Commence was the only person to see the light go out.',
  'COMMENCE (CONT’D)\n(commence the movement after the lights go out)',
  'The contract lists an on a daily basis fee for use of the studio.',
  'প্রতিদিনের ভিত্তিতে হার নির্ধারণ করতে পরিচালকের সঙ্গে কথা বললাম।',
  'প্রতিদিনের ভিত্তিতে ভাড়ার হিসাব করার জন্য আগের নথি দেখে নিন।',
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
const directionsOnly = `HOST:\nGUEST:\n[Stage direction: commence when the lights go down.]\n(Commence the countdown while the producers are testing the microphones.)\nSPEAKER 1:\nSPEAKER 2:\n[Stage direction: step out after the countdown.]`;
const stageOnlyResult = analyzeText(directionsOnly);
assert.equal(stageOnlyResult.proseWordCount, 0);
assert.equal(stageOnlyResult.score, null);
const english = analyzeText(sampleText);
const englishWithBangla = analyzeText(`${sampleText} লক্ষ্য।`);
assert.equal(englishWithBangla.method, english.method);
assert(Math.abs(englishWithBangla.score - english.score) <= 3);
const bangla = sampleScripts[1];
assert.equal(analyzeText(`${bangla} recap`).method, analyzeText(bangla).method);
const dashed = `We used to meet beside the tide gauge - the blue one by the pump house. ${sampleText}`;
assert.equal(analyzeText(dashed).score, analyzeText(dashed.replace(' - ', '\n- ')).score);
const namedDialogue = sampleText.split('\n\n').map((section, index) => `${index % 2 ? 'Mira' : 'Jon'}: ${section}`).join('\n');
assert.equal(analyzeText(namedDialogue).method, 'dialogue-rules');
assert.equal(analyzeText(namedDialogue.replace(/^(Mira|Jon)/gm, (name) => name.toUpperCase())).method, 'dialogue-rules');
const dialogue = analyzeText(sampleText, { format: 'dialogue' });
assert.equal(dialogue.method, 'dialogue-rules');
const dialogueBatch = planBulkEdits(sampleText, dialogue.suggestions, { format: 'dialogue' });
assert(dialogueBatch.count > 0);
assert(analyzeText(dialogueBatch.text, { format: 'dialogue' }).score < dialogue.score);

const shortBatch = 'In order to finish on time, we practice on a daily basis before the shop opens and drive straight home after work tonight.';
const shortEdits = analyzeText(shortBatch).suggestions;
assert.equal(shortEdits.filter(({ replacement }) => replacement !== null).length, 2);
assert.deepEqual(planBulkEdits(shortBatch, shortEdits), { text: shortBatch, count: 0, reason: 'too-short' });
const switchingBatch = 'In order to cook a meal, we try to work on a daily basis like it is a game that we want to win.';
const switchingEdits = analyzeText(switchingBatch).suggestions;
assert.equal(switchingEdits.filter(({ replacement }) => replacement !== null).length, 2);
assert.deepEqual(planBulkEdits(switchingBatch, switchingEdits), { text: switchingBatch, count: 0, reason: 'different-method' });

for (const format of ['auto', 'dialogue']) {
  const unwrapped = analyzeText(sampleText, { format });
  for (const newline of ['\n', '\r\n', '\r']) {
    const wrapped = sampleText.split('\n\n').map((para) => para.match(/\S+(?: \S+){0,5}/g).join(newline)).join(newline.repeat(2));
    const result = analyzeText(wrapped, { format });
    assert.equal(result.score, unwrapped.score);
    assert.equal(result.method, unwrapped.method);
    for (const edit of result.suggestions) {
      assert.equal(wrapped.slice(edit.start, edit.end), edit.original);
      if (/[\r\n]/u.test(edit.original)) assert.equal(edit.replacement, null);
    }
  }
}

console.log(`Passed ${guarded.length} protected-context cases, ${verifiedEdits} exact edits, ${sampleScripts.length + 2} batch fixtures, and stale or invalid plan checks.`);
console.log('Passed prose eligibility, bilingual stability, and hard-wrapped dialogue and prose checks.');
