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
  /**
   * `center` 는 라디오 없이 글자만 가운데 두는 형태다.
   * 경과 확인의 두 번째 질문(`안내받은 관리를 어떻게 실행했나요?`)이 시안에서 이 모양이다.
   */
  align?: 'start' | 'center';
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
 * 선택지 하나의 규격은 시안의 공유 컴포넌트(`Frame 1707481896`, 370×72)를 따른다.
 * 라디오 22px · 좌측 여백 25px · 라디오-라벨 간격 13px · 라벨 11px.
 * 여러 화면이 같은 인스턴스를 쓰므로 여기서만 고치면 전부 따라온다.
 */
export function ChoiceList(props: Props) {
  const { question, hint, choices, disabled, align = 'start' } = props;

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
        <legend className="whitespace-pre-line text-[28px] font-bold leading-snug text-fg">
          {question}
        </legend>
      )}
      {hint && <p className="-mt-2 text-xs text-fg-muted">{hint}</p>}

      {/* 시안 간격 7px */}
      <div className="flex flex-col gap-[7px]">
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
                'flex min-h-[72px] w-full items-center gap-[13px] rounded-card py-3 text-[11px] transition',
                align === 'center' ? 'justify-center px-5 text-center' : 'pl-[25px] pr-4 text-left',
                /*
                 * 개편 시안은 선택 상태를 일관되게 파랑으로 쓴다.
                 * 라디오가 없는 `center` 형태는 테두리만으로는 선택이 잘 안 보여서
                 * 상황 선택 타일(15:6483)처럼 파랑으로 채운다.
                 */
                selected && align === 'center' ? 'bg-info text-white' : 'bg-panel text-panel-text',
                selected && align === 'start' && 'ring-2 ring-info',
                disabled && 'opacity-50',
              )}
            >
              {align === 'start' && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    'grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition',
                    selected ? 'border-info bg-info' : 'border-panel-label',
                  )}
                >
                  {selected && <span className="size-2 rounded-full bg-white" />}
                </span>
              )}
              <span>{choice.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
