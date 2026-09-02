# IELTS WordFlow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a mobile-first, offline-capable IELTS 6–6.5 vocabulary PWA with local progress, spaced repetition, statistics, backup/restore, and at least 300 redistributable entries.

**Architecture:** A React/Vite single-page app keeps domain rules in pure TypeScript modules and persists user-owned data through a Dexie repository. Pages consume a small application service so storage failures never advance a study card; the PWA shell and bundled vocabulary remain usable offline.

**Tech Stack:** React 19, TypeScript 5, Vite 7, React Router, Dexie, vite-plugin-pwa, Vitest, Testing Library, fake-indexeddb, ESLint, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-02-ielts-wordflow-design.md`

## Global Constraints

- Default UI language is Simplified Chinese; vocabulary fields include English word, phonetic, part of speech, Chinese definition, English example, and Chinese translation.
- The app has no account, backend, telemetry, advertisements, or cloud sync.
- IndexedDB is the authority for settings, progress, and daily statistics; failed writes must not advance the current card.
- Daily new-word goals are exactly 10, 20, or 30, defaulting to 20.
- Touch targets are at least 44×44px, body contrast meets WCAG AA, and feedback states are not color-only.
- Production routing, Vite base, manifest scope, and service-worker paths use `/ielts-wordflow/`.
- The shipped vocabulary has at least 300 complete, deduplicated, redistributable entries with documented provenance.
- Completion requires `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and the mobile Playwright flow to pass.

## File Map

- `src/features/vocabulary/`: vocabulary contracts, data, validation, querying.
- `src/features/scheduler/`: pure spaced-repetition transition rules.
- `src/features/study-session/`: daily queue and in-session relearning behavior.
- `src/features/progress/`: daily and aggregate metrics.
- `src/lib/storage/`: IndexedDB schema, repositories, import/export transactions.
- `src/lib/speech/`: capability detection and British voice selection.
- `src/app/`: providers, routes, app shell, application-level study service.
- `src/pages/`: onboarding, today, study, vocabulary, stats, settings.
- `src/components/`: shared navigation, buttons, cards, empty/error states.
- `src/styles/`: tokens, global rules, responsive layout.
- `tests/e2e/`: mobile persistence acceptance flow.
- `scripts/`: vocabulary validation used by CI.
- `.github/`: CI, Pages deployment, issue and PR templates.

---

### Task 1: Project Foundation and Vocabulary Contract

**Files:**
- Create: `package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `.gitignore`
- Create: `src/main.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`
- Create: `src/features/vocabulary/types.ts`, `src/features/vocabulary/schema.ts`
- Test: `src/features/vocabulary/schema.test.ts`

**Interfaces:**
- Produces: `VocabularyEntry`, `VocabularyLevel`, `isVocabularyEntry(value): value is VocabularyEntry`, `validateVocabulary(entries): ValidationResult`.

- [ ] **Step 1: Create the package manifest and test-capable scaffold**

Use scripts `dev`, `build`, `test`, `test:watch`, `typecheck`, `lint`, `preview`, `e2e`, and `validate:vocabulary`. Pin compatible major versions from the spec and configure Vitest for `jsdom` with `src/test/setup.ts`.

- [ ] **Step 2: Install dependencies and record the lockfile**

Run: `npm install`

Expected: `package-lock.json` is created and `npm audit` reports no unresolved critical vulnerability.

- [ ] **Step 3: Write the failing vocabulary validation tests**

```ts
import { describe, expect, it } from 'vitest';
import { isVocabularyEntry, validateVocabulary } from './schema';

const valid = {
  id: 'allocate', word: 'allocate', phonetic: '/ˈæləkeɪt/',
  partOfSpeech: 'verb', definitionZh: '分配；拨给',
  example: 'The council allocated more funds to public transport.',
  exampleZh: '市政委员会为公共交通拨出了更多资金。',
  tags: ['society'], level: 'ielts-6-6.5',
};

