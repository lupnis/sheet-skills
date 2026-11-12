# Verovio rendering and annotation

For Codex Desktop, generate a fragment and embed it in the conversation using the content reference in `SKILL.md`. Set `--out` to a task-owned visualization path.

```sh
node scripts/render.mjs score.musicxml --max-width 500 --out "<visualization-directory>/score.html"
```

| Option | Effect |
| --- | --- |
| `--measures 3-4` | Re-engrave the inclusive source measure range, indexed by position. |
| `--pages 2-3` | Include only these pages from the resulting engraving. |
| `--page-width 1500` | Set Verovio's layout width. A wider layout can fit more measures on a system. |
| `--page-height 1000` | Set Verovio's layout height. A shorter layout generally fits fewer systems on a page. |
| `--max-width 720` | Limit the displayed score width in CSS pixels. |
| `--annotations file.json` | Apply the optional view configuration below. |
| `--standalone` | Export a complete offline HTML page when requested. |

The layout dimensions are Verovio units and default to 1250 × 1550. The number of measures per system depends on the music. The final SVG trims unused page height to fit the content.

Inputs include MEI, MusicXML, single-root-file compressed MusicXML (MXL), and ABC. Verovio's [import coverage](https://book.verovio.org/toolkit-reference/input-formats.html) governs which notation details survive import. The viewer uses embedded engraving vectors, so external SVG images are omitted. Rendering with Verovio can produce different page breaks, spacing, and symbol coverage from another engraving engine.

## Annotation configuration

```json
{
  "highlights": [
    { "measure": 1, "staff": 1, "note": 2, "color": "orange", "foreground": "orange", "label": "Passing tone" },
    { "id": "source-note-id", "component": "stem", "foreground": "#2774BB", "opacity": 0 },
    { "measures": [3, 4], "color": "green", "label": "Cadence" }
  ],
  "measureDetails": { "3": "V7 resolves in the next measure." }
}
```

- A target is an engraving element `id`, a single `measure`, or an inclusive pair `measures`. Add `note` to a single measure for a note target. Measure indices use the original score and count from 1. If a measure contains multiple staves, `staff` counts visible staves from the top. Note indices sort rendered noteheads left to right, then top to bottom at the same position. Chord members are individual notes. Review indices after changes that reorder music.
- The default component of a note is `notehead`. You can select `stem`, `beam`, or `element`. An ID can also target an existing rendered slur, text, or ornament. IDs from MEI are the most reliable across layout changes. MusicXML import can change IDs.
- The rectangle uses `color` and `opacity`. Set `opacity: 0` for foreground-only styling. Set `foreground` to recolor a targeted glyph. Colors accept six-digit hex values or theme-aware `orange`, `purple`, `green`, `blue`, `red`, and `yellow`.
- Provide `title`, `showLegend: true`, or `showToggles: true` when they serve the presentation. The optional toggles change only presentation. `measureDetails` adds selectable regions to the specified measures. The text appears after selecting a measure.
- Long scores can exceed Codex's inline size limit. Split the requested pages across inline previews.
