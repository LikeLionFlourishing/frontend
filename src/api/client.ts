import { ApiError, NetworkError } from './problem';
import type { Problem } from './schemas';

const BASE = '/v1';

/**
 * CSRF 토큰은 GET /sessions/current 응답에 들어 있다.
 * 상태 변경 요청(POST/PUT/PATCH/DELETE)에는 X-CSRF-Token 헤더가 필요하다.
 *
 * store 가 아니라 모듈 변수에 두는 이유: client.ts 가 store 를 import 하면
 * store 에서 client 를 쓰는 순환 참조가 생긴다. 세션 갱신 시 setCsrfToken 으로 넣어준다.
 */
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

/** 401 을 받았을 때 앱 전체가 반응할 수 있게 하는 훅. router 에서 등록한다. */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** POST /skin-reports 등 중복 저장을 막아야 하는 요청에 필요하다. */
  idempotencyKey?: string;
  headers?: Record<string, string>;
  /** AI 호출은 오래 걸린다. 기본 10초, AI 경로는 25초를 쓴다. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 10_000;
export const AI_TIMEOUT_MS = 25_000;

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    query,
    idempotencyKey,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = options;

  const url = new URL(BASE + path, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  const isMutation = method !== 'GET';
  const requestHeaders: Record<string, string> = { Accept: 'application/json', ...headers };

  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (isMutation && csrfToken) requestHeaders['X-CSRF-Token'] = csrfToken;
  if (idempotencyKey) requestHeaders['Idempotency-Key'] = idempotencyKey;

  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const composedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      // 세션 쿠키를 싣기 위해 반드시 필요하다.
      credentials: 'include',
      signal: composedSignal,
    });
  } catch {
    clearTimeout(timer);
    if (timeoutController.signal.aborted) {
      throw new ApiError({
        status: 504,
        code: 'CLIENT_TIMEOUT',
        message: '응답이 지연되고 있어요.',
        problem: null,
      });
    }
    throw new NetworkError();
  }
  clearTimeout(timer);

  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    const problem = await readProblem(response);
    const error = new ApiError({
      status: response.status,
      code: problem?.code ?? `HTTP_${response.status}`,
      message: problem?.detail ?? response.statusText,
      problem,
      retryAfterSeconds: readRetryAfter(response),
    });
    if (response.status === 401) onUnauthorized?.();
    throw error;
  }

  return (await response.json()) as T;
}

async function readProblem(response: Response): Promise<Problem | null> {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as Problem;
  } catch {
    return null;
  }
}

function readRetryAfter(response: Response): number | null {
  const raw = response.headers.get('Retry-After');
  if (!raw) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds : null;
}

/** Idempotency-Key 는 같은 논리적 제출에 대해 재시도해도 같은 값을 써야 한다. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
