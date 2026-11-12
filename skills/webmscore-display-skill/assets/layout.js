  function engravingRoot(svg) {
    return svg;
  }

  function prepareEngraving(music, bounds, page) {
    const { regions } = page;
    const notes = annotations.marks.some(mark => mark.note)
      ? Array.from(music.querySelectorAll('.Note'), element => ({ element, ...bounds(element) }))
      : [];
    const staffLines = annotations.marks.some(mark => mark.staff)
      ? Array.from(music.querySelectorAll('.StaffLines'), bounds)
      : [];

    function staffBands(region) {
      const centerX = (region.x + region.right) / 2;
      const ys = [...new Set(staffLines
        .filter(line => line.x <= centerX && centerX <= line.right && line.y >= region.y - 1 && line.y <= region.bottom + 1)
        .map(line => Math.round(line.y * 10) / 10))].sort((a, b) => a - b);
      const gaps = ys.slice(1).map((y, index) => y - ys[index]).sort((a, b) => a - b);
      const spacing = gaps[Math.floor(gaps.length / 2)] ?? 1;
      const bands = [];
      for (const y of ys) {
        const last = bands.at(-1);
        if (last && y - last.bottom <= spacing * 1.6) last.bottom = y;
        else bands.push({ top: y, bottom: y });
      }
      return bands;
    }

    function locate(mark, region) {
      if (!region) return undefined;
      const bands = mark.staff === undefined ? [] : staffBands(region);
      if (mark.staff !== undefined && !bands[mark.staff - 1]) return undefined;
      return notes.filter(note => {
        const x = (note.x + note.right) / 2;
        const y = (note.y + note.bottom) / 2;
        const padding = (note.bottom - note.y) * 1.8;
        if (x < region.x || x >= region.right || y < region.y - padding || y > region.bottom + padding) return false;
        if (!bands.length) return true;
        const distance = band => Math.max(band.top - y, y - band.bottom, 0);
        return distance(bands[mark.staff - 1]) === Math.min(...bands.map(distance));
      }).sort((a, b) => a.x - b.x || a.y - b.y)[mark.note - 1]?.element;
    }

    function fit(svg) {
    const paper = svg.viewBox.baseVal;
    const drawing = svg.getBBox();
    const margin = Math.max(10, drawing.width * 0.015);
    const paperRight = paper.x + paper.width;
    const paperBottom = paper.y + paper.height;
    const drawingRight = drawing.x + drawing.width;
    const drawingBottom = drawing.y + drawing.height;

    // MuseScore keeps an oversized system together even when the requested
    // paper cannot contain it. Extend the preview to show all engraved staves.
    const left = drawing.x < paper.x ? drawing.x - margin : paper.x;
    const top = drawing.y < paper.y ? drawing.y - margin : paper.y;
    const rightEdge = drawingRight > paperRight ? drawingRight + margin : paperRight;
    const bottomEdge = drawingBottom > paperBottom ? drawingBottom + margin : paperBottom;

      if (page.crop) {
      const x = Math.max(left, page.crop.x ?? left);
      const y = Math.max(top, page.crop.y);
      const right = Math.min(rightEdge, page.crop.right ?? Infinity);
      const bottom = Math.min(bottomEdge, page.crop.bottom);
      const width = right - x;
      if (width > 0 && bottom > y) {
        if (page.crop.keepScale) svg.style.width = (Math.min(width / paper.width, 1) * 100) + '%';
        svg.setAttribute('viewBox', [x, y, width, bottom - y].join(' '));
      }
    } else if (page.trim && drawing.width > 0 && drawing.height > 0) {
      svg.setAttribute('viewBox', [
        drawing.x - margin, drawing.y - margin, drawing.width + 2 * margin, drawing.height + 2 * margin,
      ].join(' '));
    } else if (left !== paper.x || top !== paper.y || rightEdge !== paperRight || bottomEdge !== paperBottom) {
      svg.setAttribute('viewBox', [left, top, rightEdge - left, bottomEdge - top].join(' '));
      }
    }

    return { regions, locate, fit };
  }
