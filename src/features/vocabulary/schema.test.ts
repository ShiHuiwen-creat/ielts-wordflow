import { describe, expect, it } from 'vitest';
import { isVocabularyEntry, isVocabularyId, validateVocabulary } from './schema';

const valid = {
  id: 'allocate',
  word: 'allocate',
  phonetic: '/ˈæləkeɪt/',
  partOfSpeech: 'verb',
  definitionZh: '分配；拨给',
  example: 'The council can allocate more funds to public transport.',
  exampleZh: '市政委员会可以为公共交通拨出更多资金。',
  tags: ['society'],
  level: 'ielts-6-6.5',
};

describe('vocabulary schema', () => {
  it('accepts non-empty trimmed IDs without imposing a slug format', () => {
    expect(isVocabularyId('Academic_Word')).toBe(true);
    expect(isVocabularyId('IELTS7')).toBe(true);
  });

  it('rejects empty and whitespace-only IDs', () => {
    expect(isVocabularyId('')).toBe(false);
    expect(isVocabularyId('   ')).toBe(false);
  });

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

  it('uses the shared vocabulary ID contract for entries', () => {
    expect(isVocabularyEntry({ ...valid, id: 'Academic_Word' })).toBe(true);
    expect(isVocabularyEntry({ ...valid, id: ' allocate ' })).toBe(true);
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
      { index: 2, code: 'duplicate-word' },
      { index: 3, code: 'invalid-entry' },
    ]);
  });

  it('reports duplicate words independently from duplicate IDs', () => {
    const result = validateVocabulary([
      valid,
      { ...valid, id: 'allocate-alternative' },
    ]);

    expect(result.issues).toContainEqual({ index: 1, code: 'duplicate-word' });
    expect(result.summary.duplicateWords).toBe(1);
  });

  it('continues tracking IDs after a duplicate-word issue', () => {
    const result = validateVocabulary([
      valid,
      { ...valid, id: 'second-id' },
      {
        ...valid,
        id: 'second-id',
        word: 'evaluate',
        example: 'Researchers evaluate the evidence.',
      },
    ]);

    expect(result.issues).toEqual([
      { index: 1, code: 'duplicate-word' },
      { index: 2, code: 'duplicate-id' },
    ]);
  });

  it('tracks usable IDs and words even when the first row has policy issues', () => {
    const result = validateVocabulary([
      { ...valid, tags: ['unsupported'] },
      { ...valid },
    ]);

    expect(result.issues).toEqual([
      { index: 0, code: 'invalid-tag' },
      { index: 1, code: 'duplicate-id' },
      { index: 1, code: 'duplicate-word' },
    ]);
    expect(result.summary).toMatchObject({
      duplicateIds: 1,
      duplicateWords: 1,
      invalidTags: 1,
    });
  });

  it('reports both duplicate dimensions for every exact duplicate', () => {
    const result = validateVocabulary([valid, { ...valid }, { ...valid }]);

    expect(result.issues).toEqual([
      { index: 1, code: 'duplicate-id' },
      { index: 1, code: 'duplicate-word' },
      { index: 2, code: 'duplicate-id' },
      { index: 2, code: 'duplicate-word' },
    ]);
    expect(result.summary).toMatchObject({ duplicateIds: 2, duplicateWords: 2 });
  });

  it('enforces the curated ID, tag, part-of-speech, and example policies', () => {
    const result = validateVocabulary([
      { ...valid, id: 'Upper_Case' },
      { ...valid, id: 'invalid-tag', tags: ['business'] },
      { ...valid, id: 'invalid-pos', partOfSpeech: 'v.' },
      { ...valid, id: 'missing-headword', example: 'Funding should reach rural schools.' },
    ]);

    expect(result.issues).toEqual(expect.arrayContaining([
      { index: 0, code: 'invalid-id' },
      { index: 1, code: 'invalid-tag' },
      { index: 2, code: 'invalid-part-of-speech' },
      { index: 3, code: 'example-mismatch' },
    ]));
    expect(result.summary).toMatchObject({
      exampleMismatches: 1,
      invalidIds: 1,
      invalidPartsOfSpeech: 1,
      invalidTags: 1,
    });
  });

  it('counts blank fields', () => {
    const result = validateVocabulary([
      { ...valid, id: 'blank-field', definitionZh: '   ' },
    ]);

    expect(result.issues).toContainEqual({ index: 0, code: 'invalid-entry' });
    expect(result.summary.missingFields).toBe(1);
  });

  it.each([
    ['id', { id: 'TBD' }],
    ['word', { word: 'placeholder' }],
    ['phonetic', { phonetic: '/TBD/' }],
    ['partOfSpeech', { partOfSpeech: 'TODO' }],
    ['definitionZh', { definitionZh: '待补充释义。' }],
    ['example', { example: 'Lorem ipsum placeholder.' }],
    ['exampleZh', { exampleZh: '待补充翻译。' }],
    ['level', { level: 'TBD' }],
    ['tags', { tags: ['placeholder'] }],
  ])('rejects placeholder text in %s', (_field, override) => {
    const result = validateVocabulary([{ ...valid, ...override }]);

    expect(result.issues).toContainEqual({ index: 0, code: 'placeholder-text' });
    expect(result.summary.placeholderFields).toBe(1);
  });

  it.each([
    ['be', 'A bed occupies most of the small room.'],
    ['make', 'The report says the device was maked locally.'],
  ])('rejects a guessed inflection of %s', (word, example) => {
    const result = validateVocabulary([{
      ...valid,
      id: word,
      word,
      example,
    }]);

    expect(result.issues).toContainEqual({ index: 0, code: 'example-mismatch' });
    expect(result.summary.exampleMismatches).toBe(1);
  });

  it.each([
    ['be', 'Flexible hours can be useful for parents.'],
    ['make', 'Local firms can make the device more affordable.'],
  ])('accepts the exact separate-word headword %s', (word, example) => {
    const result = validateVocabulary([{
      ...valid,
      id: word,
      word,
      example,
    }]);

    expect(result.issues).toEqual([]);
  });
});
