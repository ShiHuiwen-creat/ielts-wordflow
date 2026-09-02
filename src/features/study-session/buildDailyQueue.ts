import type { WordProgress } from '../scheduler/types';
import type { BuildDailyQueueInput, StudyQueueItem } from './types';

function endOfLocalDay(today: string, utcOffsetMinutes: number): number {
  const localDayStart = new Date(`${today}T00:00:00.000Z`).getTime() - utcOffsetMinutes * 60_000;

  return localDayStart + 24 * 60 * 60 * 1_000 - 1;
}

function dueTime(progress: WordProgress): number {
  return new Date(progress.dueAt).getTime();
}

export function buildDailyQueue({
  entries,
  progress,
  today,
  utcOffsetMinutes,
  goal,
  newLearnedToday,
}: BuildDailyQueueInput): StudyQueueItem[] {
  const entryIds = new Set<string>();
  const uniqueEntries = entries.filter((entry) => {
    if (entryIds.has(entry.id)) {
      return false;
    }

    entryIds.add(entry.id);
    return true;
  });
  const entryIdSet = new Set(uniqueEntries.map((entry) => entry.id));
  const progressByWordId = new Map<string, WordProgress>();

  for (const wordProgress of progress) {
    if (!progressByWordId.has(wordProgress.wordId)) {
      progressByWordId.set(wordProgress.wordId, wordProgress);
    }
  }

  const dayEnd = endOfLocalDay(today, utcOffsetMinutes);
  const dueReviews = [...progressByWordId.values()]
    .filter((wordProgress) => entryIdSet.has(wordProgress.wordId) && dueTime(wordProgress) <= dayEnd)
    .sort((left, right) => {
      const dueDifference = dueTime(left) - dueTime(right);
      if (dueDifference !== 0) {
        return dueDifference;
      }

      return left.wordId < right.wordId ? -1 : left.wordId > right.wordId ? 1 : 0;
    })
    .map(({ wordId }) => ({ wordId, kind: 'review' as const }));
  const remainingNewWords = Math.max(0, goal - newLearnedToday);
  const newWords = uniqueEntries
    .filter((entry) => !progressByWordId.has(entry.id))
    .slice(0, remainingNewWords)
    .map(({ id: wordId }) => ({ wordId, kind: 'new' as const }));

  return [...dueReviews, ...newWords];
}
