import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/StepLayout';
import { clsx } from '@/lib/clsx';

type Choice = 'FINE' | 'DISCOMFORT';

interface Props {
  onFine: () => void;
  onDiscomfort: () => void;
  savingFine?: boolean;
  errorMessage?: string | null;
}

/**
 * 오늘 피부 상태 (유저플로우 2. 홈 진입 / 시안 15:6623).
 *
 * 고르고 나서 `다음` 을 눌러야 진행된다. 탭 즉시 저장하면
 * `불편 없음` 이 실수로 저장되고, 같은 날 되돌릴 방법이 화면에 없다.
 * (같은 날 피부 보고를 새로 쓰면 서버가 대체하지만 사용자는 그걸 모른다)
 *
 * 미응답을 `불편 없음` 으로 저장하지 않는다 — 사용자가 직접 고른 경우에만 저장한다.
 */
export function SkinStatusStep({ onFine, onDiscomfort, savingFine, errorMessage }: Props) {
  const [choice, setChoice] = useState<Choice | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <StatusTile
          title="특별한 불편 없음"
          caption="피부 점호 완료"
          selected={choice === 'FINE'}
          onClick={() => setChoice('FINE')}
          disabled={savingFine}
        />
        <StatusTile
          title="불편해요"
          caption="이어서 기록할게요"
          selected={choice === 'DISCOMFORT'}
          onClick={() => setChoice('DISCOMFORT')}
          disabled={savingFine}
        />
      </div>

      {errorMessage && <p className="text-sm text-caution-500">{errorMessage}</p>}

      <div className="pt-6">
        <PrimaryButton
          onClick={() => (choice === 'FINE' ? onFine() : onDiscomfort())}
          disabled={!choice || savingFine}
        >
          {savingFine ? '저장 중…' : '다음'}
        </PrimaryButton>
      </div>
    </div>
  );
}

function StatusTile({
  title,
  caption,
  selected,
  onClick,
  disabled,
}: {
  title: string;
  caption: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-card px-4 text-center transition',
        selected ? 'bg-info text-white' : 'bg-panel text-panel-text',
        disabled && 'opacity-50',
      )}
    >
      {/* TODO(디자인): 시안은 픽셀 아트 얼굴 두 종이다. 에셋이 나오면 교체한다. */}
      <Icon name="face" className="size-16" />
      <span className="block text-body-strong font-semibold">{title}</span>
      <span className={clsx('block text-xs', selected ? 'text-white/80' : 'text-panel-label')}>
        {caption}
      </span>
    </button>
  );
}
