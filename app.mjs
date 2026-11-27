import { analyzeText, minimumWords, planBulkEdits } from './analysis-engine.mjs';
import { playAnalysisMotion } from './analysis-motion.mjs';
import { sampleScripts } from './sample-scripts.mjs';

const byId = (id) => document.getElementById(id);
const script = byId('script');
const editorCard = script.closest('.editor-card');
const scoreCard = byId('score-card');
const gauge = byId('gauge');
const gaugeProgress = byId('gauge-progress');
const scoreNumber = byId('score-number');
const scorePercent = byId('score-percent');
const scoreCaption = byId('score-caption');
const scoreNote = byId('score-note');
const scoreTitle = byId('score-title');
const textFormat = byId('text-format');
const scoreChange = byId('score-change');
const wordCount = byId('word-count');
const characterCount = byId('character-count');
const clearButton = byId('clear-script');
const analyzeButton = byId('analyze-script');
const analyzeIcon = byId('analyze-icon');
const analyzeLabel = byId('analyze-label');
const analysisSpinner = byId('analysis-spinner');
const analysisIndicator = byId('analysis-indicator');
const loadSampleButton = byId('load-sample');
const editorMessage = byId('editor-message');
const draftNotice = byId('draft-notice');
const messageText = byId('editor-message-text');
const undoButton = byId('undo-edit');
const suggestionsList = byId('suggestions-list');
const suggestionsEmpty = byId('suggestions-empty');
const suggestionCount = byId('suggestion-count');
const suggestionTemplate = byId('suggestion-template');
const suggestionsTools = byId('suggestions-tools');
const readyEditCount = byId('ready-edit-count');
const acceptAllButton = byId('accept-all');
const bulkDialog = byId('bulk-dialog');
const bulkWarning = byId('bulk-warning');
const confirmBulk = byId('confirm-bulk');
const analysisStatus = byId('analysis-status');

const localeNumber = new Intl.NumberFormat(document.documentElement.lang);
const scoreExplanation = scoreNote.textContent;
const compactLayout = matchMedia('(max-width: 47.5rem)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const workerThreshold = 12000;
const draftKey = 'scriptsignal.draft.v1';
let analyzedSource;
let analyzedFormat;
let result;
let inputTimer;
let draftTimer;
let manualAnalysis;
let workerJob;
let composing = false;
let undoState;
let pendingBulkEdit;
let previewingSamples = false;
let sampleIndex = 0;

function readDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey));
    if (typeof draft?.source === 'string') return draft;
  } catch {
    // The editor can still work without access to tab storage.
  }
  return null;
}

function saveDraft() {
  clearTimeout(draftTimer);
  const source = previewingSamples ? undoState.value : script.value;
  try {
    sessionStorage.setItem(draftKey, JSON.stringify({ source, format: textFormat.value }));
    draftNotice.hidden = true;
  } catch {
    draftNotice.hidden = false;
  }
}

function scheduleDraftSave() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 240);
}

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
  if (score < 30) return 'Few AI-style signals';
  if (score < 60) return 'Mixed signals';
  if (score < 85) return 'Elevated style signals';
  return 'Strong style signals';
}

function announceAnalysis(change = 0) {
  const { score, suggestions } = result;
  const changeDescription = change ? ` ${formatCount(Math.abs(change), 'point', 'points')} ${change < 0 ? 'lower' : 'higher'}.` : '';
  analysisStatus.textContent = score === null
    ? scoreNote.textContent
    : `${scoreTitle.textContent} ${score}%.${changeDescription} ${formatCount(suggestions.length, 'suggestion', 'suggestions')}.`;
}

