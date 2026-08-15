import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reports } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { labelOf, labelsOf, useReportOptions } from '@/hooks/useReportOptions';
import { formatListDate, formatDotDate } from '@/lib/date';
import { progressBadge, SKIN_CHANGE_LABEL } from '@/lib/enumLabels';
import { clsx } from '@/lib/clsx';
import type { SkinReportOptions, SkinReportSummary } from '@/api/schemas';

/**
 * 5. 기록조회.
 *
 * 두 영역으로 나뉜다.
 *  - 이어서 확인할 기록: 경과 입력을 기다리는 보고 (`FOLLOW_UP_PENDING`)
 *  - 지난 기록: 완료되었거나 만료된 보고
 *
 * 서버 목록은 최신순 한 벌로 오므로 상태 기준으로 프론트에서 나눈다.
 */
export function RecordsPage() {
  const navigate = useNavigate();
  const optionsQuery = useReportOptions();

  const listQuery = useInfiniteQuery({
    queryKey: ['skin-reports', 'list'],
    queryFn: ({ pageParam }) => reports.list({ cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
  });

  const all = listQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const pending = all.filter((r) => r.status === 'FOLLOW_UP_PENDING');
  const past = all.filter((r) => r.status !== 'FOLLOW_UP_PENDING');

  return (
    <div className="flex flex-col gap-6 px-4 pt-[calc(var(--safe-top)+20px)]">
      {/* 시안(15:8708)은 탭 루트인데도 제목 왼쪽에 뒤로가기가 있다. */}
      <header>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="-ml-1 shrink-0 text-2xl leading-none text-fg"
            aria-label="뒤로"
          >
            ‹
          </button>
          <h1 className="text-[28px] font-bold text-fg">기록조회</h1>
        </div>
        <p className="mt-1 pl-6 text-xs text-fg-muted">
          이전에 기록한 피부 상태와 변화를 확인해보세요
        </p>
      </header>

      {listQuery.isPending && <ListSkeleton />}

      {listQuery.isError && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-sm text-fg-muted">{toUserMessage(listQuery.error)}</p>
          <button
            type="button"
            onClick={() => listQuery.refetch()}
            className="rounded-pill bg-card-raised px-5 py-3 text-sm text-fg"
          >
            새로고침
          </button>
        </div>
      )}

      {listQuery.isSuccess && all.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-card bg-card-raised px-5 py-12 text-center">
          <p className="text-sm text-fg-muted">아직 기록이 없어요.</p>
          <button
            type="button"
            onClick={() => navigate('/report')}
            className="rounded-pill bg-accent px-5 py-3 text-sm font-semibold text-panel-text"
          >
            피부 점호 시작
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <section className="overflow-hidden rounded-card bg-white">
          <div className="flex items-baseline justify-between px-5 py-4">
            <h2 className="text-body-strong font-semibold text-fg">이어서 확인할 기록</h2>
            <span className="text-sm text-fg-muted">{pending.length}건</span>
          </div>

          {pending.map((report) => (
            <PendingCard
              key={report.id}
              report={report}
              options={optionsQuery.data}
              onCheck={() => navigate(`/follow-up/${report.id}`)}
            />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <PastDeck
          records={past}
          options={optionsQuery.data}
          onOpen={(id) => navigate(`/records/${id}`)}
        />
      )}

      {listQuery.hasNextPage && (
        <button
          type="button"
          onClick={() => listQuery.fetchNextPage()}
          disabled={listQuery.isFetchingNextPage}
          className="rounded-pill bg-card-raised px-5 py-3 text-sm text-fg disabled:opacity-50"
        >
          {listQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
        </button>
      )}
    </div>
  );
}

/** 시안의 초록 카드. 경과 입력이 남은 건이라 눈에 띄게 둔다. */
function PendingCard({
  report,
  options,
  onCheck,
}: {
  report: SkinReportSummary;
  options: SkinReportOptions | undefined;
  onCheck: () => void;
}) {
  const title = [
    labelOf(options?.areas, report.primaryArea),
    labelsOf(options?.appearances, report.appearances),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="rounded-card bg-guide-summary px-5 py-5">
      <h3 className="text-body-strong font-semibold text-fg">{title}</h3>

      {/*
        시안은 여기에 직전 경과(`● 나아졌어요`)와 `최근 변화-` 문구가 있다.
        지금 계약에서는 경과가 아직 없는 상태라 그 값이 존재하지 않는다.
        (다일차 추적이 열리면 마지막 경과를 여기에 채운다)
      */}
      {report.skinChange ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-fg">
          <span aria-hidden="true" className="size-2 rounded-full bg-fg" />
          {SKIN_CHANGE_LABEL[report.skinChange]}
        </p>
      ) : (
        <p className="mt-2 text-sm text-fg-muted">아직 경과를 남기지 않았어요.</p>
      )}

      <p className="mt-2 text-sm text-fg-muted">시작일 {formatDotDate(report.reportDate)}</p>

      <button
        type="button"
        onClick={onCheck}
        className="mt-5 w-full rounded-pill bg-card-raised px-5 py-3 text-body-strong font-semibold text-fg"
      >
        상태 확인하기
      </button>
    </article>
  );
}

// --- 지난 기록 덱 --------------------------------------------------------------

/**
 * 시안 기준 카드 높이 257, 다음 카드까지 158 → 99px 씩 겹친다.
 * 결과 화면의 카드 덱과 같은 팔레트를 순서대로 돌려 쓴다.
 *
 * TODO(디자인): 시안에서 파란 카드가 마침 `위험 신호 포함` 건이라
 * 색이 순서인지 의미인지 확실치 않다. 지금은 순서로 본다.
 */
const CARD_HEIGHT = 257;
const CARD_PITCH = 158;

const SURFACES = [
  { bg: 'bg-guide-summary', onDark: false },
  { bg: 'bg-guide-do', onDark: false },
  { bg: 'bg-guide-avoid', onDark: false },
  { bg: 'bg-guide-next', onDark: true },
  { bg: 'bg-card-raised', onDark: false },
];

function PastDeck({
  records,
  options,
  onOpen,
}: {
  records: SkinReportSummary[];
  options: SkinReportOptions | undefined;
  onOpen: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="sr-only">지난 기록</h2>
      <div className="relative" style={{ height: CARD_PITCH * (records.length - 1) + CARD_HEIGHT }}>
        {records.map((report, index) => {
          const surface = SURFACES[index % SURFACES.length]!;
          const isClinician = report.resultType === 'CLINICIAN_CHECK';

          return (
            <button
              key={report.id}
              type="button"
              onClick={() => onOpen(report.id)}
              style={{ top: index * CARD_PITCH, height: CARD_HEIGHT, zIndex: index }}
              className={clsx(
                // 버튼은 내용을 세로 가운데로 두는 게 기본이라 명시적으로 위로 붙인다.
                'absolute inset-x-0 flex flex-col items-stretch justify-start rounded-card px-5 pt-6 text-left',
                surface.bg,
                surface.onDark ? 'text-white' : 'text-fg',
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-body-strong font-semibold">
                  {formatListDate(report.reportDate)}
                </span>
                <span className={clsx('shrink-0 text-xs', surface.onDark ? '' : 'opacity-70')}>
                  {isClinician
                    ? '▲ 위험 신호 포함'
                    : progressBadge(report.status, report.skinChange ?? null)}
                </span>
              </span>

              <dl
                className={clsx(
                  'mt-6 flex flex-col gap-1.5 text-sm',
                  surface.onDark ? 'text-white/90' : 'opacity-80',
                )}
              >
                <Row label="부위" value={labelOf(options?.areas, report.primaryArea)} />
                <Row
                  label="상태"
                  value={[
                    labelsOf(options?.appearances, report.appearances),
                    labelsOf(options?.sensations, report.sensations),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
                <Row label="상황" value={labelsOf(options?.situations, report.situations)} />
              </dl>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="shrink-0">{label}:</dt>
      <dd className="min-w-0 flex-1">{value}</dd>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-40 animate-pulse rounded-card bg-card-raised" />
      <div className="h-32 animate-pulse rounded-card bg-card-raised" />
      <div className="h-32 animate-pulse rounded-card bg-card-raised" />
    </div>
  );
}
