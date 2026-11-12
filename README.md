# Sheet Skills

Two independent Codex skills for displaying and annotating staff notation. Both use WebAssembly for engraving and can produce interactive previews for Codex Desktop or standalone HTML for offline viewing.

![Four measures of a piano score with colored noteheads and rectangular highlights](docs/demo-preview.png)

## Choose a skill

| Skill | Engraving engine | Input formats | Annotation targets |
| --- | --- | --- | --- |
| [sheet-display-skill](skills/sheet-display-skill/) | Verovio 6.4.1 | MEI, MusicXML, MXL, ABC | Measures, ranges, noteheads, stems, beams, and rendered elements with an ID |
| [webmscore-display-skill](skills/webmscore-display-skill/) | webmscore 1.2.1 with MuseScore 4.0.0 | MSCZ, MSCX, MusicXML, MXL, MIDI | Measures, ranges, and noteheads located by staff and position |

webmscore transcribes MIDI into notation. To engrave MIDI with Verovio, first transcribe it to MusicXML. For a comparison, select the same measures in each skill because page breaks vary by engine.

## Install in Codex

In Codex, select the built-in `$skill-installer` skill and use one of the prompts below.

```text
$skill-installer help me install skills/sheet-display-skill from https://github.com/lupnis/sheet-skills using the master branch
```

```text
$skill-installer help me install skills/webmscore-display-skill from https://github.com/lupnis/sheet-skills using the master branch
```

From a local checkout, you can copy either complete directory under `skills/` into `.agents/skills/` for a project or `~/.agents/skills/` for your user account. [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)

## Use in Codex

Provide a score path, choose a skill, and describe the passage and presentation you want:

> Use $sheet-display-skill to display measures 5–8 from this MusicXML file. Highlight the cadence and show its analysis when I select measure 8.

> Use $webmscore-display-skill to preview the first two pages of this MIDI file, one system at a time, at most 400 pixels high.

Both skills let Codex choose a display width and adjust engraving dimensions. For a compact inline preview, ask for a shorter passage or a smaller `--max-width`. With webmscore, `--systems-per-view 1 --max-height 400` fits one system at a time, even when a single measure has many staves.

- [Verovio rendering and annotation reference](skills/sheet-display-skill/references/usage.md)
- [webmscore rendering and annotation reference](skills/webmscore-display-skill/references/usage.md)

## Run the shared example

Use Node.js 20 or later. Run these commands from the repository root. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

```sh
npm --prefix skills/sheet-display-skill ci --ignore-scripts
node skills/sheet-display-skill/scripts/render.mjs examples/demo.musicxml --annotations examples/demo-marks.json --max-width 500 --out out/verovio.html --standalone

npm --prefix skills/webmscore-display-skill ci --ignore-scripts
node skills/webmscore-display-skill/scripts/render.mjs examples/demo.musicxml --annotations examples/demo-marks.json --max-width 500 --out out/webmscore.html --standalone
```

Open either output in a browser and select a measure to see the analysis.

## Contributing and license

See the [contribution guide](CONTRIBUTING.md) for verification and release steps. Repository code and original examples are licensed under [GPL-3.0-only](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for the engines, font, and libraries.
