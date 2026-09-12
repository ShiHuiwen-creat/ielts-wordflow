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

const authoredTextFields = ['definitionZh', 'example', 'exampleZh'] as const;

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

function regularWordForms(word: string, partOfSpeech: string): string[] {
  const headword = word.trim().toLowerCase();
  const forms = new Set([headword]);

  if (!/^[a-z]+$/.test(headword)) {
    return [...forms];
  }

  if (partOfSpeech === 'noun' || partOfSpeech === 'verb') {
    if (/[^aeiou]y$/.test(headword)) {
      forms.add(`${headword.slice(0, -1)}ies`);
    } else if (/(?:s|x|z|ch|sh|o)$/.test(headword)) {
      forms.add(`${headword}es`);
    } else {
      forms.add(`${headword}s`);
    }
  }

  if (partOfSpeech === 'verb') {
    if (/[^aeiou]y$/.test(headword)) {
      forms.add(`${headword.slice(0, -1)}ied`);
    } else if (headword.endsWith('e')) {
      forms.add(`${headword}d`);
    } else {
      forms.add(`${headword}ed`);
    }

    if (headword.endsWith('ie')) {
      forms.add(`${headword.slice(0, -2)}ying`);
    } else if (headword.endsWith('e')) {
      forms.add(`${headword.slice(0, -1)}ing`);
    } else {
      forms.add(`${headword}ing`);
    }
  }

  return [...forms];
}

function containsHeadword(example: string, word: string, partOfSpeech: string): boolean {
  return regularWordForms(word, partOfSpeech).some((form) => {
    const escapedWord = form
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');
    const pattern = new RegExp(`(^|[^a-z])${escapedWord}($|[^a-z])`, 'iu');
    return pattern.test(example);
  });
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
    const missingFields = blankFieldCount(candidate);
    const tagsAreWellFormed = hasWellFormedTags(candidate.tags);
    const levelIsValid = candidate.level === 'ielts-6-6.5';

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
      return;
    }

    const id = (candidate.id as string).trim();
    const word = (candidate.word as string).trim();
    const partOfSpeech = (candidate.partOfSpeech as string).trim();
    const tags = candidate.tags as string[];
    const example = candidate.example as string;
    const textFields = authoredTextFields.map((field) => candidate[field] as string);
    let hasPolicyIssue = false;

    if (!curatedIdPattern.test(id)) {
      issues.push({ index, code: 'invalid-id' });
      summary.invalidIds += 1;
      hasPolicyIssue = true;
    }

    if (!approvedPartsOfSpeech.has(partOfSpeech)) {
      issues.push({ index, code: 'invalid-part-of-speech' });
      summary.invalidPartsOfSpeech += 1;
      hasPolicyIssue = true;
    }

    const invalidTagCount = tags.filter((tag) => !approvedTags.has(tag)).length;
    if (invalidTagCount > 0) {
      issues.push({ index, code: 'invalid-tag' });
      summary.invalidTags += invalidTagCount;
      hasPolicyIssue = true;
    }

    const placeholderCount = textFields.filter((value) => placeholderPattern.test(value)).length;
    if (placeholderCount > 0) {
      issues.push({ index, code: 'placeholder-text' });
      summary.placeholderFields += placeholderCount;
      hasPolicyIssue = true;
    }

    if (
      approvedPartsOfSpeech.has(partOfSpeech) &&
      !containsHeadword(example, word, partOfSpeech)
    ) {
      issues.push({ index, code: 'example-mismatch' });
      summary.exampleMismatches += 1;
      hasPolicyIssue = true;
    }

    if (hasPolicyIssue) {
      return;
    }

    const normalizedId = id.toLowerCase();
    const normalizedWord = word.toLowerCase();
    const hasDuplicateId = ids.has(normalizedId);
    const hasDuplicateWord = words.has(normalizedWord);
    ids.add(normalizedId);
    words.add(normalizedWord);

    if (hasDuplicateId) {
      issues.push({ index, code: 'duplicate-id' });
      summary.duplicateIds += 1;
      return;
    }

    if (hasDuplicateWord) {
      issues.push({ index, code: 'duplicate-word' });
      summary.duplicateWords += 1;
    }
  });

  return { issues, summary };
}
