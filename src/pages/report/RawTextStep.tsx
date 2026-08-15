import { Sentences } from '@/components/Sentences';
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
    /* 시안 기준: 입력칸 상단 81 · 높이 407, 보조 버튼 502 · 81, 다음 713 (25:28832) */
    <div className="-mt-[8px] flex flex-col">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={MAX_LENGTH}
          placeholder="예: 오늘 아침에 면도하고 야외훈련 턱이 빨갛고 따가워요."
          aria-label="오늘 피부 상태"
          className={clsx(
            // `block` 이 없으면 inline 요소의 baseline 여백이 6px 붙어 아래가 전부 밀린다
            'block h-[407px] w-full resize-none rounded-card bg-panel px-[27px] pb-12 pt-[30px]',
            'text-base text-panel-text',
            'placeholder:text-panel-label focus:outline-none focus:ring-2 focus:ring-accent',
          )}
        />
        <span className="pointer-events-none absolute bottom-[23px] right-5 text-xs text-panel-label">
          {value.length}/{MAX_LENGTH}
        </span>
      </div>

      {errorMessage && (
        <p className="mt-3 text-sm text-caution-500">
          <Sentences text={errorMessage} />
        </p>
      )}

      {/*
       * 한 문장 작성이 어려운 사용자를 위한 선택형 보조 입력 (F-02).
       * 시안은 글자를 가운데 두고 화살표만 오른쪽 끝에 붙인다.
       * 강조색은 주 CTA(다음)만 쓴다.
       */}
      <button
        type="button"
        onClick={onOpenAssist}
        className="relative mt-[14px] flex h-[81px] w-full items-center justify-center rounded-card bg-panel px-6 text-body-strong text-panel-text"
      >
        어떻게 써야할지 잘 모르겠어요.
        <span aria-hidden="true" className="absolute right-9 text-xl text-panel-text">
          ›
        </span>
      </button>

      {/* 시안은 보조 버튼과 130 을 띄우지만 그러면 화면이 넘친다. 여백만 줄인다 */}
      <div className="mt-[70px] pb-[38px]">
        <PrimaryButton onClick={onNext} disabled={!canSubmit}>
          {submitting ? '정리하는 중…' : '다음'}
        </PrimaryButton>
      </div>
    </div>
  );
}
