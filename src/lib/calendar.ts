/** 캘린더 격자와 군 일정(진급·전역) 계산. 날짜는 전부 `YYYY-MM-DD` 문자열이다. */

export interface CalendarCell {
  /** `YYYY-MM-DD` */
  iso: string;
  day: number;
  /** 격자를 채우려고 끌어온 앞뒤 달의 날짜면 false */
  inMonth: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** 오늘(로컬 기준)의 `YYYY-MM-DD`. */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * 일요일 시작 6주 격자(42칸). 칸 수를 달마다 바꾸지 않아야
 * 달을 넘길 때 아래 범례 시트가 들썩이지 않는다.
 *
 * @param month 1–12
 */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    return {
      iso: toISO(date),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month - 1,
    };
  });
}

export function addMonths(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/**
 * 입대일 기준 진급 예정일.
 *
 * 현행 육군 병 진급 소요는 이병 2개월 · 일병 6개월 · 상병 6개월이고,
 * 진급은 해당 월 1일자로 이뤄진다.
 * 정책이 바뀌거나 군종별로 다를 수 있어 **서버가 계산해 내려주는 편이 옳다**.
 *
 * TODO(백엔드): 복무 정보 저장 API 가 생기면 진급일도 함께 내려받는다.
 */
const PROMOTION_MONTHS = [2, 8, 14];
const PROMOTION_RANKS = ['일병', '상병', '병장'];

export function promotionDates(enlistedOn: string | null): { iso: string; rank: string }[] {
  if (!enlistedOn) return [];

  const [y, m, d] = enlistedOn.split('-').map(Number);
  if (!y || !m || !d) return [];

  return PROMOTION_MONTHS.map((months, index) => {
    const date = new Date(Date.UTC(y, m - 1 + months, 1));
    return { iso: toISO(date), rank: PROMOTION_RANKS[index]! };
  });
}
