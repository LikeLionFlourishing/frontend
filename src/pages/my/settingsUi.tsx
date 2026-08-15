/*
 * 설정 화면(25:28903)의 조각들.
 *
 * 원래는 하위 화면(계정관리·알림 설정)과 공유하는 레이아웃이었지만
 * 2026-08-16 결정으로 그 두 화면이 빠지면서 설정 탭 전용이 됐다.
 */
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';

/** 뒤로가기 없이 제목만 쓰는 경우(탭 루트)를 위해 헤더를 따로 노출한다. */
export function SettingsHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    // 시안 기준 뒤로가기 원 39px, 그 아래 21px 에 다음 요소가 온다
    <header className="relative mb-[21px] flex h-10 items-center justify-center">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="뒤로"
          className="absolute left-[3px] grid size-[39px] place-items-center rounded-full bg-panel text-fg-muted"
        >
          <Icon name="arrowLeft" className="size-4" />
        </button>
      )}
      {/* 시안 31:44822 — SemiBold 16 / `검`, 가운데 */}
      <h1 className="text-body-strong text-fg-muted">{title}</h1>
    </header>
  );
}

/** 밝은 회색 패널 카드. 설정 화면의 기본 단위다. */
export function SettingsCard({ children }: { children: ReactNode }) {
  // 시안 31:44816 — 370×153, 모서리 17
  return <div className="overflow-hidden rounded-[17px] bg-panel">{children}</div>;
}

/** 카드 안에서 행을 나누는 얇은 구분선. 시안은 좌우 15px 씩 들여쓴다. */
export function SettingsDivider() {
  return <div aria-hidden="true" className="mx-[15px] h-px bg-panel-label/25" />;
}
