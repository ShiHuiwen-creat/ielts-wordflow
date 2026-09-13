import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const requiredFiles = [
  'README.md',
  'README.zh-CN.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  '.github/workflows/ci.yml',
  '.github/workflows/pages.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/pull_request_template.md',
];

const errors = [];
const files = new Map();

for (const path of requiredFiles) {
  try {
    files.set(path, await readFile(resolve(repositoryRoot, path), 'utf8'));
  } catch {
    errors.push(`Missing required file: ${path}`);
  }
}

const packageJson = JSON.parse(
  await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
);
const nvmVersion = (
  await readFile(resolve(repositoryRoot, '.nvmrc'), 'utf8')
).trim();
const pwaConfig = await readFile(
  resolve(repositoryRoot, 'src/app/pwaConfig.ts'),
  'utf8',
);

const expectInFile = (path, value, description) => {
  const contents = files.get(path);
  if (contents !== undefined && !contents.includes(value)) {
    errors.push(`${path}: missing ${description}`);
  }
};

expectInFile('LICENSE', 'MIT License', 'MIT license heading');
expectInFile(
  'LICENSE',
  'Copyright (c) 2026 IELTS WordFlow contributors',
  'MIT copyright line',
);
expectInFile(
  'LICENSE',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND',
  'full MIT license warranty text',
);

const documentedScripts = [
  'dev',
  'build',
  'test',
  'typecheck',
  'lint',
  'preview',
  'e2e',
  'e2e:install',
  'validate:vocabulary',
];

for (const script of documentedScripts) {
  if (!(script in packageJson.scripts)) {
    errors.push(`package.json: missing documented script "${script}"`);
  }
  expectInFile('README.md', `npm run ${script}`, `command "npm run ${script}"`);
  expectInFile(
    'README.zh-CN.md',
    `npm run ${script}`,
    `command "npm run ${script}"`,
  );
}

for (const readmePath of ['README.md', 'README.zh-CN.md']) {
  const contents = files.get(readmePath);
  if (contents === undefined) continue;

  const commands = contents.matchAll(/npm run ([\w:-]+)/g);
  for (const [, script] of commands) {
    if (!(script in packageJson.scripts)) {
      errors.push(`${readmePath}: command "npm run ${script}" has no package.json script`);
    }
  }
}

expectInFile('README.md', '[简体中文](README.zh-CN.md)', 'Chinese README link');
expectInFile('README.zh-CN.md', '[English](README.md)', 'English README link');

const pwaBaseMatch = pwaConfig.match(/const base = ['"]([^'"]+)['"]/);
if (!pwaBaseMatch) {
  errors.push('src/app/pwaConfig.ts: unable to determine deployment base');
}
const pagesBase = pwaBaseMatch?.[1];
if (pagesBase) {
  const expectedPagesBase = `/${packageJson.name}/`;
  if (pagesBase !== expectedPagesBase) {
    errors.push(
      `Pages base mismatch: expected ${expectedPagesBase} for package ${packageJson.name}, received ${pagesBase}`,
    );
  }
  expectInFile('README.md', pagesBase, `Pages base "${pagesBase}"`);
  expectInFile('README.zh-CN.md', pagesBase, `Pages base "${pagesBase}"`);
}

const expectedEngine = `>=${nvmVersion}`;
if (packageJson.engines?.node !== expectedEngine) {
  errors.push(
    `Node version mismatch: .nvmrc is ${nvmVersion}, package.json engines.node must be ${expectedEngine}`,
  );
}
if (packageJson.devDependencies?.['@playwright/test'] !== '1.55.0') {
  errors.push('package.json: @playwright/test must be pinned to exactly 1.55.0');
}

const ciWorkflow = files.get('.github/workflows/ci.yml');
const pagesWorkflow = files.get('.github/workflows/pages.yml');
const workflows = [
  ['.github/workflows/ci.yml', ciWorkflow],
  ['.github/workflows/pages.yml', pagesWorkflow],
];

for (const [path, contents] of workflows) {
  if (contents === undefined) continue;

  expectInFile(path, `node-version: ${nvmVersion}`, `Node ${nvmVersion} setup`);
  expectInFile(path, 'npm ci', 'clean dependency installation');
  expectInFile(path, 'npm run validate:vocabulary', 'vocabulary validation');
  expectInFile(path, 'npm test', 'unit tests');
  expectInFile(path, 'npm run typecheck', 'type checking');
  expectInFile(path, 'npm run lint', 'linting');
  expectInFile(path, 'npm run build', 'production build');
}

expectInFile(
  '.github/workflows/ci.yml',
  'npx playwright install --with-deps chromium',
  'Playwright Chromium bootstrap with Linux dependencies',
);
expectInFile('.github/workflows/ci.yml', 'npm run e2e', 'Playwright tests');
expectInFile('.github/workflows/ci.yml', 'pull_request:', 'pull request trigger');
expectInFile('.github/workflows/ci.yml', 'main', 'main branch trigger');

expectInFile('.github/workflows/pages.yml', 'contents: read', 'read-only contents permission');
expectInFile('.github/workflows/pages.yml', 'pages: write', 'Pages write permission');
expectInFile('.github/workflows/pages.yml', 'id-token: write', 'OIDC token permission');
expectInFile('.github/workflows/pages.yml', 'path: ./dist', 'dist artifact path');
expectInFile('.github/workflows/pages.yml', 'github-pages', 'Pages environment');
expectInFile('.github/workflows/pages.yml', 'actions/deploy-pages@v4', 'Pages deployment action');
expectInFile(
  '.github/workflows/pages.yml',
  'npx playwright install --with-deps chromium',
  'Playwright Chromium bootstrap with Linux dependencies',
);
expectInFile('.github/workflows/pages.yml', 'npm run e2e', 'Playwright tests');

if (pagesWorkflow !== undefined) {
  const expectedPermissions = [
    'permissions:',
    '  contents: read',
    '  pages: write',
    '  id-token: write',
  ].join('\n');
  if (!pagesWorkflow.includes(expectedPermissions)) {
    errors.push('.github/workflows/pages.yml: Pages permissions must be the minimal required set');
  }
  if (!/push:\s*\n\s*branches:\s*\[main\]/.test(pagesWorkflow)) {
    errors.push('.github/workflows/pages.yml: deployment must trigger only on pushes to main');
  }
  if (/pull_request:/.test(pagesWorkflow)) {
    errors.push('.github/workflows/pages.yml: deployment workflow must not run on pull requests');
  }
}

if (errors.length > 0) {
  console.error('Repository verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Repository verification passed.');
}
