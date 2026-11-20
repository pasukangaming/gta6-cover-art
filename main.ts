// Neon Sunset Cover Studio — the entry program for gta6-cover-art-01.
// Node 22, standard library only. It hands the app in: it copies app/ and
// screenshots/ from beside this file to /output (or MAKEFUN_OUTPUT_DIR
// outside the grader) and writes /output/dossier.json, the summary the
// judge reads, using the vendored make.fun library. Nothing here touches
// the network, the clock or randomness, so two runs write identical bytes.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The app first: every static file the browser loads, exactly as built.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });

// Then the screenshots the maker took of the app and its covers.
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier, with the scorer's caps for this bounty: at most 4
// screenshots, each at most 256 KiB, and the app's own size limits.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
