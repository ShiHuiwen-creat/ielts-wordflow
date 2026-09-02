import type { WordProgress } from '../../features/scheduler/types';
import { WordflowDatabase } from './database';
import type { AppSettings, DailyStats, StorageData, StorageRepository } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  dailyGoal: 20,
  autoSpeak: false,
  onboardingComplete: false,
};

function emptyDailyStats(date: string): DailyStats {
  return {
    date,
    newLearned: 0,
    reviews: 0,
    again: 0,
    hard: 0,
    known: 0,
  };
}

class DexieStorageRepository implements StorageRepository {
  constructor(private readonly database: WordflowDatabase) {}

  async getSettings(): Promise<AppSettings> {
    const record = await this.database.settings.get('app');
    if (record === undefined) {
      return { ...DEFAULT_SETTINGS };
    }

    return {
      dailyGoal: record.dailyGoal,
      autoSpeak: record.autoSpeak,
      onboardingComplete: record.onboardingComplete,
    };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.database.settings.put({ id: 'app', ...settings });
  }

  getProgress(wordId: string): Promise<WordProgress | undefined> {
    return this.database.progress.get(wordId);
  }

  getAllProgress(): Promise<WordProgress[]> {
    return this.database.progress.toArray();
  }

  getDailyStats(date: string): Promise<DailyStats | undefined> {
    return this.database.dailyStats.get(date);
  }

  getAllDailyStats(): Promise<DailyStats[]> {
    return this.database.dailyStats.toArray();
  }

  async saveReview(
    progress: WordProgress,
    date = progress.lastReviewedAt.slice(0, 10),
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.progress,
      this.database.dailyStats,
      async () => {
        const [previousProgress, storedStats] = await Promise.all([
          this.database.progress.get(progress.wordId),
          this.database.dailyStats.get(date),
        ]);
        const nextStats = storedStats ?? emptyDailyStats(date);
        const incrementedStats: DailyStats = {
          ...nextStats,
          newLearned: nextStats.newLearned + (previousProgress === undefined ? 1 : 0),
          reviews: nextStats.reviews + (previousProgress === undefined ? 0 : 1),
          [progress.lastRating]: nextStats[progress.lastRating] + 1,
        };

        await this.database.progress.put(progress);
        await this.database.dailyStats.put(incrementedStats);
      },
    );
  }

  async replaceAll({ settings, progress, dailyStats }: StorageData): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.settings,
      this.database.progress,
      this.database.dailyStats,
      async () => {
        await this.database.settings.clear();
        await this.database.progress.clear();
        await this.database.dailyStats.clear();
        await this.database.settings.add({ id: 'app', ...settings });
        await this.database.progress.bulkAdd(progress);
        await this.database.dailyStats.bulkAdd(dailyStats);
      },
    );
  }

  close(): void {
    this.database.close();
  }
}

export function createRepository(database: string | WordflowDatabase): StorageRepository {
  return new DexieStorageRepository(
    typeof database === 'string' ? new WordflowDatabase(database) : database,
  );
}
