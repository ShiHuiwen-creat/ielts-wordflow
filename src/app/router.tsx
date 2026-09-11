import { useContext } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { OnboardingPage } from '../pages/OnboardingPage';
import { StorageBlockedPage } from '../pages/StorageBlockedPage';
import { StudyPage } from '../pages/StudyPage';
import { TodayPage } from '../pages/TodayPage';
import { AppContext } from './appContext';
import { useDashboard } from './useDashboard';

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="page-stack" aria-labelledby="placeholder-title">
      <p className="eyebrow">IELTS WordFlow</p>
      <h1 id="placeholder-title">{title}</h1>
      <div className="card placeholder-card">
        <span className="placeholder-card__icon" aria-hidden="true">◇</span>
        <p>{description}</p>
      </div>
    </section>
  );
}

export function AppRouter() {
  const dependencies = useContext(AppContext);
  const { state, applySettings } = useDashboard();

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
            />
          )}
        />
        <Route path="/vocabulary" element={<PlaceholderPage title="词库" description="词库浏览即将开放。" />} />
        <Route path="/stats" element={<PlaceholderPage title="统计" description="学习统计即将开放。" />} />
        <Route path="/settings" element={<PlaceholderPage title="设置" description="设置与数据工具即将开放。" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
