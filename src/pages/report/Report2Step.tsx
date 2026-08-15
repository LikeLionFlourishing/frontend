import { Icon, type IconName } from '@/components/Icon';
import { PrimaryButton } from '@/components/StepLayout';
import { clsx } from '@/lib/clsx';
import {
  CARE_OPTIONS,
  SITUATION_NONE,
  SITUATION_OPTIONS,
  SKIN_STATE_OPTIONS,
} from '@/api/designOptions';
import type { CareAvailability, Situation } from '@/api/schemas';

interface Props {
  situations: Situation[];
  care: CareAvailability | null;
  skinStates: string[];
  onChange: (partial: {
    situations?: Situation[];
    care?: CareAvailability;
    skinStates?: string[];
  }) => void;
  onNext: () => void;
}

/**
 * 피부보고2 (시안 30:38991) — 상황, 관리 가능 여부, 지금 피부 상태.
 *
 * 2026-08-16 개편으로 상황이 12종 → **5종 + 없음** 으로 줄고 전부 계약 enum 이 됐다.
 * `해당 상황 없음` 도 아래 넓은 버튼이 아니라 격자 안 여섯 번째 타일이다.
 */
export function Report2Step({ situations, care, skinStates, onChange, onNext }: Props) {
  const toggleSituation = (value: Situation) => {
    // `해당 상황 없음` 은 다른 값과 함께 고를 수 없다. (계약의 not/contains 제약)
    if (value === SITUATION_NONE) {
      onChange({ situations: situations.includes(value) ? [] : [value] });
      return;
    }

    const next = situations.includes(value)
      ? situations.filter((v) => v !== value)
      : [...situations.filter((v) => v !== SITUATION_NONE), value];

    onChange({ situations: next });
  };

  const toggleSkinState = (value: string) =>
    onChange({
      skinStates: skinStates.includes(value)
        ? skinStates.filter((v) => v !== value)
        : [...skinStates, value],
    });

  const canSubmit = situations.length > 0 && care !== null && skinStates.length > 0;

  return (
    <div className="flex flex-col">
      {/* 시안 기준 타일 120×110, 가로 간격 7, 세로 간격 10. 격자 상단은 화면 기준 173 */}
      <div className="mt-[9px] grid grid-cols-3 gap-x-[7px] gap-y-[10px]">
        {SITUATION_OPTIONS.map((option) => {
          const selected = situations.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleSituation(option.value)}
              className={clsx(
                'flex h-[110px] flex-col items-center justify-center gap-[14px] rounded-card transition',
                selected ? 'bg-info text-white' : 'bg-panel text-fg',
              )}
            >
              <Icon name={option.icon as IconName} className="h-[24px] w-auto" />
              <span className="text-[11px]">{option.label}</span>
            </button>
          );
        })}
      </div>

      <Question
        top={33}
        title={'지금 관리할 수 있는\n상태는 어떤가요?'}
        hint="현재 세안,관리 여부를 선택해주세요."
      />
      <TileGrid
        options={CARE_OPTIONS}
        isSelected={(value) => care === value}
        onSelect={(value) => onChange({ care: value as CareAvailability })}
      />

      <Question
        top={32}
        title={'현재 피부 상태는\n어떤가요?'}
        hint="지금 피부에서 느껴지는 상태를 선택해주세요."
      />
      <TileGrid
        options={SKIN_STATE_OPTIONS}
        isSelected={(value) => skinStates.includes(value)}
        onSelect={toggleSkinState}
      />

      <div className="mt-[31px] pb-[30px]">
        <PrimaryButton onClick={onNext} disabled={!canSubmit}>
          다음
        </PrimaryButton>
      </div>
    </div>
  );
}

/** `top` 은 앞 블록과의 간격. 시안에서 두 질문의 간격이 서로 다르다. */
function Question({ top, title, hint }: { top: number; title: string; hint: string }) {
  return (
    <div style={{ marginTop: top }}>
      <h2 className="whitespace-pre-line text-[28px] font-bold leading-9 text-fg">{title}</h2>
      <p className="mt-[4px] text-xs leading-[14px] text-fg-muted">{hint}</p>
    </div>
  );
}

/** 시안 기준 타일 182×72, 간격 6/7. 관리 가능 상태와 피부 상태가 같은 규격이다. */
function TileGrid({
  options,
  isSelected,
  onSelect,
}: {
  options: readonly { value: string; label: string }[];
  isSelected: (value: string) => boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="mt-[23px] grid grid-cols-2 gap-x-[6px] gap-y-[7px]">
      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(option.value)}
            className={clsx(
              'flex h-[72px] items-center justify-center rounded-card text-xs transition',
              selected ? 'bg-info font-semibold text-white' : 'bg-card text-fg shadow-neu',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
