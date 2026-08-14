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
 * 홈.
 *
 * 시안 대비 두 블록(D-Day 위젯, BRIEFING)은 현재 API 계약에 대응 엔드포인트가 없다.
 * `PLACEHOLDER` 주석이 그 자리이며, 값이 정해지면 그대로 교체하면 된다.
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
    <div className="safe-top flex flex-col gap-5 px-5 pt-4">
      <ProfileHeader />
      <DischargeWidget />
      <TodayCheckCard data={data} onNavigate={navigate} />

      <div className="grid grid-cols-2 gap-3">
        <BriefingCard />

        <div className="flex flex-col gap-3">
          <RecentRecordCard
            data={data}
            options={optionsQuery.data}
            onOpen={(id) => navigate(`/records/${id}`)}
          />
          <NextCheckCard
            time={notificationQuery.data?.time ?? '17:30'}
            onOpen={() => navigate('/calendar')}
          />
        </div>
      </div>
    </div>
  );
}

// --- 상단 --------------------------------------------------------------------

function ProfileHeader() {
  return (
    <header className="flex items-center gap-3">
      <div className="size-11 shrink-0 rounded-full bg-card-raised" aria-hidden="true" />
      <div className="flex-1">
        {/* PLACEHOLDER: 복무 정보(군종·계급) 저장 API 가 아직 없다. */}
        <p className="text-xs text-fg-muted">김멋사님</p>
        <p className="text-body-strong font-semibold text-fg">육군 상병</p>
      </div>
      <button type="button" className="text-info" aria-label="알림">
        <Icon name="bell" className="size-6" />
      </button>
    </header>
  );
}

function DischargeWidget() {
  // PLACEHOLDER: 입대일·전역예정일 기반 D-Day 산출 API 가 아직 없다.
  return (
    <section aria-label="전역까지 남은 기간" className="-mt-1">
      <p className="text-body-strong font-semibold text-fg">전역까지</p>
      <p className="text-[64px] font-bold leading-none tracking-tight text-info">D-187</p>
    </section>
  );
}

// --- TODAY'S CHECK -----------------------------------------------------------

/**
 * 홈의 주 카드.
 *
 * 무엇을 먼저 보여줄지는 서버가 `priority` 로 정해 준다(유저플로우 2. 홈 진입).
 * 미완료 경과가 있으면 그게 최우선이고, 오늘 점호는 그 다음이다.
 */
function TodayCheckCard({ data, onNavigate }: { data: Home; onNavigate: (to: string) => void }) {
  const pending = data.pendingFollowUp;
  // `priority` 가 FOLLOW_UP 이어도 대상 기록이 없으면 보낼 곳이 없다.
  const followUpFirst = data.priority === 'FOLLOW_UP' && pending !== null;
  const answeredToday = data.today !== null;

  return (
    <section className="rounded-card bg-card px-5 py-6">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-fg-faint">TODAY&apos;S CHECK</p>

      {followUpFirst ? (
        <>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-fg">
            어제 기록한 피부 불편은
            <br />
            오늘 어떤가요?
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            {formatShortDate(pending.reportDate)} 기록의 경과를 남겨주세요.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <ActionTile
              icon="note"
              title="경과 확인하기"
              caption="어제 기록의 변화 남기기"
              tone="accent"
              onClick={() => onNavigate(`/follow-up/${pending.reportId}`)}
            />
            <ActionTile
              icon="face"
              title="피부 점호 시작"
              caption="오늘 상태 기록하기"
              onClick={() => onNavigate('/report')}
            />
          </div>
        </>
      ) : answeredToday ? (
        <>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-fg">
            오늘 점호를
            <br />
            마쳤어요
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            {data.today?.state === 'NO_DISCOMFORT'
              ? '특별한 불편이 없다고 기록했어요.'
              : '오늘의 관리 방법을 다시 확인할 수 있어요.'}
          </p>

          {data.today?.reportId && (
            <button
              type="button"
              onClick={() => onNavigate(`/report/result/${data.today!.reportId}`)}
              className="mt-5 w-full rounded-pill bg-accent px-5 py-4 text-body-strong font-semibold text-panel-text"
            >
              오늘의 안내 다시 보기
            </button>
          )}
        </>
      ) : (
        <>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-fg">
            금일 피부 상태,
            <br />
            이상 있나요?
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <ActionTile
              icon="note"
              title="경과 확인하기"
              caption="확인할 기록이 없어요"
              disabled
              onClick={() => {}}
            />
            <ActionTile
              icon="face"
              title="피부 점호 시작"
              caption="상태를 기록하고 관리받기"
              tone="accent"
              onClick={() => onNavigate('/report')}
            />
          </div>
        </>
      )}
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
        'flex flex-col items-center gap-2 rounded-card px-3 py-5 text-center transition',
        isAccent ? 'bg-accent text-panel-text' : 'bg-card-raised text-fg',
        disabled && 'opacity-40',
      )}
    >
      <Icon name={icon} className="size-8" />
      <span className="text-body-strong font-semibold">{title}</span>
      <span className={clsx('text-xs', isAccent ? 'text-panel-label' : 'text-fg-muted')}>
        {caption}
      </span>
    </button>
  );
}

