import { useQuery } from '@tanstack/react-query';
import { referenceData } from '@/api/endpoints';
import { queryKeys } from '@/app/queryClient';
import type { OptionList } from '@/api/schemas';

/**
 * 선택지 라벨은 서버(`/reference-data/skin-report-options`)가 준다.
 * 화면 코드에 한글 문구를 하드코딩하지 않는다 — 기획이 문구를 바꿔도 배포가 필요 없다.
 */
export function useReportOptions() {
  return useQuery({
    queryKey: queryKeys.reportOptions,
    queryFn: referenceData.skinReportOptions,
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
