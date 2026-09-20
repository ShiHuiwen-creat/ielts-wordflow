# IELTS WordFlow

[简体中文](README.zh-CN.md)

IELTS WordFlow is an offline-first, Chinese-language vocabulary study app for learners targeting IELTS band 6–6.5. It ships with 300 independently authored words and examples, a spaced-review queue, local progress tracking, and JSON backup and restore.

## Screenshots

<p align="center">
  <img src="docs/screenshots/today-mobile.png" alt="Today page at a 390 by 844 mobile viewport" width="300">
  <img src="docs/screenshots/study-mobile.png" alt="Study page with a revealed answer and three written rating choices at a 390 by 844 mobile viewport" width="300">
</p>

![Statistics page at a 1440 by 900 desktop viewport](docs/screenshots/stats-desktop.png)

These images were captured from the production build during the release visual QA pass.

## Features

- A daily queue combining due reviews with a configurable 10, 20, or 30 new words.
- Reveal-and-rate study sessions with `不认识`, `模糊`, and `认识` feedback.
- A searchable 300-word library with study-status filters and word details.
- Daily totals, mastery progress, streaks, and a seven-day activity chart.
- Optional browser-provided English speech.
- Installable PWA behavior, repository-aware direct routes, and offline study after the first successful load.
- Versioned JSON export and import, plus an explicit progress reset.

## Privacy and local data

IELTS WordFlow has no account system, analytics, advertising, or telemetry. Settings, word progress, and daily statistics stay in IndexedDB in the current browser profile. Exported backups are downloaded directly by the browser; the app does not upload them.

Local browser storage is not permanent storage. Clearing site data or browser storage, using an ephemeral/private profile, resetting the browser, or losing the device can delete all learning progress. Export a backup from **Settings → Export data** regularly and keep it somewhere safe. Importing a backup replaces the current local study data only after confirmation.

## Browser support

The browser targets are current stable releases of Chrome, Edge, Firefox, and Safari. JavaScript, IndexedDB, and service workers must be enabled. Automated production acceptance currently runs in Chromium; Firefox and Safari should receive a manual smoke test for a release that changes browser-facing behavior. Install prompts and exact PWA behavior vary by browser and operating system. Speech requires a browser or operating-system English voice; study remains fully usable when no suitable voice is available.

## Install and develop

Node.js 20.19.0 is the project version (`.nvmrc`), and npm uses the committed lockfile.

```sh
nvm use
npm ci
npm run dev
```

The development server prints its local URL. Production output is written to `dist`:

```sh
npm run build
npm run preview
```

## Validation and tests

Install the exact Playwright 1.55 Chromium build once before local end-to-end testing:

```sh
npm run e2e:install
```

Run individual checks with the following repository scripts:

```sh
npm run validate:vocabulary
npm run test
npm run typecheck
npm run lint
npm run build
npm run e2e
```

For interactive unit-test development, use `npm run test:watch`.

## GitHub Pages deployment

The production base is `/ielts-wordflow/`, as defined in `src/app/pwaConfig.ts`. `.github/workflows/pages.yml` validates the repository, builds `dist`, runs the Chromium acceptance suite, uploads that directory as the Pages artifact, and deploys only from `main`. The matching `404.html` redirect preserves direct links beneath the repository base.

Forks published under a different repository name must update the shared base value before deployment.

## Architecture

- `src/app` composes providers, routing, dashboard state, and the shared PWA configuration.
- `src/pages` and `src/components` implement the accessible React interface.
- `src/features` contains vocabulary, scheduling, study-session, and progress domain logic.
- `src/lib/storage` owns the Dexie/IndexedDB repository and versioned backup format.
- `src/lib/speech` isolates optional Web Speech API behavior.
- `public` contains install icons and Pages/offline fallbacks.
- `scripts` validates data, serves Pages-like production output, and verifies release metadata.
- `tests/e2e` exercises the built PWA in Playwright Chromium.

The app bundles its vocabulary and static shell at build time. React reads and writes study state through the storage repository; the service worker caches production assets for subsequent offline use.

## Public repository release sequence

After making the repository public, a repository administrator must immediately enable **Private vulnerability reporting** under **Settings → Security → Code security and analysis**. Confirm that the **Security** tab offers a private **Report a vulnerability** route backed by GitHub Security Advisories. Complete and verify this setup before announcing or publishing a release, sharing the repository broadly, or accepting external traffic; no public issue or personal email is an acceptable fallback for sensitive reports.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Bug reports and feature proposals are welcome through the repository issue templates. Community participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and sensitive vulnerability reports should follow [SECURITY.md](SECURITY.md).

## Licenses

Software source code is licensed under the [MIT License](LICENSE).

The 300-word vocabulary data in `src/features/vocabulary/data/core-1.json`, `core-2.json`, and `core-3.json` is a separate work licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Reuse of that data requires attribution, a license link, and an indication of changes. See [DATA_SOURCES.md](DATA_SOURCES.md) for provenance and the precise data-license scope.
