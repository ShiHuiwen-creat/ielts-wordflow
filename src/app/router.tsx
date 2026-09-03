import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { OnboardingPage } from '../pages/OnboardingPage';
import { StorageBlockedPage } from '../pages/StorageBlockedPage';
import { TodayPage } from '../pages/TodayPage';
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
  const { state, applySettings } = useDashboard();

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
        <Route path="/study" element={<PlaceholderPage title="学习" description="学习流程即将开放。" />} />
        <Route path="/vocabulary" element={<PlaceholderPage title="词库" description="词库浏览即将开放。" />} />
        <Route path="/stats" element={<PlaceholderPage title="统计" description="学习统计即将开放。" />} />
        <Route path="/settings" element={<PlaceholderPage title="设置" description="设置与数据工具即将开放。" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
