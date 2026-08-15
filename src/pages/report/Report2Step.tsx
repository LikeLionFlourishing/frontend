import { Icon, type IconName } from '@/components/Icon';
import { PrimaryButton } from '@/components/StepLayout';
import { clsx } from '@/lib/clsx';
import {
  CARE_OPTIONS,
  SITUATION_NONE,
  SITUATION_OPTIONS,
  SKIN_STATE_OPTIONS,
} from '@/api/designOptions';

interface Props {
  situations: string[];
  care: string | null;
  skinStates: string[];
  onChange: (partial: { situations?: string[]; care?: string; skinStates?: string[] }) => void;
  onNext: () => void;
}

/**
 * 피부보고2 (시안 25:30577) — 상황, 관리 가능 여부, 지금 피부 상태.
 *
 * 세 질문이 한 화면에 세로로 쌓여 있다. 상황만 복수 선택이고 나머지는 하나씩 고른다.
 */
export function Report2Step({ situations, care, skinStates, onChange, onNext }: Props) {
  const toggleSituation = (value: string) => {
    // `특별히 떠오르는 상황 없음` 은 다른 값과 함께 고를 수 없다.
    if (value === SITUATION_NONE.value) {
      onChange({ situations: situations.includes(value) ? [] : [value] });
      return;
    }

    const next = situations.includes(value)
      ? situations.filter((v) => v !== value)
      : [...situations.filter((v) => v !== SITUATION_NONE.value), value];

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
      {/* 시안 기준 타일 120×110, 가로 간격 5, 세로 간격 7. 격자 상단은 화면 기준 173 */}
      <div className="mt-[9px] grid grid-cols-3 gap-x-[5px] gap-y-[7px]">
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
              <Icon name={option.icon as IconName} className="h-[27px] w-auto" />
              <span className="text-[11px]">{option.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => toggleSituation(SITUATION_NONE.value)}
        aria-pressed={situations.includes(SITUATION_NONE.value)}
        className={clsx(
          'mt-[9px] flex h-[70px] items-center justify-center rounded-card text-xs transition',
          situations.includes(SITUATION_NONE.value)
            ? 'bg-info font-semibold text-white'
            : 'bg-panel text-fg',
        )}
      >
        {SITUATION_NONE.label}
      </button>

      <Question
        top={25}
        title={'지금 관리할 수 있는\n상태는 어떤가요?'}
        hint="현재 세안,관리 여부를 선택해주세요."
      />
      <TileGrid
        options={CARE_OPTIONS}
        isSelected={(value) => care === value}
        onSelect={(value) => onChange({ care: value })}
      />

      <Question
        top={42}
        title={'현재 피부 상태는\n어떤가요?'}
        hint="지금 피부에서 느껴지는 상태를 선택해주세요."
      />
      <TileGrid
        options={SKIN_STATE_OPTIONS}
        isSelected={(value) => skinStates.includes(value)}
        onSelect={toggleSkinState}
      />

      {/* 시안의 프레임은 버튼 아래로 135px 를 더 두고 끝난다 */}
      <div className="mt-[51px] pb-[135px]">
        <PrimaryButton onClick={onNext} disabled={!canSubmit}>
          다음
        </PrimaryButton>
      </div>
    </div>
  );
}

/** `top` 은 앞 블록과의 간격. 시안에서 두 질문의 간격이 서로 다르다(25 / 42). */
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
    <div className="mt-[24px] grid grid-cols-2 gap-x-[6px] gap-y-[7px]">
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
              selected ? 'bg-info font-semibold text-white' : 'bg-card text-fg',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
