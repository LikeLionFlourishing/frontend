import type { components } from './types.generated';

type S = components['schemas'];

// 화면 코드에서 매번 components['schemas'][...] 를 쓰지 않도록 별칭만 모아둔다.
// 실제 타입 정의는 openapi.yaml 이 유일한 출처이고, `npm run api:types` 로 재생성한다.

export type AuthSession = S['AuthSession'];
export type User = S['User'];
export type Onboarding = S['Onboarding'];
export type OnboardingRequest = S['OnboardingRequest'];
export type NotificationSettings = S['NotificationSettings'];
export type PushSubscription = S['PushSubscription'];
export type NotificationPermission = S['NotificationPermission'];

export type Home = S['Home'];
export type DailyCheckIn = S['DailyCheckIn'];

export type InterpretReportRequest = S['InterpretReportRequest'];
export type ReportInterpretation = S['ReportInterpretation'];
export type StructuredReportDraft = S['StructuredReportDraft'];
export type CreateSkinReportRequest = S['CreateSkinReportRequest'];
export type ConfirmedStructuredReport = S['ConfirmedStructuredReport'];
export type SkinReportSummary = S['SkinReportSummary'];
export type SkinReportDetail = S['SkinReportDetail'];
export type SkinReportList = S['SkinReportList'];
export type CareResult = S['CareResult'];
export type SimilarExperience = S['SimilarExperience'];

export type FollowUp = S['FollowUp'];
export type SaveFollowUpRequest = S['SaveFollowUpRequest'];
export type PendingFollowUp = S['PendingFollowUp'];

export type SkinReportOptions = S['SkinReportOptions'];
export type OptionList = S['OptionList'];
export type Problem = S['Problem'];
export type AnalyticsEventInput = S['AnalyticsEventInput'];

export type BodyArea = S['BodyArea'];
export type AppearanceSelection = S['AppearanceSelection'];
export type Appearance = AppearanceSelection[number];
export type SensationSelection = S['SensationSelection'];
export type Sensation = SensationSelection[number];
export type SituationSelection = S['SituationSelection'];
export type Situation = SituationSelection[number];
export type CareAvailability = S['CareAvailability'];
export type PreCareCheckSelection = S['PreCareCheckSelection'];
export type PreCareCheck = PreCareCheckSelection[number];
export type ResultType = S['ResultType'];
export type ReportStatus = S['ReportStatus'];
export type SkinChange = S['SkinChange'];

/** 결과 카드 6장의 제목·설명. v2 부터 서버가 준다. */
export type GuideSection = S['GuideSection'];
export type RecommendedIngredient = S['RecommendedIngredient'];

/**
 * 배타 선택 규칙.
 *
 * OpenAPI 의 `not: { allOf: [contains: X, minItems: 2] }` 를 UI 규칙으로 옮긴 것이다.
 * 서버도 검증하지만, 사용자가 422 를 보기 전에 프론트에서 막는다.
 *
 * v2 에서 제약이 있는 건 이 둘뿐이다. `sensations` 는 `NONE` 이 사라졌고
 * `appearances` 는 enum 자체가 없어져(참조 데이터로 검증) 배타 값이 없다.
 */
export const EXCLUSIVE_OPTION = {
  situations: 'NONE_RECALLED',
  preCareChecks: 'NONE',
} as const;

/** 관리 전 확인에서 `NONE` 외 항목이 하나라도 있으면 의료진 확인 우선이다. */
export function resolveResultType(checks: PreCareCheckSelection): ResultType {
  return checks.some((c) => c !== 'NONE') ? 'CLINICIAN_CHECK' : 'SELF_CARE_GUIDE';
}

/**
 * 겉모습에 `진물`이 있으면 관리 전 확인의 `고름·진물·물집`을 **미리 선택해 둔다**.
 * (유저플로우 6. 진물 연동)
 *
 * 미리 선택일 뿐 확정이 아니다. 사용자가 그 화면에서 끄면 그대로 꺼진다 —
 * AI 추출만으로 의료진 확인 분기를 확정하면 안 되기 때문이다.
 * 이미 손댄 값이 있으면 덮어쓰지 않는다(뒤로 갔다 돌아온 경우).
 */
export function seedPreCareChecks(
  appearances: AppearanceSelection,
  current: PreCareCheckSelection,
): PreCareCheckSelection {
  if (current.length > 0) return current;
  // 2026-08-18 시안의 `고름이 찬 돌기` 가 진물·고름 자리다. (designOptions 의 TODO 참고)
  return appearances.includes('PUS_BUMPS') ? ['PUS_OOZING_BLISTER'] : current;
}
