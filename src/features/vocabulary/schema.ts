import type { ValidationResult, VocabularyEntry } from './types';

const requiredStringFields = [
  'id',
  'word',
  'phonetic',
  'partOfSpeech',
  'definitionZh',
  'example',
  'exampleZh',
] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isVocabularyEntry(value: unknown): value is VocabularyEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    requiredStringFields.every((field) => isNonEmptyString(candidate[field])) &&
    Array.isArray(candidate.tags) &&
    candidate.tags.length > 0 &&
    candidate.tags.every(isNonEmptyString) &&
    candidate.level === 'ielts-6-6.5'
  );
}

export function validateVocabulary(entries: unknown[]): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  const ids = new Set<string>();

  entries.forEach((entry, index) => {
    if (!isVocabularyEntry(entry)) {
      issues.push({ index, code: 'invalid-entry' });
      return;
    }

    if (ids.has(entry.id)) {
      issues.push({ index, code: 'duplicate-id' });
      return;
    }

    ids.add(entry.id);
  });

  return { issues };
}
