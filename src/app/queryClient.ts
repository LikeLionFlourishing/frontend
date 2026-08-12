import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/problem';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // 인증·검증·충돌 오류는 재시도해도 결과가 같다.
        if (error instanceof ApiError && error.status < 500 && error.status !== 429) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      // AI 호출은 비용이 있고 중복 생성 위험이 있어 자동 재시도하지 않는다.
      // 재시도는 화면의 "다시 시도" 버튼으로만 한다.
      retry: false,
    },
  },
});

// 개발 중 콘솔에서 캐시를 비우거나 특정 쿼리를 다시 부를 때 쓴다.
// 예: __qc.invalidateQueries({ queryKey: ['home'] })
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __qc: QueryClient }).__qc = queryClient;
}

export const queryKeys = {
  session: ['session'] as const,
  home: ['home'] as const,
  reportOptions: ['reference-data', 'skin-report-options'] as const,
  reports: ['skin-reports'] as const,
  report: (id: string) => ['skin-reports', id] as const,
  followUp: (id: string) => ['skin-reports', id, 'follow-up'] as const,
  notificationSettings: ['notification-settings'] as const,
};
