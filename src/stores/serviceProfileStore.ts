import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 온보딩에서 받지만 **아직 저장할 API 가 없는** 값들.
 *
 * OpenAPI 의 `PUT /me/onboarding` 은 동의와 알림 수신 여부만 받는다.
 * 복무 정보·자주 겪는 환경·기상 권역·기본 점호 시각은 계약에 없어서
 * 우선 로컬에 두고 화면을 완성해 둔다.
 *
 * TODO(백엔드): 아래 값을 저장할 필드가 생기면 이 스토어를 지우고 API 로 옮긴다.
 *  - 군종 / 입대일 / 전역예정일 (홈 D-Day 위젯, 계급 산출)
 *  - 자주 겪는 군 생활 환경 (피부점호 예상 환경 기본값)
 *  - 기상 권역 (홈 BRIEFING)
 *  - 기본 피부점호 시각 (현재 API 는 '17:30' 고정)
 */

export type MilitaryBranch = 'ARMY' | 'NAVY' | 'AIR_FORCE' | 'MARINE' | 'OTHER';

export const BRANCH_OPTIONS: { value: MilitaryBranch; label: string }[] = [
  { value: 'ARMY', label: '육군' },
  { value: 'NAVY', label: '해군' },
  { value: 'AIR_FORCE', label: '공군' },
  { value: 'MARINE', label: '해병대' },
  { value: 'OTHER', label: '기타' },
];

export const ENVIRONMENT_OPTIONS = [
  { value: 'REPEATED_SHAVING', label: '반복 면도' },
  { value: 'OUTDOOR_TRAINING', label: '야외활동·훈련' },
  { value: 'HOT_HUMID', label: '덥고 습한 환경' },
  { value: 'DUST_SOIL', label: '먼지·흙 노출' },
  { value: 'PROTECTIVE_GEAR', label: '보호장비 장시간 착용' },
  { value: 'NIGHT_SHIFT', label: '야간·교대 일정' },
  { value: 'NONE', label: '특별히 없음' },
] as const;

export const REGION_OPTIONS = [
  { value: 'CAPITAL', label: '수도권' },
  { value: 'GANGWON_WEST', label: '강원 영서' },
  { value: 'GANGWON_EAST', label: '강원 영동' },
  { value: 'CHUNGCHEONG', label: '충청' },
  { value: 'JEOLLA', label: '전라' },
  { value: 'GYEONGSANG', label: '경상' },
  { value: 'JEJU', label: '제주' },
] as const;

interface ServiceProfile {
  branch: MilitaryBranch | null;
  enlistedOn: string | null;
  dischargeOn: string | null;
  environments: string[];
  region: string | null;
  /** `HH:mm` */
  checkInTime: string;
}

interface ServiceProfileState extends ServiceProfile {
  patch: (partial: Partial<ServiceProfile>) => void;
  reset: () => void;
}

const EMPTY: ServiceProfile = {
  branch: null,
  enlistedOn: null,
  dischargeOn: null,
  environments: [],
  region: null,
  checkInTime: '17:30',
};

export const useServiceProfileStore = create<ServiceProfileState>()(
  persist(
    (set) => ({
      ...EMPTY,
      patch: (partial) => set(partial),
      reset: () => set({ ...EMPTY }),
    }),
    { name: 'haengbogwan.service-profile' },
  ),
);

/** 군종별 표준 복무기간(개월). 전역예정일 자동 계산에 쓴다. */
const SERVICE_MONTHS: Record<MilitaryBranch, number> = {
  ARMY: 18,
  MARINE: 18,
  NAVY: 20,
  AIR_FORCE: 21,
  OTHER: 18,
};

/**
 * 입대일과 군종으로 전역예정일을 추정한다. 사용자가 직접 수정할 수 있어야 한다.
 *
 * 주의: 복무기간은 정책에 따라 바뀐다. 확정 값은 기획에서 관리하고,
 * 최종적으로는 서버가 계산해 내려주는 편이 안전하다.
 */
export function estimateDischargeDate(enlistedOn: string, branch: MilitaryBranch): string | null {
  const [y, m, d] = enlistedOn.split('-').map(Number);
  if (!y || !m || !d) return null;

  // 복무 만료일은 '입대일 + N개월 - 1일'
  const end = new Date(Date.UTC(y, m - 1 + SERVICE_MONTHS[branch], d));
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}