describe('vocabulary schema', () => {
  it('accepts a complete IELTS entry', () => expect(isVocabularyEntry(valid)).toBe(true));
  it('rejects duplicate ids and incomplete entries', () => {
    expect(validateVocabulary([valid, valid, { ...valid, id: '', word: '' }]).issues)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-id' }),
        expect.objectContaining({ code: 'invalid-entry' }),
      ]));
  });
});
```

- [ ] **Step 4: Run the focused test and verify RED**

Run: `npm test -- src/features/vocabulary/schema.test.ts`

Expected: FAIL because `./schema` does not exist.

- [ ] **Step 5: Implement the minimal vocabulary types and validator**

Define all nine required fields, require non-empty trimmed strings, require at least one tag, require level `ielts-6-6.5`, and report indexed issues with codes `invalid-entry` or `duplicate-id`.

- [ ] **Step 6: Verify foundation checks and commit**

Run: `npm test -- src/features/vocabulary/schema.test.ts && npm run typecheck && npm run lint`

Expected: all commands exit 0.

Commit: `chore: establish typed vocabulary foundation`

---

### Task 2: Spaced-Repetition Scheduler

**Files:**
- Create: `src/features/scheduler/types.ts`
- Create: `src/features/scheduler/scheduleReview.ts`
- Test: `src/features/scheduler/scheduleReview.test.ts`

**Interfaces:**
- Consumes: vocabulary entry IDs from Task 1.
- Produces: `ReviewRating = 'again' | 'hard' | 'known'`, `WordProgress`, and `scheduleReview(progress, rating, reviewedAt): WordProgress`.

- [ ] **Step 1: Write failing tests for all rating transitions**

```ts
it.each([
  ['again', 0, '2026-09-03T08:00:00.000Z'],
  ['hard', 1, '2026-09-03T08:00:00.000Z'],
  ['known', 1, '2026-09-03T08:00:00.000Z'],
] as const)('schedules %s from a new word', (rating, stage, dueAt) => {
  const next = scheduleReview(undefined, rating, new Date('2026-09-02T08:00:00.000Z'), 'allocate');
  expect(next).toMatchObject({ wordId: 'allocate', stage, dueAt, lastRating: rating, reviewCount: 1 });
});

it('marks stage four mastered after two consecutive known ratings', () => {
  const current = progress({ stage: 3, consecutiveKnown: 1 });
  expect(scheduleReview(current, 'known', NOW)).toMatchObject({ stage: 4, mastered: true });
});

it('again cancels mastery and resets the stage', () => {
  const current = progress({ stage: 5, mastered: true, consecutiveKnown: 6 });
  expect(scheduleReview(current, 'again', NOW)).toMatchObject({ stage: 0, mastered: false, consecutiveKnown: 0 });
});
```

Add parameterized boundary tests for hard intervals `[1,3,7,14]`, known intervals `[1,3,7,14,30]`, the 30-day cap, and a UTC date crossing month/year boundaries.

- [ ] **Step 2: Run the scheduler test and verify RED**

Run: `npm test -- src/features/scheduler/scheduleReview.test.ts`

Expected: FAIL because `scheduleReview` is missing.

- [ ] **Step 3: Implement immutable scheduler transitions**

Use millisecond day arithmetic from the supplied `reviewedAt`, preserve `firstLearnedAt`, set `lastReviewedAt`, increment `reviewCount`, and never call `Date.now()` inside the function.

- [ ] **Step 4: Run scheduler and full tests**

Run: `npm test -- src/features/scheduler/scheduleReview.test.ts && npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit**

Commit: `feat: add spaced repetition scheduler`

---

### Task 3: Daily Queue and In-Session Relearning

**Files:**
- Create: `src/features/study-session/types.ts`
- Create: `src/features/study-session/buildDailyQueue.ts`
- Create: `src/features/study-session/sessionReducer.ts`
- Test: `src/features/study-session/buildDailyQueue.test.ts`
- Test: `src/features/study-session/sessionReducer.test.ts`

**Interfaces:**
- Consumes: `VocabularyEntry`, `WordProgress`, local date key, and the goal union `10 | 20 | 30`.
- Produces: `StudyQueueItem`, `buildDailyQueue(input): StudyQueueItem[]`, `StudySessionState`, and `sessionReducer(state, action)`.

- [ ] **Step 1: Write the failing queue tests**

