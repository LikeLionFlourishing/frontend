import { http, HttpResponse, delay } from 'msw';
import * as fx from './fixtures';
import type { DailyCheckIn, Home, Problem } from '@/api/schemas';

const V1 = '/v1';

function problem(status: number, code: string, detail: string) {
  const body: Problem = {
    type: `https://api.example.invalid/problems/${code.toLowerCase().replace(/_/g, '-')}`,
    title: code,
    status,
    detail,
    code,
    requestId: `req_mock_${Math.random().toString(36).slice(2, 10)}`,
  };
  return HttpResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

/**
 * 시나리오 스위치 + 세션 내 상태.
 *
 * 콘솔에서 `__mock.scenario = 'ai-fail'` 처럼 바꿔 예외 화면을 즉시 재현한다.
 * `__mock.reset()` 으로 초기 상태(경과 미기록 1건 대기)로 되돌린다.
 * 시연 리허설과 예외 UI 확인에 쓴다.
 */
export const mockState = {
  scenario: 'happy' as 'happy' | 'ai-fail' | 'clinician' | 'slow' | 'server-error',
  aiDelayMs: 1200,

  /** 오늘 점호 상태. null 이면 미응답. */
  today: null as Home['today'],
  /** 미완료 경과. 경과를 저장하면 비운다. */
  pendingFollowUp: fx.home.pendingFollowUp,
  /**
   * 알림 수신 여부. 서버에 저장되는 설정이라 새로고침해도 유지돼야 한다.
   * 모듈 변수로 두면 리로드 때 초기화되므로 sessionStorage 를 쓴다.
   */
  get notificationEnabled() {
    return flag('notificationEnabled');
  },
  set notificationEnabled(v: boolean) {
    setFlag('notificationEnabled', v);
  },
  /**
   * false 로 두면 온보딩 흐름을 처음부터 볼 수 있다.
   * 새로고침해도 유지돼야 해서 sessionStorage 에 둔다 — 모듈 변수는 리로드 때 날아간다.
   */
  get onboardingCompleted() {
    return flag('onboardingCompleted');
  },
  set onboardingCompleted(v: boolean) {
    setFlag('onboardingCompleted', v);
  },

  /** 로그인하지 않은 상태를 재현할 때 false 로 둔다. */
  get authenticated() {
    return flag('authenticated');
  },
  set authenticated(v: boolean) {
    setFlag('authenticated', v);
  },

  reset() {
    this.scenario = 'happy';
    this.today = null;
    this.pendingFollowUp = fx.home.pendingFollowUp;
    this.notificationEnabled = true;
    this.onboardingCompleted = true;
    this.authenticated = true;
    localStorage.removeItem('haengbogwan.service-profile');
    localStorage.removeItem('haengbogwan.report-draft');
  },

  /** 온보딩을 처음부터 다시 보고 싶을 때. 로컬 프로필도 함께 비운다. */
  replayOnboarding() {
    this.onboardingCompleted = false;
    localStorage.removeItem('haengbogwan.service-profile');
    location.href = '/onboarding';
  },

  /** 로그아웃 상태에서 시작. */
  replaySignup() {
    this.authenticated = false;
    this.onboardingCompleted = false;
    localStorage.removeItem('haengbogwan.service-profile');
    location.href = '/signup';
  },
};

/** 기본값 true. sessionStorage 에 'false' 가 있을 때만 false. */
function flag(key: string): boolean {
  if (typeof sessionStorage === 'undefined') return true;
  return sessionStorage.getItem(`__mock.${key}`) !== 'false';
}

function setFlag(key: string, value: boolean) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(`__mock.${key}`, String(value));
}

if (typeof window !== 'undefined') {
  (window as unknown as { __mock: typeof mockState }).__mock = mockState;
}

/** 현재 목 상태를 반영한 세션. */
function currentSession() {
  return {
    ...fx.session,
    user: { ...fx.session.user, signupcompleted: mockState.onboardingCompleted },
  };
}

