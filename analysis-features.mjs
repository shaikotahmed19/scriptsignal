const englishGroups = {
  firstPerson: 'i me my myself we us our ours ourselves',
  secondPerson: 'you your yours yourself yourselves',
  thirdPerson: 'he she him her his hers they them their theirs',
  functionWords: 'the a an in of and to is that it for with on as by be at from was but not if so',
  coordinators: 'and but or yet so',
  modals: 'might may could should would must will can',
  concreteTime: 'yesterday tonight today morning weekend monday tuesday wednesday thursday friday saturday sunday',
  hedges: 'often usually sometimes perhaps generally typically likely relatively arguably',
  intensifiers: 'very really quite particularly extremely highly especially deeply incredibly',
  abstractOutcomes: 'significant meaningful essential crucial critical important effective sustainable successful enhanced positive',
  formalLinks: 'furthermore moreover therefore consequently additionally nonetheless however nevertheless thus overall',
  everydayLinks: 'also anyway instead because then though actually just like now',
  boilerplateVerbs: 'ensure enhance utilize foster leveraging facilitate underscore navigate empower streamline optimize',
};

const bengaliGroups = {
  firstPerson: 'আমি আমার আমাকে আমায় আমরা আমাদের',
  secondPerson: 'তুমি তোমার তোমাকে তোমরা আপনার আপনি আপনাকে আপনারা',
  thirdPerson: 'সে তাঁরা তারা তার তাদের তিনি তাঁকে',
  functionWords: 'আর ও এবং তবে কিন্তু তাহলে যদি যে না ছিল এই সেই সঙ্গে থেকে মধ্যে জন্য হলো হতে হবে',
  coordinators: 'আর ও এবং কিংবা অথবা কিন্তু তবে',
  modals: 'হতে পারে উচিত দরকার হবে পারবে পারবেন চাই',
  concreteTime: 'গতকাল আজ আগামীকাল সকাল সন্ধ্যা দুপুর রাতে সপ্তাহ শুক্রবার শনিবার সোমবার',
  hedges: 'প্রায় সাধারণত সম্ভাব্য হয়তো প্রায়ই কখনও মাঝেমধ্যে তুলনামূলক',
  intensifiers: 'খুব বেশ অত্যন্ত বিশেষভাবে গভীরভাবে আরও ব্যাপক',
  abstractOutcomes: 'গুরুত্বপূর্ণ কার্যকর ইতিবাচক প্রয়োজনীয় অপরিহার্য অর্থবহ সামগ্রিক দীর্ঘমেয়াদি',
  formalLinks: 'উপরন্তু অধিকন্তু তদুপরি পরিশেষে ফলস্বরূপ অতএব সুতরাং সর্বোপরি মূলত পাশাপাশি',
  everydayLinks: 'পরে তারপর তখন তাই তবু যাইহোক মানে আবার কারণ',
  boilerplateVerbs: 'নিশ্চিত উন্নীত প্রসারিত উৎসাহিত বাস্তবায়ন সহায়তা বিকাশ সমাধান অন্বেষণ বিবেচনা',
};

const profiles = {
  en: { words: /[a-z]+(?:'[a-z]+)?|\d+(?:\.\d+)?/g, groups: englishGroups },
  bn: { words: /[\u0980-\u09ff]+(?:[\u200c\u200d][\u0980-\u09ff]+)*|\d+(?:\.\d+)?/g, groups: bengaliGroups },
};

for (const profile of Object.values(profiles)) {
  profile.groups = Object.entries(profile.groups).map(([name, words]) => [name, words.normalize('NFC').split(' ')]);
}

const sentencePattern = /[^.!?।॥]+[.!?।॥]*/gu;

function representativeText(source) {
  // Bound model work on long pastes while keeping the opening and the ending.
  return source.length > 18000 ? `${source.slice(0, 9000)}\n${source.slice(-9000)}` : source;
}

export function dominantStyleLanguage(source) {
  const text = representativeText(source);
  let letters = 0;
  let latin = 0;
  let bengali = 0;
  for (const letter of text.match(/\p{L}/gu) ?? []) {
    letters += 1;
    if (/[a-z]/iu.test(letter)) latin += 1;
    if (/\p{Script=Bengali}/u.test(letter)) bengali += 1;
  }
  if (bengali > 0 && bengali / letters >= .75) return 'bn';
  if (latin > 0 && latin / letters >= .9) return 'en';
  return null;
}

function variation(lengths) {
  if (lengths.length < 2) return 0;
  const mean = lengths.reduce((total, length) => total + length, 0) / lengths.length;
  const variance = lengths.reduce((total, length) => total + (length - mean) ** 2, 0) / lengths.length;
  return Math.sqrt(variance) / Math.max(1, mean);
}

export function styleFeatures(source, language) {
  const { words: wordsPattern, groups } = profiles[language];
  const text = representativeText(source);
  const normalized = text.normalize('NFKC').toLowerCase().replace(/’/g, "'");
  const words = normalized.match(wordsPattern) ?? [];
  if (words.length < 20) return null;

  const counts = new Map();
  const pairs = new Set();
  let repeatedPairs = 0;
  let letters = 0;
  let longWords = 0;
  let contractions = 0;
  let numericWords = 0;
  for (const [index, word] of words.entries()) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
    letters += word.length;
    if (word.length >= 9) longWords += 1;
    if (/n't$|'(?:m|re|ll|d|ve)$/u.test(word)) contractions += 1;
    if (/^\p{N}/u.test(word)) numericWords += 1;
    if (index === 0) continue;
    const pair = `${words[index - 1]} ${word}`;
    if (pairs.has(pair)) repeatedPairs += 1;
    pairs.add(pair);
  }

  const size = words.length;
  const rate = (count) => count / size;
  const lexical = Object.fromEntries(groups.map(([name, tokens]) => [
    name, rate(tokens.reduce((total, token) => total + (counts.get(token) ?? 0), 0)),
  ]));
  if (language === 'en' && lexical.functionWords < .09) return null;

  const sentences = (normalized.match(sentencePattern) ?? []).map((sentence) => sentence.match(wordsPattern) ?? []).filter((tokens) => tokens.length >= 3);
  const lengths = sentences.map((tokens) => tokens.length);
  const sentenceCount = Math.max(1, lengths.length);
  const sentenceRate = (test) => lengths.filter(test).length / sentenceCount;
  const openings = sentences.map((tokens) => tokens.slice(0, 2).join(' '));
  const marks = (pattern) => rate((text.match(pattern) ?? []).length);

  return {
    meanWordLength: rate(letters),
    longWords: rate(longWords),
    numericWords: rate(numericWords),
    contractions: rate(contractions),
    repeatedPairs: rate(repeatedPairs),
    vocabularyDiversity: Math.log(counts.size) / Math.log(size),
    meanSentenceLength: Math.min(65, lengths.reduce((total, length) => total + length, 0) / sentenceCount),
    sentenceVariation: Math.min(2, variation(lengths)),
    shortSentences: sentenceRate((length) => length <= 7),
    longSentences: sentenceRate((length) => length >= 25),
    repeatedOpenings: (openings.length - new Set(openings).size) / sentenceCount,
    commas: marks(/,/g),
    semicolons: marks(/;/g),
    colons: marks(/:/g),
    questions: marks(/\?/g),
    exclamations: marks(/!/g),
    dashPunctuation: marks(/[—–]|(?<=\s)-(?=\s)/g),
    parentheses: marks(/\(/g),
    quotationMarks: marks(/[“”"]/g),
    ...lexical,
  };
}
