import { describe, expect, it } from 'vitest';
import type { WordProgress } from '../scheduler/types';
import type { DailyStats } from '../../lib/storage/types';
import { summarizeProgress } from './summarizeProgress';

const TODAY = '2026-09-02';

function progress(wordId: string, mastered: boolean): WordProgress {
  return {
    wordId,
    firstLearnedAt: '2026-08-20T08:00:00.000Z',
    lastReviewedAt: '2026-09-02T08:00:00.000Z',
    dueAt: '2026-09-03T08:00:00.000Z',
    stage: mastered ? 4 : 2,
    consecutiveKnown: mastered ? 2 : 1,
    reviewCount: 3,
    lastRating: 'known',
    mastered,
  };
}

function stats(date: string, newLearned = 0, reviews = 0): DailyStats {
  return {
    date,
    newLearned,
    reviews,
    again: 0,
    hard: 0,
    known: newLearned + reviews,
  };
}

describe('summarizeProgress', () => {
  it('counts only progress records marked as mastered', () => {
    const result = summarizeProgress(
      [progress('allocate', true), progress('coherent', false), progress('derive', true)],
      [],
      TODAY,
    );

    expect(result.masteredCount).toBe(2);
  });

  it('reports current-day new, review, and total counts', () => {
    const result = summarizeProgress([], [stats(TODAY, 3, 4)], TODAY);

    expect(result.today).toEqual({ newLearned: 3, reviews: 4, total: 7 });
  });

  it('fills missing days with zero across the seven days ending today', () => {
    const result = summarizeProgress(
      [],
      [stats('2026-08-27', 2, 1), stats('2026-08-30', 0, 4), stats(TODAY, 1, 1)],
      TODAY,
    );

    expect(result.lastSevenDays).toEqual([
      { date: '2026-08-27', total: 3 },
      { date: '2026-08-28', total: 0 },
      { date: '2026-08-29', total: 0 },
      { date: '2026-08-30', total: 4 },
      { date: '2026-08-31', total: 0 },
      { date: '2026-09-01', total: 0 },
      { date: '2026-09-02', total: 2 },
    ]);
  });

  it.each([
    {
      label: 'today when today has activity',
      dailyStats: [stats('2026-08-30', 1), stats('2026-08-31', 1), stats('2026-09-01', 1), stats(TODAY, 1)],
      expected: 4,
    },
    {
      label: 'yesterday when today has no activity',
      dailyStats: [stats('2026-08-30', 1), stats('2026-08-31', 1), stats('2026-09-01', 1)],
      expected: 3,
    },
    {
      label: 'neither day when the most recent activity is older',
      dailyStats: [stats('2026-08-30', 1)],
      expected: 0,
    },
  ])('counts a consecutive-day streak ending $label', ({ dailyStats, expected }) => {
    const result = summarizeProgress([], dailyStats, TODAY);

    expect(result.streak).toBe(expected);
  });
});
