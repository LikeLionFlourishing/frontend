import { notifications } from '@/api/endpoints';

/**
 * Web Push 구독.
 *
 * `POST /push-subscriptions` 는 브라우저가 만든 `PushSubscription` 을 그대로 받는다.
 * 구독을 만들려면 서버의 VAPID 공개키가 필요한데 **계약에 이걸 내려주는 엔드포인트가
 * 없다**. 그래서 빌드 환경변수로 받는다.
 *
 *   VITE_VAPID_PUBLIC_KEY=<base64url 인코딩된 공개키>
 *
 * 키가 없으면 구독을 만들 수 없다. 그때는 조용히 실패시키지 않고
 * `PushUnavailableError` 를 던져 화면이 이유를 말할 수 있게 한다.
 *
 * TODO(백엔드): 공개키를 `GET /push-public-key` 같은 걸로 내려주면
 * 환경변수 없이도 동작한다. 키 교체도 배포 없이 된다.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** 해제할 때 필요한 서버측 구독 id. 서버가 endpoint 로 다시 찾아주지 않아 로컬에 둔다. */
const SUBSCRIPTION_ID_KEY = 'jedaero.push-subscription-id';

export class PushUnavailableError extends Error {
  constructor(
    message: string,
    /** 화면에서 안내 문구를 고르기 위한 구분값 */
    readonly reason: 'UNSUPPORTED' | 'NO_KEY' | 'DENIED',
  ) {
    super(message);
    this.name = 'PushUnavailableError';
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
}

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY);
}

/**
 * 알림 권한을 받고 구독을 만들어 서버에 등록한다.
 * 이미 구독이 있으면 그대로 재등록한다(서버가 같은 endpoint 면 200 으로 갱신한다).
 */
export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) {
    throw new PushUnavailableError('이 브라우저는 알림을 지원하지 않아요.', 'UNSUPPORTED');
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new PushUnavailableError('알림 서버 키가 설정되지 않았어요.', 'NO_KEY');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new PushUnavailableError('기기 설정에서 알림을 허용해 주세요.', 'DENIED');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      // 사용자에게 보이는 알림에만 쓴다. 조용한 푸시는 브라우저가 막는다.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();
  const saved = await notifications.subscribePush({
    endpoint: subscription.endpoint,
    expirationTime: toIsoOrNull(subscription.expirationTime),
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
    userAgent: navigator.userAgent.slice(0, 512),
  });

  localStorage.setItem(SUBSCRIPTION_ID_KEY, saved.id);
}

/** 서버 등록을 지우고 브라우저 구독도 해제한다. */
export async function unsubscribeFromPush(): Promise<void> {
  const id = localStorage.getItem(SUBSCRIPTION_ID_KEY);
  if (id) {
    // 이미 지워졌으면 404 가 온다. 해제 자체는 성공으로 본다.
    await notifications.unsubscribePush(id).catch(() => {});
    localStorage.removeItem(SUBSCRIPTION_ID_KEY);
  }

  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
}

/** `PushSubscription.expirationTime` 은 epoch ms 다. 계약은 date-time 을 받는다. */
function toIsoOrNull(value: number | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

/**
 * VAPID 공개키는 base64url 문자열로 오지만 `subscribe` 는 바이트 배열을 받는다.
 * `ArrayBuffer` 를 명시해 만들어야 한다 — 기본 `Uint8Array` 는 `SharedArrayBuffer`
 * 가능성 때문에 `BufferSource` 로 안 받아준다.
 */
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);

  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
