import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

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

const requiredWorkflowCommands = [
  'npm ci',
  'node scripts/verify-repository.mjs',
  'npm run validate:vocabulary',
  'npm test',
  'npm run typecheck',
  'npm run lint',
  'npm run build',
  'npx playwright install --with-deps chromium',
  'npm run e2e',
];

const canonicalMitLicense = `MIT License

Copyright (c) 2026 IELTS WordFlow contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const issueFormSpecifications = {
  '.github/ISSUE_TEMPLATE/bug_report.yml': {
    fields: {
      description: { type: 'textarea', required: true },
      reproduction: { type: 'textarea', required: true },
      browser: { type: 'input', required: true },
      'operating-system': { type: 'input', required: true },
      connectivity: { type: 'dropdown', required: true },
      evidence: { type: 'textarea', required: false },
      checks: { type: 'checkboxes', required: false, requiredOptions: true },
    },
  },
  '.github/ISSUE_TEMPLATE/feature_request.yml': {
    fields: {
      problem: { type: 'textarea', required: true },
      proposal: { type: 'textarea', required: true },
      alternatives: { type: 'textarea', required: false },
      'offline-privacy': { type: 'textarea', required: true },
      accessibility: { type: 'textarea', required: false },
      checks: { type: 'checkboxes', required: false, requiredOptions: true },
    },
  },
};

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalized(text) {
  return text.replaceAll('\r\n', '\n').trim();
}

function expectFragments(path, contents, fragments, errors) {
  if (contents === undefined) return;
  for (const fragment of fragments) {
    if (!contents.includes(fragment)) {
      errors.push(`${path}: missing substantive content "${fragment}"`);
    }
  }
}

function expectHeadings(path, contents, headings, errors) {
  if (contents === undefined) return;
  const lines = new Set(contents.replaceAll('\r\n', '\n').split('\n'));
  for (const heading of headings) {
    if (!lines.has(heading)) {
      errors.push(`${path}: missing required heading "${heading}"`);
    }
  }
}

function parseYamlFile(path, contents, errors) {
  if (contents === undefined) return undefined;
  try {
    const document = parse(contents);
    if (!isRecord(document)) {
      errors.push(`${path}: YAML document must be a non-empty mapping`);
      return undefined;
    }
    return document;
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : 'unknown error';
    errors.push(`${path}: malformed YAML (${message})`);
    return undefined;
  }
}

function validateIssueForm(path, contents, specification, errors) {
  const form = parseYamlFile(path, contents, errors);
  if (form === undefined) return;

  for (const key of ['name', 'description', 'title']) {
    if (typeof form[key] !== 'string' || form[key].trim() === '') {
      errors.push(`${path}: top-level ${key} must be a non-empty string`);
    }
  }
  if (!Array.isArray(form.labels) || form.labels.length === 0) {
    errors.push(`${path}: labels must be a non-empty array`);
  }
  if (!Array.isArray(form.body) || form.body.length === 0) {
    errors.push(`${path}: body must be a non-empty array`);
    return;
  }

  const fields = new Map();
  for (const item of form.body) {
    if (!isRecord(item) || typeof item.id !== 'string') continue;
    if (fields.has(item.id)) {
      errors.push(`${path}: duplicate field id "${item.id}"`);
    }
    fields.set(item.id, item);
  }

  for (const [id, expected] of Object.entries(specification.fields)) {
    const field = fields.get(id);
    if (!isRecord(field)) {
      errors.push(`${path}: missing required field id "${id}"`);
      continue;
    }
    if (field.type !== expected.type) {
      errors.push(`${path}: field "${id}" must use type "${expected.type}"`);
    }
    if (!isRecord(field.attributes) || typeof field.attributes.label !== 'string'
      || field.attributes.label.trim() === '') {
      errors.push(`${path}: field "${id}" must have a non-empty label`);
    }
    if (expected.required && (!isRecord(field.validations)
      || field.validations.required !== true)) {
      errors.push(`${path}: field "${id}" must be required`);
    }
    if (expected.requiredOptions) {
      const options = isRecord(field.attributes) ? field.attributes.options : undefined;
      if (!Array.isArray(options) || options.length === 0
        || options.some((option) => !isRecord(option)
          || typeof option.label !== 'string'
          || option.label.trim() === ''
          || option.required !== true)) {
        errors.push(`${path}: field "${id}" must have non-empty required checkbox options`);
      }
    }
  }
}

function mapsEqual(actual, expected) {
  if (!isRecord(actual)) return false;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index]
      && actual[key] === expected[key]);
}

function hasOnlyMainBranch(trigger) {
  return isRecord(trigger)
    && Array.isArray(trigger.branches)
    && trigger.branches.length === 1
    && trigger.branches[0] === 'main';
}

function workflowJobs(workflow) {
  return isRecord(workflow.jobs)
    ? Object.entries(workflow.jobs).filter(([, job]) => isRecord(job))
    : [];
}

function validateCommandJob(path, workflow, nodeVersion, errors) {
  const jobs = workflowJobs(workflow);
  const candidate = jobs.find(([, job]) => Array.isArray(job.steps)
    && job.steps.some((step) => isRecord(step)
      && typeof step.run === 'string'
      && requiredWorkflowCommands.includes(step.run.trim())));

  if (candidate === undefined) {
    errors.push(`${path}: missing job with executable repository checks`);
    return undefined;
  }

  const [jobName, job] = candidate;
  const steps = job.steps.filter(isRecord);
  const commandIndexes = requiredWorkflowCommands.map((command) => steps.findIndex(
    (step) => typeof step.run === 'string' && step.run.trim() === command,
  ));

  for (let index = 0; index < requiredWorkflowCommands.length; index += 1) {
    if (commandIndexes[index] === -1) {
      errors.push(`${path}: job "${jobName}" missing executable step "${requiredWorkflowCommands[index]}"`);
    }
  }
  if (commandIndexes.every((index) => index >= 0)
    && commandIndexes.some((index, position) => position > 0
      && index <= commandIndexes[position - 1])) {
    errors.push(`${path}: required executable steps are in the wrong order`);
  }

  const nodeStep = steps.find((step) => step.uses === 'actions/setup-node@v4');
  if (!isRecord(nodeStep) || !isRecord(nodeStep.with)
    || String(nodeStep.with['node-version']) !== nodeVersion) {
    errors.push(`${path}: actions/setup-node@v4 must use Node ${nodeVersion}`);
  }

  return { job, steps };
}

function validateWorkflows(files, nodeVersion, errors) {
  const ciPath = '.github/workflows/ci.yml';
  const pagesPath = '.github/workflows/pages.yml';
  const ci = parseYamlFile(ciPath, files.get(ciPath), errors);
  const pages = parseYamlFile(pagesPath, files.get(pagesPath), errors);

  if (ci !== undefined) {
    const events = isRecord(ci.on) ? Object.keys(ci.on).sort() : [];
    if (events.length !== 2
      || events[0] !== 'pull_request'
      || events[1] !== 'push'
      || !hasOnlyMainBranch(ci.on.push)
      || !hasOnlyMainBranch(ci.on.pull_request)) {
      errors.push(`${ciPath}: triggers must be exactly push and pull_request targeting only main`);
    }
    if (!mapsEqual(ci.permissions, { contents: 'read' })) {
      errors.push(`${ciPath}: top-level permissions must be exactly contents: read`);
    }
    validateCommandJob(ciPath, ci, nodeVersion, errors);
  }

  if (pages !== undefined) {
    const events = isRecord(pages.on) ? Object.keys(pages.on) : [];
    if (events.length !== 1 || events[0] !== 'push'
      || !hasOnlyMainBranch(pages.on.push)) {
      errors.push(`${pagesPath}: must deploy only for pushes to main and never for pull requests`);
    }
    if (!mapsEqual(pages.permissions, {
      contents: 'read',
      pages: 'write',
      'id-token': 'write',
    })) {
      errors.push(`${pagesPath}: top-level permissions must be the exact minimal Pages map`);
    }

    const commandJob = validateCommandJob(pagesPath, pages, nodeVersion, errors);
    if (commandJob !== undefined) {
      const { job, steps } = commandJob;
      if (job.if !== "github.ref == 'refs/heads/main'") {
        errors.push(`${pagesPath}: deployment job must guard refs/heads/main`);
      }
      if (!isRecord(job.environment)
        || job.environment.name !== 'github-pages'
        || typeof job.environment.url !== 'string'
        || !job.environment.url.includes('steps.deployment.outputs.page_url')) {
        errors.push(`${pagesPath}: deployment job must configure the github-pages environment URL`);
      }

      const configureStep = steps.find((step) => step.uses === 'actions/configure-pages@v5');
      const uploadStep = steps.find((step) => step.uses === 'actions/upload-pages-artifact@v3');
      const deployStep = steps.find((step) => step.uses === 'actions/deploy-pages@v4');
      if (configureStep === undefined) {
        errors.push(`${pagesPath}: missing actions/configure-pages@v5 step`);
      }
      if (uploadStep === undefined || !isRecord(uploadStep.with)
        || uploadStep.with.path !== './dist') {
        errors.push(`${pagesPath}: upload-pages-artifact@v3 must upload ./dist`);
      }
      if (deployStep === undefined || deployStep.id !== 'deployment') {
        errors.push(`${pagesPath}: deploy-pages@v4 must use the deployment step id`);
      }
      const e2eIndex = steps.findIndex((step) => step.run?.trim() === 'npm run e2e');
      const configureIndex = steps.findIndex((step) => step.uses === 'actions/configure-pages@v5');
      const uploadIndex = steps.findIndex((step) => step.uses === 'actions/upload-pages-artifact@v3');
      const deployIndex = steps.findIndex((step) => step.uses === 'actions/deploy-pages@v4');
      if ([e2eIndex, configureIndex, uploadIndex, deployIndex].every((index) => index >= 0)
        && !(e2eIndex < configureIndex
          && configureIndex < uploadIndex
          && uploadIndex < deployIndex)) {
        errors.push(`${pagesPath}: Pages configure, upload, and deploy steps are in the wrong order`);
      }
    }
  }
}

function validateDocumentation(files, packageJson, pagesBase, errors) {
  const englishReadme = files.get('README.md');
  const chineseReadme = files.get('README.zh-CN.md');

  expectHeadings('README.md', englishReadme, [
    '# IELTS WordFlow',
    '## Features',
    '## Privacy and local data',
    '## Browser support',
    '## Install and develop',
    '## Validation and tests',
    '## GitHub Pages deployment',
    '## Architecture',
    '## Public repository release sequence',
    '## Contributing',
    '## Licenses',
  ], errors);
  expectFragments('README.md', englishReadme, [
    '[简体中文](README.zh-CN.md)',
    pagesBase,
    'Clearing site data or browser storage',
    'Export a backup',
    'Private vulnerability reporting',
    'After making the repository public, a repository administrator must immediately enable',
    'before announcing or publishing a release',
    'CC BY 4.0',
    'MIT License',
  ], errors);

  expectHeadings('README.zh-CN.md', chineseReadme, [
    '# IELTS WordFlow',
    '## 功能',
    '## 隐私与本地数据',
    '## 浏览器支持',
    '## 安装与开发',
    '## 校验与测试',
    '## GitHub Pages 部署',
    '## 架构',
    '## 公开仓库发布顺序',
    '## 参与贡献',
    '## 许可证',
  ], errors);
  expectFragments('README.zh-CN.md', chineseReadme, [
    '[English](README.md)',
    pagesBase,
    '清除网站数据或浏览器存储',
    '导出数据',
    'Private vulnerability reporting',
    '仓库设为公开后，仓库管理员必须立即在',
    '在宣布或发布版本、广泛分享仓库或接受外部访问之前',
    'CC BY 4.0',
    'MIT License',
  ], errors);

  for (const script of documentedScripts) {
    if (!(script in packageJson.scripts)) {
      errors.push(`package.json: missing documented script "${script}"`);
    }
    for (const path of ['README.md', 'README.zh-CN.md']) {
      if (!files.get(path)?.includes(`npm run ${script}`)) {
        errors.push(`${path}: missing command "npm run ${script}"`);
      }
    }
  }
  for (const path of ['README.md', 'README.zh-CN.md']) {
    for (const [, script] of files.get(path)?.matchAll(/npm run ([\w:-]+)/g) ?? []) {
      if (!(script in packageJson.scripts)) {
        errors.push(`${path}: command "npm run ${script}" has no package.json script`);
      }
    }
  }

  const license = files.get('LICENSE');
  if (license !== undefined && normalized(license) !== canonicalMitLicense) {
    errors.push('LICENSE: must contain the complete canonical MIT license text and project copyright');
  }

  const contributing = files.get('CONTRIBUTING.md');
  expectHeadings('CONTRIBUTING.md', contributing, [
    '# Contributing to IELTS WordFlow',
    '## Before you start',
    '## Local setup',
    '## Development expectations',
    '## Required checks',
    '## Pull requests',
    '## Release checklist',
  ], errors);
  expectFragments('CONTRIBUTING.md', contributing, [
    'node scripts/verify-repository.mjs',
    'npm run validate:vocabulary',
    'npm run e2e',
    'MIT License',
    'CC BY 4.0',
    'Private vulnerability reporting',
    'Immediately after making the repository public',
    'Before announcing or publishing a release',
  ], errors);

  const conduct = files.get('CODE_OF_CONDUCT.md');
  expectHeadings('CODE_OF_CONDUCT.md', conduct, [
    '# Contributor Covenant Code of Conduct',
    '## Our Pledge',
    '## Our Standards',
    '## Enforcement Responsibilities',
    '## Scope',
    '## Enforcement',
    '## Enforcement Guidelines',
    '### 1. Correction',
    '### 2. Warning',
    '### 3. Temporary Ban',
    '### 4. Permanent Ban',
    '## Attribution',
  ], errors);
  expectFragments('CODE_OF_CONDUCT.md', conduct, [
    'We as members, contributors, and leaders pledge',
    'harassment-free experience for everyone',
    'Examples of behavior that contributes to a positive environment',
    'Examples of unacceptable behavior include',
    'Community leaders are responsible for clarifying and enforcing',
    'This Code of Conduct applies within all community spaces',
    'Instances of abusive, harassing, or otherwise unacceptable behavior',
    'https://www.contributor-covenant.org/version/2/1/code_of_conduct.html',
  ], errors);

  const security = files.get('SECURITY.md');
  expectHeadings('SECURITY.md', security, [
    '# Security Policy',
    '## Supported versions',
    '## Public repository security setup',
    '## Reporting a vulnerability',
    '## Scope notes',
  ], errors);
  expectFragments('SECURITY.md', security, [
    'Private vulnerability reporting',
    'After making the repository public, a repository administrator must immediately enable',
    'before announcing or publishing a release',
    'Security',
    'private vulnerability report',
    'GitHub Security Advisories',
    'do not disclose',
  ], errors);
  if (security !== undefined && (/mailto:/i.test(security)
    || /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(security))) {
    errors.push('SECURITY.md: must not publish a private contact email address');
  }

  const pullRequest = files.get('.github/pull_request_template.md');
  expectHeadings('.github/pull_request_template.md', pullRequest, [
    '## Summary',
    '## Verification',
    '## Product checks',
    '## Release checklist',
    '## Visual changes',
  ], errors);
  expectFragments('.github/pull_request_template.md', pullRequest, [
    '- [ ] `node scripts/verify-repository.mjs`',
    '- [ ] `npm run validate:vocabulary`',
    '- [ ] `npm run test`',
    '- [ ] `npm run typecheck`',
    '- [ ] `npm run lint`',
    '- [ ] `npm run build`',
    '- [ ] `npm run e2e`',
    'accessibility',
    'offline behavior',
    'privacy',
    'vocabulary-data',
    'Private vulnerability reporting',
  ], errors);
}

export async function verifyRepository(repositoryRoot) {
  const errors = [];
  const files = new Map();

  for (const path of requiredFiles) {
    try {
      files.set(path, await readFile(resolve(repositoryRoot, path), 'utf8'));
    } catch {
      errors.push(`Missing required file: ${path}`);
    }
  }

  let packageJson;
  try {
    packageJson = JSON.parse(await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'));
  } catch {
    errors.push('package.json: missing or malformed JSON');
    packageJson = { name: '', scripts: {}, devDependencies: {} };
  }
  const nvmVersion = (await readFile(resolve(repositoryRoot, '.nvmrc'), 'utf8')).trim();
  const pwaConfig = await readFile(resolve(repositoryRoot, 'src/app/pwaConfig.ts'), 'utf8');
  const pwaBaseMatch = pwaConfig.match(/const base = ['"]([^'"]+)['"]/);
  const pagesBase = pwaBaseMatch?.[1] ?? '';

  if (pagesBase === '') {
    errors.push('src/app/pwaConfig.ts: unable to determine deployment base');
  } else if (pagesBase !== `/${packageJson.name}/`) {
    errors.push(`src/app/pwaConfig.ts: Pages base must be /${packageJson.name}/`);
  }
  if (packageJson.engines?.node !== `>=${nvmVersion}`) {
    errors.push(`package.json: engines.node must be >=${nvmVersion}`);
  }
  if (packageJson.devDependencies?.['@playwright/test'] !== '1.55.0') {
    errors.push('package.json: @playwright/test must be pinned to exactly 1.55.0');
  }
  if (typeof packageJson.devDependencies?.yaml !== 'string') {
    errors.push('package.json: yaml must be a direct development dependency');
  }

  validateDocumentation(files, packageJson, pagesBase, errors);
  for (const [path, specification] of Object.entries(issueFormSpecifications)) {
    validateIssueForm(path, files.get(path), specification, errors);
  }
  validateWorkflows(files, nvmVersion, errors);

  return errors;
}

const scriptPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] === undefined ? undefined : resolve(process.argv[1]);

if (invokedPath === scriptPath) {
  const errors = await verifyRepository(resolve(dirname(scriptPath), '..'));
  if (errors.length > 0) {
    console.error('Repository verification failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Repository verification passed.');
  }
}
