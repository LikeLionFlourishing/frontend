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
      {/*
       * 시안 실측: 진행 표시가 있는 화면은 표시 상단 15 · 제목 상단 50,
       * 없는 화면(한 문장 피부보고)은 제목이 바로 11 에서 시작한다.
       */}
      <header
        className={clsx(
          'px-4',
          showProgress ? 'pt-[calc(var(--safe-top)+15px)]' : 'pt-[calc(var(--safe-top)+11px)]',
        )}
      >
        {showProgress && <StepIndicator step={step} totalSteps={totalSteps} />}

        {/*
         * 뒤로가기는 제목과 같은 줄에 있지만 흐름에서는 빼 둔다.
         * 손가락용 44px 높이를 그대로 두면 제목이 한 줄인 화면에서 그 44 가
         * 줄 높이를 밀어 올려 부제가 8px 내려앉는다.
         */}
        <div className={clsx('relative', showProgress && 'mt-[19px]')}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="absolute -left-1 top-0 flex h-11 w-8 items-start text-2xl leading-none text-fg"
              aria-label="뒤로"
            >
              ‹
            </button>
          )}
          {/* 시안 기준 제목 28px / 부제 12px (Figma 텍스트 박스 높이 36 / 14) */}
          {title && (
            <h1
              className={clsx(
                'whitespace-pre-line text-[28px] font-bold leading-9 text-fg',
                // 시안에서 제목은 화면 왼쪽 43 — 뒤로가기 화살표를 지나 시작한다
                onBack && 'pl-[27px]',
              )}
            >
              {title}
            </h1>
          )}
        </div>

        {/* 시안에서 부제 글상자는 제목 아래 4px, 높이 14 다(피부보고1·2 모두 같다) */}
        {subtitle && <p className="mt-1 text-xs leading-[14px] text-fg-muted">{subtitle}</p>}
      </header>

      <main className="flex-1 px-4 py-6">{children}</main>

      {footer && (
        <footer className="safe-bottom sticky bottom-0 bg-base px-4 pb-4 pt-3">{footer}</footer>
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
                  // 시안에서 파랑은 `지나온` 칸만 채운다. 2단계면 첫 칸 하나만 파랗다.
                  index < step ? 'bg-info' : 'bg-panel',
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

/**
 * 네온 그린 풀폭 버튼. 화면당 하나가 원칙이다.
 * 시안의 주 버튼은 어느 화면에서나 370×79 다.
 */
export function PrimaryButton({ children, onClick, disabled, type = 'button' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex h-[79px] w-full items-center justify-center rounded-pill px-5 text-body-strong transition',
        disabled
          ? 'bg-panel text-panel-label'
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
        'flex h-[79px] w-full items-center justify-center rounded-pill px-5 text-body-strong transition',
        disabled ? 'bg-panel text-panel-label' : 'bg-info text-white',
      )}
    >
      {children}
    </button>
  );
}

/**
 * 오른쪽에 화살표 원이 붙는 그린 버튼. 흐름을 시작·완료하는 자리에만 쓴다.
 *
 * 원의 색은 화면마다 다르다 — 온보딩 1화면(25:30294)은 어두운 원에 흰 화살표,
 * 기본 점호 시각(25:30666)은 흰 원에 검은 화살표다. 시안 그대로 두 벌을 둔다.
 * 글자는 버튼 전체 폭 기준 가운데라 원을 absolute 로 띄운다.
 */
export function ArrowButton({
  children,
  onClick,
  disabled,
  type = 'button',
  circle = 'dark',
}: ButtonProps & { circle?: 'dark' | 'light' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'relative flex h-[79px] w-full items-center justify-center rounded-pill px-[92px] text-body-strong transition',
        disabled ? 'bg-panel text-panel-label' : 'bg-accent text-panel-text',
      )}
    >
      {children}
      {/* 시안 기준 원 59px, 오른쪽 여백 26px */}
      <span
        aria-hidden="true"
        className={clsx(
          'absolute right-[26px] grid size-[59px] place-items-center rounded-full',
          circle === 'dark' ? 'bg-[#232E27] text-base' : 'bg-base text-fg',
        )}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor">
          <path
            d="M4 12h15m0 0-6-6m6 6-6 6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
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
        'flex h-[79px] w-full items-center justify-center rounded-pill px-5 text-body-strong transition',
        'bg-panel text-panel-label',
        disabled && 'opacity-50',
      )}
    >
      {children}
    </button>
  );
}
