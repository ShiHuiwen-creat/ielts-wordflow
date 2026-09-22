import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WordProgress } from '../features/scheduler/types';
import type { VocabularyEntry } from '../features/vocabulary/types';
import type { DailyStats, StorageRepository } from '../lib/storage/types';
import { App } from './App';

const vocabulary: VocabularyEntry[] = [{
  id: 'allocate',
  word: 'allocate',
  phonetic: '/ˈæləkeɪt/',
  partOfSpeech: 'verb',
  definitionZh: '分配',
  example: 'They allocate funds to schools.',
  exampleZh: '他们向学校分配资金。',
  tags: ['academic'],
  level: 'ielts-6-6.5',
}];

function dayStats(date: string): DailyStats {
  return { date, newLearned: 10, reviews: 0, again: 0, hard: 0, known: 10 };
}

function repository(): StorageRepository {
  return {
    getSettings: vi.fn().mockResolvedValue({
      dailyGoal: 10,
      autoSpeak: false,
      onboardingComplete: true,
    }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getProgress: vi.fn().mockResolvedValue(undefined),
    getAllProgress: vi.fn().mockResolvedValue([]),
    getDailyStats: vi.fn().mockResolvedValue(undefined),
    getAllDailyStats: vi.fn().mockResolvedValue([dayStats('2026-09-02')]),
    saveReview: vi.fn().mockResolvedValue(undefined),
    replaceAll: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
}

function mount(
  now: () => Date,
  storage: StorageRepository,
  utcOffsetMinutes: () => number = () => 480,
  initialEntry = '/',
) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App
        repository={storage}
        vocabulary={vocabulary}
        now={now}
        utcOffsetMinutes={utcOffsetMinutes}
      />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('mounted app date rollover', () => {
  it('refreshes at local midnight, starts the new-day queue, and saves to the new date', async () => {
    vi.useFakeTimers();
    let current = new Date('2026-09-02T15:59:59.900Z');
    const storage = repository();
    mount(() => current, storage);

    await act(async () => Promise.resolve());
    expect(screen.getByRole('heading', { name: '今天的任务完成啦' })).toBeVisible();

    current = new Date('2026-09-02T16:00:00.000Z');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: '还有 1 个词' })).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: '开始今日学习' }));
    fireEvent.click(screen.getByRole('button', { name: '查看答案' }));
    fireEvent.click(screen.getByRole('button', { name: /^认识$/ }));
    await act(async () => Promise.resolve());

    expect(storage.saveReview).toHaveBeenCalledWith(
      expect.objectContaining({ wordId: 'allocate' }),
      '2026-09-03',
    );
  });

  it.each(['focus', 'visibilitychange'])('refreshes the mounted dashboard on %s', async (eventName) => {
    let current = new Date('2026-09-02T15:00:00.000Z');
    const storage = repository();
    mount(() => current, storage);
    expect(await screen.findByRole('heading', { name: '今天的任务完成啦' })).toBeVisible();

    current = new Date('2026-09-02T16:00:00.000Z');
    await act(async () => {
      (eventName === 'focus' ? window : document).dispatchEvent(new Event(eventName));
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: '还有 1 个词' })).toBeVisible();
  });

  it('rechecks the local date through an offset change instead of relying on a 24-hour day', async () => {
    vi.useFakeTimers();
    let current = new Date('2026-03-08T06:59:00.000Z');
    let offset = -300;
    const storage = repository();
    vi.mocked(storage.getAllDailyStats).mockResolvedValue([dayStats('2026-03-08')]);
    mount(() => current, storage, () => offset);

    await act(async () => Promise.resolve());
    expect(screen.getByRole('heading', { name: '今天的任务完成啦' })).toBeVisible();

    current = new Date('2026-03-08T07:00:00.000Z');
    offset = -240;
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(screen.getByRole('heading', { name: '今天的任务完成啦' })).toBeVisible();

    current = new Date('2026-03-09T04:00:00.000Z');
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(screen.getByRole('heading', { name: '还有 1 个词' })).toBeVisible();
  });

  it('reconciles a new-day session after a pre-midnight save finishes', async () => {
    vi.useFakeTimers();
    let current = new Date('2026-09-02T15:59:59.900Z');
    let finishSave!: () => void;
    const pendingSave = new Promise<void>((resolve) => {
      finishSave = resolve;
    });
    const initialProgress: WordProgress = {
      wordId: 'allocate',
      firstLearnedAt: '2026-08-31T00:00:00.000Z',
      lastReviewedAt: '2026-09-01T00:00:00.000Z',
      dueAt: '2026-09-02T00:00:00.000Z',
      stage: 1,
      consecutiveKnown: 1,
      reviewCount: 1,
      lastRating: 'known',
      mastered: false,
    };
    let progress = initialProgress;
    const storage = repository();
    vi.mocked(storage.getProgress).mockImplementation(async () => progress);
    vi.mocked(storage.getAllProgress).mockImplementation(async () => [progress]);
    vi.mocked(storage.getAllDailyStats).mockResolvedValue([]);
    vi.mocked(storage.saveReview).mockImplementation(async (nextProgress) => {
      await pendingSave;
      progress = nextProgress;
    });
    mount(() => current, storage, () => 480, '/study');

    await act(async () => Promise.resolve());
    expect(screen.getByRole('heading', { name: 'allocate' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '查看答案' }));
    fireEvent.click(screen.getByRole('button', { name: /^认识$/ }));
    expect(screen.getByText('正在保存本次反馈…')).toBeVisible();

    current = new Date('2026-09-02T16:00:00.000Z');
    await act(async () => vi.advanceTimersByTimeAsync(100));
    expect(screen.getByRole('heading', { name: 'allocate' })).toBeVisible();

    await act(async () => {
      finishSave();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: '本轮学习完成' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'allocate' })).not.toBeInTheDocument();
  });
});
