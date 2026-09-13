# Vocabulary data sources and licence

## Provenance

The three `core-*.json` files are an independent compilation created for IELTS WordFlow in September 2026. No commercial vocabulary list, examination question bank, dictionary entry, example sentence, or translation was copied into the dataset.

Selection began with general academic-English frequency concepts and recurring IELTS-style subject areas, then balanced useful B2-level words across academic study, culture, the economy, education, the environment, health, science, society, and technology. Public descriptions of academic English and common language-test themes informed those broad selection principles only. No external list was imported, followed in source order, or used as a source of authored wording.

For every entry, the project authors independently:

- selected the headword and its most useful sense for an IELTS 6–6.5 learner;
- transcribed a broadly British IPA pronunciation, accepting normal accent variation;
- wrote the concise Chinese definition;
- wrote a new English example sentence; and
- wrote the paired Chinese translation from that sentence.

Words and pronunciation facts are not copied prose. All definitions, examples, and translations in these batches are original project text.

## Reviewed batches

The initial release contains three separately reviewable batches of 100 entries:

- `core-1.json`: academic reasoning, evidence, research, and essay language;
- `core-2.json`: education, work, economics, culture, and public life; and
- `core-3.json`: environment, science, technology, and health.

Each batch is checked as JSON and by the shared TypeScript validator. The checks cover required fields, exact level, stable lowercase IDs, approved parts of speech and tags, placeholders, duplicate IDs and words, and example/headword matching.

Every example must contain the exact headword as a separate word. The validator does not guess inflections, because suffix heuristics can accept nonexistent forms or confuse a short headword with a longer word. Future entries must follow the same exact-headword rule.

## Controlled vocabulary

Parts of speech are limited to `noun`, `verb`, `adjective`, and `adverb`.

Topic tags are limited to this small union: `academic`, `culture`, `economy`, `education`, `environment`, `health`, `science`, `society`, and `technology`. Tags describe likely study contexts, not an exclusive meaning of the word.

Every entry has the exact level `ielts-6-6.5`. This label describes the collection's intended learning range; it is not a claim that an examination owner has assigned an official band to each word.

## Data licence

Copyright © 2026 IELTS WordFlow contributors.

The vocabulary data in `src/features/vocabulary/data/core-1.json`, `core-2.json`, and `core-3.json`—including its selection, Chinese definitions, English examples, and Chinese translations—is made available under the [Creative Commons Attribution 4.0 International licence](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0).

Reuse must provide appropriate credit, link to the licence, and indicate whether changes were made. This data licence is separate from the repository's software-code licence. No third-party text or separately licensed dataset is included in the three core files.
