import { create } from 'zustand';
import { setCsrfToken } from '@/api/client';
import type { AuthSession, User } from '@/api/schemas';

interface AuthState {
  user: User | null;
  /** 부팅 시 세션 확인이 끝났는지. false 동안은 라우팅 판단을 미룬다. */
  initialized: boolean;
  setSession: (session: AuthSession | null) => void;
  markInitialized: () => void;
}

/**
 * 세션 자체는 HttpOnly 쿠키라 JS 가 못 읽는다.
 * 여기 담는 건 화면 분기에 필요한 사용자 정보와 CSRF 토큰뿐이다.
 * 따라서 persist 를 쓰지 않는다 — 새로고침 시 /sessions/current 로 다시 확인한다.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  setSession: (session) => {
    setCsrfToken(session?.csrfToken ?? null);
    set({ user: session?.user ?? null });
  },
  markInitialized: () => set({ initialized: true }),
}));
