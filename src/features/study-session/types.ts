import type { ReviewRating, WordProgress } from '../scheduler/types';
import type { VocabularyEntry } from '../vocabulary/types';

export type DailyGoal = 10 | 20 | 30;

export interface StudyQueueItem {
  wordId: VocabularyEntry['id'];
  kind: 'new' | 'review';
}

export interface BuildDailyQueueInput {
  entries: readonly VocabularyEntry[];
  progress: readonly WordProgress[];
  today: string;
  goal: DailyGoal;
  newLearnedToday: number;
}

export interface StudySessionSummary {
  again: number;
  hard: number;
  known: number;
}

export interface StudySessionState {
  queue: readonly StudyQueueItem[];
  current: StudyQueueItem | undefined;
  isAnswerRevealed: boolean;
  summary: StudySessionSummary;
}

export type StudySessionAction =
  | { type: 'answer-revealed' }
  | { type: 'rated'; rating: ReviewRating };
