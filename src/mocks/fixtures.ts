import type {
  AuthSession,
  FollowUp,
  Home,
  ReportInterpretation,
  SkinReportDetail,
  SkinReportOptions,
  SkinReportSummary,
} from '@/api/schemas';

export const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export const session: AuthSession = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'soldier@example.com',
    signupcompleted: true,
    createdAt: '2026-08-01T09:00:00Z',
  },
  csrfToken: 'mock-csrf-token-000000000000000000000000',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

/**
 * 결과 카드 6장의 제목·설명. v2 에서 **서버가 내려준다**(하드코딩하던 값이다).
 * 표시 순서는 배열 순서를 따른다 — 계약의 key 순서가 시안(03 WATCH → 04 SIMILAR)과
 * 반대라 여기서는 시안 순서를 따랐다. (docs/명세-대조.md 확인 필요)
 */
const GUIDE_SECTIONS: SkinReportOptions['guideSections'] = [
  {
    key: 'CURRENT_SUMMARY',
    title: '현재 기록 요약',
    description: '오늘의 피부 상태를 한눈에 확인해요',
    empty: false,
  },
  {
    key: 'DO_TODAY',
    title: '오늘 할 일',
    description: '오늘의 피부 상태에 맞춰 관리해요',
    empty: false,
  },
  {
    key: 'AVOID_TODAY',
    title: '오늘 피할 일',
    description: '오늘의 피부 상태에 맞춰 관리해요',
    empty: false,
  },
  {
    key: 'CHECK_NEXT',
    title: '다음에 확인 할 변화',
    description: '피부 상태가 어떻게 변했는지 확인해보세요.',
    empty: false,
  },
  { key: 'SIMILAR_EXPERIENCE', title: '유사 기록 보기', description: '', empty: false },
  {
    key: 'RECOMMENDED_INGREDIENTS',
    title: '추천 성분 보기',
    description: '지금 상태에 맞는 성분이에요',
    empty: false,
  },
];

export const reportOptions: SkinReportOptions = {
  version: '2026-08-16',
  areas: [
    { value: 'LEFT_FOREHEAD', label: '좌측 이마' },
    { value: 'CENTER_FOREHEAD', label: '중앙 이마' },
    { value: 'RIGHT_FOREHEAD', label: '우측 이마' },
    { value: 'NOSE', label: '코' },
    { value: 'LEFT_CHEEK', label: '왼 볼' },
    { value: 'RIGHT_CHEEK', label: '오른 볼' },
    { value: 'AROUND_MOUTH', label: '입가' },
    { value: 'LEFT_CHIN', label: '왼 턱' },
    { value: 'RIGHT_CHIN', label: '오른 턱' },
    { value: 'LEFT_JAWLINE', label: '왼 턱선' },
    { value: 'RIGHT_JAWLINE', label: '오른 턱선' },
    { value: 'NECK', label: '목' },
    { value: 'OTHER', label: '기타' },
  ],
  /*
   * [미확정] v2 는 `AppearanceSelection` 의 enum 을 비워 두고 이 목록으로만 검증한다.
   * 6종이 확정되면 여기가 곧 정답이 된다. 계약이 `OOZING`(진물) 포함을 요구한다 —
   * 관리 전 확인의 `PUS_OOZING_BLISTER` 자동 선택이 이 값에 묶여 있다.
   */
  appearances: [
    { value: 'REDNESS', label: '붉어짐' },
    { value: 'BUMPS_UNEVEN', label: '돌기와 울퉁불퉁함' },
    { value: 'PUS_BUMPS', label: '고름이 찬 돌기' },
    { value: 'ROUGHNESS_FLAKING', label: '각질/건조' },
    { value: 'OILY_SHINE', label: '번들거림/유분' },
    { value: 'OTHER', label: '기타' },
  ],
  // v2 에서 감각 7종이 불편 유형 3종으로 전면 교체됐다.
  sensations: [
    { value: 'REDNESS', label: '붉어짐' },
    { value: 'BREAKOUT', label: '트러블' },
    { value: 'EXCESS_SEBUM', label: '과피지' },
  ],
  situations: [
    { value: 'PROTECTIVE_GEAR_OR_MASK', label: '보호장비 착용' },
    { value: 'SHAVING', label: '면도' },
    { value: 'SQUEEZED_ACNE', label: '여드름을 짬' },
    { value: 'NEW_PRODUCT', label: '새 제품 사용' },
    { value: 'SWEAT_OR_SEBUM', label: '땀/과피지' },
    { value: 'NONE_RECALLED', label: '해당 상황 없음' },
  ],
  // 라벨은 원래 서버가 준다. 기획 확정안(세안 전·세안 완료·세안 불가능)에 맞춰 둔다.
  careAvailability: [
    { value: 'BEFORE_WASH_CAN_WASH_LATER', label: '세안 전' },
    { value: 'ALREADY_WASHED', label: '세안 완료' },
    { value: 'ADDITIONAL_CARE_DIFFICULT', label: '세안 불가능' },
  ],
  preCareChecks: [
    { value: 'SPREADING_RAPIDLY', label: '짧은 시간에 빠르게 넓어지고 있어요' },
    { value: 'SEVERE_PAIN_HEAT_SWELLING', label: '평소보다 통증,열감,붓기가 심해요.' },
    { value: 'PUS_OOZING_BLISTER', label: '고름,진물,물집이 보여요.' },
    { value: 'NONE', label: '해당하는 변화가 없어요.' },
  ],
  guideSections: GUIDE_SECTIONS,
};

