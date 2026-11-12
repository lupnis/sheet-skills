---
name: webmscore-display-skill
description: "Compare engraved staff notation in Codex Desktop using the experimental LibreScore webmscore WASM backend. Use when the user asks for webmscore, a backend comparison, or a preview of a native MSCZ/MSCX score without MuseScore Studio."
license: GPL-3.0-only
---

# Webmscore Display

**Render directly in the Codex Desktop conversation by default.** For a request to render, show, or preview a score, use the chat's inline visualization surface. Follow the visualize skill when available.

Write the HTML fragment with `--out` to the task-owned visualization directory or another durable location allowed by the host. Generate the fragment without `--standalone`. To display it, put the following content reference on its own line in the final answer, outside any code fence. Replace the placeholder with the actual absolute path.

```text
visualize{"path":"<absolute-path>/score.html"}
```

Keep the fragment as backing content for the inline score. Provide a file link when the user asks for an export. Use `--standalone` for an explicitly requested browser-ready HTML file. If the host cannot render an interactive score inline, prefer a static inline score image when available.

**Choose the view from the request.** Follow explicit layout and size preferences. For a general request to show an existing score, start with a readable page view.

- **Full pages.** `--pages 1-2` is sufficient to select complete engraved pages. Show all systems on each page at a readable width and allow the page height to follow the score.
- **Excerpts and compact reading.** Use `--measures 7-10` for a specific passage. Use `--systems-per-view` or `--measures-per-view` when a system-by-system or measure-by-measure reading suits the task. For compact views with many staves, use `--max-height` when a height limit helps, and check legibility.
- **Analysis.** Annotate whichever view gives the analysis enough context, including a full page when needed. Use highlights to point out the relevant music and `measureDetails` for selectable analysis. Add a title, legend, or switches when they help the reader.

When comparing engines, use the same source passage and annotation targets.

1. From this skill directory, run `npm ci --ignore-scripts` if dependencies are absent. Invoke `node scripts/render.mjs <score> --out <absolute-preview-path>.html`. Use `--annotations <marks.json>` for highlights and measure analysis. Read the [rendering and annotation reference](references/usage.md) when choosing flags or building an annotation file.
2. Use `--page-width` and `--page-height` when the task calls for different line breaks or pagination. Use `--max-width` and `--max-height` for display size in CSS pixels. Check the resulting boundaries, staff positions, and readability.
3. If the fragment exceeds the host's inline size limit, split the requested pages across inline previews.

This build uses LibreScore webmscore 1.2.1 with the MuseScore 4.0.0 engraving engine. Check modern MuseScore scores for version and glyph differences. Use explicit measure, staff, and note indices for notehead targets, and verify them visually.
