import { describe, expect, it } from 'vitest';
import { scheduleReview } from './scheduleReview';
import type { WordProgress } from './types';

const NOW = new Date('2026-09-02T08:00:00.000Z');

function progress(overrides: Partial<WordProgress> = {}): WordProgress {
  return {
    wordId: 'allocate',
    firstLearnedAt: '2026-08-01T08:00:00.000Z',
    lastReviewedAt: '2026-09-01T08:00:00.000Z',
    dueAt: '2026-09-02T08:00:00.000Z',
    stage: 0,
    consecutiveKnown: 0,
    reviewCount: 4,
    lastRating: 'hard',
    mastered: false,
    ...overrides,
  };
}

describe('scheduleReview', () => {
  it.each([
    ['again', 0, '2026-09-03T08:00:00.000Z'],
    ['hard', 1, '2026-09-03T08:00:00.000Z'],
    ['known', 1, '2026-09-03T08:00:00.000Z'],
  ] as const)('schedules %s from a new word', (rating, stage, dueAt) => {
    const next = scheduleReview(undefined, rating, NOW, 'allocate');

    expect(next).toMatchObject({
      wordId: 'allocate',
      stage,
      dueAt,
      lastRating: rating,
      reviewCount: 1,
      firstLearnedAt: '2026-09-02T08:00:00.000Z',
      lastReviewedAt: '2026-09-02T08:00:00.000Z',
      consecutiveKnown: rating === 'known' ? 1 : 0,
      mastered: false,
    });
  });

  it.each([
    [0, 1, '2026-09-03T08:00:00.000Z'],
    [1, 2, '2026-09-05T08:00:00.000Z'],
    [2, 3, '2026-09-09T08:00:00.000Z'],
    [3, 4, '2026-09-16T08:00:00.000Z'],
    [4, 5, '2026-09-16T08:00:00.000Z'],
  ] as const)('uses the hard interval for stage %d', (stage, nextStage, dueAt) => {
    const next = scheduleReview(progress({ stage }), 'hard', NOW);

    expect(next).toMatchObject({ stage: nextStage, dueAt });
  });

  it.each([
    [0, 1, '2026-09-03T08:00:00.000Z'],
    [1, 2, '2026-09-05T08:00:00.000Z'],
    [2, 3, '2026-09-09T08:00:00.000Z'],
    [3, 4, '2026-09-16T08:00:00.000Z'],
    [4, 5, '2026-10-02T08:00:00.000Z'],
    [5, 6, '2026-10-02T08:00:00.000Z'],
  ] as const)('uses the known interval for stage %d', (stage, nextStage, dueAt) => {
    const next = scheduleReview(progress({ stage }), 'known', NOW);

    expect(next).toMatchObject({ stage: nextStage, dueAt });
  });

  it('marks stage four mastered after two consecutive known ratings', () => {
    const current = progress({ stage: 3, consecutiveKnown: 1 });

    expect(scheduleReview(current, 'known', NOW)).toMatchObject({
      stage: 4,
      consecutiveKnown: 2,
      mastered: true,
    });
  });

  it('again cancels mastery and resets the stage', () => {
    const current = progress({ stage: 5, mastered: true, consecutiveKnown: 6 });

    expect(scheduleReview(current, 'again', NOW)).toMatchObject({
      stage: 0,
      mastered: false,
      consecutiveKnown: 0,
      dueAt: '2026-09-03T08:00:00.000Z',
    });
  });

  it('preserves the initial learning date and does not mutate current progress', () => {
    const current = progress();
    const snapshot = { ...current };

    const next = scheduleReview(current, 'known', NOW);

    expect(next).toMatchObject({
      firstLearnedAt: '2026-08-01T08:00:00.000Z',
      lastReviewedAt: '2026-09-02T08:00:00.000Z',
      reviewCount: 5,
    });
    expect(current).toEqual(snapshot);
  });

  it('uses UTC millisecond arithmetic across a year boundary', () => {
    const reviewedAt = new Date('2026-12-31T23:30:00.000Z');

    expect(scheduleReview(progress(), 'known', reviewedAt)).toMatchObject({
      dueAt: '2027-01-01T23:30:00.000Z',
    });
  });
});