```ts
it('puts due reviews before unseen words and sorts reviews by due time', () => {
  const queue = buildDailyQueue({ entries, progress, today: '2026-09-02', goal: 10, newLearnedToday: 0 });
  expect(queue.map(({ wordId, kind }) => [wordId, kind])).toEqual([
    ['due-earlier', 'review'], ['due-later', 'review'], ['unseen-1', 'new'], ['unseen-2', 'new'],
  ]);
});

it('subtracts words already introduced today from the new-word goal', () => {
  expect(buildDailyQueue({ entries: unseen(20), progress: [], today: '2026-09-02', goal: 10, newLearnedToday: 8 }))
    .toHaveLength(2);
});
```

Add tests for no duplicates, not-yet-due exclusion, zero-task empty state, and deterministic vocabulary order.

- [ ] **Step 2: Run queue tests and verify RED**

Run: `npm test -- src/features/study-session/buildDailyQueue.test.ts`

Expected: FAIL because the queue builder is missing.

- [ ] **Step 3: Implement the minimal deterministic queue builder**

Deduplicate by `wordId`, compare `dueAt` to the end of the supplied local day, and never mutate input arrays.

- [ ] **Step 4: Write the failing relearning reducer test**

```ts
it('requeues an again card behind at least ten remaining cards', () => {
  const next = sessionReducer(stateWithTwelveCards, { type: 'rated', rating: 'again' });
  expect(next.queue[10].wordId).toBe(stateWithTwelveCards.current.wordId);
});
```

Also test fewer than ten remaining cards, answer reveal state reset, and completion summary counts.

- [ ] **Step 5: Verify RED, implement reducer, and verify GREEN**

Run before implementation: `npm test -- src/features/study-session/sessionReducer.test.ts`

Expected: FAIL because the reducer is missing.

Run after implementation: `npm test -- src/features/study-session`

Expected: all session tests pass.

- [ ] **Step 6: Commit**

Commit: `feat: build daily study sessions`

---

### Task 4: IndexedDB Repository and Atomic Backup

**Files:**
- Create: `src/lib/storage/database.ts`
- Create: `src/lib/storage/repository.ts`
- Create: `src/lib/storage/backup.ts`
- Create: `src/lib/storage/types.ts`
- Test: `src/lib/storage/repository.test.ts`
- Test: `src/lib/storage/backup.test.ts`

**Interfaces:**
- Consumes: `WordProgress`, `ReviewRating`, settings goal, daily statistics.
- Produces: `AppSettings`, `DailyStats`, `StorageRepository`, `createBackup(repository)`, `validateBackup(value)`, and `restoreBackup(repository, backup)`.

- [ ] **Step 1: Write failing repository persistence tests with fake IndexedDB**

```ts
it('persists settings and progress across database instances', async () => {
  const first = createRepository('persistence-test');
  await first.saveSettings({ dailyGoal: 20, autoSpeak: true, onboardingComplete: true });
  await first.saveReview(progressFixture);
  first.close();
  const reopened = createRepository('persistence-test');
  await expect(reopened.getSettings()).resolves.toMatchObject({ dailyGoal: 20 });
  await expect(reopened.getProgress('allocate')).resolves.toEqual(progressFixture);
});
```

Add tests for default settings, daily-stat increment, date-key reads, and a version-1 database reopen.

- [ ] **Step 2: Verify repository RED and implement the Dexie schema**

Run before: `npm test -- src/lib/storage/repository.test.ts`

Expected: FAIL because repository modules are missing.

Create tables `settings`, `progress`, and `dailyStats`; place multi-table review writes in one transaction.

- [ ] **Step 3: Verify repository GREEN**

Run: `npm test -- src/lib/storage/repository.test.ts`

Expected: all repository tests pass.

- [ ] **Step 4: Write failing backup validation and rollback tests**

```ts
it('rejects an unsupported backup without changing stored data', async () => {
  await repository.saveReview(progressFixture);
  await expect(restoreBackup(repository, { schemaVersion: 99 })).rejects.toThrow('不支持的备份版本');
  await expect(repository.getProgress('allocate')).resolves.toEqual(progressFixture);
});

it('round-trips settings, progress and daily stats', async () => {
  const backup = await createBackup(populatedRepository);
  await restoreBackup(emptyRepository, backup);
  await expect(createBackup(emptyRepository)).resolves.toMatchObject({
    schemaVersion: 1, settings: backup.settings, progress: backup.progress, dailyStats: backup.dailyStats,
  });
});
```

