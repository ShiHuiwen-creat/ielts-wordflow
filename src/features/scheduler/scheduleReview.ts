import type { VocabularyEntry } from '../vocabulary/types';
import type { ReviewRating, WordProgress } from './types';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const HARD_INTERVALS = [1, 3, 7, 14] as const;
const KNOWN_INTERVALS = [1, 3, 7, 14, 30] as const;

function intervalFor(stage: number, rating: Exclude<ReviewRating, 'again'>): number {
  const intervals = rating === 'hard' ? HARD_INTERVALS : KNOWN_INTERVALS;
  return intervals[Math.min(stage - 1, intervals.length - 1)];
}

function dueAt(reviewedAt: Date, days: number): string {
  return new Date(reviewedAt.getTime() + days * DAY_IN_MILLISECONDS).toISOString();
}

export function scheduleReview(
  progress: WordProgress | undefined,
  rating: ReviewRating,
  reviewedAt: Date,
  wordId?: VocabularyEntry['id'],
): WordProgress {
  if (!progress && !wordId) {
    throw new Error('wordId is required when scheduling a new word');
  }

  const reviewedAtIso = reviewedAt.toISOString();
  const stage = rating === 'again' ? 0 : (progress?.stage ?? 0) + 1;
  const consecutiveKnown = rating === 'known' ? (progress?.consecutiveKnown ?? 0) + 1 : 0;
  const mastered = rating === 'again' ? false : (progress?.mastered ?? false) || (stage >= 4 && consecutiveKnown >= 2);
  const interval = rating === 'again' ? 1 : intervalFor(stage, rating);

  return {
    wordId: progress?.wordId ?? wordId!,
    firstLearnedAt: progress?.firstLearnedAt ?? reviewedAtIso,
    lastReviewedAt: reviewedAtIso,
    dueAt: dueAt(reviewedAt, interval),
    stage,
    consecutiveKnown,
    reviewCount: (progress?.reviewCount ?? 0) + 1,
    lastRating: rating,
    mastered,
  };
}
