import type { ReportStatus, ResultType, SkinChange } from '@/api/schemas';

/**
 * `/reference-data/skin-report-options` 가 커버하지 않는 enum 의 라벨.
 *
 * 그 엔드포인트는 피부 보고 입력 선택지(부위·겉모습·불편·상황·관리 상태·관리 전 확인)만 준다.
 * 경과(skinChange), 행동 실행 여부, 의료진 확인 여부, 상태 값은 라벨이 없어서 여기 둔다.
 *
 * TODO(백엔드): reference-data 응답에 아래 항목도 포함해 주시면 프론트에서 문구를 지울 수 있다.
 * 기획이 문구를 바꿀 때마다 배포가 필요한 상태다.
 */

export const SKIN_CHANGE_LABEL: Record<SkinChange, string> = {
  IMPROVED: '좋아졌어요',
  SIMILAR: '비슷해요',
  WORSENED: '악화됐어요',
  NEW_AREA: '다른 부위에도 생겼어요',
  UNSURE: '잘 모르겠어요',
};

export const ACTION_COMPLETION_LABEL = {
  MOSTLY_DONE: '대부분 했어요',
  PARTLY_DONE: '일부 했어요',
  NOT_DONE: '하지 못했어요',
} as const;

export const CLINICIAN_CHECK_LABEL = {
  CHECKED: '의무실·의료진에게 확인했어요',
  NOT_YET: '아직 확인하지 못했어요',
  PREFER_NOT_TO_RECORD: '기록하지 않을게요',
} as const;

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  FOLLOW_UP_PENDING: '경과 미기록',
  COMPLETED: '기록 완료',
  EXPIRED: '경과 미기록',
};

export const RESULT_TYPE_LABEL: Record<ResultType, string> = {
  SELF_CARE_GUIDE: '일반 관리 안내',
  CLINICIAN_CHECK: '의료진 확인 우선',
};

/** 목록 카드 우측 배지 문구. 경과가 있으면 경과를, 없으면 상태를 보여준다. */
export function progressBadge(status: ReportStatus, skinChange: SkinChange | null): string {
  if (status === 'COMPLETED' && skinChange) return `경과: ${SKIN_CHANGE_LABEL[skinChange]}`;
  return REPORT_STATUS_LABEL[status];
}
