import { analytics } from '@/api/endpoints';
import type { AnalyticsEventInput } from '@/api/schemas';

/**
 * 측정 이벤트 수집.
 *
 * 계약(`POST /analytics-events`)이 한 번에 1~20건을 받으므로 모아서 보낸다.
 * 매 이벤트마다 요청을 날리면 피부점호 한 번에 6번이 나간다.
 *
 * 보내는 값은 계약이 허용한 것만이다 — 서버가 그 밖의 속성을 거부하고,
 * 애초에 원문·부위·겉모습 같은 내용은 측정에 담지 않기로 되어 있다.
 */

type EventName = AnalyticsEventInput['name'];
type EventProperties = AnalyticsEventInput['properties'];

/** 계약 상한이 20건이다. */
const MAX_BATCH = 20;

/** 이만큼 조용하면 모아둔 걸 보낸다. */
const FLUSH_DELAY_MS = 3000;

let queue: AnalyticsEventInput[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function track(name: EventName, properties?: EventProperties): void {
  queue.push({
    eventId: crypto.randomUUID(),
    name,
    occurredAt: new Date().toISOString(),
    ...(properties ? { properties } : {}),
  });

  if (queue.length >= MAX_BATCH) {
    void flush();
    return;
  }

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), FLUSH_DELAY_MS);
}

export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;

  // 실패해도 되돌리지 않는다. 측정 때문에 같은 이벤트가 계속 쌓이면 안 된다.
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);

  await analytics.send(batch);
}

/**
 * 앱을 닫거나 탭을 숨기면 모아둔 이벤트가 사라진다. 그 전에 한 번 비운다.
 * `main.tsx` 에서 한 번만 부른다.
 */
export function installAnalyticsFlush(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
}
