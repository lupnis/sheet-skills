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

**Size the inline preview before rendering.** Start with `--max-width 500` for short excerpts. For a tall or dense score, start with `--systems-per-view 1 --max-width 720 --max-height 400`. A single measure can still be tall when it contains many staves. Keep it legible by adjusting the display caps, and follow an explicit user size or layout preference.

When comparing engines, use the same source passage and annotation targets.

1. From this skill directory, run `npm ci --ignore-scripts` if dependencies are absent. Invoke `node scripts/render.mjs <score> --out <absolute-preview-path>.html`. Use `--annotations <marks.json>` for highlights and measure analysis. Read the [rendering and annotation reference](references/usage.md) when choosing flags or building an annotation file.
2. Use `--page-width` and `--page-height` to re-engrave at a new paper size in tenths of a millimeter. Use `--pages 1-2` to choose pages after layout and `--measures 7-10` to choose a passage.
3. Use `--measures-per-view N` when the reader needs up to N measures at a time within a system. Use `--max-width` and `--max-height` to bound the on-screen size in CSS pixels. Check cropped boundaries and staff positions.
4. Keep title, legend, and annotation toggles optional. For a short excerpt, show the score with marks already applied. Write analysis to `measureDetails` for selection on the score.
5. If the fragment exceeds the host's inline size limit, split the requested pages across inline previews.

This build uses LibreScore webmscore 1.2.1 with the MuseScore 4.0.0 engraving engine. Check modern MuseScore scores for version and glyph differences. Use explicit measure, staff, and note indices for notehead targets, and verify them visually.
