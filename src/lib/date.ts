const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** `2026-07-30` → `07.30(수)` — 시안의 RECENT RECORD 표기. */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;

  // 로컬 타임존 보정을 피하려고 UTC 로 만들고 UTC 요일을 읽는다.
  const weekday = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}(${weekday})`;
}

/** `2026-05-31` → `5월 31일 (토)` — 기록 목록 카드 표기. */
export function formatListDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;

  const weekday = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${weekday})`;
}

/** `2026-05-31` → `2026.05.31` — 기록 상세 제목·타임라인 표기. */
export function formatDotDate(isoDate: string): string {
  return isoDate.slice(0, 10).replaceAll('-', '.');
}

/** 두 날짜(YYYY-MM-DD) 사이의 일수. 같은 날이면 0. */
export function daysBetween(fromISO: string, toISO: string): number {
  const from = Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${toISO.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}
