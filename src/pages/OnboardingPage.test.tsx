import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { VocabularyEntry } from '../features/vocabulary/types';
import type { StorageRepository } from '../lib/storage/types';
import { App } from '../app/App';

function entries(count: number): VocabularyEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `word-${index}`,
    word: `word${index}`,
    phonetic: `/word${index}/`,
    partOfSpeech: 'noun',
    definitionZh: '测试释义',
    example: `A sentence with word${index}.`,
    exampleZh: '测试例句。',
    tags: ['academic'],
    level: 'ielts-6-6.5',
  }));
}

function repository(
  overrides: Partial<StorageRepository> = {},
): StorageRepository {
  return {
    getSettings: vi.fn().mockResolvedValue({
      dailyGoal: 20,
      autoSpeak: false,
      onboardingComplete: false,
    }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getProgress: vi.fn().mockResolvedValue(undefined),
    getAllProgress: vi.fn().mockResolvedValue([]),
    getDailyStats: vi.fn().mockResolvedValue(undefined),
    getAllDailyStats: vi.fn().mockResolvedValue([]),
    saveReview: vi.fn().mockResolvedValue(undefined),
    replaceAll: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    ...overrides,
  };
}

describe('OnboardingPage', () => {
  it('saves the selected goal and enters the today page', async () => {
    const storage = repository();

    render(
      <MemoryRouter>
        <App
          repository={storage}
          vocabulary={entries(15)}
          now={() => new Date('2026-09-02T08:00:00.000Z')}
          utcOffsetMinutes={() => 0}
        />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('radio', { name: '每天 10 个' }));
    fireEvent.click(screen.getByRole('button', { name: '开始学习' }));

    await waitFor(() => {
      expect(storage.saveSettings).toHaveBeenCalledWith({
        dailyGoal: 10,
        autoSpeak: false,
        onboardingComplete: true,
      });
    });
    expect(await screen.findByRole('heading', { name: '今日学习' })).toBeVisible();
    expect(screen.getByText('10', { selector: '[data-stat="new"]' })).toBeVisible();
  });

  it('shows an explanation page when opening browser storage fails', async () => {
    const storage = repository({
      getSettings: vi.fn().mockRejectedValue(new Error('IndexedDB unavailable')),
    });

    render(
      <MemoryRouter>
        <App repository={storage} vocabulary={[]} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '无法打开本地存储' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '开始学习' })).not.toBeInTheDocument();
  });
});
