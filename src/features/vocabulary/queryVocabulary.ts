import type { WordProgress } from '../scheduler/types';
import type { VocabularyEntry } from './types';

export type VocabularyStatus = 'all' | 'unseen' | 'learning' | 'mastered';

function matchesStatus(
  progress: WordProgress | undefined,
  status: VocabularyStatus,
): boolean {
  if (status === 'all') {
    return true;
  }
  if (status === 'unseen') {
    return progress === undefined;
  }
  if (status === 'mastered') {
    return progress?.mastered === true;
  }
  return progress !== undefined && !progress.mastered;
}

export function queryVocabulary(
  entries: readonly VocabularyEntry[],
  progressRecords: readonly WordProgress[],
  query: string,
  status: VocabularyStatus,
): VocabularyEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const progressByWord = new Map(progressRecords.map((progress) => [progress.wordId, progress]));

  return entries.filter((entry) => {
    const matchesQuery = normalizedQuery === '' ||
      entry.word.toLocaleLowerCase().includes(normalizedQuery) ||
      entry.definitionZh.toLocaleLowerCase().includes(normalizedQuery);

    return matchesQuery && matchesStatus(progressByWord.get(entry.id), status);
  });
}
