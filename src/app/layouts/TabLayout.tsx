import { NavLink, Outlet } from 'react-router-dom';
import { clsx } from '@/lib/clsx';

// 피부점호는 탭이 아니다. 홈 또는 알림에서만 진입한다. (NEW 유저플로우 3장)
const TABS = [
  { to: '/', label: 'Home', icon: '⌂', end: true },
  { to: '/records', label: '기록', icon: '◷', end: false },
  { to: '/my', label: '설정', icon: '⚙', end: false },
];

export function TabLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col bg-base">
      <main className="flex-1 pb-28">
        <Outlet />
      </main>

      {/* 시안의 floating pill 형태 하단 탭 */}
      <nav className="safe-bottom fixed bottom-0 left-1/2 z-20 w-full max-w-app -translate-x-1/2 px-5 pb-4">
        <ul className="flex items-center justify-around rounded-pill bg-card-raised px-3 py-2">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 rounded-pill px-4 py-2 text-sm transition',
                    isActive ? 'bg-accent font-semibold text-panel-text' : 'text-fg-muted',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span aria-hidden="true" className="text-base">
                      {tab.icon}
                    </span>
                    {isActive && <span>{tab.label}</span>}
                    {!isActive && <span className="sr-only">{tab.label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
