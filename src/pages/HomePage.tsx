import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { home as homeApi, notifications } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { Icon, type IconName } from '@/components/Icon';
import { labelOf, labelsOf, useReportOptions } from '@/hooks/useReportOptions';
import { formatShortDate } from '@/lib/date';
import { clsx } from '@/lib/clsx';
import type { Home, SkinReportOptions } from '@/api/schemas';

/**
 * 홈 (확정 시안 30:37549).
 *
 * 프로필 → 오늘 날짜 → TODAY'S CHECK → 아래 카드 두 장(최근 기록 / 다음 점호).
 *
 * 2026-08-16 결정으로 **STREAK 이 빠졌다.** 명세에 없는 값이었고 5.3 제외 범위의
 * `피부 점수와 랭킹` 과 성격이 닿아 있었다. 아래 카드는 이제 같은 크기 두 장이다.
 */
export function HomePage() {
  const navigate = useNavigate();

  const homeQuery = useQuery({ queryKey: queryKeys.home, queryFn: homeApi.get });
  const optionsQuery = useReportOptions();
  const notificationQuery = useQuery({
    queryKey: queryKeys.notificationSettings,
    queryFn: notifications.getSettings,
  });

  if (homeQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-4 px-5 py-20 text-center">
        <p className="text-sm text-fg-muted">{toUserMessage(homeQuery.error)}</p>
        <button
          type="button"
          onClick={() => homeQuery.refetch()}
          className="rounded-pill bg-card-raised px-5 py-3 text-sm text-fg"
        >
          새로고침
        </button>
      </div>
    );
  }

  if (homeQuery.isPending) return <HomeSkeleton />;

  const data = homeQuery.data;

  return (
    // 7 은 시안값, 앞의 --safe-top 이 상태바 자리를 메운다 (index.css 참고)
    <div className="flex flex-col px-[17px] pt-[calc(var(--safe-top)+7px)]">
      <ProfileHeader />
      <TodayDate serverDate={data.serverDate} />
      <TodayCheckCard data={data} onNavigate={navigate} />

      {/* 시안 기준 카드 180×192 두 장, 사이 7px */}
      <div className="mt-[9px] grid grid-cols-2 gap-[7px]">
        <RecentRecordCard
          data={data}
          options={optionsQuery.data}
          onOpen={(id) => navigate(`/records/${id}`)}
        />
        <NextCheckCard time={notificationQuery.data?.time ?? '17:30'} />
      </div>
    </div>
  );
}

// --- 상단 --------------------------------------------------------------------

function ProfileHeader() {
  return (
    <header className="flex items-start gap-[9px]">
      {/* PLACEHOLDER: 프로필 사진 필드가 계약에 없다. 시안도 빈 원이다. */}
      <div className="size-[54px] shrink-0 rounded-full bg-card-raised" aria-hidden="true" />

      <div className="flex-1 pt-[11px]">
        <p className="text-xs text-fg-faint">오늘도 관리해요</p>
        {/* PLACEHOLDER: 이름 필드가 계약에 없다. */}
        <p className="mt-0.5 text-body-strong text-fg">김멋사</p>
      </div>

      <button type="button" className="mt-0.5 text-info" aria-label="알림">
        <Icon name="bell" className="h-[26px] w-[21px]" />
      </button>
    </header>
  );
}

/** 시안에서 D-Day 자리를 대신하는 오늘 날짜. 큰 파란 숫자 + 영문 요일. */
function TodayDate({ serverDate }: { serverDate: string }) {
  const [, month = '', day = ''] = serverDate.slice(0, 10).split('-');

  return (
    <section aria-label="오늘 날짜" className="mt-[-6px]">
      <p className="text-[72px] font-bold leading-[86px] tracking-tight text-info">
        {month}.{day}
      </p>
      {/* 시안에서 요일 상자가 날짜 상자와 12px 겹친다 */}
      <p className="-mt-3 pl-[7px] text-[28px] font-semibold leading-9 text-fg">
        {weekdayName(serverDate)}
      </p>
    </section>
  );
}

