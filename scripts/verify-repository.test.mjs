import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { verifyRepository } from './verify-repository.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const fixtureFiles = [
  '.nvmrc',
  'package.json',
  'src/app/pwaConfig.ts',
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
const fixtureRoots = [];

async function canonicalFile(path) {
  return readFile(resolve(repositoryRoot, path), 'utf8');
}

async function createFixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'ielts-wordflow-verifier-'));
  fixtureRoots.push(root);

  await Promise.all(fixtureFiles.map(async (path) => {
    const target = resolve(root, path);
    await mkdir(dirname(target), { recursive: true });
    if (Object.hasOwn(overrides, path)) {
      await writeFile(target, overrides[path], 'utf8');
    } else {
      await copyFile(resolve(repositoryRoot, path), target);
    }
  }));

  return root;
}

async function expectInvalid(path, contents) {
  const errors = await verifyRepository(await createFixture({ [path]: contents }));
  expect(errors.join('\n')).toContain(path);
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, {
    recursive: true,
    force: true,
  })));
});

describe('canonical repository', () => {
  it('passes every repository check', async () => {
    await expect(verifyRepository(repositoryRoot)).resolves.toEqual([]);
  });
});

describe('substantive documentation', () => {
  it('rejects an empty required document', async () => {
    await expectInvalid('CONTRIBUTING.md', '');
  });

  it('rejects an MIT license assembled from only checked fragments', async () => {
    await expectInvalid('LICENSE', [
      'MIT License',
      'Copyright (c) 2026 IELTS WordFlow contributors',
      'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND',
    ].join('\n\n'));
  });

  it('rejects a truncated Contributor Covenant', async () => {
    await expectInvalid('CODE_OF_CONDUCT.md', [
      '# Contributor Covenant Code of Conduct',
      '## Our Pledge',
      '## Attribution',
      'Contributor Covenant version 2.1',
    ].join('\n\n'));
  });

  it('rejects a security policy without private reporting guidance', async () => {
    await expectInvalid('SECURITY.md', '# Security Policy\n\nReport problems in a public issue.');
  });

  it('rejects a security policy without the pre-publication enablement prerequisite', async () => {
    const policy = await canonicalFile('SECURITY.md');
    await expectInvalid(
      'SECURITY.md',
      policy.replace(/\n## Repository publication prerequisite[\s\S]*?(?=\n## )/, ''),
    );
  });

  it.each([
    ['README.md', 'Publication prerequisite'],
    ['README.zh-CN.md', '公开发布前提'],
  ])('rejects %s without private-reporting publication guidance', async (path, heading) => {
    const readme = await canonicalFile(path);
    const section = new RegExp(`\\n## ${heading}[\\s\\S]*?(?=\\n## )`);
    await expectInvalid(path, readme.replace(section, ''));
  });

  it('rejects an empty pull request checklist', async () => {
    await expectInvalid('.github/pull_request_template.md', '');
  });
});

describe('parsed issue forms', () => {
  it('rejects malformed YAML', async () => {
    await expectInvalid('.github/ISSUE_TEMPLATE/bug_report.yml', 'name: [unfinished');
  });

  it('rejects an empty issue form', async () => {
    await expectInvalid('.github/ISSUE_TEMPLATE/feature_request.yml', '');
  });

  it('rejects a form missing a required structured field', async () => {
    const form = await canonicalFile('.github/ISSUE_TEMPLATE/bug_report.yml');
    await expectInvalid(
      '.github/ISSUE_TEMPLATE/bug_report.yml',
      form.replace('    id: reproduction', '    id: omitted-reproduction'),
    );
  });
});

describe('parsed GitHub workflows', () => {
  it('rejects a required command that exists only in a comment', async () => {
    const workflow = await canonicalFile('.github/workflows/ci.yml');
    await expectInvalid(
      '.github/workflows/ci.yml',
      workflow.replace('        run: npm run lint', '        # run: npm run lint'),
    );
  });

  it('rejects required commands in the wrong order', async () => {
    const workflow = await canonicalFile('.github/workflows/ci.yml');
    const lintStep = '      - name: Lint\n        run: npm run lint';
    const buildStep = '      - name: Build production app\n        run: npm run build';
    await expectInvalid(
      '.github/workflows/ci.yml',
      workflow.replace(`${lintStep}\n\n${buildStep}`, `${buildStep}\n\n${lintStep}`),
    );
  });

  it('rejects a Pages workflow without the upload action', async () => {
    const workflow = await canonicalFile('.github/workflows/pages.yml');
    await expectInvalid(
      '.github/workflows/pages.yml',
      workflow.replace(
        'uses: actions/upload-pages-artifact@v3',
        'run: echo "upload action missing"',
      ),
    );
  });

  it('rejects Pages actions in the wrong order', async () => {
    const workflow = await canonicalFile('.github/workflows/pages.yml');
    const configureStep = '      - name: Configure Pages\n        uses: actions/configure-pages@v5';
    const uploadStep = [
      '      - name: Upload Pages artifact',
      '        uses: actions/upload-pages-artifact@v3',
      '        with:',
      '          path: ./dist',
    ].join('\n');
    await expectInvalid(
      '.github/workflows/pages.yml',
      workflow.replace(`${configureStep}\n\n${uploadStep}`, `${uploadStep}\n\n${configureStep}`),
    );
  });

  it('rejects an extra Pages permission', async () => {
    const workflow = await canonicalFile('.github/workflows/pages.yml');
    await expectInvalid(
      '.github/workflows/pages.yml',
      workflow.replace('  id-token: write', '  id-token: write\n  actions: write'),
    );
  });

  it('rejects the wrong CI push trigger', async () => {
    const workflow = await canonicalFile('.github/workflows/ci.yml');
    await expectInvalid(
      '.github/workflows/ci.yml',
      workflow.replace('    branches: [main]', '    branches: [develop]'),
    );
  });
});
