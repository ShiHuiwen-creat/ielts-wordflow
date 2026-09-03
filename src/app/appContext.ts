import { createContext } from 'react';
import type { VocabularyEntry } from '../features/vocabulary/types';
import type { StorageRepository } from '../lib/storage/types';

export interface AppDependencies {
  repository: StorageRepository;
  vocabulary: readonly VocabularyEntry[];
  now: () => Date;
  utcOffsetMinutes: () => number;
}

export const AppContext = createContext<AppDependencies | undefined>(undefined);
