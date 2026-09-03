import { NavLink } from 'react-router-dom';

const destinations = [
  { to: '/', icon: '⌂', label: '今日', end: true },
  { to: '/study', icon: '◇', label: '学习' },
  { to: '/vocabulary', icon: 'Aa', label: '词库' },
  { to: '/stats', icon: '▥', label: '统计' },
  { to: '/settings', icon: '⚙', label: '设置' },
] as const;

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      <div className="bottom-nav__inner">
        {destinations.map(({ to, icon, label, ...props }) => (
          <NavLink
            className={({ isActive }) =>
              `bottom-nav__link${isActive ? ' bottom-nav__link--active' : ''}`
            }
            key={to}
            to={to}
            {...props}
          >
            <span className="bottom-nav__icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
