# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/pasukangaming/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/pasukangaming/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Sunset Cover Studio — turn any photo and caption into GTA-style poster art, in your browser, offline.

Upload your own photos (or use the samples), pick a multi-panel layout, crop and position each panel, write a bold caption, choose a Vice City sunset or neon grade, and export a PNG in 1080 × 1080, 1080 × 1350 or 1920 × 1080. Your photos never leave your machine. All the art — sun disc, palm silhouettes, halftone dots, gradients — is drawn in code; no Rockstar Games logo, artwork or font is used.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## How it works

- `app/index.html` + `app/style.css` — the editor: photo upload and drag-drop, layouts, per-panel crop, caption, grades, export.
- `app/src/cover.js` — the renderer: multi-panel layouts, colour grades, drawn sun/palms/halftone, bold caption lettering.
- `app/src/main.js` — the editor wiring and PNG export.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=editor` / `?shot=cover`).
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to the output and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=e2a089vq&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for bounties</sub>
