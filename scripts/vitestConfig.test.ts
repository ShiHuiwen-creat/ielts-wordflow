// @vitest-environment node

import { describe, expect, it } from 'vitest';

import config from '../vitest.config';

describe('Vitest workspace isolation', () => {
  it('does not discover tests from Git worktrees nested under the repository', () => {
    const resolvedConfig = config as {
      test?: { exclude?: string[] };
    };

    expect(resolvedConfig.test?.exclude).toContain('.worktrees/**');
  });
});
