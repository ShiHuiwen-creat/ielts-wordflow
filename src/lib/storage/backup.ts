import type { ReviewRating, WordProgress } from '../../features/scheduler/types';
import type {
  AppSettings,
  BackupData,
  DailyStats,
  StorageRepository,
} from './types';

const supportedRatings = new Set<ReviewRating>(['again', 'hard', 'known']);
const supportedGoals = new Set([10, 20, 30]);
const wordIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    dateTimePattern.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !datePattern.test(value)) {
    return false;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function isSettings(value: unknown): value is AppSettings {
  if (!isRecord(value)) {
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
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.wordId === 'string' &&
    wordIdPattern.test(value.wordId) &&
    isIsoDateTime(value.firstLearnedAt) &&
    isIsoDateTime(value.lastReviewedAt) &&
    isIsoDateTime(value.dueAt) &&
    isNonNegativeInteger(value.stage) &&
    value.stage <= 6 &&
    isNonNegativeInteger(value.consecutiveKnown) &&
    isNonNegativeInteger(value.reviewCount) &&
    typeof value.lastRating === 'string' &&
    supportedRatings.has(value.lastRating as ReviewRating) &&
    typeof value.mastered === 'boolean'
  );
}

function isDailyStats(value: unknown): value is DailyStats {
  if (!isRecord(value)) {
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
