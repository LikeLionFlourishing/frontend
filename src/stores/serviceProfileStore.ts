import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 온보딩에서 받지만 **아직 저장할 API 가 없는** 값.
 *
 * 2026-08-15 기획 결정으로 복무 정보(군종·입대일·전역예정일·현재 직급)와
 * 그 하위 기능이던 자주 겪는 환경, 기상 권역은 범위에서 빠졌다.
 * 남은 건 기본 피부점호 시각 하나뿐이다.
 *
 * TODO(백엔드): `NotificationSettings.time` 이 `const '17:30'` 이라 저장할 곳이 없다.
 * 사용자별 `HH:mm` 로 열리면 이 스토어를 지우고 API 로 옮긴다.
 * (docs/backend-요청.md 6번)
 */
export interface ServiceProfile {
  /** `HH:mm` */
  checkInTime: string;
}

interface ServiceProfileState extends ServiceProfile {
  patch: (partial: Partial<ServiceProfile>) => void;
  reset: () => void;
}

const EMPTY: ServiceProfile = {
  checkInTime: '17:30',
};

export const useServiceProfileStore = create<ServiceProfileState>()(
  persist(
    (set) => ({
      ...EMPTY,
      patch: (partial) => set(partial),
      reset: () => set({ ...EMPTY }),
    }),
    { name: 'jedaero.service-profile' },
  ),
);