export const interpretation: ReportInterpretation = {
  processingStatus: 'SUCCESS',
  proposed: {
    primaryArea: 'RIGHT_CHIN',
    otherAreasNote: null,
    appearances: ['REDNESS'],
    sensations: ['REDNESS'],
    situations: ['SHAVING', 'SWEAT_OR_SEBUM'],
    careAvailability: 'ALREADY_WASHED',
  },
  missingFields: [],
  ambiguities: [],
  failureCode: null,
};

const PENDING_REPORT_ID = '2c56fe08-ea1f-45fc-915d-c35b7c0bca39';

export const selfCareReport: SkinReportDetail = {
  id: PENDING_REPORT_ID,
  reportDate: todayISO(),
  primaryArea: 'RIGHT_CHIN',
  appearances: ['REDNESS'],
  sensations: ['REDNESS'],
  situations: ['SHAVING', 'SWEAT_OR_SEBUM'],
  resultType: 'SELF_CARE_GUIDE',
  status: 'FOLLOW_UP_PENDING',
  skinChange: null,
  rawText: '오늘 아침에 면도하고 야외훈련했는데 오른쪽 턱이 빨갛고 따가워요. 지금은 씻었어요.',
  confirmed: {
    primaryArea: 'RIGHT_CHIN',
    // 선택값이지만 시연 데이터는 채워 둔다 — 비어 있으면 이 항목이 있는지도 모른다.
    otherAreasNote: '왼쪽 볼도 살짝 붉어요.',
    appearances: ['REDNESS'],
    sensations: ['REDNESS'],
    situations: ['SHAVING', 'SWEAT_OR_SEBUM'],
    careAvailability: 'ALREADY_WASHED',
  },
  preCareChecks: ['NONE'],
  careResult: {
    resultType: 'SELF_CARE_GUIDE',
    guideSections: GUIDE_SECTIONS,
    recommendedIngredients: [
      {
        id: 'ING_PANTHENOL',
        name: '판테놀',
        description: '현재 기록된 붉어짐 가려움 등 피부 자극 상태 고려',
        cautionNote: null,
        sourceRuleIds: ['RULE_COMMON_02'],
      },
      {
        id: 'ING_CERAMIDE',
        name: '세라마이드',
        description: '건조함과 외부 자극으로부터 피부 보호 도움',
        cautionNote: null,
        sourceRuleIds: ['RULE_COMMON_02'],
      },
      {
        id: 'ING_MADECASSOSIDE',
        name: '마데카소사이드',
        description: '자극 받은 피부 진정과 회복을 도와주는 성분',
        cautionNote: null,
        sourceRuleIds: ['RULE_SHAVING_01'],
      },
    ],
    matchedRuleIds: ['RULE_SHAVING_01', 'RULE_COMMON_02'],
    ruleVersion: 'v0.1',
    summary: '면도와 야외훈련이 함께 기록된 날, 오른쪽 턱의 붉어짐과 따가움을 보고했습니다.',
    doToday: ['미지근한 물로 부드럽게 한 번만 세안하기'],
    avoidToday: ['짜거나 만지지 않기', '오늘은 추가 면도 피하기'],
    checkNext: ['내일 붉어진 범위가 넓어졌는지 확인하기'],
    reasonTags: ['면도', '이미 세안함'],
    clinicianMessage: null,
    similarExperience: {
      reportId: '9f1c1d20-7b1a-4a3c-9d55-1a2b3c4d5e6f',
      reportDate: daysAgo(10),
      similarityScore: 7,
      displayText:
        '지난 8월 3일에도 면도한 날 오른쪽 턱의 붉어짐과 따가움을 기록했고, 다음 날 `좋아졌어요`라고 남겼습니다.',
      skinChange: 'IMPROVED',
    },
    aiGenerationStatus: 'GENERATED',
    generatedAt: new Date().toISOString(),
    retryUsed: false,
  },
  followUp: null,
  createdAt: new Date().toISOString(),
};