function showScore(previousScore, announce) {
  const { score, method, proseWordCount } = result;
  const hasScore = score !== null;
  const usesModel = method.endsWith('-model');
  const caption = hasScore ? (usesModel ? describeScore(score) : 'Writing rules only') : 'Awaiting prose';
  const hue = usesModel ? 98 - 0.95 * score : 89;
  scoreTitle.textContent = hasScore && !usesModel ? 'Writing-style score' : 'AI-style score';
  scoreCard.style.setProperty('--score-color', `hsl(${hue} 84% 54%)`);
  scoreCard.style.setProperty('--score-ink', `hsl(${hue} 65% 31%)`);
  gaugeProgress.setAttribute('stroke-dasharray', `${score ?? 0} 100`);
  gaugeProgress.toggleAttribute('hidden', !hasScore || score === 0);
  scoreNumber.textContent = hasScore ? localeNumber.format(score) : '—';
  scorePercent.hidden = !hasScore;
  scoreCaption.textContent = caption;
  gauge.setAttribute('aria-label', hasScore ? `${score}% ${scoreTitle.textContent}. ${caption}.` : 'Writing-style score unavailable');
  if (method === 'worker-unavailable') {
    scoreNote.textContent = 'This browser could not analyze the full script in the background. Try a shorter excerpt.';
  } else if (!hasScore) {
    scoreNote.textContent = `Enter at least ${minimumWords} words of prose for a writing-style estimate.`;
  } else if (method === 'dialogue-rules') {
    scoreNote.textContent = 'Dialogue uses writing rules to suggest edits. Spoken text is difficult to classify by authorship.';
  } else if (method === 'rules') {
    scoreNote.textContent = 'This language or language mix uses writing rules for editing guidance.';
  } else if (proseWordCount < 60) {
    scoreNote.textContent = 'This excerpt is short. A longer passage gives more evidence about its writing style.';
  } else {
    scoreNote.textContent = scoreExplanation;
  }

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

function showAnalysisProgress(isAnalyzing) {
  analyzeButton.setAttribute('aria-disabled', String(isAnalyzing));
  scoreCard.setAttribute('aria-busy', String(isAnalyzing));
  analyzeIcon.toggleAttribute('hidden', isAnalyzing);
  analysisSpinner.hidden = !isAnalyzing;
  analyzeLabel.textContent = isAnalyzing ? 'Analyzing…' : 'Analyze script';
  analysisIndicator.textContent = isAnalyzing ? 'Analyzing' : 'Live';
  analysisStatus.textContent = isAnalyzing ? 'Analyzing script.' : '';
}

function stopManualAnalysis() {
  if (!manualAnalysis) return;

  const pending = manualAnalysis;
  manualAnalysis = undefined;
  pending.cancel?.();
  delete editorCard.dataset.analysisSource;
  delete scoreCard.dataset.analysisFlight;
  showAnalysisProgress(false);
}

function stopWorkerJob() {
  if (!workerJob) return;

  const job = workerJob;
  workerJob = undefined;
  job.worker.terminate();
  job.cleanup();
}

function startWorkerJob(type, payload, { complete, fail, cleanup }) {
  stopWorkerJob();
  let worker;
  try {
    worker = new Worker(new URL('./analysis-worker.mjs', import.meta.url), { type: 'module' });
  } catch {
    cleanup();
    fail();
    return;
  }
  const job = { worker, type, cleanup };
  workerJob = job;
  worker.onmessage = ({ data }) => {
    if (workerJob !== job) return;
    stopWorkerJob();
    complete(data);
  };
  worker.onerror = (error) => {
    if (workerJob !== job) return;
    error.preventDefault();
    stopWorkerJob();
    fail();
  };
  try {
    worker.postMessage({ type, ...payload });
  } catch {
    stopWorkerJob();
    fail();
  }
}

function startManualAnalysis(revealResult = false) {
  if (analyzeButton.disabled || manualAnalysis || composing || workerJob?.type === 'analyze') return;

  clearTimeout(inputTimer);
  const focusedElement = document.activeElement;
  const animate = !reducedMotion.matches;
  const pending = {};
  manualAnalysis = pending;
  delete scoreCard.dataset.analysisReveal;
  showAnalysisProgress(true);

  const complete = () => {
    if (manualAnalysis !== pending) return;
    refreshAnalysis({
      announce: true,
      recheck: true,
      onComplete: () => {
        if (animate) scoreCard.dataset.analysisReveal = 'true';
        if (revealResult && compactLayout.matches && document.activeElement === focusedElement) {
          scoreCard.focus({ preventScroll: true });
          scoreCard.scrollIntoView({ block: 'nearest' });
        }
      },
    });
  };

  if (animate) {
    editorCard.dataset.analysisSource = 'true';
    scoreCard.dataset.analysisFlight = 'true';
    pending.cancel = playAnalysisMotion({
      editor: script,
      trigger: analyzeButton,
      gauge,
      followDestination: revealResult,
      onComplete: complete,
    });
  } else {
    const timer = setTimeout(complete, 160);
    pending.cancel = () => clearTimeout(timer);
  }
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
      recordEditorChange('Edit applied.', previous);
      refreshAnalysis({
        announce: true,
        onComplete: () => {
          const nextApply = suggestionsList.querySelector('.apply-button:not([hidden])');
          (nextApply ?? undoButton).focus({ preventScroll: true });
        },
      });
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
  const { score, method, suggestions } = result;
  const count = suggestions.length;
  const ready = suggestions.filter(({ replacement }) => replacement !== null).length;
  const actions = () => [...suggestionsList.querySelectorAll('button:not([hidden])')];
  const focusedIndex = suggestionsList.contains(document.activeElement) ? actions().indexOf(document.activeElement) : -1;
  suggestionCount.textContent = localeNumber.format(count);
  suggestionCount.setAttribute('aria-label', formatCount(count, 'suggestion', 'suggestions'));
  suggestionsTools.hidden = ready === 0;
  suggestionsList.hidden = false;
  readyEditCount.textContent = `${formatCount(ready, 'edit', 'edits')} ready`;
  suggestionsList.replaceChildren(...suggestions.map(renderSuggestion));
  suggestionsEmpty.hidden = count > 0;

  if (!count) {
    if (method === 'worker-unavailable') {
      suggestionsEmpty.textContent = 'Try a shorter excerpt to get editing suggestions.';
    } else {
      suggestionsEmpty.textContent = score === null ? 'Add more of your script to get targeted editing suggestions.' : 'No specific edits stood out. You can keep editing the script directly.';
    }
  }

  if (focusedIndex !== -1) {
    const updated = actions();
    (updated[Math.min(focusedIndex, updated.length - 1)] ?? analyzeButton).focus({ preventScroll: true });
  }
}

function refreshAnalysis({ announce = false, compare = true, recheck = false, onComplete } = {}) {
  clearTimeout(inputTimer);
  stopManualAnalysis();
  stopWorkerJob();
  delete scoreCard.dataset.analysisReveal;
  const source = script.value;
  const format = textFormat.value;
  setEditorControls();
  if (!recheck && source === analyzedSource && format === analyzedFormat) {
    if (suggestionsList.hidden) showSuggestions();
    if (announce) announceAnalysis();
    onComplete?.();
    return;
  }
  const previousAnalysis = compare && analyzedFormat === format ? result : undefined;
  const render = ({ analysis, characterCount: characters }) => {
    if (source !== script.value || format !== textFormat.value) return;
    analyzedSource = source;
    analyzedFormat = format;
    result = analysis;
    wordCount.textContent = analysis.wordCount === null ? '— words' : formatCount(analysis.wordCount, 'word', 'words');
    characterCount.textContent = characters === null ? '— characters' : formatCount(characters, 'character', 'characters');
    showScore(previousAnalysis?.method === analysis.method ? previousAnalysis.score : undefined, announce);
    showSuggestions();
    onComplete?.();
  };

  if (source.length < workerThreshold) {
    render({ analysis: analyzeText(source, { format }), characterCount: [...source].length });
    return;
  }

  showAnalysisProgress(true);
  scoreCard.dataset.analysisPending = 'true';
  suggestionsList.hidden = true;
  suggestionsTools.hidden = true;
  suggestionsEmpty.hidden = true;
  startWorkerJob('analyze', { source, format }, {
    complete: render,
    fail: () => render({ analysis: { score: null, method: 'worker-unavailable', wordCount: null, suggestions: [] }, characterCount: null }),
    cleanup: () => {
      delete scoreCard.dataset.analysisPending;
      showAnalysisProgress(false);
    },
  });
}

function checkCurrentSuggestion() {
  if (composing || workerJob?.type === 'analyze') return false;
  if (script.value === analyzedSource && textFormat.value === analyzedFormat) return true;

  refreshAnalysis({ announce: true });
  showMessage('Script reanalyzed. Choose a suggestion from the updated list.');
  return false;
}

function rememberEditor() {
  return { value: script.value, start: script.selectionStart, end: script.selectionEnd, scrollTop: script.scrollTop };
}

acceptAllButton.addEventListener('click', () => {
  if (!checkCurrentSuggestion()) return;

  const source = analyzedSource;
  const format = analyzedFormat;
  const openConfirmation = (plan) => {
    if (script.value !== source || textFormat.value !== format) return;
    if (!plan.count) {
      const reason = {
        'too-short': `Together these edits would leave fewer than ${minimumWords} words of prose. Review the edits individually.`,
        'different-method': 'Together these edits would switch how the script is scored. Review the edits individually.',
        'no-score-decrease': 'Together these edits do not lower the score. Review the edits individually.',
      }[plan.reason];
      showMessage(reason ?? 'These edits could not be applied together. Review them individually.');
      return;
    }

    pendingBulkEdit = { source, format, ...plan };
    bulkWarning.textContent = `This will change ${formatCount(plan.count, 'passage', 'passages')} in your script at once.`;
    confirmBulk.textContent = `Apply ${formatCount(plan.count, 'edit', 'edits')}`;
    bulkDialog.returnValue = 'cancel';
    bulkDialog.showModal();
  };
  if (source.length < workerThreshold) {
    openConfirmation(planBulkEdits(source, result.suggestions, { format }));
    return;
  }

  const previousCount = readyEditCount.textContent;
  acceptAllButton.disabled = true;
  readyEditCount.textContent = 'Checking edits…';
  startWorkerJob('bulk', { source, format, suggestions: result.suggestions }, {
    complete: ({ plan }) => openConfirmation(plan),
    fail: () => showMessage('The batch check did not finish. Review the edits individually.'),
    cleanup: () => {
      acceptAllButton.disabled = false;
      readyEditCount.textContent = previousCount;
    },
  });
});

bulkDialog.addEventListener('close', () => {
  const pending = pendingBulkEdit;
  pendingBulkEdit = undefined;
  if (bulkDialog.returnValue !== 'accept' || !pending) return;
  if (script.value !== pending.source || textFormat.value !== pending.format) {
    refreshAnalysis({ announce: true });
    showMessage('Your script changed. Review the updated suggestions before applying them.');
    return;
  }

  const previous = rememberEditor();
  script.value = pending.text;
  script.setSelectionRange(previous.start, previous.start);
  script.scrollTop = previous.scrollTop;
  refreshAnalysis({ announce: true });
  recordEditorChange(`${formatCount(pending.count, 'edit', 'edits')} applied.`, previous);
  undoButton.focus();
});

function showMessage(message) {
  editorMessage.hidden = !message;
  messageText.textContent = message;
  undoButton.hidden = !undoState;
}

function recordEditorChange(message, previous) {
  previewingSamples = false;
  undoState = previous;
  showMessage(message);
  scheduleDraftSave();
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
  stopManualAnalysis();
  stopWorkerJob();
  recordEditorChange('');
  setEditorControls();
  clearTimeout(inputTimer);
  if (composing || event.isComposing) return;
  inputTimer = setTimeout(() => refreshAnalysis({ announce: true }), script.value ? 300 : 0);
}

script.addEventListener('input', queueAnalysis);
script.addEventListener('compositionstart', () => {
  composing = true;
  clearTimeout(inputTimer);
  stopManualAnalysis();
  stopWorkerJob();
});
script.addEventListener('compositionend', (event) => {
  composing = false;
  queueAnalysis(event);
});
script.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !analyzeButton.disabled && !event.isComposing) {
    event.preventDefault();
    startManualAnalysis();
  }
});

