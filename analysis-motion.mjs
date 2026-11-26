const svgNamespace = 'http://www.w3.org/2000/svg';
const blockDuration = 850;
const blockStagger = 82;
const leadIn = 46;
const impactDuration = 280;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (start, end, amount) => start + (end - start) * amount;

function createSvgElement(tag, className) {
  const element = document.createElementNS(svgNamespace, tag);
  element.setAttribute('class', className);
  return element;
}

function scriptExcerpts(text) {
  const words = text.trim().slice(0, 780).split(/\s+/u, 42).filter(Boolean);
  const count = Math.min(6, Math.ceil(words.length / 3));
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor(index * words.length / count);
    const end = Math.floor((index + 1) * words.length / count);
    return words.slice(start, end).join(' ');
  });
}

function createFlight(excerpts) {
  const overlay = document.createElement('div');
  overlay.className = 'analysis-flight';
  overlay.setAttribute('aria-hidden', 'true');
  const trails = createSvgElement('svg', 'analysis-flight-trails');
  overlay.append(trails);

  const blocks = excerpts.map((excerpt, index) => {
    const block = document.createElement('div');
    const glyph = document.createElement('span');
    const copy = document.createElement('span');
    block.className = 'analysis-flight-block';
    glyph.className = 'analysis-flight-glyph';
    copy.className = 'analysis-flight-text';
    copy.dir = 'auto';
    copy.textContent = excerpt;
    block.style.opacity = '0';
    block.append(glyph, copy);
    overlay.append(block);

    const glow = createSvgElement('path', 'analysis-flight-glow');
    const trail = createSvgElement('path', 'analysis-flight-trail');
    trails.append(glow, trail);
    return { block, glow, trail, index, delay: leadIn + index * blockStagger };
  });

  const sparks = Array.from({ length: 10 }, (_, index) => {
    const spark = document.createElement('span');
    spark.className = 'analysis-flight-spark';
    spark.style.opacity = '0';
    overlay.append(spark);
    return { spark, angle: index * Math.PI / 5, radius: 26 + index % 3 * 12 };
  });

  document.body.append(overlay);
  return { overlay, blocks, sparks };
}

function launchPoint(editorRect, triggerRect, viewport, index, count, stacked) {
  const { width, height } = viewport;
  const fraction = (index + 1) / (count + 1);
  const lane = index - (count - 1) / 2;
  const firstRow = Math.max(editorRect.top + 12, 34);
  const lastRow = Math.min(editorRect.bottom - 13, height - 34);
  const editorCenter = editorRect.left + editorRect.width * (stacked ? 0.5 : 0.43);
  const safeMargin = Math.min(105, width * 0.28);
  return {
    x: clamp(editorCenter + lane * 8, safeMargin, width - safeMargin),
    y: firstRow <= lastRow
      ? mix(firstRow, Math.min(firstRow + 218, lastRow), fraction)
      : clamp(triggerRect.top - 36 + lane * 8, 34, height - 34),
  };
}

function flightCurve(from, to, lane, stacked) {
  const xDistance = to.x - from.x;
  const yDistance = to.y - from.y;

  if (stacked) {
    const side = lane < 0 ? -1 : 1;
    const swing = side * (33 + Math.abs(lane) * 17);
    return [from, { x: from.x + swing, y: from.y + yDistance * 0.19 - 34 },
      { x: to.x + swing * 0.75, y: to.y - yDistance * 0.27 }, to];
  }

  const lift = 52 + lane * 13;
  return [from, { x: from.x + xDistance * 0.29, y: from.y - lift },
    { x: to.x - xDistance * 0.29, y: to.y - 31 + lane * 11 }, to];
}

function pointOnCurve([from, first, second, to], position) {
  const reverse = 1 - position;
  const fromWeight = reverse ** 3;
  const firstWeight = 3 * reverse ** 2 * position;
  const secondWeight = 3 * reverse * position ** 2;
  const toWeight = position ** 3;
  return {
    x: fromWeight * from.x + firstWeight * first.x + secondWeight * second.x + toWeight * to.x,
    y: fromWeight * from.y + firstWeight * first.y + secondWeight * second.y + toWeight * to.y,
  };
}

function drawTrail(item, route, point, travel, opacity) {
  const startPosition = Math.max(0, travel - 0.25);
  const tail = pointOnCurve(route, startPosition);
  const middle = pointOnCurve(route, (startPosition + travel) / 2);
  const controlX = middle.x * 2 - (tail.x + point.x) / 2;
  const controlY = middle.y * 2 - (tail.y + point.y) / 2;
  const path = `M${tail.x} ${tail.y} Q${controlX} ${controlY} ${point.x} ${point.y}`;
  const strength = opacity * clamp(travel / 0.13, 0, 1);
  item.glow.setAttribute('d', path);
  item.trail.setAttribute('d', path);
  item.glow.style.opacity = String(strength * 0.58);
  item.trail.style.opacity = String(strength * 0.76);
}

