import { extname } from 'node:path';
import { resizeArchive } from './page-layout.mjs';

async function loadEngine() {
  // The legacy Node bundle writes navigator and prefers Fetch even for file
  // URLs. Let Emscripten use its built-in local filesystem loader during init.
  const navigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const fetch = globalThis.fetch;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: globalThis.navigator ?? {}, writable: true, configurable: true,
    });
    globalThis.fetch = undefined;
    const { default: WebMscore } = await import('webmscore');
    await WebMscore.ready;
    return WebMscore;
  } finally {
    globalThis.fetch = fetch;
    if (navigator) Object.defineProperty(globalThis, 'navigator', navigator);
    else delete globalThis.navigator;
  }
}

function batches(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

function makeViews(regions, range, { systemsPerView, measuresPerView }) {
  const bySystem = new Map();
  for (const region of regions) {
    const system = bySystem.get(region.system) ?? [];
    system.push(region);
    bySystem.set(region.system, system);
  }
  const systems = Array.from(bySystem.values());
  const rows = systems.flatMap((system, index) => {
    const picked = system.filter(region => !range || (range[0] <= region.number && region.number <= range[1]));
    return picked.length ? [{ index, picked, complete: picked.length === system.length }] : [];
  });

  let groups;
  if (measuresPerView) {
    groups = rows.flatMap(row => batches(row.picked, measuresPerView).map(picked =>
      [{ ...row, picked, complete: row.complete && picked.length === row.picked.length }]));
  } else if (systemsPerView) {
    groups = [];
    for (const row of rows) {
      const group = groups.at(-1);
      if (row.complete && group?.[0].complete && group.length < systemsPerView) group.push(row);
      else groups.push([row]);
    }
  } else {
    groups = rows.map(row => [row]);
  }

  return groups.map(group => {
    const picked = group.flatMap(row => row.picked);
    const first = group[0];
    const last = group.at(-1);
    const top = Math.min(...picked.map(region => region.y));
    const bottom = Math.max(...picked.map(region => region.bottom));
    const margin = Math.max(10, (first.picked[0].bottom - first.picked[0].y) * 0.14);
    const before = systems[first.index - 1]?.[0];
    const after = systems[last.index + 1]?.[0];
    const y = before && before.bottom < top ? Math.max(top - margin, (before.bottom + top) / 2) : top - margin;
    const endY = after && after.y > bottom ? Math.min(bottom + margin, (after.y + bottom) / 2) : bottom + margin;
    const compact = Boolean(systemsPerView || measuresPerView);
    const beginsSystem = picked[0] === systems[first.index][0];
    const endsSystem = picked.at(-1) === systems[last.index].at(-1);
    return {
      regions: picked,
      crop: {
        x: compact && beginsSystem ? undefined : Math.min(...picked.map(region => region.x)),
        right: compact && endsSystem ? undefined : Math.max(...picked.map(region => region.right)),
        y, bottom: endY, keepScale: compact,
      },
    };
  });
}

export async function engrave(input, bytes, range, options = {}) {
  const formats = {
    '.mscz': 'mscz', '.mscx': 'mscx', '.musicxml': 'musicxml', '.xml': 'xml',
    '.mxl': 'mxl', '.mid': 'midi', '.midi': 'midi',
  };
  const format = formats[extname(input).toLowerCase()];
  if (!format) throw new Error('Supported inputs: MSCZ, MSCX, MusicXML, MXL, and MIDI.');
  const engine = await loadEngine();
  let score = await engine.load(format, new Uint8Array(bytes));
  try {
    if (options.pageWidth !== undefined || options.pageHeight !== undefined) {
      const archive = await score.saveMsc('mscz');
      score = await engine.load('mscz', resizeArchive(archive, options));
    }
    const metadata = await score.metadata();
    const { elements } = JSON.parse(await score.savePositions(false));
    const allRegions = elements.map(({ id, page, x, y, sx, sy }) => {
      if (![id, page, x, y, sx, sy].every(Number.isFinite) || sx <= 0 || sy <= 0) {
        throw new Error('webmscore did not return usable measure positions.');
      }
      return { number: id + 1, page: page + 1, x, y, right: x + sx, bottom: y + sy, system: Math.round(y) };
    });
    if (range && range[1] > allRegions.length) {
      throw new Error('Measure range exceeds the engraved score length (' + allRegions.length + ').');
    }
    const [firstPage, lastPage] = options.pageRange ?? [1, metadata.pages];
    if (lastPage > metadata.pages) throw new Error('Page range is outside the available score pages.');
    const pages = [];
    let version;
    for (let number = firstPage; number <= lastPage; number++) {
      const regions = allRegions.filter(region => region.page === number);
      const split = range || options.systemsPerView || options.measuresPerView;
      const views = split ? makeViews(regions, range, options) : [{ regions, trim: metadata.pages === 1 }];
      if (!views.length) continue;
      const svg = await score.saveSvg(number - 1, false);
      version ??= svg.match(/Generated by MuseScore ([^<]+)/)?.[1] ?? '1.2.1';
      for (const view of views) pages.push({ number, svg, ...view });
    }
    return { engine: 'webmscore', version, pages, themeBlack: true };
  } finally {
    await score.destroy();
  }
}
