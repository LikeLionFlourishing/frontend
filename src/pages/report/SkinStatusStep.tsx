import { clsx } from '@/lib/clsx';

interface Props {
  onFine: () => void;
  onDiscomfort: () => void;
  savingFine?: boolean;
  errorMessage?: string | null;
}

/**
 * 3-2. 오늘 피부 상태.
 *
 * `괜찮아요` 는 한 번의 선택으로 저장되고 바로 끝난다 (F-01 수용 기준).
 * 대부분의 날이 이 경로이므로 여기서 길어지면 리텐션이 죽는다.
 *
 * 미응답을 `불편 없음` 으로 저장하지 않는다 — 사용자가 직접 고른 경우에만 저장한다.
 */
export function SkinStatusStep({ onFine, onDiscomfort, savingFine, errorMessage }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <StatusTile
        title="괜찮아요"
        caption="오늘은 특별한 불편이 없어요"
        onClick={onFine}
        disabled={savingFine}
      />
      <StatusTile
        title="불편해요"
        caption="피부 불편을 보고할게요"
        tone="accent"
        onClick={onDiscomfort}
        disabled={savingFine}
      />

      {errorMessage && <p className="pt-2 text-sm text-accent">{errorMessage}</p>}
    </div>
  );
}

function StatusTile({
  title,
  caption,
  onClick,
  tone = 'default',
  disabled,
}: {
  title: string;
  caption: string;
  onClick: () => void;
  tone?: 'default' | 'accent';
  disabled?: boolean;
}) {
  const isAccent = tone === 'accent';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-full rounded-card px-5 py-6 text-left transition',
        isAccent ? 'bg-accent text-panel-text' : 'bg-panel text-panel-text',
        disabled && 'opacity-50',
      )}
    >
      <span className="block text-xl font-bold">{title}</span>
      <span
        className={clsx('mt-1 block text-sm', isAccent ? 'text-panel-label' : 'text-panel-label')}
      >
        {caption}
      </span>
    </button>
  );
}