function drawBlock(item, elapsed, target, count, stacked) {
  const progress = (elapsed - item.delay) / blockDuration;
  if (progress < 0) return;

  if (progress >= 1) {
    item.block.hidden = true;
    item.glow.style.display = 'none';
    item.trail.style.display = 'none';
    return;
  }

  const time = clamp((progress - 0.08) / 0.92, 0, 1);
  const travel = time * time * (3 - 2 * time);
  const lane = item.index - (count - 1) / 2;
  const route = flightCurve(item.origin, target, lane, stacked);
  const point = pointOnCurve(route, travel);
  const forming = clamp(progress / 0.16, 0, 1);
  const landing = clamp((progress - 0.72) / 0.28, 0, 1);
  const opacity = forming * (1 - landing ** 2);
  const scale = mix(mix(0.82, 1, forming), 0.12, landing ** 1.15);
  const rotation = lane * mix(-2.2, 5.5, travel) * (1 - landing);
  item.block.style.opacity = String(opacity);
  item.block.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
  drawTrail(item, route, point, travel, opacity);
}

function drawImpact(sparks, target, progress) {
  const expansion = 1 - (1 - progress) ** 2;
  for (const { spark, angle, radius } of sparks) {
    const x = target.x + Math.cos(angle) * radius * expansion;
    const y = target.y + Math.sin(angle) * radius * expansion;
    spark.style.opacity = String((1 - progress) ** 1.3);
    spark.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${1 - progress * 0.5})`;
  }
}

export function playAnalysisMotion({ editor, trigger, gauge, followDestination, onComplete }) {
  const excerpts = scriptExcerpts(editor.value);
  const initialEditor = editor.getBoundingClientRect();
  const initialGauge = gauge.getBoundingClientRect();
  if (!excerpts.length || !initialEditor.width || !initialGauge.width || !window.requestAnimationFrame) {
    const fallback = window.setTimeout(onComplete, 100);
    return () => window.clearTimeout(fallback);
  }

  const flight = createFlight(excerpts);
  const stacked = initialGauge.top >= initialEditor.bottom;
  const arrival = flight.blocks.at(-1).delay + blockDuration;
  const duration = arrival + impactDuration;
  const startedAt = performance.now();
  let frame;
  let active = true;
  let impacted = false;
  let scrollPending = followDestination;

  function cancel() {
    if (!active) return;
    active = false;
    window.cancelAnimationFrame(frame);
    window.clearTimeout(watchdog);
    flight.overlay.remove();
    delete gauge.dataset.analysisImpact;
  }

  function finish() {
    if (!active) return;
    cancel();
    onComplete();
  }

  function tick(now) {
    const elapsed = now - startedAt;
    if (elapsed >= duration || !gauge.isConnected) {
      finish();
      return;
    }

    const viewport = { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight };
    const editorRect = editor.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const gaugeRect = gauge.getBoundingClientRect();
    const gaugeCenterY = gaugeRect.top + gaugeRect.height * 0.58;
    const target = {
      x: clamp(gaugeRect.left + gaugeRect.width / 2, 16, viewport.width - 16),
      y: clamp(gaugeCenterY, 24, viewport.height - 24),
    };

    if (scrollPending && elapsed >= 275) {
      scrollPending = false;
      if (gaugeCenterY > viewport.height - 92 || gaugeCenterY < 72) {
        window.scrollTo({ top: window.scrollY + gaugeCenterY - viewport.height * 0.47, behavior: 'smooth' });
      }
    }

    for (const item of flight.blocks) {
      if (!item.origin && elapsed >= item.delay) {
        item.origin = launchPoint(editorRect, triggerRect, viewport, item.index, flight.blocks.length, stacked);
      }
      if (item.origin && !item.block.hidden) drawBlock(item, elapsed, target, flight.blocks.length, stacked);
    }

    if (elapsed >= arrival) {
      if (!impacted) {
        impacted = true;
        gauge.dataset.analysisImpact = 'true';
      }
      drawImpact(flight.sparks, target, (elapsed - arrival) / impactDuration);
    }

    frame = window.requestAnimationFrame(tick);
  }

  const watchdog = window.setTimeout(finish, duration + 180);
  frame = window.requestAnimationFrame(tick);
  return cancel;
}
