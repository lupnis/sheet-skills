  function engravingRoot(svg) {
    return svg.querySelector('svg.definition-scale') ?? svg;
  }

  function prepareEngraving(music, bounds, page) {
    const regions = Array.from(music.querySelectorAll('g.measure')).map((measure, index) => {
      const lines = Array.from(measure.querySelectorAll('g.staff > path'), bounds);
      const box = lines.length ? combine(lines) : bounds(measure);
      const contents = combine([box, ...Array.from(measure.querySelectorAll('g.notehead'), bounds)]);
      return {
        ...box, y: contents.y, bottom: contents.bottom,
        number: page.firstMeasure + index, measure, system: measure.closest('g.system'),
      };
    });

    function locate(mark, region) {
      const component = mark.component ?? 'notehead';
      let element;
      if (mark.id !== undefined) {
        element = music.querySelector('#' + CSS.escape(mark.id));
      } else if (region) {
        const staff = mark.staff === undefined
          ? region.measure
          : region.measure.querySelectorAll(':scope > g.staff')[mark.staff - 1];
        if (!staff) return undefined;
        element = Array.from(staff.querySelectorAll('g.note'), note => ({
          element: note, ...bounds(note.querySelector('.notehead') ?? note),
        })).sort((a, b) => a.x - b.x || a.y - b.y)[mark.note - 1]?.element;
      }
      if (!element?.matches('g.note') || component === 'element') return element;
      if (component === 'beam') return element.closest('g.beam');
      if (component === 'stem') {
        return element.querySelector('g.stem') ?? element.closest('g.chord')?.querySelector(':scope > g.stem');
      }
      return element.querySelector('.notehead use, .notehead') ?? element;
    }

    function fit(svg) {
      const ink = [];
      for (const element of music.querySelectorAll('path, use, polyline, polygon, line, rect, ellipse, circle, text')) {
        if (element.closest('defs, .placeholder') || getComputedStyle(element).visibility !== 'visible') continue;
        const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
        if (width || height) ink.push({ x: left, y: top, right, bottom });
      }
      const transform = svg.getScreenCTM()?.inverse();
      if (!ink.length || !transform) return;

      const box = combine(ink);
      const corners = [
        [box.x, box.y], [box.right, box.y], [box.x, box.bottom], [box.right, box.bottom],
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(transform));
      const paper = svg.viewBox.baseVal;
      const padding = Math.max(2, paper.width * 0.006);
      const x = Math.min(paper.x, ...corners.map(point => point.x - padding));
      const y = Math.min(paper.y, ...corners.map(point => point.y - padding));
      const right = Math.max(paper.x + paper.width, ...corners.map(point => point.x + padding));
      const bottom = Math.max(paper.y + paper.height, ...corners.map(point => point.y + padding));
      const width = right - x;
      const height = bottom - y;
      if (x === paper.x && y === paper.y && width === paper.width && height === paper.height) return;

      // Preserve the engraving's coordinate transform when the outer canvas grows.
      if (music !== svg) {
        const innerWidth = music.width.baseVal.value;
        const innerHeight = music.height.baseVal.value;
        music.setAttribute('width', innerWidth);
        music.setAttribute('height', innerHeight);
      }
      svg.setAttribute('viewBox', [x, y, width, height].join(' '));
    }

    return { regions, locate, fit };
  }
