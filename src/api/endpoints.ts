import { AI_TIMEOUT_MS, request } from './client';
import type {
  AnalyticsEventInput,
  AuthSession,
  CreateSkinReportRequest,
  DailyCheckIn,
  FollowUp,
  Home,
  InterpretReportRequest,
  NotificationConsentInput,
  NotificationSettings,
  PushSubscription,
  Onboarding,
  OnboardingRequest,
  ReportInterpretation,
  SaveFollowUpRequest,
  SkinReportDetail,
  SkinReportList,
  SkinReportOptions,
  User,
} from './schemas';

/*
 * 계약 문서에는 `User.signupcompleted`(전부 소문자)로 적혀 있지만, 실서버는 나머지
 * 필드처럼 camelCase `signupCompleted` 로 내려준다(2026-08-18 실연동에서 확인).
 * 어느 철자로 와도 앱이 쓰는 `signupcompleted` 에 채워 넣어, 목·실서버 양쪽에서 돈다.
 * TODO(백엔드): 계약 문서의 오타를 `signupCompleted` 로 고치면 이 보정을 지운다.
 */
function normalizeSession(session: AuthSession): AuthSession {
  const user = session.user as User & { signupCompleted?: boolean };
  return {
    ...session,
    user: { ...user, signupcompleted: user.signupcompleted ?? user.signupCompleted ?? false },
  };
}

export const auth = {
  register: (body: { email: string; password: string }) =>
    request<AuthSession>('/users', { method: 'POST', body }).then(normalizeSession),

  login: (body: { email: string; password: string }) =>
    request<AuthSession>('/sessions', { method: 'POST', body }).then(normalizeSession),

  currentSession: () => request<AuthSession>('/sessions/current').then(normalizeSession),

  logout: () => request<void>('/sessions/current', { method: 'DELETE' }),

  me: () => request<User>('/me'),

  deleteAccount: () =>
    request<void>('/me', {
      method: 'DELETE',
      headers: { 'X-Confirm-Deletion': 'delete-account' },
    }),
};

export const onboarding = {
  complete: (body: OnboardingRequest) =>
    request<Onboarding>('/me/onboarding', { method: 'PUT', body }),
};

export const notifications = {
  getSettings: () => request<NotificationSettings>('/me/notification-settings'),

  /*
   * 계약상 PATCH 는 부분 갱신이라 보내지 않은 항목은 그대로 둔다. 그리고 알림을 켜려면
   * 이번 요청의 `consent.agreed` 이거나 서버에 저장된 활성 버전 동의가 있어야 한다.
   * 온보딩에서 알림을 건너뛴 사용자는 저장된 동의가 없으므로, 설정에서 켤 때 동의를
   * 함께 실어 보내지 않으면 422 로 막힌다.
   */
  updateSettings: (enabled: boolean, consent?: NotificationConsentInput) =>
    request<NotificationSettings>('/me/notification-settings', {
      method: 'PATCH',
      body: consent ? { enabled, consent } : { enabled },
    }),

  subscribePush: (body: {
    endpoint: string;
    expirationTime: string | null;
    keys: { p256dh: string; auth: string };
    userAgent: string;
  }) => request<PushSubscription>('/push-subscriptions', { method: 'POST', body }),

  unsubscribePush: (subscriptionId: string) =>
    request<void>(`/push-subscriptions/${subscriptionId}`, { method: 'DELETE' }),
};

export const home = {
  get: () => request<Home>('/home'),

  /** `오늘은 특별한 불편이 없어요` 원탭 저장. date 는 서버 기준 오늘(Asia/Seoul). */
  saveNoDiscomfort: (date: string) =>
    request<DailyCheckIn>(`/daily-check-ins/${date}`, {
      method: 'PUT',
      body: { state: 'NO_DISCOMFORT' },
    }),
};

export const referenceData = {
  /** 선택지 라벨은 서버가 준다. 화면에 한글 문구를 하드코딩하지 않는다. */
  skinReportOptions: () => request<SkinReportOptions>('/reference-data/skin-report-options'),
};

export const reports = {
  /** AI 구조화. 실패해도 200 + processingStatus: FAILED 로 온다. */
  interpret: (body: InterpretReportRequest) =>
    request<ReportInterpretation>('/report-interpretations', {
      method: 'POST',
      body,
      timeoutMs: AI_TIMEOUT_MS,
    }),

  create: (body: CreateSkinReportRequest, idempotencyKey: string) =>
    request<SkinReportDetail>('/skin-reports', {
      method: 'POST',
      body,
      idempotencyKey,
      timeoutMs: AI_TIMEOUT_MS,
    }),

  get: (reportId: string) => request<SkinReportDetail>(`/skin-reports/${reportId}`),

  list: (params: { cursor?: string; limit?: number } = {}) =>
    request<SkinReportList>('/skin-reports', { query: params }),

  /** aiGenerationStatus 가 FALLBACK 인 SELF_CARE_GUIDE 에 한해 딱 한 번만 허용된다. */
  retryCareGuide: (reportId: string, idempotencyKey: string) =>
    request(`/skin-reports/${reportId}/care-guide-generations`, {
      method: 'POST',
      idempotencyKey,
      timeoutMs: AI_TIMEOUT_MS,
    }),
};

export const followUps = {
  get: (reportId: string) => request<FollowUp>(`/skin-reports/${reportId}/follow-up`),

  save: (reportId: string, body: SaveFollowUpRequest) =>
    request<FollowUp>(`/skin-reports/${reportId}/follow-up`, { method: 'PUT', body }),
};

export const analytics = {
  send: (events: AnalyticsEventInput[]) =>
    request('/analytics-events', { method: 'POST', body: { events } }).catch(() => {
      // 측정 실패가 사용자 흐름을 막으면 안 된다.
    }),
};
