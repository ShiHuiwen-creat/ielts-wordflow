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

  it.each([
    'id',
    'word',
    'phonetic',
    'partOfSpeech',
    'definitionZh',
    'example',
    'exampleZh',
  ] as const)('rejects empty and whitespace-only %s', (field) => {
    expect(isVocabularyEntry({ ...valid, [field]: '' })).toBe(false);
    expect(isVocabularyEntry({ ...valid, [field]: '   ' })).toBe(false);
  });

  it('allows meaningful text with surrounding whitespace', () => {
    expect(isVocabularyEntry({ ...valid, word: ' allocate ' })).toBe(true);
  });

  it.each([
    [],
    ['   '],
    ['society', 1],
    'society',
  ])('rejects empty, malformed, and non-array tags: %j', (tags) => {
    expect(isVocabularyEntry({ ...valid, tags })).toBe(false);
  });

  it('rejects unsupported levels', () => {
    expect(isVocabularyEntry({ ...valid, level: 'ielts-7' })).toBe(false);
  });

  it('reports exact indexes for invalid entries and duplicate valid ids', () => {
    const entries = [
      { ...valid, word: '   ' },
      valid,
      { ...valid },
      { ...valid, id: '', word: '' },
    ];

    expect(validateVocabulary(entries).issues).toEqual([
      { index: 0, code: 'invalid-entry' },
      { index: 2, code: 'duplicate-id' },
      { index: 3, code: 'invalid-entry' },
    ]);
  });
});
