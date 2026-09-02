import type { VocabularyEntry } from '../vocabulary/types';

export type ReviewRating = 'again' | 'hard' | 'known';

export interface WordProgress {
  wordId: VocabularyEntry['id'];
  firstLearnedAt: string;
  lastReviewedAt: string;
  dueAt: string;
  stage: number;
  consecutiveKnown: number;
  reviewCount: number;
  lastRating: ReviewRating;
  mastered: boolean;
}
