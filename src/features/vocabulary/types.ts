export type VocabularyLevel = 'ielts-6-6.5';

export const APPROVED_PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
] as const;

export type VocabularyPartOfSpeech = typeof APPROVED_PARTS_OF_SPEECH[number];

export const APPROVED_VOCABULARY_TAGS = [
  'academic',
  'culture',
  'economy',
  'education',
  'environment',
  'health',
  'science',
  'society',
  'technology',
] as const;

export type VocabularyTag = typeof APPROVED_VOCABULARY_TAGS[number];

export interface VocabularyEntry {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: VocabularyPartOfSpeech;
  definitionZh: string;
  example: string;
  exampleZh: string;
  tags: VocabularyTag[];
  level: VocabularyLevel;
}

export interface ValidationIssue {
  index: number;
  code:
    | 'duplicate-id'
    | 'duplicate-word'
    | 'example-mismatch'
    | 'invalid-entry'
    | 'invalid-id'
    | 'invalid-part-of-speech'
    | 'invalid-tag'
    | 'placeholder-text';
}

export interface ValidationSummary {
  total: number;
  duplicateIds: number;
  duplicateWords: number;
  exampleMismatches: number;
  invalidEntries: number;
  invalidIds: number;
  invalidLevels: number;
  invalidPartsOfSpeech: number;
  invalidTags: number;
  missingFields: number;
  placeholderFields: number;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  summary: ValidationSummary;
}
