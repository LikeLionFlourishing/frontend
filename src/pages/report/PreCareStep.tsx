import { ChoiceList } from '@/components/ChoiceList';
import { PrimaryButton } from '@/components/StepLayout';
import { EXCLUSIVE_OPTION, resolveResultType } from '@/api/schemas';
import type { PreCareCheckSelection, SkinReportOptions } from '@/api/schemas';

interface Props {
  options: SkinReportOptions;
  value: PreCareCheckSelection;
  onChange: (value: PreCareCheckSelection) => void;
  onSubmit: () => void;
  submitting?: boolean;
  errorMessage?: string | null;
}

/**
 * 3-3. 관리 전 안전 확인.
 *
 * 결과 유형 분기는 AI 가 아니라 여기서 사용자가 최종 확인한 값으로만 결정된다. (F-03, F-04)
 * `NONE` 외 항목이 하나라도 선택되면 CLINICIAN_CHECK 이고, 일반 관리 안내를 생성하지 않는다.
 *
 * 진단이나 긴급도 판정처럼 읽히지 않도록 문구는 서버 라벨을 그대로 쓴다.
 */
export function PreCareStep({
  options,
  value,
  onChange,
  onSubmit,
  submitting,
  errorMessage,
}: Props) {
  const canSubmit = value.length > 0 && !submitting;

  return (
    <div className="flex flex-col gap-5">
      <ChoiceList
        mode="multi"
        choices={options.preCareChecks}
        value={value}
        exclusiveValue={EXCLUSIVE_OPTION.preCareChecks}
        onChange={(v) => onChange(v as PreCareCheckSelection)}
      />

      {errorMessage && <p className="text-sm text-accent">{errorMessage}</p>}

      <div className="pt-6">
        <PrimaryButton onClick={onSubmit} disabled={!canSubmit}>
          {submitting ? '준비하는 중…' : '다음'}
        </PrimaryButton>
      </div>

      {/* 사용자에게는 분기 결과를 미리 알리지 않는다. 판정처럼 읽히면 안 되기 때문이다. */}
      <span className="sr-only">
        {resolveResultType(value) === 'CLINICIAN_CHECK'
          ? '선택한 항목이 있어 의료진 확인 안내로 이동합니다.'
          : ''}
      </span>
    </div>
  );
}
