import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { engrave } from './backend.mjs';

const help = 'Usage: node scripts/render.mjs INPUT --out VIEW.html [--annotations MARKS.json] [--measures 2-4] [--pages 1-2] [--page-width N] [--page-height N] [--systems-per-view N | --measures-per-view N] [--max-width PX] [--max-height PX] [--standalone]';
const colorPattern = /^(#[a-f\d]{6}|orange|purple|green|blue|red|yellow)$/i;
const safeElements = new Set([
  'svg', 'g', 'defs', 'desc', 'title', 'path', 'use', 'rect', 'circle', 'ellipse',
  'line', 'polyline', 'polygon', 'text', 'tspan', 'clipPath', 'mask', 'linearGradient',
  'radialGradient', 'stop', 'pattern', 'symbol',
]);

function parseRange(value, label) {
  if (value === undefined) return undefined;
  if (!/^[1-9]\d*(?:-[1-9]\d*)?$/.test(value)) throw new Error(label + ' expects a 1-based number or range such as 2-4.');
  const [first, last = first] = value.split('-').map(Number);
  if (last < first || !Number.isSafeInteger(last)) throw new Error('Invalid ' + label + ' range.');
  return [first, last];
}

function integerOption(value, label, minimum = 1, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(number) || number < minimum || number > maximum) {
    const range = maximum === Number.MAX_SAFE_INTEGER ? 'a positive integer' : 'an integer from ' + minimum + ' to ' + maximum;
    throw new Error(label + ' expects ' + range + '.');
  }
  return number;
}

function requireColor(value, label) {
  if (typeof value !== 'string' || !colorPattern.test(value)) {
    throw new Error(label + ' must be a six-digit hex color or a named theme color.');
  }
  return value.toLowerCase();
}

function parseAnnotations(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Annotations must be a JSON object.');
  const { title, showLegend = false, showToggles = false, highlights = [], measureDetails = {} } = value;
  if (title !== undefined && typeof title !== 'string') throw new Error('title must be text.');
  if (typeof showLegend !== 'boolean' || typeof showToggles !== 'boolean') throw new Error('Legend and toggle options must be boolean.');
  if (!Array.isArray(highlights)) throw new Error('highlights must be an array.');
  if (!measureDetails || typeof measureDetails !== 'object' || Array.isArray(measureDetails) ||
      Object.entries(measureDetails).some(([key, detail]) => !/^[1-9]\d*$/.test(key) || typeof detail !== 'string')) {
    throw new Error('measureDetails maps 1-based measure numbers to text.');
  }

  const marks = highlights.map((mark, index) => {
    if (!mark || typeof mark !== 'object' || Array.isArray(mark)) throw new Error('Each highlight must be an object.');
    const { id, measure, note, staff, measures, component, label, color, foreground, opacity = 0.25 } = mark;
    if (id !== undefined || (component !== undefined && component !== 'notehead')) {
      throw new Error('The webmscore preview supports positional notehead targets. Use measure, staff, and note.');
    }
    if ([id !== undefined, measure !== undefined, measures !== undefined].filter(Boolean).length !== 1) {
      throw new Error('Highlight ' + (index + 1) + ' requires one target: id, measure, or measures.');
    }
    if (id !== undefined && (typeof id !== 'string' || !id.trim())) throw new Error('Highlight id must be nonempty text.');
    if (measure !== undefined && (!Number.isSafeInteger(measure) || measure < 1)) throw new Error('measure must be a positive integer.');
    if (measures !== undefined && (!Array.isArray(measures) || measures.length !== 2 ||
        measures.some(number => !Number.isSafeInteger(number) || number < 1) || measures[0] > measures[1])) {
      throw new Error('measures must be an inclusive pair such as [3, 5].');
    }
    if (note !== undefined && (measure === undefined || !Number.isSafeInteger(note) || note < 1)) {
      throw new Error('note must be a positive index within a measure.');
    }
    if (staff !== undefined && (note === undefined || !Number.isSafeInteger(staff) || staff < 1)) {
      throw new Error('staff must be a positive index and requires a note target.');
    }
    if (component !== undefined && (!['notehead', 'stem', 'beam', 'element'].includes(component) ||
        (id === undefined && note === undefined))) throw new Error('component requires a note or ID target.');
    if (foreground !== undefined && (measures !== undefined || (measure !== undefined && note === undefined))) {
      throw new Error('foreground requires a note or ID target.');
    }
    if (label !== undefined && typeof label !== 'string') throw new Error('label must be text.');
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new Error('opacity must be between 0 and 1.');
    return {
      id, measure, note, staff, measures, component, label: label ?? '标注 ' + (index + 1), opacity,
      color: requireColor(color ?? 'orange', 'color'),
      foreground: foreground === undefined ? undefined : requireColor(foreground, 'foreground'),
    };
  });
  return { title, showLegend, showToggles, marks, measureDetails };
}

