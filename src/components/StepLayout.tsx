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
          {/* 시안 기준 제목 28px / 부제 12px (Figma 텍스트 박스 높이 36 / 14) */}
          {title && <h1 className="text-[28px] font-bold leading-snug text-fg">{title}</h1>}
        </div>

        {subtitle && <p className="mt-2 text-xs leading-relaxed text-fg-muted">{subtitle}</p>}
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
        return (
          <div key={index} className={clsx('flex items-center', index < totalSteps && 'flex-1')}>
            {/*
             * 시안에서 점은 진행과 무관하게 늘 회색이고, 점 사이를 잇는 선만 파랑으로 찬다.
             * (개편 전에는 점이 강조 그린으로 바뀌는 형태였다)
             */}
            <span className="size-4 shrink-0 rounded-full bg-panel" />
            {index < totalSteps && (
              <span
                className={clsx(
                  'h-1.5 flex-1 rounded-full',
                  index <= step ? 'bg-info' : 'bg-panel',
                )}
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

/**
 * 파란 채움 버튼. 개편 시안에서 `다시 작성할래요` 처럼
 * 주 CTA(그린)와 나란히 놓이지만 회색으로 내리기엔 무게가 있는 동작에 쓴다.
 */
export function InfoButton({ children, onClick, disabled, type = 'button' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-full rounded-pill px-5 py-4 text-body-strong transition',
        disabled ? 'bg-card-raised text-fg-faint' : 'bg-info text-white',
      )}
    >
      {children}
    </button>
  );
}

/** 보조 동작. 밝은 회색 pill. */
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
