import { describe, expect, it } from 'vitest';
import { buildDailyQueue } from './buildDailyQueue';
import type { VocabularyEntry } from '../vocabulary/types';
import type { WordProgress } from '../scheduler/types';

function entry(id: string): VocabularyEntry {
  return {
    id,
    word: id,
    phonetic: '/test/',
    partOfSpeech: 'noun',
    definitionZh: '测试',
    example: 'A test example.',
    exampleZh: '一个测试示例。',
    tags: ['test'],
    level: 'ielts-6-6.5',
  };
}

function progress(wordId: string, dueAt: string): WordProgress {
  return {
    wordId,
    firstLearnedAt: '2026-08-01T08:00:00.000Z',
    lastReviewedAt: '2026-09-01T08:00:00.000Z',
    dueAt,
    stage: 1,
    consecutiveKnown: 1,
    reviewCount: 1,
    lastRating: 'known',
    mastered: false,
  };
}

function unseen(count: number): VocabularyEntry[] {
  return Array.from({ length: count }, (_, index) => entry(`unseen-${index + 1}`));
}

describe('buildDailyQueue', () => {
  it('puts due reviews before unseen words and sorts reviews by due time', () => {
    const entries = [entry('unseen-1'), entry('due-later'), entry('due-earlier'), entry('unseen-2')];
    const reviewProgress = [
      progress('due-later', '2026-09-02T20:00:00.000Z'),
      progress('due-earlier', '2026-09-01T20:00:00.000Z'),
    ];

    const queue = buildDailyQueue({
      entries,
      progress: reviewProgress,
      today: '2026-09-02',
      goal: 10,
      newLearnedToday: 0,
    });

    expect(queue.map(({ wordId, kind }) => [wordId, kind])).toEqual([
      ['due-earlier', 'review'],
      ['due-later', 'review'],
      ['unseen-1', 'new'],
      ['unseen-2', 'new'],
    ]);
  });

  it('subtracts words already introduced today from the new-word goal', () => {
    expect(
      buildDailyQueue({
        entries: unseen(20),
        progress: [],
        today: '2026-09-02',
        goal: 10,
        newLearnedToday: 8,
      }),
    ).toHaveLength(2);
  });

  it('does not queue a word more than once when entries or progress contain duplicates', () => {
    const entries = [entry('due'), entry('due'), entry('new'), entry('new')];
    const reviewProgress = [
      progress('due', '2026-09-01T00:00:00.000Z'),
      progress('due', '2026-09-02T12:00:00.000Z'),
    ];

    const queue = buildDailyQueue({
      entries,
      progress: reviewProgress,
      today: '2026-09-02',
      goal: 10,
      newLearnedToday: 0,
    });

    expect(queue.map((item) => item.wordId)).toEqual(['due', 'new']);
  });

  it('excludes progress that is not due by the end of the supplied local day', () => {
    const queue = buildDailyQueue({
      entries: [entry('due-at-day-end'), entry('tomorrow')],
      progress: [
        progress('due-at-day-end', '2026-09-02T23:59:59.999Z'),
        progress('tomorrow', '2026-09-03T00:00:00.000Z'),
      ],
      today: '2026-09-02',
      goal: 10,
      newLearnedToday: 0,
    });

    expect(queue).toEqual([{ wordId: 'due-at-day-end', kind: 'review' }]);
  });

  it('returns an empty queue when no review is due and the new-word goal is exhausted', () => {
    expect(
      buildDailyQueue({
        entries: unseen(2),
        progress: [],
        today: '2026-09-02',
        goal: 10,
        newLearnedToday: 10,
      }),
    ).toEqual([]);
  });

  it('keeps unseen vocabulary in source order and does not mutate inputs', () => {
    const entries = [entry('third'), entry('first'), entry('second')];
    const reviewProgress = [progress('future', '2026-09-03T00:00:00.000Z')];
    const entriesSnapshot = structuredClone(entries);
    const progressSnapshot = structuredClone(reviewProgress);

    const queue = buildDailyQueue({
      entries,
      progress: reviewProgress,
      today: '2026-09-02',
      goal: 20,
      newLearnedToday: 0,
    });

    expect(queue.map((item) => item.wordId)).toEqual(['third', 'first', 'second']);
    expect(entries).toEqual(entriesSnapshot);
    expect(reviewProgress).toEqual(progressSnapshot);
  });
});
