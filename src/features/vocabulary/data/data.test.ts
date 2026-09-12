import { describe, expect, it } from 'vitest';
import { validateVocabulary } from '../schema';
import {
  APPROVED_PARTS_OF_SPEECH,
  APPROVED_VOCABULARY_TAGS,
} from '../types';
import { coreVocabulary, coreVocabularyBatches } from '.';

describe('core vocabulary dataset', () => {
  it('ships three reviewed batches of at least 100 entries', () => {
    expect(coreVocabularyBatches).toHaveLength(3);
    coreVocabularyBatches.forEach((batch) => {
      expect(batch.length).toBeGreaterThanOrEqual(100);
    });
    expect(coreVocabulary.length).toBeGreaterThanOrEqual(300);
  });

  it('ships complete unique IELTS entries that satisfy the shared policy', () => {
    const result = validateVocabulary(coreVocabulary);

    expect(result.issues).toEqual([]);
    expect(result.summary).toMatchObject({
      duplicateIds: 0,
      duplicateWords: 0,
      exampleMismatches: 0,
      invalidPartsOfSpeech: 0,
      invalidTags: 0,
      missingFields: 0,
      placeholderFields: 0,
    });
    expect(new Set(coreVocabulary.map((entry) => entry.word.toLowerCase())).size)
      .toBe(coreVocabulary.length);
  });

  it('uses only the documented tags, parts of speech, and target level', () => {
    const approvedTags = new Set<string>(APPROVED_VOCABULARY_TAGS);
    const approvedPartsOfSpeech = new Set<string>(APPROVED_PARTS_OF_SPEECH);

    coreVocabulary.forEach((entry) => {
      expect(entry.tags.every((tag) => approvedTags.has(tag))).toBe(true);
      expect(approvedPartsOfSpeech.has(entry.partOfSpeech)).toBe(true);
      expect(entry.level).toBe('ielts-6-6.5');
    });
  });
});
