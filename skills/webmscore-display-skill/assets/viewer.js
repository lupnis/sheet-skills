(() => {
  const root = document.getElementById('__SHEET_ROOT__');
  const { engine, annotations, pages, maxWidth, maxHeight, engravings } = JSON.parse(root.querySelector('[data-engraving]').textContent);
  const score = root.querySelector('[data-score]');
  if (maxWidth) score.style.maxWidth = maxWidth + 'px';
  const title = root.querySelector('[data-title]');
  const legend = root.querySelector('[data-legend]');
  const detail = root.querySelector('[data-detail]');
  const warning = root.querySelector('[data-warning]');
  const nav = root.querySelector('[data-navigation]');
  const previous = nav.querySelector('[data-previous]');
  const next = nav.querySelector('[data-next]');
  const label = nav.querySelector('[data-page-label]');
  const namespace = 'http://www.w3.org/2000/svg';
/*LAYOUT_ADAPTER*/
  const enabled = annotations.marks.map(() => true);
  let pageIndex = 0;
  let selectedMeasure;

  if (annotations.title) {
    title.textContent = annotations.title;
    title.hidden = false;
  }

  function paint(value) {
    return value.startsWith('#') ? value : 'var(--sheet-' + value + ')';
  }

  function persist() {
    window.openai?.setWidgetState?.({
      modelContent: { pageIndex, selectedMeasure: selectedMeasure ?? null, enabled: [...enabled] },
      privateContent: null,
    })?.catch(() => {});
  }

  if ((annotations.showLegend || annotations.showToggles) && annotations.marks.length) {
    legend.hidden = false;
    annotations.marks.forEach((mark, index) => {
      const item = document.createElement(annotations.showToggles ? 'button' : 'span');
      const swatch = document.createElement('span');
      swatch.className = 'sheet-swatch';
      swatch.style.backgroundColor = paint(mark.color);
      swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, document.createTextNode(mark.label));
      if (annotations.showToggles) {
        item.className = 'btn';
        item.type = 'button';
        item.setAttribute('aria-pressed', 'true');
        item.addEventListener('click', () => {
          enabled[index] = !enabled[index];
          item.setAttribute('aria-pressed', String(enabled[index]));
          draw();
          persist();
        });
      }
      legend.append(item);
    });
  }

  function combine(boxes) {
    return {
      x: Math.min(...boxes.map(box => box.x)),
      y: Math.min(...boxes.map(box => box.y)),
      right: Math.max(...boxes.map(box => box.right)),
      bottom: Math.max(...boxes.map(box => box.bottom)),
    };
  }

  function draw() {
    const page = pages[pageIndex];
    const parsed = new DOMParser().parseFromString(engravings[page.number], 'image/svg+xml');
    const svg = document.importNode(parsed.documentElement, true);
    svg.classList.add('engraving-' + engine);
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('role', Object.keys(annotations.measureDetails).length ? 'group' : 'img');
    svg.setAttribute('aria-label', page.crop?.keepScale
      ? '五线谱，第 ' + (pageIndex + 1) + ' 屏，排版第 ' + page.number + ' 页'
      : '五线谱，第 ' + page.number + ' 页');
    score.replaceChildren(svg);

    // Anchor overlays inside the same SVG viewport as the engraving. The nested
    // viewport in Verovio can shift independently of the outer responsive SVG.
    const music = engravingRoot(svg);
    const matrix = music.getScreenCTM()?.inverse();
    if (!matrix) return;

    function bounds(element) {
      const box = element.getBBox();
      const transform = matrix.multiply(element.getScreenCTM());
      const corners = [
        [box.x, box.y], [box.x + box.width, box.y],
        [box.x, box.y + box.height], [box.x + box.width, box.y + box.height],
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(transform));
      return combine(corners.map(({ x, y }) => ({ x, y, right: x, bottom: y })));
    }

    const { regions, locate, fit } = prepareEngraving(music, bounds, page);
    const regionByNumber = new Map(regions.map(region => [region.number, region]));
    const layers = document.createElementNS(namespace, 'g');
    layers.setAttribute('aria-hidden', 'true');
    music.insertBefore(layers, Array.from(music.children).find(element =>
      !['defs', 'title', 'desc'].includes(element.localName)) ?? null);

    function makeRect(box, paddingX, paddingY) {
      const rect = document.createElementNS(namespace, 'rect');
      const width = Math.max(1, box.right - box.x + 2 * paddingX);
      const height = Math.max(1, box.bottom - box.y + 2 * paddingY);
      for (const [key, value] of Object.entries({ x: box.x - paddingX, y: box.y - paddingY, width, height })) {
        rect.setAttribute(key, value.toFixed(2));
      }
      return rect;
    }

    function addMark(box, mark, index, isMeasure) {
      const height = box.bottom - box.y;
      const padding = Math.max(height, box.right - box.x > height && !isMeasure ? (box.right - box.x) * 0.12 : 0);
      const rect = makeRect(box, isMeasure ? 0 : padding * 0.28, padding * (isMeasure ? 0.035 : 0.27));
      rect.setAttribute('rx', (padding * (isMeasure ? 0.016 : 0.13)).toFixed(2));
      rect.setAttribute('class', 'sheet-highlight');
      rect.setAttribute('data-highlight', index + 1);
      rect.style.fill = paint(mark.color);
      rect.style.fillOpacity = String(mark.opacity);
      layers.append(rect);
    }

    function tint(element, color) {
      const leaves = element.matches('g') ? element.querySelectorAll('path, use, polygon, polyline, line, text, tspan') : [element];
      for (const leaf of leaves) {
        const current = getComputedStyle(leaf);
        if (current.stroke !== 'none') leaf.style.stroke = paint(color);
        if (current.fill !== 'none') leaf.style.fill = paint(color);
      }
    }

    const unresolved = [];
    annotations.marks.forEach((mark, index) => {
      if (!enabled[index]) return;
      if (mark.id !== undefined || mark.note !== undefined) {
        const region = regionByNumber.get(mark.measure);
        const target = locate(mark, region);
        if (!target) {
          if (region || (mark.id !== undefined && pages.length === 1)) unresolved.push(mark.label);
          return;
        }
        if (mark.opacity > 0) addMark(bounds(target), mark, index, false);
        if (mark.foreground) tint(target, mark.foreground);
        return;
      }

      const [first, last] = mark.measures ?? [mark.measure, mark.measure];
      const systems = new Map();
      for (const region of regions) {
        if (region.number < first || region.number > last) continue;
        const boxes = systems.get(region.system) ?? [];
        boxes.push(region);
        systems.set(region.system, boxes);
      }
      if (mark.opacity > 0) {
        for (const boxes of systems.values()) addMark(combine(boxes), mark, index, true);
      }
    });

    function selectMeasure(number) {
      selectedMeasure = number;
      detail.textContent = annotations.measureDetails[number] ?? '';
      music.querySelectorAll('[data-measure]').forEach(link => {
        if (Number(link.dataset.measure) === selectedMeasure) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }

    const links = document.createElementNS(namespace, 'g');
    for (const region of regions) {
      if (!Object.hasOwn(annotations.measureDetails, region.number)) continue;
      const link = document.createElementNS(namespace, 'a');
      link.setAttribute('href', '#__SHEET_ROOT__-detail');
      link.setAttribute('data-measure', region.number);
      link.setAttribute('class', 'sheet-measure-target cursor-interaction');
      link.setAttribute('aria-label', '查看第 ' + region.number + ' 小节的分析');
      link.append(makeRect(region, 0, 0));
      link.addEventListener('click', event => {
        event.preventDefault();
        selectMeasure(region.number);
        persist();
      });
      links.append(link);
    }
    music.append(links);
    detail.id = '__SHEET_ROOT__-detail';
    selectMeasure(regionByNumber.has(selectedMeasure) ? selectedMeasure : undefined);
    warning.textContent = unresolved.length ? '本页无法定位：' + unresolved.join('、') : '';
    nav.hidden = pages.length < 2;
    label.textContent = (pageIndex + 1) + ' / ' + pages.length;
    previous.disabled = pageIndex === 0;
    next.disabled = pageIndex === pages.length - 1;

    fit?.(svg);
    if (maxHeight) {
      const { width, height } = svg.viewBox.baseVal;
      if (width > 0 && height > 0) svg.style.maxWidth = (maxHeight * width / height) + 'px';
    }
  }

  for (const [button, direction] of [[previous, -1], [next, 1]]) {
    button.addEventListener('click', () => {
      pageIndex = Math.max(0, Math.min(pages.length - 1, pageIndex + direction));
      draw();
      persist();
    });
  }

  function restore(state) {
    const saved = state?.modelContent;
    pageIndex = Number.isInteger(saved?.pageIndex) && pages[saved.pageIndex] ? saved.pageIndex : 0;
    selectedMeasure = Number.isInteger(saved?.selectedMeasure) ? saved.selectedMeasure : undefined;
    enabled.forEach((_, index) => { enabled[index] = saved?.enabled?.[index] !== false; });
    Array.from(legend.querySelectorAll('button')).forEach((button, index) => {
      button.setAttribute('aria-pressed', String(enabled[index]));
    });
    draw();
  }

  window.addEventListener('openai:set_globals', event => {
    if (event.detail?.globals?.widgetState !== undefined) restore(event.detail.globals.widgetState);
  });
  restore(window.openai?.widgetState);
})();
