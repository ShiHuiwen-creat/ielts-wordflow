import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { describe, expect, it } from 'vitest';

describe('vocabulary validation CLI', () => {
  it('runs the shared TypeScript validator without runtime warnings', () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/validate-vocabulary.mjs'],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const total = result.stdout.match(/total entries: (\d+) \(minimum 300\)/);
    expect(Number(total?.[1] ?? 0)).toBeGreaterThanOrEqual(300);
    expect(result.stdout).toContain('duplicate IDs: 0');
    expect(result.stdout).toContain('duplicate words: 0');
    expect(result.stdout).toContain('missing fields: 0');
    expect(result.stdout).toContain('invalid parts of speech: 0');
    expect(result.stdout).toContain('invalid tags: 0');
    expect(result.stdout).toContain('placeholder fields: 0');
    expect(result.stdout).toContain('example mismatches: 0');
    expect(result.stdout).toContain('status: valid');
  });
});
