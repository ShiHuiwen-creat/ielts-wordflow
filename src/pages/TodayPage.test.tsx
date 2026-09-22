import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { WordProgress } from '../features/scheduler/types';
import type { VocabularyEntry } from '../features/vocabulary/types';
import type { AppSettings, DailyStats, StorageRepository } from '../lib/storage/types';
import { App } from '../app/App';

const NOW = new Date('2026-09-02T08:00:00.000Z');
const SETTINGS: AppSettings = {
  dailyGoal: 10,
  autoSpeak: false,
  onboardingComplete: true,
};

function entry(id: string, word: string): VocabularyEntry {
  return {
    id,
    word,
    phonetic: `/${word}/`,
    partOfSpeech: 'verb',
    definitionZh: `${word} 的释义`,
    example: `We can ${word} this example.`,
    exampleZh: '示例翻译。',
    tags: ['academic'],
    level: 'ielts-6-6.5',
  };
}

function progress(
  wordId: string,
  dueAt: string,
  mastered = false,
): WordProgress {
  return {
    wordId,
    firstLearnedAt: '2026-08-20T08:00:00.000Z',
    lastReviewedAt: '2026-09-01T08:00:00.000Z',
    dueAt,
    stage: mastered ? 4 : 2,
    consecutiveKnown: mastered ? 2 : 1,
    reviewCount: 3,
    lastRating: 'known',
    mastered,
  };
}

function stats(date: string, newLearned: number, reviews: number): DailyStats {
  return {
    date,
    newLearned,
    reviews,
    again: 0,
    hard: 0,
    known: newLearned + reviews,
  };
}

function repository(options: {
  progress: WordProgress[];
  dailyStats?: DailyStats[];
}): StorageRepository {
  return {
    getSettings: vi.fn().mockResolvedValue(SETTINGS),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getProgress: vi.fn().mockResolvedValue(undefined),
    getAllProgress: vi.fn().mockResolvedValue(options.progress),
    getDailyStats: vi.fn().mockResolvedValue(undefined),
    getAllDailyStats: vi.fn().mockResolvedValue(options.dailyStats ?? []),
    saveReview: vi.fn().mockResolvedValue(undefined),
    replaceAll: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
}

function renderToday(storage: StorageRepository, vocabulary: VocabularyEntry[]) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App
        repository={storage}
        vocabulary={vocabulary}
        now={() => NOW}
        utcOffsetMinutes={() => 0}
      />
    </MemoryRouter>,
  );
}

describe('TodayPage', () => {
  it('shows the real daily queue counts and progress summary', async () => {
    const vocabulary = [
      entry('allocate', 'allocate'),
      entry('coherent', 'coherent'),
      entry('derive', 'derive'),
    ];
    const storage = repository({
      progress: [
        progress('allocate', '2026-09-02T07:00:00.000Z'),
        progress('coherent', '2026-09-04T07:00:00.000Z', true),
        progress('retired-word', '2026-09-04T07:00:00.000Z', true),
      ],
      dailyStats: [
        stats('2026-08-31', 1, 0),
        stats('2026-09-01', 0, 2),
        stats('2026-09-02', 9, 0),
      ],
    });

    renderToday(storage, vocabulary);

    expect(await screen.findByRole('heading', { name: '今日学习' })).toBeVisible();
    expect(screen.getByText('1', { selector: '[data-stat="review"]' })).toBeVisible();
    expect(screen.getByText('1', { selector: '[data-stat="new"]' })).toBeVisible();
    expect(screen.getByText('连续 3 天')).toBeVisible();
    expect(screen.getByText('已掌握 1 个')).toBeVisible();
    expect(screen.getByRole('link', { name: '开始今日学习' })).toHaveAttribute('href', '/study');
  });

  it('shows a clear all-done state when the real queue is empty', async () => {
    const vocabulary = [entry('allocate', 'allocate')];
    const storage = repository({
      progress: [progress('allocate', '2026-09-04T07:00:00.000Z', true)],
    });

    renderToday(storage, vocabulary);

    expect(await screen.findByRole('heading', { name: '今天的任务完成啦' })).toBeVisible();
    expect(screen.queryByRole('link', { name: '开始今日学习' })).not.toBeInTheDocument();
  });
});
