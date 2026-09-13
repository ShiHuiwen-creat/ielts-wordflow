import {
  APPROVED_PARTS_OF_SPEECH,
  APPROVED_VOCABULARY_TAGS,
} from './types';
import type {
  ValidationResult,
  ValidationSummary,
  VocabularyEntry,
} from './types';

const requiredStringFields = [
  'id',
  'word',
  'phonetic',
  'partOfSpeech',
  'definitionZh',
  'example',
  'exampleZh',
] as const;

const curatedIdPattern = /^[a-z]+(?:-[a-z]+)*$/;
const placeholderPattern = /(?:\b(?:lorem ipsum|placeholder|tbd|todo)\b|待补(?:充)?|占位|示例翻译)/iu;
const approvedPartsOfSpeech = new Set<string>(APPROVED_PARTS_OF_SPEECH);
const approvedTags = new Set<string>(APPROVED_VOCABULARY_TAGS);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isVocabularyId(value: unknown): value is VocabularyEntry['id'] {
  return isNonEmptyString(value);
}

export function isVocabularyEntry(value: unknown): value is VocabularyEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isVocabularyId(candidate.id) &&
    requiredStringFields
      .filter((field) => field !== 'id')
      .every((field) => isNonEmptyString(candidate[field])) &&
    approvedPartsOfSpeech.has(candidate.partOfSpeech as string) &&
    Array.isArray(candidate.tags) &&
    candidate.tags.length > 0 &&
    candidate.tags.every((tag) => isNonEmptyString(tag) && approvedTags.has(tag)) &&
    candidate.level === 'ielts-6-6.5'
  );
}

function blankFieldCount(candidate: Record<string, unknown>): number {
  return requiredStringFields.filter((field) => !isNonEmptyString(candidate[field])).length;
}

function hasWellFormedTags(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isNonEmptyString)
  );
}

function containsHeadword(example: string, word: string): boolean {
  const escapedWord = word
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  const pattern = new RegExp(`(^|[^a-z])${escapedWord}($|[^a-z])`, 'iu');
  return pattern.test(example);
}

function placeholderFieldCount(candidate: Record<string, unknown>): number {
  const stringFields = Object.values(candidate).filter(
    (value): value is string => typeof value === 'string',
  );
  const stringTags = Array.isArray(candidate.tags)
    ? candidate.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  return [...stringFields, ...stringTags]
    .filter((value) => placeholderPattern.test(value))
    .length;
}

function emptySummary(total: number): ValidationSummary {
  return {
    total,
    duplicateIds: 0,
    duplicateWords: 0,
    exampleMismatches: 0,
    invalidEntries: 0,
    invalidIds: 0,
    invalidLevels: 0,
    invalidPartsOfSpeech: 0,
    invalidTags: 0,
    missingFields: 0,
    placeholderFields: 0,
  };
}

export function validateVocabulary(entries: readonly unknown[]): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  const ids = new Set<string>();
  const words = new Set<string>();
  const summary = emptySummary(entries.length);

  entries.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      issues.push({ index, code: 'invalid-entry' });
      summary.invalidEntries += 1;
      summary.missingFields += requiredStringFields.length;
      return;
    }

    const candidate = entry as Record<string, unknown>;
    const rawId = candidate.id;
    const rawWord = candidate.word;
    const rawPartOfSpeech = candidate.partOfSpeech;
    const rawExample = candidate.example;
    const rawTags = candidate.tags;
    const missingFields = blankFieldCount(candidate);
    const tagsAreWellFormed = hasWellFormedTags(rawTags);
    const levelIsValid = candidate.level === 'ielts-6-6.5';
    const idIsUsable = isNonEmptyString(rawId);
    const wordIsUsable = isNonEmptyString(rawWord);
    const partOfSpeechIsUsable = isNonEmptyString(rawPartOfSpeech);
    const exampleIsUsable = isNonEmptyString(rawExample);

    summary.missingFields += missingFields;
    if (!levelIsValid) {
      summary.invalidLevels += 1;
    }

    if (missingFields > 0 || !tagsAreWellFormed || !levelIsValid) {
      if (!tagsAreWellFormed) {
        summary.invalidTags += 1;
      }
      issues.push({ index, code: 'invalid-entry' });
      summary.invalidEntries += 1;
    }

    const id = idIsUsable ? rawId.trim() : '';
    const word = wordIsUsable ? rawWord.trim() : '';
    const partOfSpeech = partOfSpeechIsUsable ? rawPartOfSpeech.trim() : '';
    const example = exampleIsUsable ? rawExample : '';

    if (idIsUsable && !curatedIdPattern.test(id)) {
      issues.push({ index, code: 'invalid-id' });
      summary.invalidIds += 1;
    }

    if (partOfSpeechIsUsable && !approvedPartsOfSpeech.has(partOfSpeech)) {
      issues.push({ index, code: 'invalid-part-of-speech' });
      summary.invalidPartsOfSpeech += 1;
    }

    const invalidTagCount = tagsAreWellFormed
      ? rawTags.filter((tag) => !approvedTags.has(tag)).length
      : 0;
    if (invalidTagCount > 0) {
      issues.push({ index, code: 'invalid-tag' });
      summary.invalidTags += invalidTagCount;
    }

    const placeholderCount = placeholderFieldCount(candidate);
    if (placeholderCount > 0) {
      issues.push({ index, code: 'placeholder-text' });
      summary.placeholderFields += placeholderCount;
    }

    if (
      wordIsUsable &&
      exampleIsUsable &&
      !containsHeadword(example, word)
    ) {
      issues.push({ index, code: 'example-mismatch' });
      summary.exampleMismatches += 1;
    }

    if (idIsUsable) {
      const normalizedId = id.toLowerCase();
      const hasDuplicateId = ids.has(normalizedId);
      ids.add(normalizedId);

      if (hasDuplicateId) {
        issues.push({ index, code: 'duplicate-id' });
        summary.duplicateIds += 1;
      }
    }

    if (wordIsUsable) {
      const normalizedWord = word.toLowerCase();
      const hasDuplicateWord = words.has(normalizedWord);
      words.add(normalizedWord);

      if (hasDuplicateWord) {
        issues.push({ index, code: 'duplicate-word' });
        summary.duplicateWords += 1;
      }
    }
  });

  return { issues, summary };
}
