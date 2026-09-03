import type { ReviewRating, WordProgress } from '../../features/scheduler/types';
import { isVocabularyId } from '../../features/vocabulary/schema';
import type {
  AppSettings,
  BackupData,
  DailyStats,
  StorageRepository,
} from './types';

const supportedRatings = new Set<ReviewRating>(['again', 'hard', 'known']);
const supportedGoals = new Set([10, 20, 30]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const canonicalUtcDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const backupKeys = ['schemaVersion', 'exportedAt', 'settings', 'progress', 'dailyStats'];
const settingsKeys = ['dailyGoal', 'autoSpeak', 'onboardingComplete'];
const progressKeys = [
  'wordId',
  'firstLearnedAt',
  'lastReviewedAt',
  'dueAt',
  'stage',
  'consecutiveKnown',
  'reviewCount',
  'lastRating',
  'mastered',
];
const dailyStatsKeys = ['date', 'newLearned', 'reviews', 'again', 'hard', 'known'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== 'string' || !canonicalUtcDateTimePattern.test(value)) {
    return false;
  }

  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !datePattern.test(value)) {
    return false;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function isSettings(value: unknown): value is AppSettings {
  if (!isRecord(value) || !hasExactKeys(value, settingsKeys)) {
    return false;
  }

  return (
    typeof value.dailyGoal === 'number' &&
    supportedGoals.has(value.dailyGoal) &&
    typeof value.autoSpeak === 'boolean' &&
    typeof value.onboardingComplete === 'boolean'
  );
}

function isProgress(value: unknown): value is WordProgress {
  if (!isRecord(value) || !hasExactKeys(value, progressKeys)) {
    return false;
  }

  return (
    isVocabularyId(value.wordId) &&
    isIsoDateTime(value.firstLearnedAt) &&
    isIsoDateTime(value.lastReviewedAt) &&
    isIsoDateTime(value.dueAt) &&
    isNonNegativeInteger(value.stage) &&
    isNonNegativeInteger(value.consecutiveKnown) &&
    isNonNegativeInteger(value.reviewCount) &&
    typeof value.lastRating === 'string' &&
    supportedRatings.has(value.lastRating as ReviewRating) &&
    typeof value.mastered === 'boolean'
  );
}

function isDailyStats(value: unknown): value is DailyStats {
  if (!isRecord(value) || !hasExactKeys(value, dailyStatsKeys)) {
    return false;
  }

  return (
    isDateKey(value.date) &&
    isNonNegativeInteger(value.newLearned) &&
    isNonNegativeInteger(value.reviews) &&
    isNonNegativeInteger(value.again) &&
    isNonNegativeInteger(value.hard) &&
    isNonNegativeInteger(value.known)
  );
}

function hasUniqueKeys<T>(values: T[], key: (value: T) => string): boolean {
  return new Set(values.map(key)).size === values.length;
}

export function validateBackup(value: unknown): BackupData {
  if (isRecord(value) && typeof value.schemaVersion === 'number' && value.schemaVersion !== 1) {
    throw new Error('不支持的备份版本');
  }

  if (
    !isRecord(value) ||
    !hasExactKeys(value, backupKeys) ||
    value.schemaVersion !== 1 ||
    !isIsoDateTime(value.exportedAt) ||
    !isSettings(value.settings) ||
    !Array.isArray(value.progress) ||
    !value.progress.every(isProgress) ||
    !hasUniqueKeys(value.progress, (record) => record.wordId) ||
    !Array.isArray(value.dailyStats) ||
    !value.dailyStats.every(isDailyStats) ||
    !hasUniqueKeys(value.dailyStats, (record) => record.date)
  ) {
    throw new Error('备份数据无效');
  }

  return value as unknown as BackupData;
}

export async function createBackup(repository: StorageRepository): Promise<BackupData> {
  const [settings, progress, dailyStats] = await Promise.all([
    repository.getSettings(),
    repository.getAllProgress(),
    repository.getAllDailyStats(),
  ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings,
    progress,
    dailyStats,
  };
}

export async function restoreBackup(
  repository: StorageRepository,
  value: unknown,
): Promise<void> {
  const { settings, progress, dailyStats } = validateBackup(value);
  await repository.replaceAll({ settings, progress, dailyStats });
}
