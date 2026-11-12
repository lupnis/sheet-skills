---
name: sheet-display-skill
description: "Render and annotate staff notation inside Codex Desktop with Verovio. Use for 五线谱、谱例、作曲分析、和声分析 or score excerpts from MEI, MusicXML, MXL, or ABC. Supports measures, multi-instrument scores, and paginated previews without MuseScore Studio."
license: GPL-3.0-only
---

# Sheet Display

**Render directly in the Codex Desktop conversation by default.** For a request to render, show, or preview a score, use the chat's inline visualization surface. Follow the visualize skill when available.

Write the HTML fragment with `--out` to the task-owned visualization directory or another durable location allowed by the host. Generate the fragment without `--standalone`. To display it, put the following content reference on its own line in the final answer, outside any code fence. Replace the placeholder with the actual absolute path.

```text
visualize{"path":"<absolute-path>/score.html"}
```

Keep the fragment as backing content for the inline score. Provide a file link when the user asks for an export. Use `--standalone` for an explicitly requested browser-ready HTML file. If the host cannot render an interactive score inline, prefer a static inline score image when available.

**Choose the view from the request.** Follow explicit layout and size preferences. For a general request to show an existing score, start with a readable page view.

- **Full pages.** Select engraved pages with `--pages 1-2` and show all systems on each page at a readable width. Use the normal page dimensions for a page-based request. Set `--page-width 1250` to give a short score the standard page width when it would otherwise use automatic excerpt sizing.
- **Excerpts.** Use `--measures 7-10` to re-engrave the relevant passage. Around `--max-width 500` can suit a short example in the flow of the conversation. Give dense notation more room when needed.
- **Analysis.** Annotate whichever view gives the analysis enough context, including a full page when needed. Use highlights to point out the relevant music and `measureDetails` for selectable analysis. Add a title, legend, or switches when they help the reader.

1. Use the user's source score when available. For a new excerpt, write valid MEI or MusicXML. For notation edits, edit the structured source so pitch, duration, voices, and relationships survive regeneration.
2. From this skill directory, run `npm ci --ignore-scripts` once when dependencies are absent. Invoke `node scripts/render.mjs <score> --out <absolute-preview-path>.html` and add `--annotations <marks.json>` for markup. Read the [rendering and annotation reference](references/usage.md) when choosing flags or building an annotation file.
3. Use `--page-width` and `--page-height` when the task calls for different line breaks or pagination. Use `--max-width` for display size and check that noteheads and labels remain readable.
4. If the fragment exceeds the host's inline size limit, split the requested pages across inline previews.

Anchor a highlight to the smallest relevant score object. Prefer MEI element IDs for precise marks on complex or edited passages. For imported scores without stable IDs, use measure, staff, and note indices and visually check the target. Use a separate foreground color if the glyph itself should change color. Review beam grouping, cross-staff passages, complex ornaments, and import-sensitive notation against the input when they matter to the analysis.
