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

    return { regions, locate };
  }
