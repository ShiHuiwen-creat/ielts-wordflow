export type VocabularyLevel = 'ielts-6-6.5';

export interface VocabularyEntry {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definitionZh: string;
  example: string;
  exampleZh: string;
  tags: string[];
  level: VocabularyLevel;
}

export interface ValidationIssue {
  index: number;
  code: 'duplicate-id' | 'invalid-entry';
}

export interface ValidationResult {
  issues: ValidationIssue[];
}
