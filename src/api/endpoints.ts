import { AI_TIMEOUT_MS, request } from './client';
import type {
  AuthSession,
  CreateSkinReportRequest,
  DailyCheckIn,
  FollowUp,
  Home,
  InterpretReportRequest,
  NotificationSettings,
  Onboarding,
  OnboardingRequest,
  ReportInterpretation,
  SaveFollowUpRequest,
  SkinReportDetail,
  SkinReportList,
  SkinReportOptions,
  User,
} from './schemas';

export const auth = {
  register: (body: { email: string; password: string }) =>
    request<AuthSession>('/users', { method: 'POST', body }),

  login: (body: { email: string; password: string }) =>
    request<AuthSession>('/sessions', { method: 'POST', body }),

  currentSession: () => request<AuthSession>('/sessions/current'),

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

  updateSettings: (enabled: boolean) =>
    request<NotificationSettings>('/me/notification-settings', {
      method: 'PATCH',
      body: { enabled },
    }),

  subscribePush: (body: {
    endpoint: string;
    expirationTime: string | null;
    keys: { p256dh: string; auth: string };
    userAgent: string;
  }) => request('/push-subscriptions', { method: 'POST', body }),

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
  send: (events: unknown[]) =>
    request('/analytics-events', { method: 'POST', body: { events } }).catch(() => {
      // 측정 실패가 사용자 흐름을 막으면 안 된다.
    }),
};
