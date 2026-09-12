import { coreVocabulary, coreVocabularyBatches } from '../src/features/vocabulary/data';
import { validateVocabulary } from '../src/features/vocabulary/schema';

const result = validateVocabulary(coreVocabulary);
const batchSizes = coreVocabularyBatches.map((batch) => batch.length);
const minimumsMet = result.summary.total >= 300 && batchSizes.every((size) => size >= 100);

console.log('Vocabulary validation');
console.log(`total entries: ${result.summary.total} (minimum 300)`);
console.log(`batch sizes: ${batchSizes.join(', ')} (minimum 100 each)`);
console.log(`duplicate IDs: ${result.summary.duplicateIds}`);
console.log(`duplicate words: ${result.summary.duplicateWords}`);
console.log(`missing fields: ${result.summary.missingFields}`);
console.log(`invalid IDs: ${result.summary.invalidIds}`);
console.log(`invalid levels: ${result.summary.invalidLevels}`);
console.log(`invalid parts of speech: ${result.summary.invalidPartsOfSpeech}`);
console.log(`invalid tags: ${result.summary.invalidTags}`);
console.log(`placeholder fields: ${result.summary.placeholderFields}`);
console.log(`example mismatches: ${result.summary.exampleMismatches}`);

if (!minimumsMet || result.issues.length > 0) {
  for (const issue of result.issues) {
    const entry = coreVocabulary[issue.index];
    console.error(`[${issue.index}] ${entry?.id ?? '<unknown>'}: ${issue.code}`);
  }
  process.exitCode = 1;
} else {
  console.log('status: valid');
}
