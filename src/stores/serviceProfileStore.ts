import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 온보딩에서 받지만 **아직 저장할 API 가 없는** 값.
 *
 * 2026-08-15 기획 결정으로 복무 정보(군종·입대일·전역예정일·현재 직급)와
 * 그 하위 기능이던 자주 겪는 환경, 기상 권역은 범위에서 빠졌다.
 * 남은 건 기본 피부점호 시각 하나뿐이다.
 *
 * v2 계약에서 사용자별 `HH:mm` 저장이 열렸다. 온보딩 마지막 화면에서 고른 값을
 * `PUT /me/onboarding` 의 `notificationTime` 으로 보낸다.
 * 이 스토어는 그때까지 화면이 값을 들고 있는 자리로만 남는다 —
 * 설정 화면에서 나중에 바꾸는 것은 P1 이다(`NotificationSettings.timeEditable`).
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
