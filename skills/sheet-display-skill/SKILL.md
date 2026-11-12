---
name: sheet-display-skill
description: "Render and annotate staff notation inside Codex Desktop with Verovio. Use for 五线谱、谱例、作曲分析、和声分析 or score excerpts from MEI, MusicXML, MXL, or ABC. Supports measures, multi-instrument scores, and paginated previews without MuseScore Studio."
license: GPL-3.0-only
---

# Sheet Display

**Size the inline preview before rendering.** Start with `--max-width 500` for short excerpts and allow more width when dense notation needs it. Aim to keep the visible score around 400–500 CSS pixels high when practical. If a page is too tall, try a smaller display width or a shorter passage, or lower `--page-height` to fit fewer systems per page. Check that noteheads and labels remain readable. Follow an explicit user size or layout preference.

Use the score as the primary answer. Add a title, legend, or switches when they serve the excerpt. Markings are visible by default. Use selectable measures for concise analysis.

1. Use the user's source score when available. For a new excerpt, write valid MEI or MusicXML. For notation edits, edit the structured source so pitch, duration, voices, and relationships survive regeneration.
2. From this skill directory, run `npm ci --ignore-scripts` once when dependencies are absent. Invoke `node scripts/render.mjs <score> --out <absolute-preview-path>.html` and add `--annotations <marks.json>` for markup. Read the [rendering and annotation reference](references/usage.md) when choosing flags or building an annotation file.
3. Set `--measures 7-10` to re-engrave a passage and `--pages 1-2` to select pages after layout. Use `--page-width` and `--page-height` for line breaks and pagination, and `--max-width` for screen size.
4. Put the HTML fragment in the task-owned visualization directory when one is provided. Use the visualize content reference in the final response when Codex supports it. For a standalone browser preview requested by the user, add `--standalone`.

Anchor a highlight to the smallest relevant score object. Prefer MEI element IDs for precise marks on complex or edited passages. For imported scores without stable IDs, use measure, staff, and note indices and visually check the target. Use a separate foreground color if the glyph itself should change color. Review beam grouping, cross-staff passages, complex ornaments, and import-sensitive notation against the input when they matter to the analysis.
