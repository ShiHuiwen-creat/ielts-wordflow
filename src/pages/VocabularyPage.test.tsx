import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import type { WordProgress } from '../features/scheduler/types';
import type { VocabularyEntry } from '../features/vocabulary/types';
import type { StorageRepository } from '../lib/storage/types';

const vocabulary: VocabularyEntry[] = [
  {
    id: 'allocate',
    word: 'Allocate',
    phonetic: '/ˈæləkeɪt/',
    partOfSpeech: 'verb',
    definitionZh: '分配资源',
    example: 'We allocate time carefully.',
    exampleZh: '我们认真分配时间。',
    tags: ['academic'],
    level: 'ielts-6-6.5',
  },
  {
    id: 'coherent',
    word: 'Coherent',
    phonetic: '/kəʊˈhɪərənt/',
    partOfSpeech: 'adjective',
    definitionZh: '连贯的；条理清楚的',
    example: 'Her argument is coherent.',
    exampleZh: '她的论点很连贯。',
    tags: ['education'],
    level: 'ielts-6-6.5',
  },
  {
    id: 'derive',
    word: 'Derive',
    phonetic: '/dɪˈraɪv/',
    partOfSpeech: 'verb',
    definitionZh: '获得；源自',
    example: 'The term derives from Latin.',
    exampleZh: '这个词源自拉丁语。',
    tags: ['academic'],
    level: 'ielts-6-6.5',
  },
];

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
      progress('coherent', false),
      progress('derive', true),
    ]),
    getDailyStats: vi.fn().mockResolvedValue(undefined),
    getAllDailyStats: vi.fn().mockResolvedValue([]),
    saveReview: vi.fn().mockResolvedValue(undefined),
    replaceAll: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
}

describe('VocabularyPage', () => {
  it('searches real fixtures, filters by status, and opens a word detail route', async () => {
    render(
      <MemoryRouter initialEntries={['/vocabulary']}>
        <App repository={repository()} vocabulary={vocabulary} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '词库' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Allocate/ })).toBeVisible();
    expect(screen.getByRole('link', { name: /Coherent/ })).toBeVisible();
    expect(screen.getByRole('link', { name: /Derive/ })).toBeVisible();

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索单词或中文释义' }), {
      target: { value: '条理' },
    });
    expect(screen.queryByRole('link', { name: /Allocate/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Coherent/ })).toBeVisible();

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索单词或中文释义' }), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: '学习状态' }), {
      target: { value: 'mastered' },
    });
    expect(screen.getByRole('link', { name: /Derive/ })).toBeVisible();
    expect(screen.queryByRole('link', { name: /Coherent/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Derive/ }));

    expect(await screen.findByRole('heading', { name: 'Derive' })).toBeVisible();
    expect(screen.getByText('/dɪˈraɪv/')).toBeVisible();
    expect(screen.getByText('获得；源自')).toBeVisible();
    expect(screen.getByText('The term derives from Latin.')).toBeVisible();
    expect(screen.getByText('这个词源自拉丁语。')).toBeVisible();
    expect(screen.getByText('已掌握')).toBeVisible();
    expect(screen.getByRole('link', { name: '返回词库' })).toHaveAttribute('href', '/vocabulary');
  });

  it('shows an explicit empty state when no words match', async () => {
    render(
      <MemoryRouter initialEntries={['/vocabulary']}>
        <App repository={repository()} vocabulary={vocabulary} />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByRole('searchbox', { name: '搜索单词或中文释义' }), {
      target: { value: '不存在的词' },
    });

    expect(screen.getByRole('status')).toHaveTextContent('没有找到符合条件的单词');
  });
});