function safeSvg(source, themeBlack) {
  const parser = new DOMParser({
    onError(level, message) {
      if (level !== 'warning') throw new Error('Invalid SVG from the engraving engine: ' + message);
    },
  });
  const root = parser.parseFromString(source, 'image/svg+xml').documentElement;
  if (root.localName !== 'svg' || !root.hasAttribute('viewBox')) throw new Error('Engraving engine did not return a scalable SVG.');

  function clean(element) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.localName.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on') || name === 'base' || name === 'src' ||
          (name === 'href' && !/^#[^\s]+$/.test(value)) ||
          /url\s*\(\s*(?!['"]?#)/i.test(value) ||
          (name === 'style' && /@|expression\s*\(|[\\]/i.test(value))) {
        element.removeAttributeNode(attribute);
      } else if (themeBlack && (name === 'stroke' || name === 'fill') && /^(black|#000000|#000)$/i.test(value)) {
        element.setAttribute(attribute.name, 'currentColor');
      }
    }
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 1 && safeElements.has(child.localName)) clean(child);
      else if (child.nodeType !== 3) element.removeChild(child);
    }
  }

  clean(root);
  root.removeAttribute('width');
  root.removeAttribute('height');
  return new XMLSerializer().serializeToString(root);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string' }, annotations: { type: 'string' },
      measures: { type: 'string' }, pages: { type: 'string' },
      'systems-per-view': { type: 'string' }, 'measures-per-view': { type: 'string' },
      'page-width': { type: 'string' }, 'page-height': { type: 'string' },
      'max-width': { type: 'string' }, 'max-height': { type: 'string' },
      standalone: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(help);
    return;
  }
  if (positionals.length !== 1 || !values.out) throw new Error(help);

  const input = resolve(positionals[0]);
  const output = resolve(values.out);
  if (!/\.html?$/i.test(output)) throw new Error('--out must end in .html or .htm.');
  const annotationPath = values.annotations ? resolve(values.annotations) : undefined;
  if (output === input || output === annotationPath) throw new Error('Choose an output path distinct from your inputs.');
  const annotations = parseAnnotations(annotationPath ? JSON.parse((await readFile(annotationPath, 'utf8')).replace(/^\uFEFF/, '')) : undefined);
  const pageRange = parseRange(values.pages, '--pages');
  const systemsPerView = integerOption(values['systems-per-view'], '--systems-per-view');
  const measuresPerView = integerOption(values['measures-per-view'], '--measures-per-view');
  const pageWidth = integerOption(values['page-width'], '--page-width', 100, 100_000);
  const pageHeight = integerOption(values['page-height'], '--page-height', 100, 60_000);
  const maxWidth = integerOption(values['max-width'], '--max-width');
  const maxHeight = integerOption(values['max-height'], '--max-height');
  if (systemsPerView && measuresPerView) {
    throw new Error('Choose either --systems-per-view or --measures-per-view.');
  }
  const score = await engrave(input, await readFile(input), parseRange(values.measures, '--measures'), {
    pageRange, systemsPerView, measuresPerView, pageWidth, pageHeight,
  });
  const { pages } = score;
  if (!pages.length) throw new Error('No score content matches the requested pages and measures.');

  // Each cut from the same paper page shares the same engraving.
  const engravings = {};
  const payload = {
    engine: score.engine, annotations, maxWidth, maxHeight, engravings,
    pages: pages.map(({ svg, ...view }) => {
      engravings[view.number] ??= safeSvg(svg, score.themeBlack);
      return view;
    }),
  };
  const [template, viewer, layout] = await Promise.all([
    readFile(new URL('../assets/viewer.html', import.meta.url), 'utf8'),
    readFile(new URL('../assets/viewer.js', import.meta.url), 'utf8'),
    readFile(new URL('../assets/layout.js', import.meta.url), 'utf8'),
  ]);
  const root = 'sheet-' + randomUUID().replaceAll('-', '');
  const data = JSON.stringify(payload).replaceAll('<', '\\u003c');
  const fragment = template.replaceAll('__SHEET_ROOT__', root)
    .replace('<!--VIEWER_SCRIPT-->', () => viewer.replaceAll('__SHEET_ROOT__', root)
      .replace('/*LAYOUT_ADAPTER*/', () => layout))
    .replace('<!--SCORE_DATA-->', () => data);
  if (!values.standalone && Buffer.byteLength(fragment) >= 950_000) {
    throw new Error('Inline preview is too large. Use --pages to split it into smaller previews.');
  }
  const html = values.standalone
    ? '<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Sheet music</title><style>body{max-width:960px;margin:1rem auto;padding:0 1rem;font:1rem system-ui;color-scheme:light dark}</style><body>' +
      fragment + '</body></html>'
    : fragment;
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html, 'utf8');
  const kind = pages.some(page => page.crop) ? 'view(s)' : 'page(s)';
  console.log(score.engine + ' ' + score.version + ' · ' + pages.length + ' ' + kind + ' · ' + output);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
