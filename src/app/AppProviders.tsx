import type { ReactNode } from 'react';
import { coreVocabulary } from '../features/vocabulary/data';
import type { VocabularyEntry } from '../features/vocabulary/types';
import type { StorageRepository } from '../lib/storage/types';
import { AppContext } from './appContext';

interface AppProvidersProps {
  children: ReactNode;
  repository: StorageRepository;
  vocabulary?: readonly VocabularyEntry[];
  now?: () => Date;
  utcOffsetMinutes?: () => number;
}

export function AppProviders({
  children,
  repository,
  vocabulary = coreVocabulary,
  now = () => new Date(),
  utcOffsetMinutes = () => -new Date().getTimezoneOffset(),
}: AppProvidersProps) {
  return (
    <AppContext.Provider value={{ repository, vocabulary, now, utcOffsetMinutes }}>
      {children}
    </AppContext.Provider>
  );
}
