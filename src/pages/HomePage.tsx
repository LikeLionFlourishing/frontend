import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { home as homeApi, notifications, reports } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { Icon, type IconName } from '@/components/Icon';
import { labelOf, labelsOf, useReportOptions } from '@/hooks/useReportOptions';
import { formatShortDate } from '@/lib/date';
import { computeStreak, recentDays, STREAK_WINDOW } from '@/lib/streak';
import { clsx } from '@/lib/clsx';
import type { Home, SkinReportOptions } from '@/api/schemas';

/**
 * 홈 (확정 시안 22:10631).
 *
 * 프로필 → 오늘 날짜 → TODAY'S CHECK → 아래 카드 세 장(최근 기록 / STREAK / 다음 점호).
 *
 * 개편 전에 있던 D-Day 위젯과 BRIEFING 카드는 시안에서 사라져 함께 지웠다.
 * 그 자리에 큰 날짜와 STREAK 이 들어왔다.
 */
export function HomePage() {
  const navigate = useNavigate();

  const homeQuery = useQuery({ queryKey: queryKeys.home, queryFn: homeApi.get });
  const optionsQuery = useReportOptions();
  const notificationQuery = useQuery({
    queryKey: queryKeys.notificationSettings,
    queryFn: notifications.getSettings,
  });

  /*
   * STREAK 은 계약에 필드가 없어서 최근 기록 목록으로 직접 센다.
   * 홈만으로는 알 수 없어 목록을 한 번 더 부른다. (lib/streak.ts 의 한계 설명 참고)
   */
  const streakQuery = useQuery({
    queryKey: [...queryKeys.reports, { limit: STREAK_WINDOW }],
    queryFn: () => reports.list({ limit: STREAK_WINDOW }),
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

  /*
   * 오늘 `괜찮아요` 만 누른 날은 피부보고가 없어 목록에 안 나온다.
   * 홈이 주는 오늘치(`today`)로 그날 하루만 보정한다.
   */
  const recordedDates = [
    ...(streakQuery.data?.data.map((r) => r.reportDate) ?? []),
    ...(data.today ? [data.today.date] : []),
  ];

  return (
    <div className="safe-top flex flex-col px-[17px] pt-[7px]">
      <ProfileHeader />
      <TodayDate serverDate={data.serverDate} />
      <TodayCheckCard data={data} onNavigate={navigate} />

      {/* 시안 기준 카드 사이 7px, 오른쪽 열 안에서는 6px */}
      <div className="mt-[14px] grid grid-cols-2 gap-[7px]">
        <RecentRecordCard
          data={data}
          options={optionsQuery.data}
          onOpen={(id) => navigate(`/records/${id}`)}
        />

        <div className="flex flex-col gap-[6px]">
          <StreakCard recordedDates={recordedDates} serverDate={data.serverDate} />
          <NextCheckCard time={notificationQuery.data?.time ?? '17:30'} />
        </div>
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
    // 시안 기준 368×309, 안쪽 여백 좌 24 / 위 19
    <section className="mt-[23px] rounded-card bg-card-hero px-[24px] pb-[27px] pt-[19px]">
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

      {/* 시안 기준 타일 163×140, 간격 7 */}
      <div className="mt-[21px] grid grid-cols-2 gap-[7px]">
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
        'flex h-[140px] flex-col items-center rounded-card px-3 pt-[25px] text-center transition',
        isAccent ? 'bg-accent text-panel-text' : 'bg-card-raised text-fg',
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

/** 시안(22:10691)의 막대. 높이는 고정이고 색만 그날 기록 여부를 따른다. */
const STREAK_BAR_HEIGHTS = [11, 17, 22, 29, 37];

function StreakCard({
  recordedDates,
  serverDate,
}: {
  recordedDates: string[];
  serverDate: string;
}) {
  const streak = computeStreak(recordedDates, serverDate);
  const days = recentDays(recordedDates, serverDate, STREAK_BAR_HEIGHTS.length);

  return (
    <MiniCard label="STREAK" className="h-[93px]">
      <div className="flex flex-1 items-end justify-between">
        <div>
          <p className="text-[30px] font-bold leading-none text-info">{streak}</p>
          <p className="mt-[9px] text-xs text-fg-muted">
            {streak > 0 ? '일 연속 기록 중!' : '오늘부터 시작해요'}
          </p>
        </div>

        <div aria-hidden="true" className="flex items-end gap-[7px] pb-[7px]">
          {STREAK_BAR_HEIGHTS.map((height, index) => (
            <span
              key={height}
              style={{ height }}
              className={clsx('w-[5px] rounded-full', days[index] ? 'bg-info' : 'bg-[#939598]')}
            />
          ))}
        </div>
      </div>
    </MiniCard>
  );
}

function NextCheckCard({ time }: { time: string }) {
  return (
    <MiniCard label="NEXT CHECK" className="h-[93px]">
      <div className="flex flex-1 items-end justify-between gap-2">
        <div className="text-left">
          <p className="text-xs text-fg-muted">내일 경과 확인</p>
          <p className="mt-[2px] text-xs font-semibold text-info">{time}</p>
        </div>
        <span className="grid size-[46px] shrink-0 place-items-center rounded-full border border-dashed border-info text-info">
          <Icon name="bell" className="size-5" />
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
    <section className={clsx('flex flex-col rounded-card bg-card px-[17px] py-[11px]', className)}>
      <p className="text-[10px] font-semibold tracking-[0.14em] text-fg-faint">{label}</p>
      {children}
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="safe-top flex flex-col gap-5 px-[17px] pt-[7px]">
      <div className="h-[54px] w-40 animate-pulse rounded-pill bg-card-raised" />
      <div className="h-24 w-52 animate-pulse rounded-card bg-card-raised" />
      <div className="h-[309px] animate-pulse rounded-card bg-card-hero" />
      <div className="h-[192px] animate-pulse rounded-card bg-card" />
    </div>
  );
}
