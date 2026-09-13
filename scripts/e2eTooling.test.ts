import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as Record<string, unknown>;
}

describe('Playwright tooling', () => {
  it('recreates the compatible browser runner from committed metadata', () => {
    const packageJson = readJson('package.json') as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const packageLock = readJson('package-lock.json') as {
      packages: Record<string, { version?: string }>;
    };

    expect(packageJson.devDependencies['@playwright/test']).toBe('1.55.0');
    expect(packageJson.scripts['e2e:install']).toBe('playwright install chromium');
    expect(packageLock.packages['node_modules/@playwright/test'].version).toBe('1.55.0');
    expect(packageLock.packages['node_modules/playwright'].version).toBe('1.55.0');
    expect(packageLock.packages['node_modules/playwright-core'].version).toBe('1.55.0');
  });
});
