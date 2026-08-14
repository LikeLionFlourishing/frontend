/*
 * Web Push 수신용 서비스워커.
 *
 * 페이로드는 서버가 정하는데 계약에 형태가 없어서, 표준 형태
 * `{ title, body, url }` 을 기대하되 없으면 기본 문구로 떨어진다.
 * TODO(백엔드): 발송 페이로드 스키마가 정해지면 여기 파싱을 맞춘다.
 *
 * 개발 중에는 MSW 워커(`/mockServiceWorker.js`)가 같은 스코프에 등록돼
 * 이 워커가 밀려날 수 있다. 푸시 확인은 목을 끈 빌드에서 한다.
 */

const DEFAULT_TITLE = '제대로';
const DEFAULT_BODY = '오늘의 피부점호 시간이에요.';

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // 텍스트로 오면 본문으로만 쓴다.
    payload = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || DEFAULT_TITLE, {
      body: payload.body || DEFAULT_BODY,
      icon: '/illustrations/summary.png',
      // 같은 태그면 알림이 쌓이지 않고 갱신된다. 매일 오는 알림이라 쌓이면 안 된다.
      tag: payload.tag || 'daily-check-in',
      data: { url: payload.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 이미 앱이 열려 있으면 새 창을 띄우지 않고 그 창을 쓴다.
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
