import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import type { WordProgress } from '../features/scheduler/types';
import type { VocabularyEntry } from '../features/vocabulary/types';
import type { AppSettings, BackupData, DailyStats, StorageData, StorageRepository } from '../lib/storage/types';

const initialSettings: AppSettings = {
  dailyGoal: 20,
  autoSpeak: false,
  onboardingComplete: true,
};

const vocabulary: VocabularyEntry[] = Array.from({ length: 35 }, (_, index) => ({
  id: `word-${index}`,
  word: `word${index}`,
  phonetic: `/word${index}/`,
  partOfSpeech: 'noun',
  definitionZh: '释义',
  example: 'Example.',
  exampleZh: '例句。',
  tags: ['academic'],
  level: 'ielts-6-6.5',
}));

function learnedProgress(wordId: string): WordProgress {
  return {
    wordId,
    firstLearnedAt: '2026-08-20T08:00:00.000Z',
    lastReviewedAt: '2026-09-01T08:00:00.000Z',
    dueAt: '2026-09-03T08:00:00.000Z',
    stage: 2,
    consecutiveKnown: 1,
    reviewCount: 3,
    lastRating: 'known',
    mastered: false,
  };
}

function dailyStats(date: string): DailyStats {
  return { date, newLearned: 1, reviews: 2, again: 0, hard: 1, known: 2 };
}

interface MutableRepository extends StorageRepository {
  snapshot: () => StorageData;
}

function repository(): MutableRepository {
  let settings = { ...initialSettings };
  let progress = [learnedProgress('word-0')];
  let stats = [dailyStats('2026-09-01')];
  const storage: MutableRepository = {
    getSettings: vi.fn().mockImplementation(async () => ({ ...settings })),
    saveSettings: vi.fn().mockImplementation(async (next: AppSettings) => {
      settings = { ...next };
    }),
    getProgress: vi.fn().mockImplementation(async (wordId: string) =>
      progress.find((record) => record.wordId === wordId)),
    getAllProgress: vi.fn().mockImplementation(async () => [...progress]),
    getDailyStats: vi.fn().mockImplementation(async (date: string) =>
      stats.find((record) => record.date === date)),
    getAllDailyStats: vi.fn().mockImplementation(async () => [...stats]),
    saveReview: vi.fn().mockResolvedValue(undefined),
    replaceAll: vi.fn().mockImplementation(async (data: StorageData) => {
      settings = { ...data.settings };
      progress = [...data.progress];
      stats = [...data.dailyStats];
    }),
    close: vi.fn(),
    snapshot: () => ({ settings, progress, dailyStats: stats }),
  };
  return storage;
}

const validBackup: BackupData = {
  schemaVersion: 1,
  exportedAt: '2026-09-03T08:00:00.000Z',
  settings: { dailyGoal: 10, autoSpeak: true, onboardingComplete: true },
  progress: [learnedProgress('word-2'), learnedProgress('word-3')],
  dailyStats: [dailyStats('2026-09-02')],
};

function renderSettings(storage: StorageRepository) {
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <App
        repository={storage}
        vocabulary={vocabulary}
        now={() => new Date('2026-09-02T08:00:00.000Z')}
        utcOffsetMinutes={() => 0}
      />
    </MemoryRouter>,
  );
}

function chooseFile(contents: string, name = 'backup.json') {
  const input = screen.getByLabelText('选择备份文件');
  fireEvent.change(input, {
    target: { files: [new File([contents], name, { type: 'application/json' })] },
  });
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(new Error('blob read failed')));
    reader.readAsText(blob);
  });
}

let clickedDownload = '';
let clickedHref = '';