export const clinicianReport: SkinReportDetail = {
  ...selfCareReport,
  id: '7a7a7a7a-1111-4111-8111-222222222222',
  resultType: 'CLINICIAN_CHECK',
  preCareChecks: ['PUS_OOZING_BLISTER'],
  appearances: ['PUS_BUMPS'],
  careResult: {
    ...selfCareReport.careResult,
    resultType: 'CLINICIAN_CHECK',
    doToday: [],
    avoidToday: [],
    checkNext: [],
    clinicianMessage:
      '오늘은 셀프케어보다 의무실 또는 의료진 확인이 먼저입니다. 가능한 시점에 의무실을 방문해 상태를 확인해 주세요.',
    aiGenerationStatus: 'NOT_APPLICABLE',
    similarExperience: null,
  },
};

/**
 * 경과 확인은 "어제 기록"이 있어야 화면이 뜬다.
 * 실제 서버에서는 하루를 기다려야 하므로, 목에서는 항상 대기 상태 한 건을 만들어 둔다.
 * 시연 리허설에서 이 경로를 반복해서 확인할 수 있어야 한다.
 */
export const home: Home = {
  serverDate: todayISO(),
  priority: 'FOLLOW_UP',
  pendingFollowUp: {
    reportId: PENDING_REPORT_ID,
    reportDate: daysAgo(1),
    availableFrom: new Date(Date.now() - 3_600_000).toISOString(),
    expiresAt: new Date(Date.now() + 44 * 3_600_000).toISOString(),
    resultType: 'SELF_CARE_GUIDE',
  },
  today: null,
  recentReport: {
    id: PENDING_REPORT_ID,
    reportDate: daysAgo(1),
    primaryArea: 'RIGHT_CHIN',
    appearances: ['REDNESS'],
    sensations: ['REDNESS'],
    situations: ['SHAVING'],
    resultType: 'SELF_CARE_GUIDE',
    status: 'FOLLOW_UP_PENDING',
    skinChange: null,
  },
};

export const followUp: FollowUp = {
  reportId: PENDING_REPORT_ID,
  kind: 'SELF_CARE',
  skinChange: 'IMPROVED',
  actionCompletion: 'MOSTLY_DONE',
  submittedAt: new Date().toISOString(),
};

/**
 * 기록 목록용. 배지·카드 변형을 전부 볼 수 있게 상태를 섞어 둔다.
 * 경과 미기록 / 좋아짐 / 비슷함 / 악화됨 / 만료 / 위험 신호 포함.
 */
export const reportList: SkinReportSummary[] = [
  {
    id: PENDING_REPORT_ID,
    reportDate: daysAgo(1),
    primaryArea: 'RIGHT_CHIN',
    appearances: ['REDNESS', 'BUMPS_UNEVEN'],
    sensations: ['REDNESS'],
    situations: ['SHAVING', 'SWEAT_OR_SEBUM'],
    resultType: 'SELF_CARE_GUIDE',
    status: 'FOLLOW_UP_PENDING',
    skinChange: null,
  },
  {
    id: '11110000-0000-4000-8000-000000000001',
    reportDate: daysAgo(4),
    primaryArea: 'CENTER_FOREHEAD',
    appearances: ['BUMPS_UNEVEN'],
    sensations: ['BREAKOUT'],
    situations: ['PROTECTIVE_GEAR_OR_MASK', 'SWEAT_OR_SEBUM'],
    resultType: 'SELF_CARE_GUIDE',
    status: 'COMPLETED',
    skinChange: 'IMPROVED',
  },
  {
    id: '11110000-0000-4000-8000-000000000002',
    reportDate: daysAgo(9),
    primaryArea: 'NOSE',
    appearances: ['ROUGHNESS_FLAKING'],
    sensations: ['EXCESS_SEBUM'],
    situations: ['SHAVING'],
    resultType: 'SELF_CARE_GUIDE',
    status: 'COMPLETED',
    skinChange: 'SIMILAR',
  },
  {
    id: clinicianReport.id,
    reportDate: daysAgo(14),
    primaryArea: 'LEFT_CHEEK',
    appearances: ['PUS_BUMPS'],
    sensations: ['BREAKOUT', 'REDNESS'],
    situations: ['PROTECTIVE_GEAR_OR_MASK'],
    resultType: 'CLINICIAN_CHECK',
    status: 'COMPLETED',
    skinChange: 'WORSENED',
  },
  {
    id: '11110000-0000-4000-8000-000000000004',
    reportDate: daysAgo(20),
    primaryArea: 'NECK',
    appearances: ['REDNESS'],
    sensations: ['BREAKOUT'],
    situations: ['NEW_PRODUCT'],
    resultType: 'SELF_CARE_GUIDE',
    status: 'EXPIRED',
    skinChange: null,
  },
];