- [ ] **Step 5: Verify RED, implement validated transactional restore, verify GREEN**

Run: `npm test -- src/lib/storage/backup.test.ts`

Expected after implementation: valid backups round-trip and invalid backups leave existing records unchanged.

- [ ] **Step 6: Commit**

Commit: `feat: persist and back up learning data`

---

### Task 5: App Shell, Onboarding, Today Page, and Design System

**Files:**
- Create: `src/app/App.tsx`, `src/app/AppProviders.tsx`, `src/app/router.tsx`
- Create: `src/app/useDashboard.ts`, `src/features/progress/summarizeProgress.ts`
- Create: `src/components/AppShell.tsx`, `src/components/BottomNav.tsx`, `src/components/ErrorState.tsx`, `src/components/AppErrorBoundary.tsx`
- Create: `src/pages/OnboardingPage.tsx`, `src/pages/TodayPage.tsx`, `src/pages/StorageBlockedPage.tsx`
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/layout.css`
- Modify: `src/main.tsx`
- Test: `src/features/progress/summarizeProgress.test.ts`
- Test: `src/pages/OnboardingPage.test.tsx`, `src/pages/TodayPage.test.tsx`, `src/components/AppErrorBoundary.test.tsx`

**Interfaces:**
- Consumes: storage repository and daily queue from Tasks 3–4.
- Produces: routed application shell, `summarizeProgress`, onboarding persistence, dashboard view model.

- [ ] **Step 1: Write the failing progress summary tests**

Test mastered counts, current-day counts, seven-day zero filling, and consecutive-day streak ending today or yesterday.

- [ ] **Step 2: Verify RED, implement summary functions, verify GREEN**

Run: `npm test -- src/features/progress/summarizeProgress.test.ts`

Expected after implementation: all aggregation cases pass without reading system time implicitly.

- [ ] **Step 3: Write failing onboarding and today-page component tests**

```tsx
it('saves the selected goal and enters the today page', async () => {
  renderApp({ onboardingComplete: false });
  await user.click(screen.getByRole('radio', { name: '每天 10 个' }));
  await user.click(screen.getByRole('button', { name: '开始学习' }));
  expect(repository.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ dailyGoal: 10 }));
  expect(await screen.findByRole('heading', { name: '今日学习' })).toBeVisible();
});
```

The today-page test asserts due/new counts, streak, mastered count, start action, and the all-done empty state. The error-boundary test throws from a child, verifies a reload action is offered, and verifies the boundary never calls any storage deletion API. The storage-blocked test simulates an IndexedDB open failure and verifies the explanation page is shown instead of onboarding.

- [ ] **Step 4: Verify component RED**

Run: `npm test -- src/pages/OnboardingPage.test.tsx src/pages/TodayPage.test.tsx`

Expected: FAIL because pages and router do not exist.

- [ ] **Step 5: Implement the shell and responsive design system**

Use semantic landmarks, a 720px content maximum, safe-area padding, 44px controls, visible focus states, a paper `#F5F0E6` background, forest `#174C3C` primary, and non-color text/icon labels for feedback.

- [ ] **Step 6: Verify pages, types, lint, and commit**

Run: `npm test && npm run typecheck && npm run lint`

Expected: all commands pass with no React act warnings.

Commit: `feat: add onboarding and daily dashboard`

---

### Task 6: Study Workflow and Speech

**Files:**
- Create: `src/app/studyService.ts`
- Create: `src/lib/speech/speakWord.ts`
- Create: `src/components/WordCard.tsx`, `src/components/RatingControls.tsx`, `src/components/SessionSummary.tsx`
- Create: `src/pages/StudyPage.tsx`
- Test: `src/app/studyService.test.ts`
- Test: `src/lib/speech/speakWord.test.ts`
- Test: `src/pages/StudyPage.test.tsx`

**Interfaces:**
- Consumes: scheduler, session reducer, storage repository, vocabulary lookup.
- Produces: `StudyService.rateCurrent(rating, reviewedAt)` that resolves only after persistence; `canSpeak()`, `speakWord(word)`; complete `/study` experience.

