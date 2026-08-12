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

export const reportOptions: SkinReportOptions = {
  version: '2026-08-09',
  areas: [
    // 부분 부위를 고르기 어려울 만큼 얼굴 전반이 불편한 경우.
    // 부분 부위 목록보다 먼저 두어 12개를 스크롤하지 않아도 되게 한다.
    { value: 'WHOLE_FACE', label: '얼굴 전체' },
    { value: 'LEFT_FOREHEAD', label: '왼쪽 이마' },
    { value: 'CENTER_FOREHEAD', label: '가운데 이마' },
    { value: 'RIGHT_FOREHEAD', label: '오른쪽 이마' },
    { value: 'NOSE', label: '코' },
    { value: 'LEFT_CHEEK', label: '왼쪽 볼' },
    { value: 'RIGHT_CHEEK', label: '오른쪽 볼' },
    { value: 'AROUND_MOUTH', label: '입 주변' },
    { value: 'LEFT_CHIN', label: '왼쪽 턱' },
    { value: 'RIGHT_CHIN', label: '오른쪽 턱' },
    { value: 'LEFT_JAWLINE', label: '왼쪽 턱선' },
    { value: 'RIGHT_JAWLINE', label: '오른쪽 턱선' },
    { value: 'NECK', label: '목' },
    { value: 'OTHER', label: '기타' },
  ],
  appearances: [
    { value: 'REDNESS', label: '붉어짐' },
    { value: 'SMALL_BUMPS', label: '작은 돌기' },
    { value: 'WHITE_TIPPED_BUMPS', label: '하얀 끝이 보이는 돌기' },
    { value: 'RED_BUMPS_AROUND_HAIR', label: '털 주변의 붉은 돌기' },
    { value: 'ROUGHNESS_FLAKING', label: '거칠어짐·각질' },
    { value: 'OOZING', label: '진물' },
    { value: 'CRUST', label: '딱지' },
    { value: 'UNSURE', label: '잘 모르겠음' },
  ],
  sensations: [
    { value: 'ITCHING', label: '가려움' },
    { value: 'STINGING_BURNING', label: '따가움·화끈거림' },
    { value: 'PAIN_WHEN_PRESSED', label: '누르면 아픔' },
    { value: 'PAIN_AT_REST', label: '가만히 있어도 아픔' },
    { value: 'HEAT', label: '열감' },
    { value: 'TIGHTNESS', label: '당김' },
    { value: 'NONE', label: '특별한 느낌 없음' },
  ],
  situations: [
    { value: 'SHAVING', label: '면도' },
    { value: 'SWEAT_OR_DUST_AFTER_TRAINING', label: '훈련·운동 후 땀 또는 먼지' },
    { value: 'PROTECTIVE_GEAR_OR_MASK', label: '보호장비·마스크 착용' },
    { value: 'DELAYED_WASHING', label: '세안·샤워 지연' },
    { value: 'NEW_PRODUCT', label: '새로운 제품 사용' },
    { value: 'TOUCHED_OR_SQUEEZED', label: '피부를 만지거나 짬' },
    { value: 'SLEEP_DEPRIVATION', label: '수면 부족' },
    { value: 'OTHER', label: '기타' },
    { value: 'NONE_RECALLED', label: '특별히 떠오르는 상황 없음' },
  ],
  careAvailability: [
    { value: 'BEFORE_WASH_CAN_WASH_LATER', label: '아직 세안·샤워 전이며 이후 가능' },
    { value: 'ALREADY_WASHED', label: '이미 세안·샤워함' },
    { value: 'CAN_CARE_BEFORE_SLEEP', label: '취침 전에 관리 가능' },
    { value: 'ADDITIONAL_CARE_DIFFICULT', label: '오늘은 추가 관리가 어려움' },
  ],
  preCareChecks: [
    { value: 'SPREADING_RAPIDLY', label: '짧은 시간에 빠르게 넓어지고 있어요.' },
    { value: 'SEVERE_PAIN_HEAT_SWELLING', label: '평소보다 통증·열감·붓기가 심해요.' },
    { value: 'PUS_OOZING_BLISTER', label: '고름·진물·물집이 보여요.' },
    { value: 'NONE', label: '해당하는 변화가 없어요.' },
  ],
};

export const interpretation: ReportInterpretation = {
  processingStatus: 'SUCCESS',
  proposed: {
    primaryArea: 'RIGHT_CHIN',
    otherAreasNote: null,
    appearances: ['REDNESS'],
    sensations: ['STINGING_BURNING'],
    situations: ['SHAVING', 'SWEAT_OR_DUST_AFTER_TRAINING'],
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
  sensations: ['STINGING_BURNING'],
  situations: ['SHAVING', 'SWEAT_OR_DUST_AFTER_TRAINING'],
  resultType: 'SELF_CARE_GUIDE',
  status: 'FOLLOW_UP_PENDING',
  skinChange: null,
  rawText: '오늘 아침에 면도하고 야외훈련했는데 오른쪽 턱이 빨갛고 따가워요. 지금은 씻었어요.',
  confirmed: {
    primaryArea: 'RIGHT_CHIN',
    otherAreasNote: null,
    appearances: ['REDNESS'],
    sensations: ['STINGING_BURNING'],
    situations: ['SHAVING', 'SWEAT_OR_DUST_AFTER_TRAINING'],
    careAvailability: 'ALREADY_WASHED',
  },
  preCareChecks: ['NONE'],
  careResult: {
    resultType: 'SELF_CARE_GUIDE',
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
  appearances: ['OOZING'],
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
    sensations: ['STINGING_BURNING'],
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
    appearances: ['REDNESS', 'SMALL_BUMPS'],
    sensations: ['STINGING_BURNING'],
    situations: ['SHAVING', 'SWEAT_OR_DUST_AFTER_TRAINING'],
    resultType: 'SELF_CARE_GUIDE',
    status: 'FOLLOW_UP_PENDING',
    skinChange: null,
  },
  {
    id: '11110000-0000-4000-8000-000000000001',
    reportDate: daysAgo(4),
    primaryArea: 'CENTER_FOREHEAD',
    appearances: ['SMALL_BUMPS'],
    sensations: ['ITCHING'],
    situations: ['PROTECTIVE_GEAR_OR_MASK', 'DELAYED_WASHING'],
    resultType: 'SELF_CARE_GUIDE',
    status: 'COMPLETED',
    skinChange: 'IMPROVED',
  },
  {
    id: '11110000-0000-4000-8000-000000000002',
    reportDate: daysAgo(9),
    primaryArea: 'NOSE',
    appearances: ['ROUGHNESS_FLAKING'],
    sensations: ['TIGHTNESS'],
    situations: ['SHAVING'],
    resultType: 'SELF_CARE_GUIDE',
    status: 'COMPLETED',
    skinChange: 'SIMILAR',
  },
  {
    id: clinicianReport.id,
    reportDate: daysAgo(14),
    primaryArea: 'LEFT_CHEEK',
    appearances: ['OOZING'],
    sensations: ['PAIN_AT_REST', 'HEAT'],
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
    sensations: ['ITCHING'],
    situations: ['SLEEP_DEPRIVATION'],
    resultType: 'SELF_CARE_GUIDE',
    status: 'EXPIRED',
    skinChange: null,
  },
];