beforeEach(() => {
  clickedDownload = '';
  clickedHref = '';
  const NativeURL = URL;
  class TestURL extends NativeURL {
    static createObjectURL = vi.fn().mockReturnValue('blob:test-backup');
    static revokeObjectURL = vi.fn();
  }
  vi.stubGlobal('URL', TestURL);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(
    this: HTMLAnchorElement,
  ) {
    clickedDownload = this.download;
    clickedHref = this.href;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SettingsPage', () => {
  it('persists goal and auto-speak changes and refreshes Today immediately', async () => {
    const storage = repository();
    renderSettings(storage);

    fireEvent.click(await screen.findByRole('radio', { name: '每天 30 个' }));
    await waitFor(() => expect(storage.saveSettings).toHaveBeenLastCalledWith({
      dailyGoal: 30,
      autoSpeak: false,
      onboardingComplete: true,
    }));

    fireEvent.click(screen.getByRole('checkbox', { name: '学习时自动发音' }));
    await waitFor(() => expect(storage.saveSettings).toHaveBeenLastCalledWith({
      dailyGoal: 30,
      autoSpeak: true,
      onboardingComplete: true,
    }));

    fireEvent.click(screen.getByRole('link', { name: '今日' }));
    expect(await screen.findByText('30', { selector: '[data-stat="new"]' })).toBeVisible();
  });

  it('downloads a complete JSON backup and revokes its object URL', async () => {
    const storage = repository();
    renderSettings(storage);

    fireEvent.click(await screen.findByRole('button', { name: '导出数据' }));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce());
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    const exported = JSON.parse(await readBlob(blob)) as BackupData;
    expect(exported).toMatchObject({
      schemaVersion: 1,
      settings: initialSettings,
      progress: [expect.objectContaining({ wordId: 'word-0' })],
      dailyStats: [expect.objectContaining({ date: '2026-09-01' })],
    });
    expect(clickedDownload).toBe('ielts-wordflow-backup.json');
    expect(clickedHref).toContain('blob:test-backup');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-backup');
  });

  it('rejects an invalid file without showing confirmation or changing data', async () => {
    const storage = repository();
    const before = storage.snapshot();
    renderSettings(storage);

    await screen.findByRole('heading', { name: '设置' });
    chooseFile('{ invalid json');

    expect(await screen.findByRole('alert')).toHaveTextContent('备份文件无效');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(storage.replaceAll).not.toHaveBeenCalled();
    expect(storage.snapshot()).toEqual(before);
  });

  it('validates before showing an import summary and cancel leaves data untouched', async () => {
    const storage = repository();
    const before = storage.snapshot();
    renderSettings(storage);

    await screen.findByRole('heading', { name: '设置' });
    chooseFile(JSON.stringify(validBackup));

    const dialog = await screen.findByRole('dialog', { name: '确认导入数据' });
    expect(within(dialog).getByText('每日目标：10 个')).toBeVisible();
    expect(within(dialog).getByText('单词进度：2 条')).toBeVisible();
    expect(within(dialog).getByText('每日统计：1 天')).toBeVisible();
    expect(storage.replaceAll).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(storage.replaceAll).not.toHaveBeenCalled();
    expect(storage.snapshot()).toEqual(before);
  });

  it('restores focus to the exact import and reset controls after sequential dialogs', async () => {
    const storage = repository();
    renderSettings(storage);
    const fileInput = await screen.findByLabelText('选择备份文件');
    fileInput.focus();

    chooseFile(JSON.stringify(validBackup));

    const importDialog = await screen.findByRole('dialog', { name: '确认导入数据' });
    const importCancel = within(importDialog).getByRole('button', { name: '取消' });
    expect(importCancel).toHaveFocus();
    fireEvent.click(importCancel);
    expect(fileInput).toHaveFocus();

    const reset = screen.getByRole('button', { name: '重置学习数据' });
    reset.focus();
    fireEvent.click(reset);
    const resetDialog = screen.getByRole('dialog', { name: '确认重置学习数据' });
    const resetCancel = within(resetDialog).getByRole('button', { name: '取消' });
    expect(resetCancel).toHaveFocus();
    fireEvent.click(resetCancel);
    expect(reset).toHaveFocus();
  });

  it('blocks background setting and navigation mutations while confirmation is pending', async () => {
    const storage = repository();
    renderSettings(storage);
    const autoSpeak = await screen.findByRole('checkbox', { name: '学习时自动发音' });
    const todayLink = screen.getByRole('link', { name: '今日' });

    chooseFile(JSON.stringify(validBackup));
    const dialog = await screen.findByRole('dialog', { name: '确认导入数据' });

    fireEvent.click(autoSpeak);
    fireEvent.click(todayLink);

    expect(storage.saveSettings).not.toHaveBeenCalled();
    expect(storage.snapshot().settings).toEqual(initialSettings);
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.getByRole('heading', { name: '设置' })).toBeVisible();
  });

  it('restores a validated backup only after explicit confirmation and refreshes data', async () => {
    const storage = repository();
    renderSettings(storage);

    await screen.findByRole('heading', { name: '设置' });
    chooseFile(JSON.stringify(validBackup));
    const dialog = await screen.findByRole('dialog', { name: '确认导入数据' });
    expect(storage.replaceAll).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: '确认导入' }));

    await waitFor(() => expect(storage.replaceAll).toHaveBeenCalledOnce());
    expect(storage.snapshot()).toEqual({
      settings: validBackup.settings,
      progress: validBackup.progress,
      dailyStats: validBackup.dailyStats,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('数据导入成功');
    await waitFor(() => expect(storage.getAllProgress).toHaveBeenCalledTimes(2));
  });

  it('keeps import confirmation active with an actionable error when restore fails', async () => {
    const storage = repository();
    const before = storage.snapshot();
    vi.mocked(storage.replaceAll).mockRejectedValueOnce(new Error('restore failed'));
    renderSettings(storage);
    await screen.findByRole('heading', { name: '设置' });
    chooseFile(JSON.stringify(validBackup));
    const dialog = await screen.findByRole('dialog', { name: '确认导入数据' });

    fireEvent.click(within(dialog).getByRole('button', { name: '确认导入' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '导入失败，现有数据未更改。请重试或取消。',
    );
    expect(within(dialog).getByRole('button', { name: '确认导入' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: '取消' })).toBeEnabled();
    expect(storage.snapshot()).toEqual(before);
  });

  it('resets progress only behind a separate destructive confirmation', async () => {
    const storage = repository();
    renderSettings(storage);

    fireEvent.click(await screen.findByRole('button', { name: '重置学习数据' }));
    const firstDialog = screen.getByRole('dialog', { name: '确认重置学习数据' });
    expect(storage.replaceAll).not.toHaveBeenCalled();
    fireEvent.click(within(firstDialog).getByRole('button', { name: '取消' }));
    expect(storage.replaceAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '重置学习数据' }));
    const secondDialog = screen.getByRole('dialog', { name: '确认重置学习数据' });
    fireEvent.click(within(secondDialog).getByRole('button', { name: '确认重置' }));

    await waitFor(() => expect(storage.replaceAll).toHaveBeenCalledWith({
      settings: initialSettings,
      progress: [],
      dailyStats: [],
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('学习数据已重置');
  });

  it('keeps reset confirmation active with an actionable error when reset fails', async () => {
    const storage = repository();
    const before = storage.snapshot();
    vi.mocked(storage.replaceAll).mockRejectedValueOnce(new Error('reset failed'));
    renderSettings(storage);
    fireEvent.click(await screen.findByRole('button', { name: '重置学习数据' }));
    const dialog = screen.getByRole('dialog', { name: '确认重置学习数据' });

    fireEvent.click(within(dialog).getByRole('button', { name: '确认重置' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '重置失败，现有数据未更改。请重试或取消。',
    );
    expect(within(dialog).getByRole('button', { name: '确认重置' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: '取消' })).toBeEnabled();
    expect(storage.snapshot()).toEqual(before);
  });
});
