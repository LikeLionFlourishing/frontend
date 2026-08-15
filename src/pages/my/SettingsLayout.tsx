import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';

/**
 * 설정 하위 화면 공통 레이아웃.
 *
 * 큰 제목을 왼쪽에 두는 `StepLayout` 과 달리, 시안의 설정 계열은
 * 원형 뒤로가기 + 가운데 정렬 제목이다. (Figma `설정` 5:728)
 */
export function SettingsLayout({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-app px-4 pt-[calc(var(--safe-top)+16px)]">
      <SettingsHeader title={title} onBack={() => navigate(-1)} />
      {children}
    </div>
  );
}

/** 뒤로가기 없이 제목만 쓰는 경우(탭 루트)를 위해 헤더를 따로 노출한다. */
export function SettingsHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="relative mb-6 flex h-10 items-center justify-center">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="뒤로"
          className="absolute left-0 grid size-10 place-items-center rounded-full bg-panel text-panel-text"
        >
          <Icon name="arrowLeft" className="size-4" />
        </button>
      )}
      <h1 className="text-body-strong font-semibold text-fg">{title}</h1>
    </header>
  );
}

/** 밝은 회색 패널 카드. 설정 화면의 기본 단위다. */
export function SettingsCard({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-card bg-panel">{children}</div>;
}

/** 카드 안에서 행을 나누는 얇은 구분선. 시안은 좌우 15px 씩 들여쓴다. */
export function SettingsDivider() {
  return <div aria-hidden="true" className="mx-4 h-px bg-panel-label/25" />;
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-2 text-sm font-semibold text-fg-muted">{title}</h2>
      {children}
    </section>
  );
}
