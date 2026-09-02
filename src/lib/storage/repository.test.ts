import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import type { WordProgress } from '../../features/scheduler/types';
import { WordflowDatabase } from './database';
import { createRepository } from './repository';

const databaseNames = new Set<string>();

function databaseName(label: string): string {
  const name = `repository-${label}-${crypto.randomUUID()}`;
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

afterEach(async () => {
  await Promise.all([...databaseNames].map((name) => Dexie.delete(name)));
  databaseNames.clear();
});

describe('storage repository', () => {
  it('returns safe defaults for a new database', async () => {
    const repository = createRepository(databaseName('defaults'));

    await expect(repository.getSettings()).resolves.toEqual({
      dailyGoal: 20,
      autoSpeak: false,
      onboardingComplete: false,
    });

    repository.close();
  });

  it('persists settings and progress across database instances', async () => {
    const name = databaseName('persistence');
    const first = createRepository(name);
    const storedProgress = progress();
    await first.saveSettings({ dailyGoal: 20, autoSpeak: true, onboardingComplete: true });
    await first.saveReview(storedProgress);
    first.close();

    const reopened = createRepository(name);
    await expect(reopened.getSettings()).resolves.toMatchObject({ dailyGoal: 20 });
    await expect(reopened.getProgress('allocate')).resolves.toEqual(storedProgress);
    reopened.close();
  });

  it('keeps one progress record per word id', async () => {
    const repository = createRepository(databaseName('unique-progress'));
    await repository.saveReview(progress(), '2026-09-02');
    await repository.saveReview(
      progress({ stage: 2, reviewCount: 2, lastRating: 'hard' }),
      '2026-09-03',
    );

    await expect(repository.getAllProgress()).resolves.toEqual([
      progress({ stage: 2, reviewCount: 2, lastRating: 'hard' }),
    ]);
    repository.close();
  });

  it('increments new, review, and rating counters with the progress write', async () => {
    const repository = createRepository(databaseName('daily-increment'));
    await repository.saveReview(progress(), '2026-09-02');
    await repository.saveReview(
      progress({ reviewCount: 2, lastRating: 'again', consecutiveKnown: 0, stage: 0 }),
      '2026-09-02',
    );

    await expect(repository.getDailyStats('2026-09-02')).resolves.toEqual({
      date: '2026-09-02',
      newLearned: 1,
      reviews: 1,
      again: 1,
      hard: 0,
      known: 1,
    });
    repository.close();
  });

  it('reads daily statistics by their local date key', async () => {
    const repository = createRepository(databaseName('date-key'));
    await repository.saveReview(progress(), '2026-09-02');

    await expect(repository.getDailyStats('2026-09-01')).resolves.toBeUndefined();
    await expect(repository.getDailyStats('2026-09-02')).resolves.toMatchObject({
      date: '2026-09-02',
      newLearned: 1,
    });
    repository.close();
  });

  it('rolls back progress when the daily-stat write fails', async () => {
    const database = new WordflowDatabase(databaseName('atomic-review'));
    database.dailyStats.hook('creating', () => {
      throw new Error('daily stats failed');
    });
    const repository = createRepository(database);

    await expect(repository.saveReview(progress(), '2026-09-02')).rejects.toThrow(
      'daily stats failed',
    );
    await expect(repository.getProgress('allocate')).resolves.toBeUndefined();
    repository.close();
  });

  it('reopens a version-1 database without replacing its records', async () => {
    const name = databaseName('version-one');
    const versionOne = new Dexie(name);
    versionOne.version(1).stores({
      settings: '&id',
      progress: '&wordId',
      dailyStats: '&date',
    });
    await versionOne.table('settings').put({
      id: 'app',
      dailyGoal: 30,
      autoSpeak: true,
      onboardingComplete: true,
    });
    versionOne.close();

    const repository = createRepository(name);
    await expect(repository.getSettings()).resolves.toEqual({
      dailyGoal: 30,
      autoSpeak: true,
      onboardingComplete: true,
    });
    repository.close();
  });
});
