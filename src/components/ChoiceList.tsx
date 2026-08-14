import { clsx } from '@/lib/clsx';

export interface Choice {
  value: string;
  label: string;
}

interface BaseProps {
  question?: string;
  hint?: string;
  choices: Choice[];
  disabled?: boolean;
}

interface SingleProps extends BaseProps {
  mode: 'single';
  value: string | null;
  onChange: (value: string) => void;
}

interface MultiProps extends BaseProps {
  mode: 'multi';
  value: string[];
  onChange: (value: string[]) => void;
  /**
   * 다른 값과 함께 고를 수 없는 값. (`UNSURE`, `NONE`, `NONE_RECALLED` 등)
   * OpenAPI 의 `not: { allOf: [contains, minItems: 2] }` 제약을 UI 에서 먼저 막는다.
   */
  exclusiveValue?: string;
}

type Props = SingleProps | MultiProps;

/**
 * 새 유저플로우 화면 대부분이 "질문 + 선택지" 구조라 이 컴포넌트 하나로 커버한다.
 * 오늘 군생활 확인, 겉모습, 느껴지는 불편, 직전 상황, 관리 상태,
 * 관리 전 확인, 경과(오늘은 어떤가요), 행동 실행 여부까지 전부 여기에 해당한다.
 *
 * 디자인: 검정 배경 위 밝은 회색 pill 카드, 선택 시 네온 그린 테두리 + 라디오 채움.
 */
export function ChoiceList(props: Props) {
  const { question, hint, choices, disabled } = props;

  const isSelected = (value: string) =>
    props.mode === 'single' ? props.value === value : props.value.includes(value);

  const handleSelect = (value: string) => {
    if (disabled) return;

    if (props.mode === 'single') {
      props.onChange(value);
      return;
    }

    const { value: current, onChange, exclusiveValue } = props;

    // 배타 값을 고르면 나머지를 모두 지운다.
    if (exclusiveValue && value === exclusiveValue) {
      onChange(current.includes(value) ? [] : [value]);
      return;
    }

    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current.filter((v) => v !== exclusiveValue), value];

    onChange(next);
  };

  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      {question && (
        <legend className="text-[28px] font-bold leading-snug text-fg">{question}</legend>
      )}
      {hint && <p className="-mt-2 text-xs text-fg-muted">{hint}</p>}

      <div className="flex flex-col gap-3">
        {choices.map((choice) => {
          const selected = isSelected(choice.value);
          return (
            <button
              key={choice.value}
              type="button"
              role={props.mode === 'single' ? 'radio' : 'checkbox'}
              aria-checked={selected}
              onClick={() => handleSelect(choice.value)}
              className={clsx(
                'flex w-full items-center gap-3 rounded-pill px-5 py-4 text-left text-body-strong transition',
                'bg-panel text-panel-text',
                // 개편 시안은 선택 상태를 일관되게 파랑으로 쓴다(동의·참고일러스트·진행 표시).
                selected && 'ring-2 ring-info',
                disabled && 'opacity-50',
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'grid size-5 shrink-0 place-items-center rounded-full border-2 transition',
                  selected ? 'border-info bg-info' : 'border-panel-label',
                )}
              >
                {selected && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span>{choice.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
