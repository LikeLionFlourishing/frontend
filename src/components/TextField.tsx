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
      <div
        className={clsx(
          'rounded-card px-5 py-3.5 transition',
          surface === 'soft' ? 'bg-panel-soft' : 'bg-panel',
          error && 'ring-2 ring-caution-500',
        )}
      >
        <label htmlFor={id} className="block text-xs font-semibold text-panel-text">
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
          className="mt-1 w-full bg-transparent text-base text-panel-text outline-none placeholder:text-panel-label"
        />
      </div>

      {error && <p className="px-2 text-sm text-caution-500">{error}</p>}
    </div>
  );
}

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
    <div className="rounded-card bg-card-raised px-5 py-3.5">
      <label htmlFor={id} className="block text-xs font-semibold text-fg-muted">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full appearance-none bg-transparent text-base text-fg outline-none"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-card text-fg">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface DateFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  const id = useId();

  return (
    <div className="rounded-card bg-card-raised px-5 py-3.5">
      <label htmlFor={id} className="block text-xs font-semibold text-fg-muted">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-transparent text-base text-fg outline-none"
      />
    </div>
  );
}