analyzeButton.addEventListener('click', () => startManualAnalysis(true));
textFormat.addEventListener('change', () => {
  scheduleDraftSave();
  refreshAnalysis({ announce: true, compare: false });
});

clearButton.addEventListener('click', () => {
  const previous = rememberEditor();
  script.value = '';
  refreshAnalysis({ compare: false });
  recordEditorChange('Script cleared.', previous);
  script.focus();
});

loadSampleButton.addEventListener('click', () => {
  const previous = previewingSamples ? undoState : rememberEditor();
  sampleIndex = (sampleIndex + 1) % sampleScripts.length;
  if (sampleScripts[sampleIndex] === previous.value) {
    sampleIndex = (sampleIndex + 1) % sampleScripts.length;
  }
  script.value = sampleScripts[sampleIndex];
  script.scrollTop = 0;
  script.setSelectionRange(0, 0);
  refreshAnalysis({ announce: true, compare: false });
  undoState = previous;
  previewingSamples = true;
  showMessage('Sample loaded.');
  scheduleDraftSave();
});

undoButton.addEventListener('click', () => {
  if (!undoState) return;
  const previous = undoState;
  script.value = previous.value;
  script.focus();
  script.setSelectionRange(previous.start, previous.end);
  script.scrollTop = previous.scrollTop;
  refreshAnalysis({ announce: true });
  recordEditorChange('Last change undone.');
});

window.addEventListener('pagehide', saveDraft);
drawGaugeTicks();
const draft = readDraft();
script.value = draft?.source ?? sampleScripts[sampleIndex];
textFormat.value = draft?.format === 'dialogue' ? 'dialogue' : 'auto';
script.setSelectionRange(0, 0);
refreshAnalysis();
