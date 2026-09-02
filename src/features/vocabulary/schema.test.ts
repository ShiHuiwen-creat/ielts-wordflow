import { describe, expect, it } from 'vitest';
import { isVocabularyEntry, validateVocabulary } from './schema';

const valid = {
  id: 'allocate',
  word: 'allocate',
  phonetic: '/ˈæləkeɪt/',
  partOfSpeech: 'verb',
  definitionZh: '分配；拨给',
  example: 'The council allocated more funds to public transport.',
  exampleZh: '市政委员会为公共交通拨出了更多资金。',
  tags: ['society'],
  level: 'ielts-6-6.5',
};

describe('vocabulary schema', () => {
  it('accepts a complete IELTS entry', () => {
    expect(isVocabularyEntry(valid)).toBe(true);
  });

  it('rejects duplicate ids and incomplete entries', () => {
    expect(validateVocabulary([valid, valid, { ...valid, id: '', word: '' }]).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-id' }),
        expect.objectContaining({ code: 'invalid-entry' }),
      ]),
    );
  });
});
