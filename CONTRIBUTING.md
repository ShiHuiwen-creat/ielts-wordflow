# Contributing to IELTS WordFlow

Thank you for helping improve IELTS WordFlow. Small, focused changes with tests and a clear explanation are easiest to review.

## Before you start

- Search existing issues before opening a new bug report or feature request.
- Use the provided issue forms and include reproducible details.
- For a substantial feature or data-model change, open an issue first so the approach can be discussed.
- Never include personal learner data, private backups, credentials, or copied commercial vocabulary content.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Local setup

Use Node.js 20.19.0 from `.nvmrc` and install the locked dependency graph:

```sh
nvm use
npm ci
npm run e2e:install
npm run dev
```

## Development expectations

- Keep domain logic in `src/features` and storage concerns behind `src/lib/storage`.
- Preserve offline behavior and the `/ielts-wordflow/` deployment base.
- Add or update focused tests for behavior changes. Fixes should include a regression test when practical.
- Maintain keyboard access, visible focus, semantic labels, readable contrast, and mobile layouts.
- Keep user-facing Chinese concise and consistent with the existing interface.
- Do not add analytics, remote fonts, trackers, or runtime data services without prior project discussion.

Vocabulary additions must follow `DATA_SOURCES.md`: text must be original or compatibly licensed, attribution must be documented, and the controlled schema must pass validation. Do not copy dictionary definitions, example sentences, translations, exam questions, or proprietary word lists.

## Required checks

Run the complete local gate before requesting review:

```sh
node scripts/verify-repository.mjs
npm run validate:vocabulary
npm run test
npm run typecheck
npm run lint
npm run build
npm run e2e
```

If Chromium is missing, run `npm run e2e:install` and retry. Pull requests run the same checks on Linux with the pinned Playwright version.

## Pull requests

1. Create a topic branch from the latest `main`.
2. Make focused commits with imperative messages.
3. Complete the pull request template, including test evidence, accessibility impact, privacy/offline impact, and screenshots when the visual interface changes.
4. Respond to review feedback and keep the branch current.

By contributing software code, you agree that your contribution is licensed under the repository's MIT License. Contributions to the three core vocabulary datasets are licensed under CC BY 4.0 as described in `DATA_SOURCES.md`; include the required provenance with any data contribution.

## Release checklist

- [ ] Immediately after making the repository public, a repository administrator must enable **Private vulnerability reporting** under **Settings → Security → Code security and analysis**.
- [ ] Before announcing or publishing a release, sharing the repository broadly, or accepting external traffic, the **Security** tab's **Report a vulnerability** route has been verified to open a private GitHub Security Advisory; a public issue or personal email is not used as a fallback.
- [ ] The full validation gate, production build, and offline Playwright acceptance suite pass on the release commit.
- [ ] English and Chinese release documentation describe the same public behavior and data-safety limitations.
