import { describe, expect, it } from 'vitest';
import type { WordProgress } from '../scheduler/types';
import type { VocabularyEntry } from './types';
import { queryVocabulary } from './queryVocabulary';

const entries: VocabularyEntry[] = [
  {
    id: 'allocate',
    word: 'Allocate',
    phonetic: '/ˈæləkeɪt/',
    partOfSpeech: 'v.',
    definitionZh: '分配资源',
    example: 'We allocate time carefully.',
    exampleZh: '我们认真分配时间。',
    tags: ['academic'],
    level: 'ielts-6-6.5',
  },
  {
    id: 'coherent',
    word: 'Coherent',
    phonetic: '/kəʊˈhɪərənt/',
    partOfSpeech: 'adj.',
    definitionZh: '连贯的；条理清楚的',
    example: 'Her argument is coherent.',
    exampleZh: '她的论点很连贯。',
    tags: ['writing'],
    level: 'ielts-6-6.5',
  },
  {
    id: 'derive',
    word: 'Derive',
    phonetic: '/dɪˈraɪv/',
    partOfSpeech: 'v.',
    definitionZh: '获得；源自',
    example: 'The term derives from Latin.',
    exampleZh: '这个词源自拉丁语。',
    tags: ['academic'],
    level: 'ielts-6-6.5',
  },
];

function progress(wordId: string, mastered: boolean): WordProgress {
  return {
    wordId,
    firstLearnedAt: '2026-08-20T08:00:00.000Z',
    lastReviewedAt: '2026-09-01T08:00:00.000Z',
    dueAt: '2026-09-03T08:00:00.000Z',
    stage: mastered ? 4 : 2,
    consecutiveKnown: mastered ? 2 : 1,
    reviewCount: 3,
    lastRating: 'known',
    mastered,
  };
}

const progressRecords = [progress('coherent', false), progress('derive', true)];

describe('queryVocabulary', () => {
  it('matches English substrings without regard to case', () => {
    expect(queryVocabulary(entries, progressRecords, 'LOC', 'all').map(({ id }) => id))
      .toEqual(['allocate']);
  });

  it('matches Chinese definition substrings', () => {
    expect(queryVocabulary(entries, progressRecords, '条理', 'all').map(({ id }) => id))
      .toEqual(['coherent']);
  });

  it.each([
    ['unseen', ['allocate']],
    ['learning', ['coherent']],
    ['mastered', ['derive']],
  ] as const)('applies the exact %s status filter', (status, expectedIds) => {
    expect(queryVocabulary(entries, progressRecords, '', status).map(({ id }) => id))
      .toEqual(expectedIds);
  });

  it('requires both search and status filters to match', () => {
    expect(queryVocabulary(entries, progressRecords, '连贯', 'mastered')).toEqual([]);
  });
});
