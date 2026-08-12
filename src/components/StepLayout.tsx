import type { ReactNode } from 'react';
import { clsx } from '@/lib/clsx';

interface Props {
  /** 1-based */
  step?: number;
  totalSteps?: number;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** 하단 고정 CTA. 스크롤과 무관하게 항상 보인다. */
  footer?: ReactNode;
}

/**
 * 피부점호 스텝 공통 레이아웃.
 * 상단에 진행 인디케이터(선-점 형태), 그 아래 뒤로가기 + 큰 제목.
 */
export function StepLayout({ step, totalSteps, onBack, title, subtitle, children, footer }: Props) {
  const showProgress = typeof step === 'number' && typeof totalSteps === 'number';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col bg-base">
      <header className="safe-top px-5 pt-4">
        {showProgress && <StepIndicator step={step} totalSteps={totalSteps} />}

        <div className="mt-5 flex items-start gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 shrink-0 text-2xl leading-none text-fg"
              aria-label="뒤로"
            >
              ‹
            </button>
          )}
          {title && <h1 className="text-2xl font-bold leading-snug text-fg">{title}</h1>}
        </div>

        {subtitle && <p className="mt-2 text-sm leading-relaxed text-fg-muted">{subtitle}</p>}
      </header>

      <main className="flex-1 px-5 py-6">{children}</main>

      {footer && (
        <footer className="safe-bottom sticky bottom-0 bg-base px-5 pb-4 pt-3">{footer}</footer>
      )}
    </div>
  );
}

function StepIndicator({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div
      className="flex items-center"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const index = i + 1;
        const done = index <= step;
        return (
          <div key={index} className={clsx('flex items-center', index < totalSteps && 'flex-1')}>
            <span
              className={clsx(
                'size-2.5 shrink-0 rounded-full',
                done ? 'bg-accent' : 'bg-panel-label',
              )}
            />
            {index < totalSteps && (
              <span
                className={clsx('h-0.5 flex-1', index < step ? 'bg-accent' : 'bg-panel-label')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

/** 네온 그린 풀폭 버튼. 화면당 하나가 원칙이다. */
export function PrimaryButton({ children, onClick, disabled, type = 'button' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-full rounded-pill px-5 py-4 text-body-strong transition',
        disabled
          ? 'bg-card-raised text-fg-faint'
          : 'bg-accent text-panel-text active:bg-accent-pressed',
      )}
    >
      {children}
    </button>
  );
}

/** 보조 동작(다시 작성할래요 등). 밝은 회색 pill. */
export function SecondaryButton({ children, onClick, disabled, type = 'button' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-full rounded-pill px-5 py-4 text-body-strong transition',
        'bg-panel text-panel-label',
        disabled && 'opacity-50',
      )}
    >
      {children}
    </button>
  );
}
