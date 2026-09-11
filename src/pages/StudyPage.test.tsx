import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import type { VocabularyEntry } from '../features/vocabulary/types';
import type { AppSettings, StorageRepository } from '../lib/storage/types';

const NOW = new Date('2026-09-02T23:30:00.000Z');
const SETTINGS: AppSettings = {
  dailyGoal: 10,
  autoSpeak: false,
  onboardingComplete: true,
};

function entry(id: string): VocabularyEntry {
  return {
    id,
    word: id,
    phonetic: `/ˈ${id}/`,
    partOfSpeech: 'verb',
    definitionZh: `${id} 的中文释义`,
    example: `This is the ${id} example.`,
    exampleZh: `这是 ${id} 的例句翻译。`,
    tags: ['academic'],
    level: 'ielts-6-6.5',
  };
}

function repository(): StorageRepository {
  return {
    getSettings: vi.fn().mockResolvedValue(SETTINGS),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getProgress: vi.fn().mockResolvedValue(undefined),
    getAllProgress: vi.fn().mockResolvedValue([]),
    getDailyStats: vi.fn().mockResolvedValue(undefined),
    getAllDailyStats: vi.fn().mockResolvedValue([]),
    saveReview: vi.fn().mockResolvedValue(undefined),
    replaceAll: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
}

function renderStudy(storage: StorageRepository, entries = [entry('allocate'), entry('coherent')]) {
  render(
    <MemoryRouter initialEntries={['/study']}>
      <App
        repository={storage}
        vocabulary={entries}
        now={() => NOW}
        utcOffsetMinutes={() => 480}
      />
    </MemoryRouter>,
  );
}

async function revealAndRate(rating: '不认识' | '模糊' | '认识') {
  fireEvent.click(screen.getByRole('button', { name: '查看答案' }));
  fireEvent.click(screen.getByRole('button', { name: rating }));
  await waitFor(() => expect(screen.queryByText('正在保存本次反馈…')).not.toBeInTheDocument());
}

describe('StudyPage', () => {
  it('keeps ratings absent until revealing every answer field', async () => {
    renderStudy(repository());

    expect(await screen.findByRole('heading', { name: 'allocate' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '不认识' })).not.toBeInTheDocument();
    expect(screen.queryByText('/ˈallocate/')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看答案' }));

    expect(screen.getByText('/ˈallocate/')).toBeVisible();
    expect(screen.getByText('verb')).toBeVisible();
    expect(screen.getByText('allocate 的中文释义')).toBeVisible();
    expect(screen.getByText('This is the allocate example.')).toBeVisible();
    expect(screen.getByText('这是 allocate 的例句翻译。')).toBeVisible();
    expect(screen.getByRole('button', { name: '不认识' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '模糊' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '认识' })).toBeEnabled();
  });

  it('disables every rating while saving and ignores a double submission', async () => {
    let finishSave!: () => void;
    const pendingSave = new Promise<void>((resolve) => {
      finishSave = resolve;
    });
    const storage = repository();
    vi.mocked(storage.saveReview).mockReturnValue(pendingSave);
    renderStudy(storage);
    await screen.findByRole('heading', { name: 'allocate' });
    fireEvent.click(screen.getByRole('button', { name: '查看答案' }));

    const known = screen.getByRole('button', { name: '认识' });
    fireEvent.click(known);

    expect(screen.getByText('正在保存本次反馈…')).toBeVisible();
    expect(screen.getByRole('button', { name: '不认识' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '模糊' })).toBeDisabled();
    expect(known).toBeDisabled();
    await waitFor(() => expect(storage.saveReview).toHaveBeenCalledOnce());
    fireEvent.click(known);
    expect(storage.saveReview).toHaveBeenCalledOnce();

    await act(async () => finishSave());
    expect(await screen.findByRole('heading', { name: 'coherent' })).toBeVisible();
  });

  it('shows a recoverable Chinese error and retains the exact revealed card after failure', async () => {
    const storage = repository();
    vi.mocked(storage.saveReview).mockRejectedValue(new Error('quota exceeded'));
    renderStudy(storage);
    await screen.findByRole('heading', { name: 'allocate' });
    fireEvent.click(screen.getByRole('button', { name: '查看答案' }));

    fireEvent.click(screen.getByRole('button', { name: '认识' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败，请重试。当前单词尚未提交。');
    expect(screen.getByRole('heading', { name: 'allocate' })).toBeVisible();
    expect(screen.getByText('allocate 的中文释义')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'coherent' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '认识' })).toBeEnabled();
  });

  it('shows all three exact feedback counts in the final session summary', async () => {
    renderStudy(repository(), [entry('allocate'), entry('coherent'), entry('derive')]);
    await screen.findByRole('heading', { name: 'allocate' });

    await revealAndRate('不认识');
    await revealAndRate('模糊');
    await revealAndRate('认识');
    await revealAndRate('认识');

    expect(await screen.findByRole('heading', { name: '本轮学习完成' })).toBeVisible();
    expect(screen.getByText('1', { selector: '[data-summary="again"]' })).toBeVisible();
    expect(screen.getByText('1', { selector: '[data-summary="hard"]' })).toBeVisible();
    expect(screen.getByText('2', { selector: '[data-summary="known"]' })).toBeVisible();
    expect(screen.getByRole('link', { name: '返回今日页' })).toHaveAttribute('href', '/');
  });

  it('passes the dashboard local date key to persistence', async () => {
    const storage = repository();
    renderStudy(storage, [entry('allocate')]);
    await screen.findByRole('heading', { name: 'allocate' });

    await revealAndRate('认识');

    expect(storage.saveReview).toHaveBeenCalledWith(expect.any(Object), '2026-09-03');
  });
});
