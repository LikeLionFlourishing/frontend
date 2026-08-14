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

      {/*
       * 시안의 floating 하단 탭 (홈화면 15:8696).
       * 화면 폭을 채우지 않고 268×72 로 가운데 떠 있다.
       * 비활성 탭도 47px 원 배경을 가진다 — 아이콘만 놓으면 시안과 다르다.
       */}
      <nav className="safe-bottom fixed bottom-0 left-1/2 z-20 -translate-x-1/2 pb-4">
        <ul className="flex h-[72px] items-center gap-[9px] rounded-pill bg-[#F8F8F8] px-[19px]">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  clsx(
                    'flex h-[47px] items-center justify-center gap-2 transition',
                    // 라이트 테마에서는 활성 탭이 검정 pill + 흰 글자다.
                    // (`text-base` 는 글자 크기 유틸리티라 색으로 못 쓴다 → text-white)
                    isActive
                      ? 'w-[113px] rounded-pill bg-fg font-semibold text-white'
                      : 'w-[47px] rounded-full bg-[#F3F3F3] text-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={tab.icon} className="size-5" />
                    {isActive && <span className="text-sm">{tab.label}</span>}
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
