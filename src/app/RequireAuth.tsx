import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const location = useLocation();

  // 세션 확인이 끝나기 전에 판단하면 새로고침마다 로그인 화면이 깜빡인다.
  if (!initialized) return <BootSplash />;

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // 온보딩을 마치지 않은 사용자는 다른 화면으로 들어가지 못한다.
  // (필수 동의 전에는 피부 보고를 저장할 수 없어야 한다 — F-00 수용 기준)
  const onboardingDone = user.signupcompleted;
  const isOnboardingRoute = location.pathname === '/onboarding';

  if (!onboardingDone && !isOnboardingRoute) return <Navigate to="/onboarding" replace />;
  if (onboardingDone && isOnboardingRoute) return <Navigate to="/" replace />;

  return <Outlet />;
}

function BootSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-base">
      <p className="text-sm text-fg-muted">불러오는 중…</p>
    </div>
  );
}
