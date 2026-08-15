/*
 * 연속 기록일(STREAK).
 *
 * 확정 시안의 홈에 새로 생긴 값인데 계약에 필드가 없어서 프론트가 계산한다.
 * `GET /skin-reports` 는 **피부보고가 있는 날**만 준다. `괜찮아요`(NO_DISCOMFORT)만
 * 누른 날은 DailyCheckIn 으로만 남고 목록에 안 나오므로 **연속이 끊긴 것처럼 보인다.**
 * 오늘 하루는 홈이 `today` 를 주기 때문에 그것만 보정한다.
 *
 * TODO(기획): STREAK 은 1차 MVP 기능명세서에 없는 값이다. 카드를 뺄지 정해야 한다.
 * (docs/명세-대조.md 2-7)
 *  - `괜찮아요` 만 누른 날을 연속으로 볼지
 *  - 어느 시각을 하루 경계로 볼지 (Asia/Seoul 자정)
 */

/** 최근 며칠까지 되짚어 볼지. 목록 요청 크기와 맞춰 둔다. */
export const STREAK_WINDOW = 30;

/**
 * 오늘부터 거꾸로 세어 기록이 끊기지 않은 날 수.
 *
 * 오늘 아직 기록하지 않았어도 어제까지 이어졌다면 그 길이를 그대로 보여준다.
 * (아침에 열었다고 어제까지의 연속이 0 으로 보이면 안 된다)
 */
export function computeStreak(recordedDates: Iterable<string>, serverDate: string): number {
  const recorded = new Set([...recordedDates].map((d) => d.slice(0, 10)));

  // 오늘 기록이 없으면 어제부터 센다.
  let cursor = recorded.has(serverDate) ? 0 : 1;
  let streak = 0;

  while (recorded.has(shiftDate(serverDate, -cursor)) && streak < STREAK_WINDOW) {
    streak += 1;
    cursor += 1;
  }
  return streak;
}

/**
 * 막대 그래프용. 오늘까지 최근 `count` 일의 기록 여부를 과거 → 오늘 순으로 준다.
 * 시안(25:28596)의 막대는 다섯 개다.
 */
export function recentDays(
  recordedDates: Iterable<string>,
  serverDate: string,
  count = 5,
): boolean[] {
  const recorded = new Set([...recordedDates].map((d) => d.slice(0, 10)));
  return Array.from({ length: count }, (_, i) =>
    recorded.has(shiftDate(serverDate, -(count - 1 - i))),
  );
}

/** `2026-08-15`, -2 → `2026-08-13` */
function shiftDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return isoDate;

  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}
