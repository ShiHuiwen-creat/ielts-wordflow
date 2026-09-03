import type { VocabularyEntry } from '../features/vocabulary/types';
import type { StorageRepository } from '../lib/storage/types';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { AppProviders } from './AppProviders';
import { AppRouter } from './router';

interface AppProps {
  repository: StorageRepository;
  vocabulary: readonly VocabularyEntry[];
  now?: () => Date;
  utcOffsetMinutes?: () => number;
  onReload?: () => void;
}

export function App({
  repository,
  vocabulary,
  now,
  utcOffsetMinutes,
  onReload,
}: AppProps) {
  return (
    <AppProviders
      repository={repository}
      vocabulary={vocabulary}
      now={now}
      utcOffsetMinutes={utcOffsetMinutes}
    >
      <AppErrorBoundary onReload={onReload}>
        <AppRouter />
      </AppErrorBoundary>
    </AppProviders>
  );
}