// --- 하단 카드 ---------------------------------------------------------------

function BriefingCard() {
  // PLACEHOLDER: 기상 API 가 계약에 없다. 값이 정해지면 교체한다.
  return (
    <MiniCard label="BRIEFING">
      <p className="text-body-strong font-semibold text-fg">기상</p>
      <p className="mt-0.5 text-sm text-fg-muted">32° / 25°</p>

      <p className="mt-4 text-body-strong font-semibold text-fg">예상 환경</p>
      <p className="mt-0.5 text-sm text-fg-muted">야외활동 훈련</p>

      <hr className="my-4 border-panel" />

      <div className="flex items-end justify-between gap-2">
        <p className="text-xs leading-relaxed text-fg-muted">
          · 자외선 차단
          <br />· 수분보충
        </p>
        <span aria-hidden="true" className="text-fg-muted">
          ›
        </span>
      </div>
    </MiniCard>
  );
}

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
      <MiniCard label="RECENT RECORD">
        <p className="text-sm text-fg-muted">아직 기록이 없어요</p>
      </MiniCard>
    );
  }

  // 정보구조도상 `최근 피부 기록` 아래에 `전체 기록 보기`가 붙는다.
  const seeAll = (
    <Link to="/records" className="mt-3 block text-xs font-semibold text-info">
      전체 기록 보기 ›
    </Link>
  );

  const summary = [
    labelOf(options?.areas, recent.primaryArea),
    labelsOf(options?.appearances, recent.appearances),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <MiniCard label="RECENT RECORD">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body-strong font-semibold text-fg">
            {formatShortDate(recent.reportDate)}
          </p>
          <p className="mt-0.5 truncate text-sm text-fg-muted">{summary}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(recent.id)}
          aria-label="기록 자세히 보기"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-panel-text"
        >
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      {seeAll}
    </MiniCard>
  );
}

/** 다음 점호 시각. 누르면 날짜별로 시각을 조정하는 캘린더로 간다. */
function NextCheckCard({ time, onOpen }: { time: string; onOpen: () => void }) {
  return (
    <MiniCard label="NEXT CHECK">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="text-left">
          <p className="text-sm text-fg-muted">내일 경과 확인</p>
          <p className="text-body-strong font-semibold text-info">{time}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-info text-info">
          <Icon name="bell" className="size-4" />
        </span>
      </button>
    </MiniCard>
  );
}

function MiniCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-1 flex-col rounded-card bg-card-raised px-4 py-4">
      <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-fg-faint">{label}</p>
      {children}
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="safe-top flex flex-col gap-5 px-5 pt-4">
      <div className="h-11 w-40 animate-pulse rounded-pill bg-card-raised" />
      <div className="h-20 w-52 animate-pulse rounded-card bg-card-raised" />
      <div className="h-64 animate-pulse rounded-card bg-card" />
      <div className="h-40 animate-pulse rounded-card bg-card-raised" />
    </div>
  );
}