export const handlers = [
  // --- Authentication -------------------------------------------------------
  http.post(`${V1}/users`, async () => {
    // 새로 가입한 사용자는 온보딩을 아직 마치지 않은 상태다.
    mockState.onboardingCompleted = false;
    mockState.authenticated = true;
    return HttpResponse.json(currentSession(), { status: 201 });
  }),

  http.post(`${V1}/sessions`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return problem(400, 'VALIDATION_ERROR', '이메일과 비밀번호를 입력해 주세요.');
    }
    if (body.password === 'wrong') {
      return problem(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호를 확인해 주세요.');
    }
    mockState.authenticated = true;
    return HttpResponse.json(currentSession(), { status: 201 });
  }),

  http.get(`${V1}/sessions/current`, () => {
    if (!mockState.authenticated) {
      return problem(401, 'AUTHENTICATION_REQUIRED', '다시 로그인해 주세요.');
    }
    return HttpResponse.json(currentSession());
  }),

  http.delete(`${V1}/sessions/current`, () => {
    mockState.authenticated = false;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${V1}/me`, () => HttpResponse.json(currentSession().user)),

  http.delete(`${V1}/me`, ({ request }) => {
    // 명세상 확인 헤더가 없으면 지우지 않는다. 실수로 계정이 날아가면 안 된다.
    if (request.headers.get('X-Confirm-Deletion') !== 'delete-account') {
      return problem(422, 'VALIDATION_ERROR', '삭제 확인이 필요합니다.');
    }
    mockState.reset();
    mockState.authenticated = false;
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Onboarding -----------------------------------------------------------
  http.put(`${V1}/me/onboarding`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      consentVersion: String(body.consentVersion ?? '2026-08-09'),
      consentedAt: new Date().toISOString(),
      notificationEnabled: Boolean(body.notificationEnabled),
      notificationPermission: body.notificationPermission ?? 'DEFAULT',
      completedAt: new Date().toISOString(),
    });
  }),

  // --- Reference data -------------------------------------------------------
  http.get(`${V1}/reference-data/skin-report-options`, () => HttpResponse.json(fx.reportOptions)),

  // --- Home -----------------------------------------------------------------
  http.get(`${V1}/home`, async () => {
    await delay(200);
    if (mockState.scenario === 'server-error') {
      return problem(503, 'SERVICE_UNAVAILABLE', '잠시 후 다시 시도해 주세요.');
    }

    const priority: Home['priority'] = mockState.pendingFollowUp
      ? 'FOLLOW_UP'
      : mockState.today
        ? 'RECENT_RECORD'
        : 'TODAY_CHECK_IN';

    return HttpResponse.json({
      ...fx.home,
      priority,
      today: mockState.today,
      pendingFollowUp: mockState.pendingFollowUp,
    } satisfies Home);
  }),

  http.put(`${V1}/daily-check-ins/:date`, async ({ params }) => {
    await delay(150);

    // 결과가 저장된 뒤에는 같은 날 새로운 보고를 추가하지 않는다. (공통 정책 7.1)
    if (mockState.today?.state === 'SKIN_REPORT') {
      return problem(409, 'ALREADY_CHECKED_IN', '오늘은 이미 피부 보고를 마쳤어요.');
    }

    const checkIn: DailyCheckIn = {
      date: String(params.date),
      state: 'NO_DISCOMFORT',
      updatedAt: new Date().toISOString(),
    };
    const alreadySaved = mockState.today?.state === 'NO_DISCOMFORT';
    mockState.today = checkIn;

    return HttpResponse.json(checkIn, { status: alreadySaved ? 200 : 201 });
  }),

  // --- Reports --------------------------------------------------------------
  http.post(`${V1}/report-interpretations`, async ({ request }) => {
    await delay(mockState.scenario === 'slow' ? 8000 : mockState.aiDelayMs);

    const body = (await request.json()) as { rawText?: string };
    if (!body.rawText || body.rawText.trim().length === 0) {
      return problem(422, 'VALIDATION_ERROR', '피부 상태를 한 문장으로 적어 주세요.');
    }

    // AI 실패는 200 + FAILED 로 온다. 사용자는 직접 입력으로 흐름을 계속할 수 있어야 한다.
    if (mockState.scenario === 'ai-fail') {
      return HttpResponse.json({
        processingStatus: 'FAILED',
        proposed: {
          primaryArea: null,
          otherAreasNote: null,
          appearances: [],
          sensations: [],
          situations: [],
          careAvailability: null,
        },
        missingFields: [
          'PRIMARY_AREA',
          'APPEARANCES',
          'SENSATIONS',
          'SITUATIONS',
          'CARE_AVAILABILITY',
        ],
        ambiguities: [],
        failureCode: 'AI_TIMEOUT',
      });
    }

    return HttpResponse.json(fx.interpretation);
  }),

  http.post(`${V1}/skin-reports`, async ({ request }) => {
    if (!request.headers.get('Idempotency-Key')) {
      return problem(400, 'VALIDATION_ERROR', 'Idempotency-Key 헤더가 필요합니다.');
    }
    await delay(mockState.aiDelayMs);

    const body = (await request.json()) as { preCareChecks?: string[] };
    const isClinician =
      mockState.scenario === 'clinician' || (body.preCareChecks ?? []).some((c) => c !== 'NONE');
    const report = isClinician ? fx.clinicianReport : fx.selfCareReport;

    // 같은 날 `불편 없음` 이 저장돼 있었다면 피부 보고가 우선한다. (공통 정책 7.1)
    mockState.today = {
      date: fx.todayISO(),
      state: 'SKIN_REPORT',
      reportId: report.id,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(report, { status: 201 });
  }),

  http.get(`${V1}/skin-reports`, async ({ request }) => {
    await delay(200);

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    // 경과를 남기면 해당 건이 목록에서도 완료로 바뀌어야 한다.
    const data = fx.reportList
      .map((r) =>
        r.status === 'FOLLOW_UP_PENDING' && !mockState.pendingFollowUp
          ? { ...r, status: 'COMPLETED' as const, skinChange: 'IMPROVED' as const }
          : r,
      )
      .filter((r) => !status || r.status === status);

    return HttpResponse.json({
      data,
      pagination: { nextCursor: null, hasMore: false, limit: 20 },
    });
  }),

  http.get(`${V1}/skin-reports/:reportId`, async ({ params }) => {
    await delay(150);

    const summary = fx.reportList.find((r) => r.id === params.reportId);
    if (!summary) return problem(404, 'NOT_FOUND', '기록을 찾을 수 없어요.');

    // 목록 항목을 상세로 부풀린다. 결과 유형에 맞는 기본 상세를 고르고 목록 값으로 덮는다.
    const base = summary.resultType === 'CLINICIAN_CHECK' ? fx.clinicianReport : fx.selfCareReport;
    const hasFollowUp = summary.status === 'COMPLETED' && summary.skinChange !== null;

    return HttpResponse.json({
      ...base,
      id: summary.id,
      reportDate: summary.reportDate,
      primaryArea: summary.primaryArea,
      appearances: summary.appearances,
      sensations: summary.sensations,
      situations: summary.situations,
      resultType: summary.resultType,
      status: summary.status,
      skinChange: summary.skinChange,
      confirmed: {
        ...base.confirmed,
        primaryArea: summary.primaryArea,
        appearances: summary.appearances,
        sensations: summary.sensations,
        situations: summary.situations,
      },
      followUp: hasFollowUp
        ? {
            reportId: summary.id,
            kind: summary.resultType === 'CLINICIAN_CHECK' ? 'CLINICIAN_CHECK' : 'SELF_CARE',
            skinChange: summary.skinChange,
            ...(summary.resultType === 'CLINICIAN_CHECK'
              ? { clinicianCheckStatus: 'CHECKED' }
              : { actionCompletion: 'MOSTLY_DONE' }),
            submittedAt: new Date(
              Date.parse(`${summary.reportDate}T09:00:00Z`) + 86_400_000,
            ).toISOString(),
          }
        : null,
    });
  }),

  http.post(`${V1}/skin-reports/:reportId/care-guide-generations`, async () => {
    await delay(mockState.aiDelayMs);
    return HttpResponse.json({ ...fx.selfCareReport.careResult, retryUsed: true });
  }),

  // --- Follow-ups -----------------------------------------------------------
  http.get(`${V1}/skin-reports/:reportId/follow-up`, () =>
    problem(404, 'NOT_FOUND', '아직 경과를 기록하지 않았어요.'),
  ),

  http.put(`${V1}/skin-reports/:reportId/follow-up`, async ({ params, request }) => {
    await delay(200);
    const body = (await request.json()) as Record<string, unknown>;

    // 경과를 남기면 미완료 경과가 사라진다.
    mockState.pendingFollowUp = null;

    return HttpResponse.json(
      { reportId: String(params.reportId), ...body, submittedAt: new Date().toISOString() },
      { status: 201 },
    );
  }),

  // --- Notifications / Analytics -------------------------------------------
  http.get(`${V1}/me/notification-settings`, () =>
    HttpResponse.json({
      enabled: mockState.notificationEnabled,
      time: '17:30',
      timezone: 'Asia/Seoul',
      permission: 'DEFAULT',
      activeSubscriptionCount: 0,
    }),
  ),
  http.patch(`${V1}/me/notification-settings`, async ({ request }) => {
    const body = (await request.json()) as { enabled: boolean };
    // 온보딩 마지막 단계가 이 호출이라 여기서 완료로 표시한다.
    // (복무 정보·환경·권역·점호 시각을 저장할 엔드포인트가 계약에 없어서 생긴 우회다)
    mockState.onboardingCompleted = true;
    mockState.notificationEnabled = body.enabled;
    return HttpResponse.json({
      enabled: body.enabled,
      time: '17:30',
      timezone: 'Asia/Seoul',
      permission: 'DEFAULT',
      activeSubscriptionCount: 0,
    });
  }),

  http.post(`${V1}/analytics-events`, async ({ request }) => {
    const body = (await request.json()) as { events: unknown[] };
    return HttpResponse.json({ accepted: body.events.length }, { status: 202 });
  }),
];
