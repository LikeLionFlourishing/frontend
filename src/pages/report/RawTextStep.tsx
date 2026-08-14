import { PrimaryButton } from '@/components/StepLayout';
import { clsx } from '@/lib/clsx';

const MAX_LENGTH = 300;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onOpenAssist: () => void;
  errorMessage?: string | null;
  submitting?: boolean;
}

/**
 * 3-1. 한 문장 피부보고.
 *
 * 원문은 어떤 실패 상황에서도 잃지 않아야 하므로 상위에서 localStorage 에 유지한다.
 * (기능명세서 11.4)
 */
export function RawTextStep({
  value,
  onChange,
  onNext,
  onOpenAssist,
  errorMessage,
  submitting,
}: Props) {
  const tooLong = value.length > MAX_LENGTH;
  const canSubmit = value.trim().length > 0 && !tooLong && !submitting;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={11}
          placeholder="예: 오늘 아침에 면도하고 야외훈련 뛰어서 턱이 빨갛고 따가워요."
          aria-label="오늘 피부 상태"
          className={clsx(
            'w-full resize-none rounded-card bg-panel px-4 py-4 text-base text-panel-text',
            'placeholder:text-panel-label focus:outline-none focus:ring-2 focus:ring-accent',
          )}
        />
        <span className="pointer-events-none absolute bottom-4 right-4 text-xs text-panel-label">
          {value.length}/{MAX_LENGTH}
        </span>
      </div>

      {errorMessage && <p className="text-sm text-accent">{errorMessage}</p>}

      {/* 한 문장 작성이 어려운 사용자를 위한 선택형 보조 입력 (F-02) */}
      <button
        type="button"
        onClick={onOpenAssist}
        // 개편 시안에서 회색 패널로 내려왔다. 강조색은 주 CTA(다음)만 쓴다.
        className="flex w-full items-center justify-between rounded-pill bg-panel px-6 py-4 text-body-strong font-semibold text-panel-text"
      >
        입력하기 어려우신가요?
        <span aria-hidden="true">›</span>
      </button>

      <div className="pt-6">
        <PrimaryButton onClick={onNext} disabled={!canSubmit}>
          {submitting ? '정리하는 중…' : '다음'}
        </PrimaryButton>
      </div>
    </div>
  );
}
