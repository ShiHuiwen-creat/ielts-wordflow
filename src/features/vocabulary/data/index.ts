import type { VocabularyEntry } from '../types';
import coreBatch1Json from './core-1.json';
import coreBatch2Json from './core-2.json';
import coreBatch3Json from './core-3.json';

const coreBatch1 = Object.freeze(coreBatch1Json as unknown as VocabularyEntry[]);
const coreBatch2 = Object.freeze(coreBatch2Json as unknown as VocabularyEntry[]);
const coreBatch3 = Object.freeze(coreBatch3Json as unknown as VocabularyEntry[]);

export const coreVocabularyBatches = Object.freeze([
  coreBatch1,
  coreBatch2,
  coreBatch3,
] as const);

export const coreVocabulary: readonly VocabularyEntry[] = Object.freeze(
  coreVocabularyBatches.flat(),
);
