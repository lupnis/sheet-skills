# Third-Party Notices

Each skill's `package-lock.json` pins its runtime dependencies. Retain the lockfiles and upstream references when distributing the source.

| Component | Use | Source and license |
| --- | --- | --- |
| Verovio 6.4.1 | WebAssembly engraving engine for the Verovio skill | [Source](https://github.com/rism-digital/verovio) and [LGPL-3.0-only](https://book.verovio.org/introduction/licensing.html) |
| Bravura | Music font used by Verovio, including symbols in text such as tempo marks | [SIL Open Font License 1.1](skills/sheet-display-skill/assets/Bravura-OFL.txt) and [source](https://github.com/steinbergmedia/bravura) |
| LibreScore webmscore 1.2.1 | WebAssembly import and engraving engine for the webmscore skill | [Upstream source and license](https://github.com/LibreScore/webmscore) and [MuseScore source](https://github.com/musescore/MuseScore) |
| @xmldom/xmldom 0.9.12 | XML and SVG parsing | [Source and MIT license](https://github.com/xmldom/xmldom) |
| fflate 0.8.3 | Updates page styles in in-memory MuseScore archives | [Source and MIT license](https://github.com/101arrowz/fflate) |

Credit Verovio when distributing its engravings. Previews that embed Bravura include its copyright and license text. The repository's [GPL-3.0-only license](LICENSE) covers the project source and original examples.
