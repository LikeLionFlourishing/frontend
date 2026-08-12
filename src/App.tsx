import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './app/queryClient';
import { router } from './app/router';
import { auth } from './api/endpoints';
import { setUnauthorizedHandler } from './api/client';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const setSession = useAuthStore((s) => s.setSession);
  const markInitialized = useAuthStore((s) => s.markInitialized);

  useEffect(() => {
    // 부팅 시 한 번: 쿠키 세션이 살아 있는지 확인하고 CSRF 토큰을 받아 둔다.
    // 이걸 먼저 하지 않으면 첫 상태 변경 요청이 CSRF 없이 나가서 실패한다.
    let cancelled = false;

    auth
      .currentSession()
      .then((session) => {
        if (!cancelled) setSession(session);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) markInitialized();
      });

    setUnauthorizedHandler(() => {
      setSession(null);
      queryClient.clear();
    });

    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, [setSession, markInitialized]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
