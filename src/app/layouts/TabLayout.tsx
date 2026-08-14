import { NavLink, Outlet } from 'react-router-dom';
import { clsx } from '@/lib/clsx';
import { Icon, type IconName } from '@/components/Icon';

// 피부점호는 탭이 아니다. 홈 또는 알림에서만 진입한다. (NEW 유저플로우 3장)
const TABS: { to: string; label: string; icon: IconName; end: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/records', label: '기록', icon: 'clock', end: false },
  { to: '/my', label: '설정', icon: 'gear', end: false },
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
                    // 라이트 테마에서는 활성 탭이 검정 pill + 흰 글자다.
                    // (`text-base` 는 글자 크기 유틸리티라 색으로 못 쓴다 → text-white)
                    isActive ? 'bg-fg font-semibold text-white' : 'text-fg-muted',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={tab.icon} className="size-5" />
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
