import { describe, expect, it, vi } from 'vitest';
import type { StudySessionState } from '../features/study-session/types';
import type { WordProgress } from '../features/scheduler/types';
import type { StorageRepository } from '../lib/storage/types';
import { createStudyService } from './studyService';

const NOW = new Date('2026-09-02T23:30:00.000Z');
const DATE_KEY = '2026-09-03';

function initialSession(): StudySessionState {
  const queue = [
    { wordId: 'allocate', kind: 'review' as const },
    { wordId: 'coherent', kind: 'new' as const },
  ];

  return {
    queue,
    current: queue[0],
    isAnswerRevealed: true,
    summary: { again: 0, hard: 0, known: 0 },
  };
}

function storedProgress(): WordProgress {
  return {
    wordId: 'allocate',
    firstLearnedAt: '2026-08-01T08:00:00.000Z',
    lastReviewedAt: '2026-09-01T08:00:00.000Z',
    dueAt: '2026-09-02T08:00:00.000Z',
    stage: 1,
    consecutiveKnown: 1,
    reviewCount: 2,
    lastRating: 'known',
    mastered: false,
  };
}

function repository(progress: WordProgress | undefined): StorageRepository {
  return {
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    getProgress: vi.fn().mockResolvedValue(progress),
    getAllProgress: vi.fn(),
    getDailyStats: vi.fn(),
    getAllDailyStats: vi.fn(),
    saveReview: vi.fn().mockResolvedValue(undefined),
    replaceAll: vi.fn(),
    close: vi.fn(),
  };
}

describe('createStudyService', () => {
  it('keeps the exact current card when persistence fails', async () => {
    const storage = repository(storedProgress());
    vi.mocked(storage.saveReview).mockRejectedValue(new Error('quota exceeded'));
    const session = initialSession();
    const service = createStudyService({
      repository: storage,
      initialSession: session,
      reviewDate: DATE_KEY,
    });

    await expect(service.rateCurrent('known', NOW)).rejects.toThrow('quota exceeded');

    expect(service.getState()).toBe(session);
    expect(service.getState().current).toBe(session.current);
    expect(service.getState().summary).toEqual({ again: 0, hard: 0, known: 0 });
  });

  it('persists the scheduled review with the explicit local date before advancing once', async () => {
    const previous = storedProgress();
    const storage = repository(previous);
    const service = createStudyService({
      repository: storage,
      initialSession: initialSession(),
      reviewDate: DATE_KEY,
    });

    await service.rateCurrent('hard', NOW);

    expect(storage.saveReview).toHaveBeenCalledOnce();
    expect(storage.saveReview).toHaveBeenCalledWith(
      expect.objectContaining({
        wordId: 'allocate',
        lastRating: 'hard',
        reviewCount: 3,
        lastReviewedAt: NOW.toISOString(),
      }),
      DATE_KEY,
    );
    expect(service.getState()).toMatchObject({
      current: { wordId: 'coherent', kind: 'new' },
      summary: { again: 0, hard: 1, known: 0 },
      isAnswerRevealed: false,
    });
  });

  it('schedules an unseen current word without existing progress', async () => {
    const storage = repository(undefined);
    const session: StudySessionState = {
      queue: [{ wordId: 'coherent', kind: 'new' }],
      current: { wordId: 'coherent', kind: 'new' },
      isAnswerRevealed: true,
      summary: { again: 0, hard: 0, known: 0 },
    };
    const service = createStudyService({
      repository: storage,
      initialSession: session,
      reviewDate: DATE_KEY,
    });

    await service.rateCurrent('known', NOW);

    expect(storage.saveReview).toHaveBeenCalledWith(
      expect.objectContaining({ wordId: 'coherent', reviewCount: 1, lastRating: 'known' }),
      DATE_KEY,
    );
    expect(service.getState().current).toBeUndefined();
    expect(service.getState().summary.known).toBe(1);
  });
});
