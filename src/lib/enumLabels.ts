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

/*
 * 아래 세 벌의 문구는 경과 확인 시안(15:4468 / 15:4586)에서 그대로 가져왔다.
 *
 * 예외: 시안의 첫 선택지는 `빠르게 넓어지고 있어요` 인데 이건 IMPROVED 의 뜻과
 * 정반대다. 바로 앞 화면(15:4725)의 위험 신호 문구가 잘못 들어간 것으로 보여
 * `좋아졌어요` 로 둔다. 기획 확인 필요.
 */
export const SKIN_CHANGE_LABEL: Record<SkinChange, string> = {
  IMPROVED: '좋아졌어요',
  SIMILAR: '비슷해요',
  WORSENED: '악화됐어요',
};

export const ACTION_COMPLETION_LABEL = {
  // 시안 32:56821. 계약 값이 MOSTLY_DONE 이라 `대부분` 이 맞다
  MOSTLY_DONE: '대부분 실행함',
  PARTLY_DONE: '일부만 실행함',
  NOT_DONE: '실행하지 못함',
} as const;

export const CLINICIAN_CHECK_LABEL = {
  CHECKED: '확인했어요',
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
