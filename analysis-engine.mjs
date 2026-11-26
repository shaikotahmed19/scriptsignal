// These rules describe writing style. A score cannot establish who wrote a script.
const wordPattern = /[\p{L}\p{N}][\p{L}\p{M}\p{N}\u200C\u200D]*(?:[’'‑-][\p{L}\p{N}][\p{L}\p{M}\p{N}\u200C\u200D]*)*/gu;
const sentencePattern = /[^.!?।॥！？\r\n]+[.!?।॥！？]*/gu;
const wordCharacter = "[\\p{L}\\p{M}\\p{N}\\u200C\\u200D]";
export const minimumWords = 20;
const maximumSuggestions = 8;
const protectedPatterns = [
  /```[\s\S]*?(?:```|(?![\s\S]))/,
  /`[^`\r\n]+`/,
  /^[ \t]*>[ \t][^\r\n]*/,
  /https?:\/\/[^\s<>]+|www\.[^\s<>]+/,
  /(?<![\w.%+-])[\w.%+-]+@[\w.-]+\.[a-z]{2,}/,
  /“[^“”]*”|«[^«»]*»|"[^"\r\n]+"/,
  /‘[^\r\n‘]{1,1000}?’(?![\p{L}\p{M}\p{N}])/,
  /(?<![\p{L}\p{M}\p{N}])'[^\r\n]{1,1000}?'(?![\p{L}\p{M}\p{N}])/,
];
const protectedPattern = new RegExp(protectedPatterns.map((pattern) => pattern.source).join("|"), "gimu");

const rules = [
  ["in today's fast-paced world", "Generic opening", "Open on a real moment", "Name a scene your audience recognizes. A specific moment gives your listener something to picture.", 13],
  ["make a meaningful difference", "Vague outcome", "Name the actual change", "Tell the listener what changes in practice, such as what they can do faster or what gets easier.", 11],
  ["more important than ever", "Vague claim", "Explain what changed", "Give one concrete reason this matters now, with a detail you can support.", 10],
  ["embark on a journey", "Generic phrasing", "Name the first action", "Tell the listener what they can do first. A real action is easier to picture than an abstract journey.", 10],
  ["unlock your potential", "Vague outcome", "Describe a concrete outcome", "Name the skill or result the listener can expect and how they would recognize it.", 10],
  ["it is worth noting that", "Filler phrase", "Get to the point sooner", "Start with the fact or observation that follows. It can carry the emphasis on its own.", 9],
  ["it is important to note that", "Filler phrase", "Lead with the point", "State the point directly. If its importance needs explaining, show the listener what follows from it.", 10],
  ["in order to", "Filler phrase", "Trim the setup", "“To” carries the same purpose and is easier to say aloud.", 11, "to"],
  ["due to the fact that", "Filler phrase", "Use a direct cause", "“Because” keeps the cause and takes fewer words to say.", 12, "because"],
  ["as a result of", "Formal wording", "Use a simpler connector", "“Because of” expresses a cause in more conversational language.", 7, "because of"],
  ["at this point in time", "Filler phrase", "Shorten the time reference", "Give the actual time if it matters. For something happening in the present, try “right now.”", 10],
  ["on a daily basis", "Formal wording", "Say how often directly", "“Every day” is a shorter way to convey the same schedule.", 9, "every day"],
  ["has the ability to", "Formal wording", "Make the action direct", "“Can” keeps the meaning and lets the main verb arrive sooner.", 11, "can"],
  ["have the ability to", "Formal wording", "Make the action direct", "“Can” keeps the meaning and lets the main verb arrive sooner.", 11, "can"],
  ["plays a pivotal role in", "Formal wording", "Say it in everyday language", "“Is central to” keeps the emphasis on the same idea.", 9, "is central to"],
  ["a fundamental aspect of", "Formal wording", "Use familiar words", "“A core part of” keeps the emphasis and is easier to follow when spoken.", 8, "a core part of"],
  ["furthermore", "Formal transition", "Use a spoken transition", "“Also” connects the ideas with a word people often use in conversation.", 9, "also"],
  ["moreover", "Formal transition", "Use a spoken transition", "“Also” keeps the additive transition in more familiar language.", 8, "also"],
  ["in conclusion", "Formal transition", "Make the ending conversational", "“To sum up” signals the same wrap-up in spoken language.", 9, "to sum up"],
  ["utilize", "Formal wording", "Choose the everyday verb", "“Use” conveys the action with a more familiar verb.", 7, "use"],
  ["commence", "Formal wording", "Choose the everyday verb", "“Begin” conveys the same action and is easier to follow aloud.", 7, "begin"],
  ["বর্তমান যুগে", "Generic opening", "Start with a specific scene", "Use a place, moment, or situation the listener can picture immediately.", 12],
  ["আজকের দ্রুত পরিবর্তনশীল বিশ্বে", "Generic opening", "Start with a specific scene", "Name the change that affects your audience, or open with a moment when it shows up.", 13],
  ["গুরুত্বপূর্ণ ভূমিকা পালন করে", "Vague claim", "Explain how it helps", "Name what it does in this situation, then give one result the listener could recognize.", 11],
  ["জীবনে ইতিবাচক পরিবর্তন", "Vague outcome", "Name a visible result", "Tell the listener what they will do differently or what will become easier.", 11],
  ["উল্লেখ করা প্রয়োজন যে", "Filler phrase", "Lead with the point", "Say the point that follows directly and use an example if it needs emphasis.", 9],
  ["অত্যন্ত গুরুত্বপূর্ণ", "Formal wording", "Choose spoken wording", "“খুব গুরুত্বপূর্ণ” keeps the emphasis in more everyday language.", 8, "খুব গুরুত্বপূর্ণ"],
  ["বিভিন্ন ধরনের", "Formal wording", "Choose spoken wording", "“নানা রকমের” keeps the idea of variety in conversational Bengali.", 7, "নানা রকমের"],
  ["এই বিষয়টি বিবেচনা করা উচিত", "Formal wording", "Choose spoken wording", "“এটা ভেবে দেখা উচিত” keeps the recommendation and is easier to say aloud.", 10, "এটা ভেবে দেখা উচিত"],
  ["প্রতিদিনের ভিত্তিতে", "Formal wording", "Say how often directly", "“প্রতিদিন” conveys the same schedule in fewer words.", 10, "প্রতিদিন"],
  ["উপরন্তু", "Formal transition", "Use a spoken transition", "“এ ছাড়া” keeps the link between points in a conversational register.", 8, "এ ছাড়া"],
  ["পরিশেষে", "Formal transition", "Make the ending conversational", "“শেষে” gives the same closing cue in simple spoken Bengali.", 9, "শেষে"],
].map(([phrase, kind, title, description, weight, replacement], index) => ({
  id: `phrase-${index}`,
  phrase,
  kind,
  title,
  description,
  weight,
  replacement: replacement ?? null,
}));

const ruleByPhrase = new Map(rules.map((rule) => [normalizePhrase(rule.phrase), rule]));
const phrases = rules.map((rule) => phrasePattern(rule.phrase)).join("|");
const phrasingPattern = new RegExp(`(?<!${wordCharacter})(?:${phrases})(?!${wordCharacter})`, "giu");
const clauseBeginning = /(?:^|[.!?।॥！？,;:\r\n])\s*$/u;
const contextualEdits = new Map([
  ["in order to", { prefix: clauseBeginning, description: "If the phrase introduces a purpose, try “to” before the action." }],
  ["as a result of", { prefix: clauseBeginning, description: "If you’re introducing a cause, try “because of” for a shorter connection." }],
  ["in conclusion", { prefix: clauseBeginning, description: "If this is the beginning of your wrap-up, try “to sum up.”" }],
  ["have the ability to", {
    prefix: /(?:^|[.!?।॥！？,;:\r\n]|\b(?:and|but|so|because|when|if)\s+)\s*(?:i|you|we|they)\s+$/iu,
    description: "Bring the main action closer to the start. Keep any tense or condition it depends on.",
  }],
]);

function phrasePattern(phrase) {
  return Array.from(phrase, (character) => {
    if (character === " ") return "[\\t \\u00A0]+";
    if (character === "'") return "['’]";
    if (character === "-") return "[-‑–]";

    const decomposed = character.normalize("NFD");
    if (decomposed !== character) return `(?:${character}|${decomposed})`;
    return character;
  }).join("");
}

function normalizePhrase(phrase) {
  return phrase.normalize("NFC").toLowerCase().replace(/[\t \u00A0]+/g, " ").replace(/’/g, "'").replace(/[‑–]/g, "-");
}

function maskProtectedText(text) {
  // Keep all UTF-16 offsets aligned with the editor's original text.
  return text.replace(protectedPattern, (match) => match.replace(/[^\r\n.!?।॥！？]/g, "\0"));
}

export const sampleText = `In today’s fast-paced world, it is easy to think that change only comes from big decisions. In reality, small habits can make a meaningful difference.

In order to make a habit stick, give it a clear place in your day. Put a book next to your coffee mug, or leave your walking shoes by the door. Furthermore, you can make the habit easier by starting with something you can finish in two minutes.

Over time, you have the ability to change how you see yourself through these small actions. Try reading one page on a daily basis, even on a busy morning.

In conclusion, choose one thing you want to do more often and give it a moment that already belongs to you.`;

function wordsIn(text) {
  return Array.from(text.matchAll(wordPattern));
}

function sentencesIn(text) {
  const sentences = [];

  for (const match of text.matchAll(sentencePattern)) {
    const words = wordsIn(match[0]);
    if (words.length < 3) continue;

    const first = words[0];
    const third = words[2];
    const last = words.at(-1);
    sentences.push({
      start: match.index + first.index,
      openingEnd: match.index + third.index + third[0].length,
      end: match.index + last.index + last[0].length,
      words,
    });
  }

  return sentences;
}

function inspectStyle(text, wordCount) {
  const eligibleText = maskProtectedText(text);
  const sentences = sentencesIn(eligibleText);
  let phraseWeight = 0;
  const matches = [];

  for (const match of eligibleText.matchAll(phrasingPattern)) {
    const rule = ruleByPhrase.get(normalizePhrase(match[0]));
    if (!rule) continue;

    const prefix = eligibleText.slice(Math.max(0, match.index - 120), match.index);
    if (rule.phrase === "in order to" && /\b(?:put|place[ds]?|sort(?:ed|s)?|set|arrange[ds]?|keep|kept|line[ds]?|stack(?:ed|s)?)\b[^.!?।॥！？,;:\r\n]*$/iu.test(prefix)) continue;

    phraseWeight += rule.weight;
    matches.push({ rule, prefix, start: match.index, end: match.index + match[0].length });
  }

  const openings = new Set();
  const repeatedOpenings = [];
  const longSentences = [];

  for (const sentence of sentences) {
    if (sentence.words.length >= 30) longSentences.push(sentence);

    const openingWords = sentence.words.slice(0, 3);
    const opening = openingWords.map(([word]) => word.normalize("NFC").toLowerCase()).join(" ");
    if (openings.has(opening)) {
      repeatedOpenings.push({ start: sentence.start, end: sentence.openingEnd });
    }
    openings.add(opening);
  }

  const scale = Math.min(1, 115 / wordCount);
  const lengthWeight = longSentences.reduce((total, sentence) => total + Math.min(6, (sentence.words.length - 25) * 0.6), 0);
  const variationWeight = sentenceVariationWeight(sentences);
  const signal = phraseWeight * scale + Math.min(12, lengthWeight * scale) + Math.min(12, repeatedOpenings.length * 4 * scale) + variationWeight;
  const score = Math.round(18 + 81 * (1 - Math.exp(-signal / 65)));

  return { score, matches, longSentences, repeatedOpenings };
}

function sentenceVariationWeight(sentences) {
  if (sentences.length < 4) return 0;

  const lengths = sentences.map((sentence) => sentence.words.length);
  const average = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
  if (average < 8) return 0;

  const deviation = Math.sqrt(lengths.reduce((sum, length) => sum + (length - average) ** 2, 0) / lengths.length);
  return Math.max(0, 7 * (1 - deviation / (average * 0.32)));
}

function matchCapitalization(original, replacement) {
  const uppercase = original.toUpperCase();
  const lowercase = original.toLowerCase();
  if (original === uppercase && original !== lowercase) return replacement.toUpperCase();
  if (original[0] !== lowercase[0]) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

function makeSuggestion(text, options) {
  const { id, kind, title, description, start, end, replacement = null, impact = null } = options;
  return { id: `${id}-${start}-${end}`, kind, title, description, start, end, original: text.slice(start, end), replacement, impact };
}

function phraseSuggestions(text, matches, score) {
  const automatic = [];
  const manual = [];
  const candidates = matches.map((match) => {
    const context = contextualEdits.get(match.rule.phrase);
    if (!context || context.prefix.test(match.prefix)) return match;

    const rule = { ...match.rule, replacement: null, description: context.description };
    return { ...match, rule };
  }).sort((left, right) => right.rule.weight - left.rule.weight || left.start - right.start);

  for (const { rule, start, end } of candidates) {
    if (rule.replacement === null && manual.length < maximumSuggestions) {
      manual.push(makeSuggestion(text, { ...rule, start, end }));
    }
  }

  // Each automatic edit is verified by rescoring, so limit that work on long pastes.
  const verificationLimit = text.length > 50000 ? 4 : 16;
  const replaceable = candidates.filter(({ rule }) => rule.replacement !== null);

  for (const { rule, start, end } of replaceable.slice(0, verificationLimit)) {
    const replacement = matchCapitalization(text.slice(start, end), rule.replacement);
    const edited = text.slice(0, start) + replacement + text.slice(end);
    const editedWordCount = wordsIn(edited).length;
    if (editedWordCount < minimumWords) continue;

    const impact = score - inspectStyle(edited, editedWordCount).score;
    if (impact > 0) automatic.push(makeSuggestion(text, { ...rule, start, end, replacement, impact }));
  }

  if (automatic.length === 0 && manual.length === 0) {
    const examples = new Set();
    for (const { rule, start, end } of replaceable) {
      if (examples.has(rule.id)) continue;
      examples.add(rule.id);
      manual.push(makeSuggestion(text, { ...rule, start, end, replacement: null }));
      if (manual.length === maximumSuggestions) break;
    }
  }

  automatic.sort((left, right) => right.impact - left.impact || left.start - right.start);
  return { automatic, manual };
}

function collectSuggestions(candidates) {
  const suggestions = [];

  for (const candidate of candidates) {
    if (suggestions.some(({ start, end }) => candidate.start < end && candidate.end > start)) continue;
    suggestions.push(candidate);
    if (suggestions.length === maximumSuggestions) break;
  }

  return suggestions;
}

export function analyzeText(text) {
  const wordCount = wordsIn(text).length;
  if (wordCount < minimumWords) {
    return { score: null, wordCount, confidence: "Need more text", suggestions: [] };
  }

  const confidence = wordCount < 60 ? "Short sample" : wordCount < 180 ? "Moderate sample" : "Longer sample";
  const { score, matches, longSentences, repeatedOpenings } = inspectStyle(text, wordCount);
  const { automatic, manual } = phraseSuggestions(text, matches, score);

  for (const sentence of longSentences.slice(0, maximumSuggestions)) {
    manual.push(makeSuggestion(text, {
      id: "long-sentence",
      kind: "Long sentence",
      title: "Split this into spoken beats",
      description: `This sentence has ${sentence.words.length} words. Try ending it after the first complete thought.`,
      start: sentence.start,
      end: sentence.end,
    }));
  }

  for (const opening of repeatedOpenings.slice(0, maximumSuggestions)) {
    manual.push(makeSuggestion(text, {
      id: "repeated-opening",
      kind: "Repeated opening",
      title: "Vary how this sentence starts",
      description: "An earlier sentence starts with the same three words. Try opening here with the action or the person doing it.",
      ...opening,
    }));
  }

  const suggestions = collectSuggestions([...automatic, ...manual]);
  return { score, wordCount, confidence, suggestions };
}