const WEEKDAY_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** 시안의 요일 표기는 영문 전체 이름이다. 타임존 보정을 피해 UTC 로 읽는다. */
function weekdayName(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return WEEKDAY_EN[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? '';
}

// --- TODAY'S CHECK -----------------------------------------------------------

/**
 * 홈의 주 카드.
 *
 * 시안은 상태와 무관하게 타일 두 장을 늘 나란히 두고, 강조색은 `피부 점호 시작`
 * 쪽에 고정돼 있다. 서버가 주는 `priority` 는 왼쪽 타일의 문구와 활성 여부에만 쓴다.
 */
function TodayCheckCard({ data, onNavigate }: { data: Home; onNavigate: (to: string) => void }) {
  const pending = data.pendingFollowUp;
  const answeredToday = data.today !== null;

  return (
    /*
     * 시안 기준 368×309, 안쪽 여백 좌 24 / 위 19.
     * 위 간격만 시안(23)보다 9 줄였다 — 홈은 스크롤이 없어야 하는 화면이다.
     */
    <section className="mt-[14px] rounded-card bg-card-hero px-[24px] pb-[20px] pt-[19px] shadow-neu">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-fg-faint">
        TODAY&apos;S CHECK
      </p>

      <h2 className="mt-[7px] text-[28px] font-bold leading-[38px] text-fg">
        {answeredToday ? (
          <>
            오늘 점호를
            <br />
            마쳤어요
          </>
        ) : (
          <>
            오늘 피부 상태는
            <br />
            어떤가요?
          </>
        )}
      </h2>

      {/* 시안 기준 타일 163×140, 간격 7. 스크롤을 없애려고 높이만 8 줄였다 */}
      <div className="mt-[16px] grid grid-cols-2 gap-[7px]">
        <ActionTile
          icon="note"
          title="경과 확인하기"
          caption={pending ? '어제 기록을 남겨주세요' : '확인할 기록이 없어요'}
          disabled={!pending}
          onClick={() => pending && onNavigate(`/follow-up/${pending.reportId}`)}
        />
        <ActionTile
          icon="face"
          title="피부 점호 시작"
          caption={answeredToday ? '오늘의 안내 다시 보기' : '상태를 기록하고 관리받기'}
          tone="accent"
          onClick={() =>
            onNavigate(
              answeredToday && data.today?.reportId
                ? `/report/result/${data.today.reportId}`
                : '/report',
            )
          }
        />
      </div>
    </section>
  );
}

function ActionTile({
  icon,
  title,
  caption,
  onClick,
  tone = 'default',
  disabled,
}: {
  icon: IconName;
  title: string;
  caption: string;
  onClick: () => void;
  tone?: 'default' | 'accent';
  disabled?: boolean;
}) {
  const isAccent = tone === 'accent';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex h-[132px] flex-col items-center rounded-card px-3 pt-[22px] text-center transition',
        isAccent ? 'bg-accent text-panel-text' : 'bg-card-raised text-fg shadow-neu',
        disabled && 'opacity-40',
      )}
    >
      <Icon name={icon} className="size-8" />
      <span className="mt-[15px] text-body-strong">{title}</span>
      <span className={clsx('mt-[5px] text-xs', isAccent ? 'text-panel-label' : 'text-fg-faint')}>
        {caption}
      </span>
    </button>
  );
}

// --- 하단 카드 ---------------------------------------------------------------

function RecentRecordCard({
  data,
  options,
  onOpen,
}: {
  data: Home;
  options: SkinReportOptions | undefined;
  onOpen: (reportId: string) => void;
}) {
  const recent = data.recentReport;

  if (!recent) {
    return (
      <MiniCard label="RECENT RECORD" className="h-[192px]">
        <p className="mt-[13px] text-sm text-fg-faint">아직 기록이 없어요</p>
      </MiniCard>
    );
  }

  const summary = [
    labelOf(options?.areas, recent.primaryArea),
    labelsOf(options?.appearances, recent.appearances),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <MiniCard label="RECENT RECORD" className="h-[192px]">
      <p className="mt-[13px] text-body-strong text-fg">{formatShortDate(recent.reportDate)}</p>
      <p className="mt-[4px] truncate text-xs text-fg-muted">{summary}</p>

      {/* 시안 기준 52px 원이 카드 오른쪽 아래에 걸친다 */}
      <button
        type="button"
        onClick={() => onOpen(recent.id)}
        aria-label="기록 자세히 보기"
        className="mt-[9px] grid size-[52px] shrink-0 -translate-x-[2px] place-items-center self-end rounded-full bg-gradient-to-br from-[#CFFFE0] to-[#8CFFB6] text-panel-text"
      >
        <span aria-hidden="true" className="text-lg">
          ↗
        </span>
      </button>

      <hr className="mt-auto border-panel" />
      <Link
        to={`/records/${recent.id}`}
        className="flex items-center justify-between pt-[10px] text-xs text-fg"
      >
        기록 자세히 보기
        <span aria-hidden="true" className="text-fg-faint">
          ›
        </span>
      </Link>
    </MiniCard>
  );
}

function NextCheckCard({ time }: { time: string }) {
  return (
    // 시안에서 이제 RECENT RECORD 와 같은 180×192 다
    <MiniCard label="NEXT CHECK" className="h-[192px]">
      <div className="mt-[13px] flex items-start justify-between gap-2">
        <div className="text-left">
          <p className="text-xs text-fg-muted">내일 경과 확인</p>
          <p className="mt-[1px] text-body-strong font-semibold text-info">{time}</p>
        </div>
        <span className="grid size-[46px] shrink-0 place-items-center rounded-full border border-dashed border-info text-info">
          <Icon name="bell" className="size-5" />
        </span>
      </div>

      <hr className="mt-auto border-panel" />
      {/*
       * 시안(30:37549)에 새로 생긴 줄. 갈 화면이 아직 시안에 없어서 눌리지 않는다.
       * 설정의 `알림 설정` 행과 같은 상태다. (docs/명세-대조.md 2-10)
       */}
      <div
        aria-disabled="true"
        className="flex items-center justify-between pt-[10px] text-xs text-fg opacity-60"
      >
        알람 설정하기
        <span aria-hidden="true" className="text-fg-faint">
          ›
        </span>
      </div>
    </MiniCard>
  );
}

function MiniCard({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    // 시안 기준 안쪽 여백 좌 17 / 위 11
    <section
      className={clsx(
        'flex flex-col rounded-card bg-card shadow-neu px-[17px] py-[11px]',
        className,
      )}
    >
      <p className="text-[10px] font-semibold tracking-[0.14em] text-fg-faint">{label}</p>
      {children}
    </section>
  );
}

function HomeSkeleton() {
  return (
    // 위 여백은 본 화면과 같아야 한다. 다르면 로딩이 끝날 때 화면이 튄다
    <div className="flex flex-col gap-5 px-[17px] pt-[calc(var(--safe-top)+7px)]">
      <div className="h-[54px] w-40 animate-pulse rounded-pill bg-card-raised" />
      <div className="h-24 w-52 animate-pulse rounded-card bg-card-raised" />
      <div className="h-[309px] animate-pulse rounded-card bg-card-hero" />
      <div className="h-[192px] animate-pulse rounded-card bg-card" />
    </div>
  );
}
