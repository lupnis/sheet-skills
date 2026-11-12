# Contributing

When reporting a problem, include the skill name, operating system, Node.js version, command, selected pages or measures, and expected behavior. A minimal score you can share publicly helps others reproduce the problem.

## Verify changes

- Run both renderers using the [shared example](README.md#run-the-shared-example). Open the preview and select a measure to verify that its analysis appears. Use a shareable multipage score when testing pagination.
- For shared viewer behavior, check the `assets/viewer.html` and `assets/viewer.js` in both skill directories. Each skill directory is installed independently.
- For layout changes, check short excerpts, range highlights across systems, and dense notation in a narrow window. Verify foreground coloring and translucent highlights independently.
- Record the source and redistribution terms for added scores. Store private scores in `private-scores/` and generated previews in `out/`.

GitHub Actions installs the locked dependencies and renders inline and standalone previews for both skills on Windows and Linux.

## Publish the repository

Review the files you intend to commit before the first push. Keep the root [LICENSE](LICENSE) with the repository. Include a copy of it when redistributing either skill independently.

For the first release, create an empty GitHub repository. Stage and review the intended files locally:

```sh
git add .
git status --short
```

Once the staged files are ready, commit and push:

```sh
git commit -m "Initial release"
git remote add origin https://github.com/lupnis/sheet-skills.git
git branch -M master
git push -u origin master
```
