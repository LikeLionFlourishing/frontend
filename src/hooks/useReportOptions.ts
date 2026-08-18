import { useQuery } from '@tanstack/react-query';
import { referenceData } from '@/api/endpoints';
import { queryKeys } from '@/app/queryClient';
import { DESIGN_LABELS } from '@/api/designOptions';
import type { OptionList, SkinReportOptions } from '@/api/schemas';

/** 라벨을 덮어쓸 목록들. `version`·`guideSections` 는 선택지가 아니라 건드리지 않는다. */
const OPTION_KEYS = [
  'areas',
  'appearances',
  'sensations',
  'situations',
  'careAvailability',
  'preCareChecks',
] as const;

/**
 * 서버가 준 선택지의 **라벨만** 시안 문구로 바꾼다. 값은 그대로 둔다.
 *
 * 프론트는 선택 화면(피부보고1·2, 관리 전 확인)에서 시안 문구를 직접 쓰고,
 * 그 뒤 화면(보고 내용 확인·결과 요약·기록 상세·기록 목록)은 이 응답의 라벨을 쓴다.
 * 둘이 다르면 **같은 선택지가 화면마다 다른 이름**으로 보인다 —
 * 타일에서 `세안 불가능` 을 고르고 다음 화면에서 `오늘은 추가 관리가 어려움` 을 보는 식이다.
 *
 * 서버에만 있는 값은 서버 라벨을 그대로 둔다. 그래야 시안에 없는 값이 내려와도 빈칸이 안 된다.
 */
function withDesignLabels(options: SkinReportOptions): SkinReportOptions {
  const next = { ...options };

  for (const key of OPTION_KEYS) {
    const dict = DESIGN_LABELS[key];
    const list = options[key] as OptionList | undefined;
    if (!dict || !list) continue;

    next[key] = list.map((o) => (dict[o.value] ? { ...o, label: dict[o.value]! } : o));
  }

  return next;
}

/**
 * 피부 보고 선택지.
 *
 * 값(value)은 서버가 정한다 — 저장할 때 서버가 이 목록으로 검증하기 때문이다.
 * 화면에 보이는 문구만 시안 기준으로 맞춘다. (`withDesignLabels` 참고)
 */
export function useReportOptions() {
  return useQuery({
    queryKey: queryKeys.reportOptions,
    queryFn: referenceData.skinReportOptions,
    select: withDesignLabels,
    // 하루에 몇 번 바뀔 값이 아니다.
    staleTime: 60 * 60 * 1000,
  });
}

/** enum 값 하나를 라벨로 바꾼다. 못 찾으면 값 자체를 반환한다. */
export function labelOf(options: OptionList | undefined, value: string | null): string {
  if (!value) return '';
  return options?.find((o) => o.value === value)?.label ?? value;
}

/** enum 배열을 `면도, 야외훈련` 형태로 합친다. */
export function labelsOf(options: OptionList | undefined, values: readonly string[]): string {
  return values.map((v) => labelOf(options, v)).join(', ');
}
