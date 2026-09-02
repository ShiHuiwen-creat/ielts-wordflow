import type { ReviewRating, WordProgress } from '../../features/scheduler/types';
import type { DailyGoal } from '../../features/study-session/types';

export interface AppSettings {
  dailyGoal: DailyGoal;
  autoSpeak: boolean;
  onboardingComplete: boolean;
}

export interface DailyStats {
  date: string;
  newLearned: number;
  reviews: number;
  again: number;
  hard: number;
  known: number;
}

export interface StorageData {
  settings: AppSettings;
  progress: WordProgress[];
  dailyStats: DailyStats[];
}

export interface BackupData extends StorageData {
  schemaVersion: 1;
  exportedAt: string;
}

export interface StorageRepository {
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  getProgress(wordId: string): Promise<WordProgress | undefined>;
  getAllProgress(): Promise<WordProgress[]>;
  getDailyStats(date: string): Promise<DailyStats | undefined>;
  getAllDailyStats(): Promise<DailyStats[]>;
  saveReview(progress: WordProgress, date?: string): Promise<void>;
  replaceAll(data: StorageData): Promise<void>;
  close(): void;
}

export type RatingCounts = Record<ReviewRating, number>;