- [ ] **Step 1: Write the failing atomic study-service tests**

```ts
it('does not advance when persistence fails', async () => {
  repository.recordReview.mockRejectedValue(new Error('quota exceeded'));
  const service = createStudyService({ repository, initialSession });
  await expect(service.rateCurrent('known', NOW)).rejects.toThrow('quota exceeded');
  expect(service.getState().current.wordId).toBe(initialSession.current.wordId);
});
```

Also verify successful persistence advances exactly once and increments the correct daily feedback field.

- [ ] **Step 2: Verify RED, implement the service, verify GREEN**

Run: `npm test -- src/app/studyService.test.ts`

Expected after implementation: failed writes retain the card and successful writes advance it.

- [ ] **Step 3: Write failing speech-selection tests**

Verify `en-GB` preference, English fallback, unavailable synthesis behavior, and `cancel()` before speaking a new utterance.

- [ ] **Step 4: Verify RED, implement speech adapter, verify GREEN**

Run: `npm test -- src/lib/speech/speakWord.test.ts`

- [ ] **Step 5: Write failing StudyPage interaction tests**

Assert that ratings are absent before “查看答案”, all answer fields appear afterward, a disabled busy state prevents double submission, storage error text is visible, the same card remains after an error, and final summary shows the three rating counts.

- [ ] **Step 6: Verify RED, implement the study UI, verify GREEN**

Run: `npm test -- src/pages/StudyPage.test.tsx`

Expected after implementation: all interactions pass using real scheduler/session functions and only a fake repository boundary.

- [ ] **Step 7: Run full checks and commit**

Run: `npm test && npm run typecheck && npm run lint`

Commit: `feat: deliver the core word study flow`

---

### Task 7: Vocabulary Library, Statistics, Settings, and Backup UI

**Files:**
- Create: `src/features/vocabulary/queryVocabulary.ts`
- Create: `src/pages/VocabularyPage.tsx`, `src/pages/VocabularyDetailPage.tsx`
- Create: `src/pages/StatsPage.tsx`, `src/pages/SettingsPage.tsx`
- Create: `src/components/StatChart.tsx`, `src/components/ConfirmDialog.tsx`
- Test: `src/features/vocabulary/queryVocabulary.test.ts`
- Test: `src/pages/VocabularyPage.test.tsx`, `src/pages/StatsPage.test.tsx`, `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: vocabulary entries, progress summary, repository backup APIs.
- Produces: case-insensitive search, status filter, details routing, seven-day chart, safe import/export controls.

- [ ] **Step 1: Write failing vocabulary query tests**

Test English substring, Chinese definition substring, case folding, and exact `unseen | learning | mastered` status filters.

- [ ] **Step 2: Verify RED, implement query functions, verify GREEN**

Run: `npm test -- src/features/vocabulary/queryVocabulary.test.ts`

- [ ] **Step 3: Write failing page tests**

The vocabulary test searches and filters real fixtures and opens details. The stats test checks seven labeled days and text equivalents for chart values. The settings test checks goal persistence, auto-speak persistence, JSON download, invalid-file error, import summary, explicit confirmation, cancel-without-change, and reset behind a separate destructive confirmation.

- [ ] **Step 4: Verify page RED**

Run: `npm test -- src/pages/VocabularyPage.test.tsx src/pages/StatsPage.test.tsx src/pages/SettingsPage.test.tsx`

Expected: FAIL because pages are missing.

- [ ] **Step 5: Implement pages with accessible controls**

Use a real `<input type="file" accept="application/json">`, create download files through `Blob` and object URLs, revoke object URLs, and never call restore until the confirmation dialog is accepted.

- [ ] **Step 6: Verify all checks and commit**

Run: `npm test && npm run typecheck && npm run lint`

Commit: `feat: add library stats and data controls`

---

### Task 8: Curated 300-Entry Vocabulary Dataset

**Files:**
- Create: `src/features/vocabulary/data/core-1.json`, `core-2.json`, `core-3.json`
- Create: `src/features/vocabulary/data/index.ts`
- Create: `scripts/validate-vocabulary.mjs`
- Create: `DATA_SOURCES.md`
- Test: `src/features/vocabulary/data/data.test.ts`

**Interfaces:**
- Consumes: Task 1 validator.
- Produces: `coreVocabulary: readonly VocabularyEntry[]` with at least 300 entries.

- [ ] **Step 1: Write the failing dataset acceptance test**

```ts
it('ships at least 300 complete unique IELTS entries', () => {
  const result = validateVocabulary(coreVocabulary);
  expect(coreVocabulary.length).toBeGreaterThanOrEqual(300);
  expect(result.issues).toEqual([]);
  expect(new Set(coreVocabulary.map((entry) => entry.word.toLowerCase())).size)
    .toBe(coreVocabulary.length);
});
```

Add assertions that examples contain the target word or an explicitly documented inflection, every tag belongs to the approved tag set, and no field contains placeholder text.

- [ ] **Step 2: Run the data test and verify RED**

Run: `npm test -- src/features/vocabulary/data/data.test.ts`

Expected: FAIL because no dataset exists.

- [ ] **Step 3: Add three reviewed batches of at least 100 entries each**

Write original Chinese definitions, original English examples, and original Chinese translations. Use stable lowercase IDs, standard part-of-speech labels, IPA strings, and topic tags. Record that word selection is independently compiled from general academic-English frequency concepts and that all authored fields are contributed under the repository’s stated data license.

- [ ] **Step 4: Add the CLI validator and inspect every failure**

Run: `npm run validate:vocabulary`

Expected: reports total count at least 300, zero duplicate IDs/words, zero missing fields, and zero invalid tags.

- [ ] **Step 5: Run data and full test suites**

Run: `npm test -- src/features/vocabulary/data/data.test.ts && npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

