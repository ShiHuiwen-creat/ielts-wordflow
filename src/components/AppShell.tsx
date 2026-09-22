import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: ReactNode }) {
  function focusMainNavigation() {
    document.querySelector<HTMLElement>('#main-navigation a')?.focus();
  }

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-navigation"
        onClick={(event) => {
          event.preventDefault();
          focusMainNavigation();
        }}
      >
        跳到主导航
      </a>
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
