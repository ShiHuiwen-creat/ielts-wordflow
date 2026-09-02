import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import type { WordProgress } from '../../features/scheduler/types';
import { createBackup, restoreBackup, validateBackup } from './backup';
import { WordflowDatabase } from './database';
import { createRepository } from './repository';
import type { StorageRepository } from './types';

const databaseNames = new Set<string>();

function databaseName(label: string): string {
  const name = `backup-${label}-${crypto.randomUUID()}`;
  databaseNames.add(name);
  return name;
}

function progress(overrides: Partial<WordProgress> = {}): WordProgress {
  return {
    wordId: 'allocate',
    firstLearnedAt: '2026-09-02T08:00:00.000Z',
    lastReviewedAt: '2026-09-02T08:00:00.000Z',
    dueAt: '2026-09-03T08:00:00.000Z',
    stage: 1,
    consecutiveKnown: 1,
    reviewCount: 1,
    lastRating: 'known',
    mastered: false,
    ...overrides,
  };
}

async function populate(repository: StorageRepository): Promise<void> {
  await repository.saveSettings({
    dailyGoal: 30,
    autoSpeak: true,
    onboardingComplete: true,
  });
  await repository.saveReview(progress(), '2026-09-02');
  await repository.saveReview(
    progress({ reviewCount: 2, lastRating: 'hard', stage: 2 }),
    '2026-09-03',
  );
}

afterEach(async () => {
  await Promise.all([...databaseNames].map((name) => Dexie.delete(name)));
  databaseNames.clear();
});

describe('storage backup', () => {
  it('rejects an unsupported backup without changing stored data', async () => {
    const repository = createRepository(databaseName('unsupported'));
    await repository.saveReview(progress(), '2026-09-02');

    await expect(restoreBackup(repository, { schemaVersion: 99 })).rejects.toThrow(
      '不支持的备份版本',
    );
    await expect(repository.getProgress('allocate')).resolves.toEqual(progress());
    repository.close();
  });

  it('rejects malformed records before changing stored data', async () => {
    const repository = createRepository(databaseName('malformed'));
    await populate(repository);
    const before = await createBackup(repository);
    const malformed = {
      ...before,
      progress: [{ ...before.progress[0], dueAt: 'tomorrow' }],
    };

    expect(() => validateBackup(malformed)).toThrow('备份数据无效');
    await expect(restoreBackup(repository, malformed)).rejects.toThrow('备份数据无效');
    const after = await createBackup(repository);
    expect(after).toMatchObject({
      settings: before.settings,
      progress: before.progress,
      dailyStats: before.dailyStats,
    });
    repository.close();
  });

  it('rejects parseable strings that are not ISO 8601 timestamps', () => {
    expect(() =>
      validateBackup({
        schemaVersion: 1,
        exportedAt: '2026',
        settings: { dailyGoal: 20, autoSpeak: false, onboardingComplete: false },
        progress: [],
        dailyStats: [],
      }),
    ).toThrow('备份数据无效');
  });

  it('round-trips settings, progress and daily stats', async () => {
    const populatedRepository = createRepository(databaseName('source'));
    const emptyRepository = createRepository(databaseName('destination'));
    await populate(populatedRepository);

    const backup = await createBackup(populatedRepository);
    await restoreBackup(emptyRepository, backup);

    await expect(createBackup(emptyRepository)).resolves.toMatchObject({
      schemaVersion: 1,
      settings: backup.settings,
      progress: backup.progress,
      dailyStats: backup.dailyStats,
    });
    populatedRepository.close();
    emptyRepository.close();
  });

  it('rolls back every table when a restore write fails', async () => {
    const database = new WordflowDatabase(databaseName('rollback'));
    const repository = createRepository(database);
    await populate(repository);
    const before = await createBackup(repository);
    database.progress.hook('creating', (_key, record) => {
      if (record.wordId === 'trigger-failure') {
        throw new Error('restore write failed');
      }
    });
    const replacement = {
      schemaVersion: 1 as const,
      exportedAt: '2026-09-03T08:00:00.000Z',
      settings: { dailyGoal: 10 as const, autoSpeak: false, onboardingComplete: false },
      progress: [progress({ wordId: 'trigger-failure' })],
      dailyStats: [
        { date: '2026-09-03', newLearned: 1, reviews: 0, again: 0, hard: 0, known: 1 },
      ],
    };

    await expect(restoreBackup(repository, replacement)).rejects.toThrow('restore write failed');
    const after = await createBackup(repository);
    expect(after).toMatchObject({
      settings: before.settings,
      progress: before.progress,
      dailyStats: before.dailyStats,
    });
    repository.close();
  });

  it('rejects duplicate keys before restore can start', async () => {
    const repository = createRepository(databaseName('duplicates'));
    const valid = await createBackup(repository);
    const duplicated = {
      ...valid,
      progress: [progress(), progress({ stage: 2 })],
    };

    await expect(restoreBackup(repository, duplicated)).rejects.toThrow('备份数据无效');
    repository.close();
  });
});