Commit: `data: add original IELTS core vocabulary`

---

### Task 9: PWA, Offline Behavior, and Mobile Acceptance

**Files:**
- Modify: `vite.config.ts`, `src/app/router.tsx`, `index.html`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png`
- Create: `public/favicon.svg`, `public/offline.html`
- Create: `playwright.config.ts`, `tests/e2e/mobile-study.spec.ts`
- Test: `src/app/pwaConfig.test.ts`

**Interfaces:**
- Consumes: complete application and bundled vocabulary.
- Produces: installable manifest at `/ielts-wordflow/`, service worker precache, GitHub Pages-compatible SPA navigation, mobile persistence acceptance test.

- [ ] **Step 1: Write the failing PWA configuration test**

Assert manifest name, short name, standalone display, theme/background colors, `/ielts-wordflow/` start URL and scope, required icon purposes, and that the Vite base is `/ielts-wordflow/`.

- [ ] **Step 2: Verify RED, implement PWA configuration, verify GREEN**

Run: `npm test -- src/app/pwaConfig.test.ts`

- [ ] **Step 3: Write the failing Playwright mobile flow**

```ts
test.use({ viewport: { width: 390, height: 844 } });
test('onboards, studies one word, and keeps progress after reload', async ({ page }) => {
  await page.goto('/ielts-wordflow/');
  await page.getByRole('radio', { name: '每天 10 个' }).check();
  await page.getByRole('button', { name: '开始学习' }).click();
  await page.getByRole('button', { name: '开始今日学习' }).click();
  await page.getByRole('button', { name: '查看答案' }).click();
  await page.getByRole('button', { name: '认识' }).click();
  await page.reload();
  await expect(page.getByText('今日已学习 1')).toBeVisible();
});
```

- [ ] **Step 4: Run Playwright and verify RED**

Run: `npm run build && npm run e2e`

Expected: FAIL until base routing, persistence, or test server configuration is complete.

- [ ] **Step 5: Complete routing/offline assets and verify mobile flow**

Generate simple original icons from the project mark, configure the preview web server, and make direct-route fallback work under the repository base.

Run: `npm run build && npm run e2e`

Expected: Chromium mobile flow passes.

- [ ] **Step 6: Verify production offline behavior manually**

Serve `dist`, load once online, switch the browser context offline, reload, open a vocabulary entry, and complete a review. Confirm no network request is required for application code or vocabulary data.

- [ ] **Step 7: Commit**

Commit: `feat: make IELTS WordFlow installable offline`

---

### Task 10: Open-Source Documentation and GitHub Automation

**Files:**
- Create: `README.md`, `README.zh-CN.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- Create: `.github/workflows/ci.yml`, `.github/workflows/pages.yml`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/pull_request_template.md`
- Test: `scripts/verify-repository.mjs`

**Interfaces:**
- Consumes: final scripts and deployment base.
- Produces: contributor-ready repository, CI checks, Pages artifact workflow.

- [ ] **Step 1: Write the failing repository verifier**

The script checks required files, MIT copyright line, README commands that exist in `package.json`, both workflow files, Node version consistency, Pages base consistency, and links between English/Chinese READMEs.

- [ ] **Step 2: Run verifier and verify RED**

Run: `node scripts/verify-repository.mjs`

Expected: FAIL listing missing documentation and workflow files.

- [ ] **Step 3: Add complete open-source documentation**

Document product screenshots, features, privacy, local-data deletion risk, install, development, test, build, Pages deployment, architecture, data license, contribution flow, and browser support. Use the full MIT license text and Contributor Covenant text with a project contact route that does not expose private information.

- [ ] **Step 4: Add CI and Pages workflows**

CI runs `npm ci`, vocabulary validation, tests, typecheck, lint, build, and Playwright on pull requests and main pushes. Pages runs the same build checks, uploads `dist`, and deploys only from `main` with `pages: write` and `id-token: write` permissions.

- [ ] **Step 5: Verify repository and all quality gates**

Run: `node scripts/verify-repository.mjs && npm run validate:vocabulary && npm test && npm run typecheck && npm run lint && npm run build && npm run e2e`

Expected: every command exits 0 with no skipped required suite.

- [ ] **Step 6: Commit**

Commit: `docs: prepare public open source release`

---

### Task 11: Visual QA, Release Audit, and GitHub Publication

**Files:**
- Modify only files implicated by verified defects.
- Create: `docs/screenshots/today-mobile.png`, `docs/screenshots/study-mobile.png`, `docs/screenshots/stats-desktop.png`
- Modify: `README.md`, `README.zh-CN.md` to include screenshots.

**Interfaces:**
- Consumes: production build and GitHub CLI authentication.
- Produces: visually verified app, public GitHub repository, pushed `main`, configured Pages workflow.

- [ ] **Step 1: Capture and inspect representative screenshots**

Run the production preview and capture 390×844 Today/Study pages plus a 1440×900 Stats page. Inspect for clipping, horizontal overflow, focus visibility, 44px controls, readable contrast, and non-color rating labels.

- [ ] **Step 2: Fix each observed visual defect test-first where behavior changes**

For DOM/interaction defects, add a focused component or Playwright assertion, verify it fails, make the minimum fix, and rerun it. Pure CSS corrections must be verified by recapturing the affected screenshot.

- [ ] **Step 3: Perform the requirement-by-requirement release audit**

Map every “首版包含” item and every acceptance definition in the spec to a page, test, command output, dataset check, or repository file. Treat missing evidence as incomplete work and fix it before continuing.

- [ ] **Step 4: Run the final verification suite from a clean state**

Run: `npm ci && npm run validate:vocabulary && npm test && npm run typecheck && npm run lint && npm run build && npm run e2e && git status --short`

Expected: all quality commands exit 0; Git status contains only the three intended screenshots and README changes before the release commit.

- [ ] **Step 5: Commit final visual assets**

Commit: `docs: add verified product screenshots`

- [ ] **Step 6: Create the public GitHub repository and push**

Check: `gh auth status`

Create and push: `gh repo create ielts-wordflow --public --source=. --remote=origin --push --description "A local-first IELTS vocabulary PWA with spaced repetition"`

Expected: the public repository URL is returned and `main` tracks `origin/main`.

- [ ] **Step 7: Verify remote workflows and Pages configuration**

Run: `gh run list --limit 5` and inspect the CI/Pages runs. If Pages requires one-time repository configuration, enable GitHub Actions as the Pages source in repository settings, rerun the workflow, and verify the deployed URL loads under `/ielts-wordflow/`.

- [ ] **Step 8: Tag the first release after remote checks pass**

Run: `git tag -a v0.1.0 -m "IELTS WordFlow v0.1.0"` then `git push origin v0.1.0`.

Expected: tag `v0.1.0` exists locally and remotely, and the public README links to the working Pages site.
