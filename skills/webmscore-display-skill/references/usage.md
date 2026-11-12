# webmscore rendering and annotation

For Codex Desktop, generate a fragment and embed it in the conversation using the content reference in `SKILL.md`. Set `--out` to a task-owned visualization path.

```sh
node scripts/render.mjs score.musicxml --pages 1 --out "<visualization-directory>/score.html"
```

| Option | Effect |
| --- | --- |
| `--pages 2-3` | Include these pages after engraving. |
| `--measures 3-4` | Crop the selected measures from the engraved layout. Crops across systems are navigated in order. A crop that starts mid-system can start without a clef or key signature. |
| `--page-width 2100` | Set paper width in tenths of a millimeter (210 mm here) and recompute the layout. |
| `--page-height 1900` | Set paper height in tenths of a millimeter (190 mm here) and recompute pagination. |
| `--systems-per-view 1` | Show up to this many original systems per screen. A system is one horizontal row containing the staves of the instruments. |
| `--measures-per-view 2` | Show up to this many measures per screen within each original system. Shorter views keep the scale of the original page. |
| `--max-width 720` | Limit the displayed score width in CSS pixels. The score also fits narrower windows. |
| `--max-height 400` | Limit the displayed score height in CSS pixels. The preview scales proportionally to fit. |
| `--annotations file.json` | Apply the optional presentation below. |
| `--standalone` | Export a complete offline HTML page when requested. |

The renderer applies optional paper dimensions to an in-memory MuseScore copy before selecting pages or measures. `--pages` selects complete pages. For a compact preview, choose one of the two per-view options. A single system can exceed the paper height when it contains many staves. If the compact view needs a height limit, `--max-height` scales the entire system proportionally.

Inputs include MuseScore MSCZ and MSCX, MusicXML and MXL, and MIDI. A MIDI import uses the engine's transcription and quantization. MuseScore 4.0.0 may render newer score features differently. Long scores may need a smaller `--pages` range for inline display. The preview uses embedded engraving vectors and omits SVG images.

## Annotation configuration

```json
{
  "highlights": [
    { "measure": 1, "staff": 1, "note": 2, "label": "Passing tone", "color": "orange", "foreground": "orange" },
    { "measures": [3, 4], "label": "Cadence", "color": "green" }
  ],
  "measureDetails": { "3": "V7 resolves in the next measure." }
}
```

- Use `measure` or an inclusive `measures` pair, counting the original score from 1. Use `note` within a measure to target a notehead. Notes sort by rendered position left to right, then top to bottom at the same position. A chord contributes individual noteheads.
- `staff` optionally limits a note target to the specified staff, counting from the top. The SVG export provides independent note shapes. The preview uses measure coordinates and staff line geometry to locate them. Verify targets in cross-staff, tablature, or visually dense passages. Direct source IDs, independent stems and beams are outside this adapter's annotation support.
- `color` and `opacity` apply to the rectangle. `foreground` changes a selected notehead's paint. Use `opacity: 0` for foreground only. Color values accept six-digit hex or a theme color from `orange`, `purple`, `green`, `blue`, `red`, and `yellow`.
- Set `title`, `showLegend: true`, or `showToggles: true` when useful. Use `measureDetails` to add text revealed when a measure is selected.
