import { analyzeText, planBulkEdits } from './analysis-engine.mjs';

self.addEventListener('message', ({ data }) => {
  const { type, source, format, suggestions } = data;
  if (type === 'bulk') {
    self.postMessage({ plan: planBulkEdits(source, suggestions, { format }) });
    return;
  }

  let characterCount = 0;
  for (const character of source) characterCount += 1;
  self.postMessage({ analysis: analyzeText(source, { format }), characterCount });
});
