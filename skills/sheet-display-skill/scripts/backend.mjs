import { extname } from 'node:path';

export async function engrave(input, bytes, range, { pageWidth, pageHeight } = {}) {
  const extension = extname(input).toLowerCase();
  const formats = { '.mei': 'mei', '.musicxml': 'xml', '.xml': 'xml', '.mxl': 'xml', '.abc': 'abc' };
  const format = formats[extension];
  if (!format) throw new Error('Supported inputs: MEI, MusicXML, MXL, and ABC.');

  const [{ default: createModule }, { VerovioToolkit }] = await Promise.all([
    import('verovio/wasm'),
    import('verovio/esm'),
  ]);
  const toolkit = new VerovioToolkit(await createModule());
  try {
    toolkit.setOptions({
      inputFrom: format,
      breaks: 'auto',
      pageWidth: pageWidth ?? 1250,
      pageHeight: pageHeight ?? 1550,
      scale: 55,
      adjustPageHeight: true,
      adjustPageWidth: Boolean(range) && pageWidth === undefined,
      header: 'none',
      footer: 'none',
      pageMarginLeft: 34,
      pageMarginRight: 24,
      pageMarginTop: 24,
      pageMarginBottom: 24,
      svgViewBox: true,
      svgRemoveXlink: true,
      svgFormatRaw: true,
      smuflTextFont: 'embedded',
      xmlIdChecksum: true,
      font: 'Bravura',
    });
    const loaded = extension === '.mxl'
      ? toolkit.loadZipDataBase64(bytes.toString('base64'))
      : toolkit.loadData(bytes.toString('utf8'));
    if (!loaded || toolkit.getPageCount() < 1) throw new Error('Verovio could not load the score.');

    const normalized = range || toolkit.getPageCount() === 1 ? toolkit.getMEI({ pageBased: false }) : '';
    const sourceCount = (normalized.match(/<measure(?:\s|>)/g) ?? []).length;
    if (range) {
      if (range[1] > sourceCount) throw new Error('Measure range exceeds the score length (' + sourceCount + ').');
      if (!toolkit.select({ measureRange: range.join('-') })) throw new Error('Verovio could not select that measure range.');
    }
    const measureCount = range ? range[1] - range[0] + 1 : sourceCount;
    const compact = pageWidth === undefined && pageHeight === undefined &&
      measureCount > 0 && measureCount <= 4 &&
      (normalized.match(/<staffDef(?:\s|>)/g) ?? []).length <= 2 &&
      (normalized.match(/<note(?:\s|>)/g) ?? []).length <= 80 &&
      !/<(?:pb|sb)(?:\s|\/|>)/.test(normalized);
    if (compact) toolkit.setOptions({ breaks: 'none', adjustPageWidth: true });
    if (range || compact) toolkit.redoLayout();

    const pages = [];
    let firstMeasure = range?.[0] ?? 1;
    for (let number = 1; number <= toolkit.getPageCount(); number++) {
      const svg = toolkit.renderToSVG(number);
      const count = (svg.match(/\bclass="measure(?:\s[^"]*)?"/g) ?? []).length;
      pages.push({ number, firstMeasure, svg });
      firstMeasure += count;
    }
    return { engine: 'verovio', version: toolkit.getVersion(), pages };
  } finally {
    toolkit.destroy();
  }
}
