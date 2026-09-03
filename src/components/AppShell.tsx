import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span className="brand-name">IELTS WordFlow</span>
        </div>
      </header>
      <main className="app-main">{children}</main>
      <BottomNav />
    </div>
  );
}
