import { PixelArt } from './PixelArt';
import { FACE_CELL, FACE_HAPPY, FACE_NEUTRAL, FACE_SAD } from './faces';
import { clsx } from '@/lib/clsx';
import type { SkinChange } from '@/api/schemas';

/*
 * 어제와 비교한 피부 변화.
 *
 * 확정 시안(경과 확인 25:35604 / 피부변화확인 25:31859)은 세 개뿐이다.
 * 계약의 `SkinChange` 에는 `NEW_AREA`(새로운 부위)·`UNSURE`(잘 모르겠어요)도 있지만
 * 시안에서 사라져 화면에서 뺐다. (docs/명세-대조.md 2-3)
 */
const CHOICES: {
  value: Extract<SkinChange, 'IMPROVED' | 'SIMILAR' | 'WORSENED'>;
  label: string;
  caption: string;
  face: readonly string[];
}[] = [
  {
    value: 'IMPROVED',
    label: '좋아졌어요',
    caption: '불편함이 줄어\n들었어요.',
    face: FACE_HAPPY,
  },
  { value: 'SIMILAR', label: '비슷해요', caption: '어제와 큰변화\n없어요.', face: FACE_NEUTRAL },
  { value: 'WORSENED', label: '악화됐어요', caption: '증상이\n더 심해졌어요.', face: FACE_SAD },
];

interface Props {
  value: string | null;
  onChange: (value: SkinChange) => void;
  /**
   * 표정 색. 경과 확인(`info`)은 파랑, 피부변화확인(`ink`)은 검정이다.
   * 선택된 타일에서는 파랑 배경 위라 늘 흰색으로 뒤집는다.
   */
  tone?: 'info' | 'ink';
  /** 시안 기준 높이. 경과 확인 297, 피부변화확인 299 — 같은 규격으로 본다. */
  className?: string;
}

/** 세로로 긴 타일 세 장. 시안 기준 120.6×299, 간격 4. */
export function SkinChangeTiles({ value, onChange, tone = 'info', className }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="어제와 비교한 피부 상태"
      className={clsx('grid grid-cols-3 gap-1', className)}
    >
      {CHOICES.map((choice) => {
        const selected = value === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(choice.value)}
            className={clsx(
              'flex h-[299px] flex-col items-center rounded-card px-2 pt-[97px] transition',
              selected ? 'bg-info text-white' : 'bg-panel text-fg',
            )}
          >
            <PixelArt
              bitmap={choice.face}
              cell={FACE_CELL}
              gap={0}
              tint={selected ? 'bg-white' : tone === 'ink' ? 'bg-fg' : 'bg-info'}
            />
            {/* 시안 기준 표정 아래 22px, 제목 16 / 설명 11 */}
            <span className="mt-[22px] text-body-strong">{choice.label}</span>
            <span
              className={clsx(
                'mt-[13px] whitespace-pre-line text-center text-[11px] leading-[14px]',
                selected ? 'text-white/80' : 'text-fg-muted',
              )}
            >
              {choice.caption}
            </span>
          </button>
        );
      })}
    </div>
  );
}
