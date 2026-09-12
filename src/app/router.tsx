import { useContext } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { OnboardingPage } from '../pages/OnboardingPage';
import { SettingsPage } from '../pages/SettingsPage';
import { StorageBlockedPage } from '../pages/StorageBlockedPage';
import { StatsPage } from '../pages/StatsPage';
import { StudyPage } from '../pages/StudyPage';
import { TodayPage } from '../pages/TodayPage';
import { VocabularyDetailPage } from '../pages/VocabularyDetailPage';
import { VocabularyPage } from '../pages/VocabularyPage';
import { AppContext } from './appContext';
import { useDashboard } from './useDashboard';

export function AppRouter() {
  const dependencies = useContext(AppContext);
  const { state, applySettings, refreshDashboard } = useDashboard();

  if (dependencies === undefined) {
    throw new Error('AppRouter must be used within AppProviders.');
  }

  if (state.status === 'loading') {
    return (
      <main className="centered-page" aria-busy="true">
        <p className="eyebrow">IELTS WordFlow</p>
        <h1>正在准备今日学习…</h1>
      </main>
    );
  }

  if (state.status === 'storage-blocked') {
    return <StorageBlockedPage />;
  }

  if (!state.dashboard.settings.onboardingComplete) {
    return (
      <OnboardingPage
        settings={state.dashboard.settings}
        onComplete={applySettings}
      />
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<TodayPage dashboard={state.dashboard} />} />
        <Route
          path="/study"
          element={(
            <StudyPage
              queue={state.dashboard.queue}
              vocabulary={dependencies.vocabulary}
              repository={dependencies.repository}
              reviewDate={state.dashboard.today}
              autoSpeak={state.dashboard.settings.autoSpeak}
              now={dependencies.now}
              onReviewSaved={refreshDashboard}
            />
          )}
        />
        <Route
          path="/vocabulary"
          element={(
            <VocabularyPage
              progress={state.source.progress}
              vocabulary={dependencies.vocabulary}
            />
          )}
        />
        <Route
          path="/vocabulary/:wordId"
          element={(
            <VocabularyDetailPage
              progress={state.source.progress}
              vocabulary={dependencies.vocabulary}
            />
          )}
        />
        <Route
          path="/stats"
          element={(
            <StatsPage
              summary={state.dashboard.progressSummary}
              totalVocabulary={dependencies.vocabulary.length}
            />
          )}
        />
        <Route
          path="/settings"
          element={(
            <SettingsPage
              onDashboardChanged={(settings) => {
                if (settings !== undefined) {
                  applySettings(settings);
                }
                refreshDashboard();
              }}
              repository={dependencies.repository}
              settings={state.dashboard.settings}
            />
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
