import { PrimaryButton } from '@/components/StepLayout';
import { clsx } from '@/lib/clsx';
import type { AppearanceSelection, SkinReportOptions } from '@/api/schemas';

interface Props {
  options: SkinReportOptions;
  value: AppearanceSelection;
  onChange: (value: AppearanceSelection) => void;
  onNext: () => void;
}

/**
 * 3-1b. 참고 일러스트로 겉모습 고르기.
 *
 * 한 문장으로 쓰기 어려운 사용자를 위한 보조 입력이다. (F-02)
 * 부제가 "가장 비슷한 모습"이라 하나만 고른다.
 *
 * 선택지는 시안에 그려진 6개가 아니라 reference-data 를 그대로 쓴다.
 * 시안에는 `진물`·`딱지` 가 빠져 있는데 둘 다 의료진 확인 분기를 태우는
 * 위험 신호라, 보조 입력에서만 사라지면 놓칠 수 있다. (아래 TODO 참고)
 */
export function AppearanceAssistStep({ options, value, onChange, onNext }: Props) {
  const selected = value[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2">
        {options.appearances.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange([option.value] as AppearanceSelection)}
              className={clsx(
                'flex h-[127px] flex-col items-center justify-end gap-4 rounded-card px-3 pb-4 pt-6 transition',
                isSelected ? 'bg-info text-white' : 'bg-card-raised text-fg',
              )}
            >
              {/*
                TODO(디자인): 실제 일러스트 에셋 대기 중.
                시안도 아직 자리표시 점 패턴이라 같은 형태로 둔다.
              */}
              <PlaceholderArt selected={isSelected} />
              <span className="text-xs font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>

      <PrimaryButton onClick={onNext} disabled={!selected}>
        다음
      </PrimaryButton>
    </div>
  );
}

/** 시안의 자리표시 도트 패턴. 흩뿌려진 점 7개. */
const DOTS = [
  { x: 18, y: 46 },
  { x: 34, y: 22 },
  { x: 46, y: 54 },
  { x: 60, y: 12 },
  { x: 72, y: 38 },
  { x: 88, y: 20 },
  { x: 96, y: 50 },
];

function PlaceholderArt({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden="true" className="relative block h-16 w-28">
      {DOTS.map((dot, i) => (
        <span
          key={i}
          className={clsx(
            'absolute size-2.5 rounded-full',
            selected ? 'bg-white' : 'bg-panel-strong',
          )}
          style={{ left: dot.x, top: dot.y }}
        />
      ))}
    </span>
  );
}
