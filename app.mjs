import { analyzeText, minimumWords, sampleText } from './analysis-engine.mjs';

const byId = (id) => document.getElementById(id);
const script = byId('script');
const scoreCard = byId('score-card');
const gauge = byId('gauge');
const gaugeProgress = byId('gauge-progress');
const scoreNumber = byId('score-number');
const scorePercent = byId('score-percent');
const scoreCaption = byId('score-caption');
const scoreNote = byId('score-note');
const scoreChange = byId('score-change');
const wordCount = byId('word-count');
const characterCount = byId('character-count');
const clearButton = byId('clear-script');
const analyzeButton = byId('analyze-script');
const loadSampleButton = byId('load-sample');
const editorMessage = byId('editor-message');
const messageText = byId('editor-message-text');
const undoButton = byId('undo-edit');
const suggestionsList = byId('suggestions-list');
const suggestionsEmpty = byId('suggestions-empty');
const suggestionCount = byId('suggestion-count');
const suggestionTemplate = byId('suggestion-template');
const analysisStatus = byId('analysis-status');

const localeNumber = new Intl.NumberFormat(document.documentElement.lang);
const scoreExplanation = scoreNote.textContent;
let analyzedSource;
let result;
let inputTimer;
let undoState;

function drawGaugeTicks() {
  const ticks = byId('gauge-ticks');
  for (let index = 0; index <= 20; index += 1) {
    const angle = (160 + index * 11) * Math.PI / 180;
    const outerRadius = 80;
    const innerRadius = index % 5 === 0 ? 73 : 76;
    const mark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    mark.setAttribute('x1', 140 + innerRadius * Math.cos(angle));
    mark.setAttribute('y1', 108 + innerRadius * Math.sin(angle));
    mark.setAttribute('x2', 140 + outerRadius * Math.cos(angle));
    mark.setAttribute('y2', 108 + outerRadius * Math.sin(angle));
    ticks.append(mark);
  }
}

function describeScore(score) {
  if (score < 30) return 'Low likelihood';
  if (score < 60) return 'Mixed signals';
  if (score < 85) return 'Elevated likelihood';
  return 'High likelihood';
}

function announceAnalysis(change = 0) {
  const { score, suggestions } = result;
  const changeDescription = change ? ` ${formatCount(Math.abs(change), 'point', 'points')} ${change < 0 ? 'lower' : 'higher'}.` : '';
  analysisStatus.textContent = score === null
    ? scoreNote.textContent
    : `AI likelihood estimate ${score}%.${changeDescription} ${formatCount(suggestions.length, 'suggestion', 'suggestions')}.`;
}

function showScore(previousScore, announce) {
  const { score } = result;
  const hasScore = score !== null;
  const caption = hasScore ? describeScore(score) : 'Awaiting script';
  const hue = 98 - 0.95 * (score ?? 0);
  scoreCard.style.setProperty('--score-color', `hsl(${hue} 84% 54%)`);
  scoreCard.style.setProperty('--score-ink', `hsl(${hue} 65% 31%)`);
  gaugeProgress.setAttribute('stroke-dasharray', `${score ?? 0} 100`);
  gaugeProgress.toggleAttribute('hidden', !hasScore || score === 0);
  scoreNumber.textContent = hasScore ? localeNumber.format(score) : '—';
  scorePercent.hidden = !hasScore;
  scoreCaption.textContent = caption;
  gauge.setAttribute('aria-label', hasScore ? `${score}% AI likelihood estimate. ${caption}.` : 'AI likelihood estimate unavailable');
  scoreNote.textContent = hasScore ? scoreExplanation : `Enter at least ${minimumWords} words for a writing-style estimate.`;

  const change = hasScore && previousScore !== undefined && previousScore !== null ? score - previousScore : 0;
  scoreChange.hidden = change === 0;
  scoreChange.classList.toggle('is-increase', change > 0);
  scoreChange.textContent = change ? `${change < 0 ? '−' : '+'}${Math.abs(change)} ${Math.abs(change) === 1 ? 'pt' : 'pts'}` : '';

  if (announce) announceAnalysis(change);
}

function formatCount(count, singular, plural) {
  return `${localeNumber.format(count)} ${count === 1 ? singular : plural}`;
}

function setEditorControls() {
  clearButton.disabled = !script.value;
  analyzeButton.disabled = !script.value.trim();
}

function previewText(text) {
  const compact = text.trim().replace(/\s+/gu, ' ');
  return compact.length > 220 ? `${compact.slice(0, 215).trimEnd()}…` : compact;
}

function renderSuggestion(suggestion) {
  const { description, end, impact, original, replacement, start, title } = suggestion;
  const card = suggestionTemplate.content.cloneNode(true);
  const impactLabel = card.querySelector('.suggestion-impact');
  const before = card.querySelector('del');
  const after = card.querySelector('ins');
  const excerpt = card.querySelector('.suggestion-excerpt');
  const applyButton = card.querySelector('.apply-button');
  const locateButton = card.querySelector('.locate-button');
  const canApply = replacement !== null;

  card.querySelector('h3').textContent = title;
  card.querySelector('.suggestion-description').textContent = description;
  impactLabel.hidden = impact === null;
  if (impact !== null) {
    impactLabel.textContent = `−${impact} ${impact === 1 ? 'pt' : 'pts'}`;
    impactLabel.setAttribute('aria-label', `Estimated decrease of ${formatCount(impact, 'point', 'points')}`);
  }

  before.hidden = after.hidden = applyButton.hidden = !canApply;
  excerpt.hidden = canApply;
  if (canApply) {
    before.textContent = previewText(original);
    after.textContent = replacement ? previewText(replacement) : 'Remove this phrase';
    applyButton.setAttribute('aria-label', `Apply edit: ${title}`);
    applyButton.addEventListener('click', () => {
      if (!checkCurrentSuggestion()) return;
      const previous = rememberEditor();
      script.setRangeText(replacement, start, end, 'select');
      refreshAnalysis({ announce: true });
      showMessage('Edit applied.', previous);
      const nextApply = suggestionsList.querySelector('.apply-button:not([hidden])');
      (nextApply ?? undoButton).focus({ preventScroll: true });
    });
  } else {
    excerpt.textContent = `“${previewText(original)}”`;
  }
  locateButton.setAttribute('aria-label', `Find in script: ${title}`);
  locateButton.addEventListener('click', () => {
    if (!checkCurrentSuggestion()) return;
    selectPassage(start, end);
  });
  return card;
}

