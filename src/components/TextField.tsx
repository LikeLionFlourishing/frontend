import { useId } from 'react';
import { clsx } from '@/lib/clsx';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'date';
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
  inputMode?: 'text' | 'email' | 'numeric';
  /** 로그인 화면만 더 밝은 회색 필드를 쓴다. */
  surface?: 'panel' | 'soft';
}

/** 시안의 밝은 회색 입력 필드. 라벨이 필드 안 상단에 붙는다. */
export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  error,
  inputMode,
  surface = 'panel',
}: Props) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      {/* 시안(로그인 15:5969) 기준 369×83, 좌 여백 25, 라벨 20px 지점. */}
      <div
        className={clsx(
          'h-[83px] rounded-card px-[25px] pt-5 transition',
          surface === 'soft' ? 'bg-panel-soft' : 'bg-panel',
          error && 'ring-2 ring-caution-500',
        )}
      >
        <label htmlFor={id} className="block text-body-strong font-semibold text-panel-text">
          {label}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={Boolean(error)}
          className="mt-[9px] w-full bg-transparent text-xs text-panel-text outline-none placeholder:text-panel-label"
        />
      </div>

      {error && <p className="px-2 text-sm text-caution-500">{error}</p>}
    </div>
  );
}

/*
 * 온보딩2(복무 정보) 계열 필드.
 *
 * 로그인·회원가입과 달리 라벨이 필드 **밖 위쪽**에 붙는다.
 * 시안(22:12730) 기준 라벨 12px 회색 → 2px 간격 → 필드 370×71,
 * 값 16px 이 세로 가운데, 오른쪽 24px 지점에 아이콘.
 */
function FieldShell({
  id,
  label,
  icon,
  error,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block px-px text-xs text-fg-faint">
        {label}
      </label>
      <div
        className={clsx(
          'relative mt-0.5 flex h-[71px] items-center rounded-card bg-panel-soft pl-[22px] pr-12',
          error && 'ring-2 ring-caution-500',
        )}
      >
        {children}
        {icon && (
          <span aria-hidden="true" className="absolute right-6 text-panel-text">
            {icon}
          </span>
        )}
      </div>
      {error && <p className="mt-1 px-px text-sm text-caution-500">{error}</p>}
    </div>
  );
}

const CHEVRON = (
  <svg viewBox="0 0 15 8" className="w-[15px]" fill="none" stroke="currentColor">
    <path d="M1 1l6.5 6L14 1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CALENDAR = (
  <svg viewBox="0 0 21 23" className="w-[21px]" fill="none" stroke="currentColor">
    <rect x="1" y="3" width="19" height="19" rx="4" strokeWidth="1.6" />
    <path d="M1 9h19M6 1v4M15 1v4" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M6 14h2M10 14h2M14 14h2M6 18h2M10 18h2" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

interface SelectFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = '선택해주세요',
}: SelectFieldProps) {
  const id = useId();

  return (
    <FieldShell id={id} label={label} icon={CHEVRON}>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'w-full appearance-none bg-transparent text-body-strong outline-none',
          value ? 'text-panel-text' : 'text-panel-label',
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-base text-fg">
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

interface DateFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  /** 계산으로 채워지는 값(전역예정일). 시안에서 아이콘 없이 읽기 전용이다. */
  readOnly?: boolean;
}

export function DateField({ label, value, onChange, readOnly }: DateFieldProps) {
  const id = useId();

  return (
    <FieldShell id={id} label={label} {...(readOnly ? {} : { icon: CALENDAR })}>
      <input
        id={id}
        type="date"
        value={value ?? ''}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'w-full bg-transparent text-body-strong outline-none [&::-webkit-calendar-picker-indicator]:opacity-0',
          readOnly ? 'text-panel-label' : 'text-panel-text',
        )}
      />
    </FieldShell>
  );
}
