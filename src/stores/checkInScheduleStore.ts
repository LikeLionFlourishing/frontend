import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 날짜별 피부점호 설정 (주간 캘린더 · Figma 15:8798 / 15:8832).
 *
 * 계약에 대응하는 엔드포인트가 **없다**. `PATCH /me/notification-settings` 는
 * `enabled` 하나만 받고 시각은 서버가 `17:30` 으로 고정한다. 날짜별 예외라는
 * 개념 자체가 API 에 없어서 값 전부를 로컬에 둔다.
 *
 * TODO(백엔드): 아래 형태의 컬렉션이 생기면 이 스토어를 지우고 API 로 옮긴다.
 *   GET/PUT /me/check-in-schedule/{date} → { alarm, time, environments }
 *   GET     /me/check-in-schedule?from=&to=   (캘린더 한 달치)
 */

export type AlarmMode =
  /** 기본 점호 시각을 그대로 쓴다 */
  | 'DEFAULT'
  /** 이 날만 다른 시각에 알린다 */
  | 'CUSTOM'
  /** 이 날은 알리지 않는다 */
  | 'OFF';

export interface DateSchedule {
  alarm: AlarmMode;
  /** `HH:mm`. `alarm === 'CUSTOM'` 일 때만 의미가 있다. */
  time: string | null;
  environments: string[];
}

/**
 * 날짜별 '예상 환경' 선택지.
 *
 * 온보딩의 `ENVIRONMENT_OPTIONS`(자주 겪는 환경) 와 목록이 다르다. 이쪽은
 * '그날 일정으로 예상되는 것'이라 면도·습도·먼지처럼 상시적인 항목은 빠진다.
 * 시안(15:8798)에 나온 네 개가 전부다.
 */
export const DAILY_ENVIRONMENT_OPTIONS = [
  { value: 'OUTDOOR_TRAINING', label: '야외활동 훈련', icon: 'tent' },
  { value: 'PROTECTIVE_GEAR', label: '보호장비 장시간 착용', icon: 'mask' },
  { value: 'NIGHT_SHIFT', label: '야간 교대 일정', icon: 'moon' },
  { value: 'NONE', label: '특별히 없음', icon: 'minusCircle' },
] as const;

export const EMPTY_SCHEDULE: DateSchedule = {
  alarm: 'DEFAULT',
  time: null,
  environments: [],
};

interface CheckInScheduleState {
  /** key 는 `YYYY-MM-DD` */
  byDate: Record<string, DateSchedule>;
  save: (date: string, schedule: DateSchedule) => void;
  clear: (date: string) => void;
}

export const useCheckInScheduleStore = create<CheckInScheduleState>()(
  persist(
    (set) => ({
      byDate: {},

      save: (date, schedule) => set((state) => ({ byDate: { ...state.byDate, [date]: schedule } })),

      clear: (date) =>
        set((state) => {
          const { [date]: _removed, ...rest } = state.byDate;
          return { byDate: rest };
        }),
    }),
    { name: 'jedaero.check-in-schedule' },
  ),
);

/**
 * 캘린더가 그 날에 찍을 마커.
 *
 * **저장한 날짜만** 마커를 받는다. 손대지 않은 날까지 기본 시각 점을 찍으면
 * 달력 전체가 남색으로 덮여 마커가 정보를 잃는다(시안도 세 날짜에만 찍혀 있다).
 * 시각 마커와 환경 마커는 한 칸에 함께 찍힐 수 있다.
 */
export function markersOf(schedule: DateSchedule | undefined) {
  if (!schedule) return { time: null, env: false };
  return {
    time: schedule.alarm === 'OFF' ? null : schedule.alarm,
    env: schedule.environments.length > 0 && !schedule.environments.includes('NONE'),
  };
}
