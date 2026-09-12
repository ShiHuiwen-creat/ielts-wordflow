import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import type { WordProgress } from '../features/scheduler/types';
import type { VocabularyEntry } from '../features/vocabulary/types';
import type { DailyStats, StorageRepository } from '../lib/storage/types';

const vocabulary: VocabularyEntry[] = Array.from({ length: 4 }, (_, index) => ({
  id: `word-${index}`,
  word: `word${index}`,
  phonetic: `/word${index}/`,
  partOfSpeech: 'n.',
  definitionZh: '释义',
  example: 'Example.',
  exampleZh: '例句。',
  tags: ['academic'],
  level: 'ielts-6-6.5',
}));

function progress(wordId: string, mastered: boolean): WordProgress {
  return {
    wordId,
    firstLearnedAt: '2026-08-20T08:00:00.000Z',
    lastReviewedAt: '2026-09-01T08:00:00.000Z',
    dueAt: '2026-09-03T08:00:00.000Z',
    stage: mastered ? 4 : 2,
    consecutiveKnown: mastered ? 2 : 1,
    reviewCount: 3,
    lastRating: 'known',
    mastered,
  };
}

function stats(
  date: string,
  total: number,
  feedback: Pick<DailyStats, 'again' | 'hard' | 'known'> = { again: 0, hard: 0, known: 0 },
): DailyStats {
  return {
    date,
    newLearned: total,
    reviews: 0,
    ...feedback,
  };
}

function repository(): StorageRepository {
  return {
    getSettings: vi.fn().mockResolvedValue({
      dailyGoal: 20,
      autoSpeak: false,
      onboardingComplete: true,
    }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getProgress: vi.fn().mockResolvedValue(undefined),
    getAllProgress: vi.fn().mockResolvedValue([
      progress('word-0', true),
      progress('word-1', false),
    ]),
    getDailyStats: vi.fn().mockResolvedValue(undefined),
    getAllDailyStats: vi.fn().mockResolvedValue([
      stats('2026-08-27', 1),
      stats('2026-08-28', 2),
      stats('2026-08-29', 3),
      stats('2026-08-30', 4),
      stats('2026-08-31', 5),
      stats('2026-09-01', 6, { again: 2, hard: 1, known: 3 }),
      stats('2026-09-02', 7, { again: 1, hard: 2, known: 4 }),
    ]),
    saveReview: vi.fn().mockResolvedValue(undefined),
    replaceAll: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
}

describe('StatsPage', () => {
  it('shows seven labeled days, visible chart values, feedback totals, and mastery progress', async () => {
    render(
      <MemoryRouter initialEntries={['/stats']}>
        <App
          repository={repository()}
          vocabulary={vocabulary}
          now={() => new Date('2026-09-02T08:00:00.000Z')}
          utcOffsetMinutes={() => 0}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '学习统计' })).toBeVisible();
    expect(screen.getByText('今日完成 7 个')).toBeVisible();
    expect(screen.getByText('已掌握 1 / 4')).toBeVisible();

    const chart = screen.getByRole('figure', { name: '近 7 天学习量' });
    const days = within(chart).getAllByRole('listitem');
    expect(days).toHaveLength(7);
    expect(days.map((day) => day.textContent)).toEqual([
      '8月27日1 个',
      '8月28日2 个',
      '8月29日3 个',
      '8月30日4 个',
      '8月31日5 个',
      '9月1日6 个',
      '9月2日7 个',
    ]);
    expect(within(chart).getByText('9月2日')).toHaveAttribute('datetime', '2026-09-02');

    const feedback = screen.getByRole('region', { name: '累计反馈分布' });
    expect(within(feedback).getByText('不认识 3 次')).toBeVisible();
    expect(within(feedback).getByText('模糊 3 次')).toBeVisible();
    expect(within(feedback).getByText('认识 7 次')).toBeVisible();
  });
});