function showSuggestions() {
  const { score, suggestions } = result;
  const count = suggestions.length;
  const actions = () => [...suggestionsList.querySelectorAll('button:not([hidden])')];
  const focusedIndex = suggestionsList.contains(document.activeElement) ? actions().indexOf(document.activeElement) : -1;
  suggestionCount.textContent = localeNumber.format(count);
  suggestionCount.setAttribute('aria-label', formatCount(count, 'suggestion', 'suggestions'));
  suggestionsList.replaceChildren(...suggestions.map(renderSuggestion));
  suggestionsEmpty.hidden = count > 0;

  if (!count) {
    suggestionsEmpty.textContent = score === null ? 'Add more of your script to get targeted editing suggestions.' : 'No specific edits stood out. You can keep editing the script directly.';
  }

  if (focusedIndex !== -1) {
    const updated = actions();
    (updated[Math.min(focusedIndex, updated.length - 1)] ?? analyzeButton).focus({ preventScroll: true });
  }
}

function refreshAnalysis({ announce = false, compare = true } = {}) {
  clearTimeout(inputTimer);
  if (script.value === analyzedSource) {
    if (announce) announceAnalysis();
    return;
  }
  const previousScore = compare ? result?.score : undefined;
  analyzedSource = script.value;
  result = analyzeText(analyzedSource);

  wordCount.textContent = formatCount(result.wordCount, 'word', 'words');
  characterCount.textContent = formatCount([...analyzedSource].length, 'character', 'characters');
  setEditorControls();
  showScore(previousScore, announce);
  showSuggestions();
}

function checkCurrentSuggestion() {
  if (script.value === analyzedSource) return true;

  refreshAnalysis({ announce: true });
  showMessage('Script reanalyzed. Choose a suggestion from the updated list.');
  return false;
}

function rememberEditor() {
  return { value: script.value, start: script.selectionStart, end: script.selectionEnd, scrollTop: script.scrollTop };
}

function showMessage(message = '', previous) {
  undoState = previous;
  editorMessage.hidden = !message;
  messageText.textContent = message;
  undoButton.hidden = !undoState;
}

function selectPassage(start, end) {
  script.focus();
  script.setSelectionRange(start, end);
  if (script.scrollHeight <= script.clientHeight) return;

  // Match the editor's wrapping to find the selected line inside long scripts.
  const mirror = document.createElement('div');
  const marker = document.createElement('span');
  const style = getComputedStyle(script);
  for (const property of ['font', 'lineHeight', 'letterSpacing', 'padding', 'tabSize', 'direction', 'textAlign', 'whiteSpace', 'overflowWrap', 'wordBreak']) {
    mirror.style[property] = style[property];
  }
  Object.assign(mirror.style, {
    position: 'fixed',
    visibility: 'hidden',
    boxSizing: 'border-box',
    width: `${script.clientWidth}px`,
    top: '0',
    left: '0',
  });
  marker.textContent = script.value.slice(start, start + 1);
  mirror.append(script.value.slice(0, start), marker, script.value.slice(start + 1));
  document.body.append(mirror);
  script.scrollTop = marker.offsetTop - script.clientHeight / 3;
  mirror.remove();
}

function queueAnalysis(event) {
  showMessage();
  setEditorControls();
  clearTimeout(inputTimer);
  if (event.isComposing) return;
  inputTimer = setTimeout(() => refreshAnalysis({ announce: true }), script.value ? 300 : 0);
}

script.addEventListener('input', queueAnalysis);
script.addEventListener('compositionend', queueAnalysis);
script.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !analyzeButton.disabled && !event.isComposing) {
    event.preventDefault();
    refreshAnalysis({ announce: true });
  }
});

analyzeButton.addEventListener('click', () => {
  refreshAnalysis({ announce: true });
  if (matchMedia('(max-width: 47.5rem)').matches) {
    scoreCard.focus({ preventScroll: true });
    scoreCard.scrollIntoView({ block: 'start' });
  }
});

clearButton.addEventListener('click', () => {
  const previous = rememberEditor();
  script.value = '';
  refreshAnalysis({ compare: false });
  showMessage('Script cleared.', previous);
  script.focus();
});

loadSampleButton.addEventListener('click', () => {
  if (script.value === sampleText) {
    script.focus();
    return;
  }
  const previous = rememberEditor();
  script.value = sampleText;
  script.scrollTop = 0;
  script.setSelectionRange(0, 0);
  refreshAnalysis({ announce: true, compare: false });
  showMessage('Sample loaded.', previous);
});

undoButton.addEventListener('click', () => {
  if (!undoState) return;
  const previous = undoState;
  script.value = previous.value;
  script.focus();
  script.setSelectionRange(previous.start, previous.end);
  script.scrollTop = previous.scrollTop;
  refreshAnalysis({ announce: true });
  showMessage('Last change undone.');
});

drawGaugeTicks();
script.value = sampleText;
script.setSelectionRange(0, 0);
refreshAnalysis();
