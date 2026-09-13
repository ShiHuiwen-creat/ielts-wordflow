import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import type { WordProgress } from '../features/scheduler/types';
import type { VocabularyEntry } from '../features/vocabulary/types';
import type { AppSettings, DailyStats, StorageRepository } from '../lib/storage/types';

const NOW = new Date('2026-09-02T23:30:00.000Z');
const SETTINGS: AppSettings = {
  dailyGoal: 10,
  autoSpeak: false,
  onboardingComplete: true,
};
const originalSynthesis = window.speechSynthesis;
const originalUtterance = window.SpeechSynthesisUtterance;

function voice(name: string, lang: string): SpeechSynthesisVoice {
  return {
    default: false,
    lang,
    localService: true,
    name,
    voiceURI: name,
  };
}

function installDeferredSpeech() {
  let voices: SpeechSynthesisVoice[] = [];
  const synthesis = Object.assign(new EventTarget(), {
    cancel: vi.fn(),
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
  });

  class FakeUtterance {
    lang = '';
    voice: SpeechSynthesisVoice | null = null;

    constructor(public text: string) {}
  }

  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: FakeUtterance,
  });

  return {
    loadVoices(nextVoices: SpeechSynthesisVoice[]) {
      voices = nextVoices;
      synthesis.dispatchEvent(new Event('voiceschanged'));
    },
  };
}

function installSpeechDuringSubscription() {
  const englishVoice = voice('UK English', 'en-GB');
  let reads = 0;
  const synthesis = Object.assign(new EventTarget(), {
    cancel: vi.fn(),
    getVoices: vi.fn(() => {
      reads += 1;
      return reads === 1 ? [] : [englishVoice];
    }),
    speak: vi.fn(),
  });

  class FakeUtterance {
    lang = '';
    voice: SpeechSynthesisVoice | null = null;

    constructor(public text: string) {}
  }

  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: FakeUtterance,
  });
}

afterEach(() => {
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: originalSynthesis,
  });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: originalUtterance,
  });
});

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

function persistentRepository(): StorageRepository {
  const progressByWord = new Map<string, WordProgress>();
  const dailyStatsByDate = new Map<string, DailyStats>();
  const storage = repository();

  vi.mocked(storage.getProgress).mockImplementation(async (wordId) => progressByWord.get(wordId));
  vi.mocked(storage.getAllProgress).mockImplementation(async () => [...progressByWord.values()]);
  vi.mocked(storage.getAllDailyStats).mockImplementation(async () => [...dailyStatsByDate.values()]);
  vi.mocked(storage.saveReview).mockImplementation(async (progress, date = progress.lastReviewedAt.slice(0, 10)) => {
    const wasLearned = progressByWord.has(progress.wordId);
    const current = dailyStatsByDate.get(date) ?? {
      date,
      newLearned: 0,
      reviews: 0,
      again: 0,
      hard: 0,
      known: 0,
    };

    progressByWord.set(progress.wordId, progress);
    dailyStatsByDate.set(date, {
      ...current,
      newLearned: current.newLearned + (wasLearned ? 0 : 1),
      reviews: current.reviews + (wasLearned ? 1 : 0),
      [progress.lastRating]: current[progress.lastRating] + 1,
    });
  });

  return storage;
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
  it('rechecks speech after subscribing so a voice loaded during setup is not missed', async () => {
    installSpeechDuringSubscription();
    renderStudy(repository());

    const speakButton = await screen.findByRole('button', { name: '朗读单词 allocate' });
    await waitFor(() => expect(speakButton).toBeEnabled());
  });

  it('enables speech when an English voice loads after the study card', async () => {
    const speech = installDeferredSpeech();
    renderStudy(repository());

    const speakButton = await screen.findByRole('button', { name: '朗读单词 allocate' });
    expect(speakButton).toBeDisabled();
    expect(screen.getByText('暂无可用英语发音，仍可继续学习。')).toBeVisible();

    act(() => speech.loadVoices([voice('UK English', 'en-GB')]));

    expect(speakButton).toBeEnabled();
    expect(screen.queryByText('暂无可用英语发音，仍可继续学习。')).not.toBeInTheDocument();
  });

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

  it('retries a failed write, then persists and advances the retained card exactly once', async () => {
    const storage = repository();
    vi.mocked(storage.saveReview).mockRejectedValueOnce(new Error('quota exceeded'));
    renderStudy(storage);
    await screen.findByRole('heading', { name: 'allocate' });
    fireEvent.click(screen.getByRole('button', { name: '查看答案' }));

    fireEvent.click(screen.getByRole('button', { name: '认识' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败，请重试。当前单词尚未提交。');
    expect(screen.getByRole('heading', { name: 'allocate' })).toBeVisible();
    expect(screen.getByText('allocate 的中文释义')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'coherent' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '认识' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '认识' }));

    expect(await screen.findByRole('heading', { name: 'coherent' })).toBeVisible();
    expect(screen.getByText('剩余 1 个词')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(storage.saveReview).toHaveBeenCalledTimes(2);
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

  it('refreshes Today counts after a successful rating without a page reload', async () => {
    const storage = persistentRepository();
    renderStudy(storage, [entry('allocate')]);
    await screen.findByRole('heading', { name: 'allocate' });

    await revealAndRate('认识');
    fireEvent.click(screen.getByRole('link', { name: '返回今日页' }));

    expect(await screen.findByRole('heading', { name: '今日学习' })).toBeVisible();
    expect(await screen.findByText('今日已学习 1')).toBeVisible();
    expect(screen.getByRole('heading', { name: '今天的任务完成啦' })).toBeVisible();
  });

  it('does not offer a completed word when re-entering Study without a page reload', async () => {
    const storage = persistentRepository();
    renderStudy(storage, [entry('allocate')]);
    await screen.findByRole('heading', { name: 'allocate' });

    await revealAndRate('认识');
    fireEvent.click(screen.getByRole('link', { name: '返回今日页' }));
    await screen.findByRole('heading', { name: '今日学习' });
    fireEvent.click(screen.getByRole('link', { name: '学习' }));

    expect(await screen.findByRole('heading', { name: '本轮学习完成' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'allocate' })).not.toBeInTheDocument();
  });

  it('keeps the active relearning queue when refreshed dashboard props change', async () => {
    const storage = persistentRepository();
    renderStudy(storage, [entry('allocate'), entry('coherent')]);
    await screen.findByRole('heading', { name: 'allocate' });

    await revealAndRate('不认识');
    expect(await screen.findByRole('heading', { name: 'coherent' })).toBeVisible();
    await waitFor(() => expect(storage.getAllProgress).toHaveBeenCalledTimes(2));
    await revealAndRate('认识');

    expect(await screen.findByRole('heading', { name: 'allocate' })).toBeVisible();
  });
});
