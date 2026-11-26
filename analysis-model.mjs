import { dominantStyleLanguage, styleFeatures } from './analysis-features.mjs';

// Coefficients fitted with tools/fit-style-model.mjs on the documented training sets.
const models = {
  en: {
    bias: -0.0646181,
    features: [
      ["meanWordLength",4.7827643,0.2901264,0.2259935],
      ["longWords",0.1009544,0.0344394,0.3975694],
      ["numericWords",0.009682,0.0151262,-0.073748],
      ["contractions",0.0014513,0.0039363,0.2569546],
      ["repeatedPairs",0.0927309,0.0512776,0.4855416],
      ["vocabularyDiversity",0.894464,0.0179264,-0.2255967],
      ["meanSentenceLength",21.7361261,4.5508807,-0.1677401],
      ["sentenceVariation",0.3361603,0.121619,-0.7865113],
      ["shortSentences",0.0353236,0.0644509,-0.0940113],
      ["longSentences",0.3241445,0.1933454,-0.1013597],
      ["repeatedOpenings",0.0829629,0.0935525,0.4700155],
      ["commas",0.0568308,0.0202668,0.4300706],
      ["semicolons",0.0007949,0.002788,-0.3650339],
      ["colons",0.0011785,0.0027235,-0.3329465],
      ["questions",0.0004451,0.0021247,0.2012007],
      ["exclamations",0.0000651,0.0006469,-0.1515081],
      ["dashPunctuation",0.001391,0.0032891,-0.4432337],
      ["parentheses",0.0017722,0.0051146,-0.4638461],
      ["quotationMarks",0.0144418,0.0168105,-0.0705033],
      ["firstPerson",0.0054042,0.0098325,0.0429718],
      ["secondPerson",0.0005533,0.0022257,-0.1279667],
      ["thirdPerson",0.0395126,0.0292872,0.1229887],
      ["functionWords",0.3075736,0.0367082,0.4410536],
      ["coordinators",0.0391235,0.0144891,0.4008434],
      ["modals",0.0094473,0.0084635,0.1738855],
      ["concreteTime",0.000914,0.0025544,-0.176013],
      ["hedges",0.0005883,0.0015354,0.0108988],
      ["intensifiers",0.0012103,0.002389,-0.0679039],
      ["abstractOutcomes",0.0014618,0.0027687,0.4564077],
      ["formalLinks",0.0018374,0.0027603,0.1339486],
      ["everydayLinks",0.0059615,0.0051454,-0.1917411],
      ["boilerplateVerbs",0.0006204,0.0016159,0.3675404],
    ],
  },
  bn: {
    bias: 0.0250634,
    features: [
      ["meanWordLength",5.4388573,0.551809,0.1985639],
      ["longWords",0.1164601,0.0638153,0.030762],
      ["numericWords",0.0243549,0.0357664,0.0157108],
      ["contractions",0,0.00001,0],
      ["repeatedPairs",0.0641645,0.1421349,0.6217136],
      ["vocabularyDiversity",0.945483,0.0686358,0.0171467],
      ["meanSentenceLength",15.189351,8.9923092,-0.1262818],
      ["sentenceVariation",0.3726612,0.1811594,-0.3531902],
      ["shortSentences",0.1767632,0.2020729,-0.0900699],
      ["longSentences",0.1109805,0.2145185,-0.125089],
      ["repeatedOpenings",0.0224498,0.0852866,0.0341706],
      ["commas",0.0363644,0.0320132,0.1498662],
      ["semicolons",0.0004808,0.0039635,-0.1306395],
      ["colons",0.0021017,0.007281,0.040574],
      ["questions",0.0010855,0.0055687,-0.0782656],
      ["exclamations",0.0008373,0.0050581,-0.0858249],
      ["dashPunctuation",0.0006839,0.0037222,-0.0993832],
      ["parentheses",0.005597,0.0133579,0.0498181],
      ["quotationMarks",0.0041292,0.0168821,0.0317227],
      ["firstPerson",0.0074359,0.0179369,0.0261971],
      ["secondPerson",0.0020034,0.0099442,-0.0171429],
      ["thirdPerson",0.0165319,0.028516,0.1377902],
      ["functionWords",0.0705468,0.0398795,0.1482115],
      ["coordinators",0.0261717,0.0212302,0.1501604],
      ["modals",0.0088743,0.0173229,0.0491],
      ["concreteTime",0.0038543,0.0101209,0.0107817],
      ["hedges",0.0013149,0.0050575,-0.1178178],
      ["intensifiers",0.0029137,0.0083276,-0.0403015],
      ["abstractOutcomes",0.0008352,0.0037386,0.0908689],
      ["formalLinks",0.0008704,0.0040045,-0.0743184],
      ["everydayLinks",0.004499,0.0095,-0.0858314],
      ["boilerplateVerbs",0.0015548,0.0060323,0.2162024],
    ],
  },
};

function hasSpeakerTurns(text) {
  const roleLabels = text.match(/^[ \t]*(?:host|guest|narrator|presenter|interviewer|voiceover|speaker[ \t]+\p{N}+|উপস্থাপক|বক্তা|অতিথি|বর্ণনাকারী|সঞ্চালক)[ \t]*:/gimu);
  if (roleLabels?.length >= 2) return true;

  const nameCounts = new Map();
  for (const [, name] of text.matchAll(/^[ \t]*([A-Z][a-zA-Z]{1,20}(?:[ \t]+[A-Z][a-zA-Z]{1,20})?)[ \t]*:[ \t]+\p{L}/gmu)) {
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  return [...nameCounts.values()].filter((count) => count >= 2).length >= 2;
}

function learnedScore(measured, { bias, features }) {
  const logit = features.reduce((total, [name, mean, scale, coefficient]) => {
    const standardized = Math.max(-5, Math.min(5, (measured[name] - mean) / scale));
    return total + standardized * coefficient;
  }, bias);
  return 100 / (1 + Math.exp(-logit));
}

export function assessWritingStyle(text, ruleScore, wordCount, format = 'auto') {
  if (format === 'dialogue' || hasSpeakerTurns(text)) return { score: ruleScore, method: 'dialogue-rules' };

  const weight = .72 * Math.max(0, Math.min(1, (wordCount - 20) / 12));
  if (!weight) return { score: ruleScore, method: 'short-rules' };

  const language = dominantStyleLanguage(text);
  const measured = language && styleFeatures(text, language);
  if (!measured) return { score: ruleScore, method: 'rules' };

  const score = Math.round(weight * learnedScore(measured, models[language]) + (1 - weight) * ruleScore);
  return { score, method: `${language}-model` };
}
