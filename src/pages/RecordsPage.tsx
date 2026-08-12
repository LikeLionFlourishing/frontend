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
 * 5. 기록.
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
    <div className="safe-top flex flex-col gap-6 px-5 pt-5">
      <header>
        <h1 className="text-2xl font-bold text-fg">기록조회</h1>
        <p className="mt-2 text-sm text-fg-muted">이전에 기록한 피부 상태와 변화를 확인해보세요</p>
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
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-body-strong font-semibold text-fg">이어서 확인할 기록</h2>
            <span className="text-sm text-fg-muted">{pending.length}건</span>
          </div>

          <div className="flex flex-col gap-3">
            {pending.map((report) => (
              <PendingCard
                key={report.id}
                report={report}
                options={optionsQuery.data}
                onCheck={() => navigate(`/follow-up/${report.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-body-strong font-semibold text-fg">지난 기록</h2>
          <div className="flex flex-col gap-3">
            {past.map((report) => (
              <PastCard
                key={report.id}
                report={report}
                options={optionsQuery.data}
                onOpen={() => navigate(`/records/${report.id}`)}
              />
            ))}
          </div>
        </section>
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

/** 시안의 밝은 회색 카드. 경과 입력이 남은 건이라 눈에 띄게 둔다. */
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
    <article className="rounded-card bg-panel px-5 py-5">
      <h3 className="text-body-strong font-semibold text-panel-text">{title}</h3>

      <p className="mt-2 text-sm text-panel-label">시작일 {formatDotDate(report.reportDate)}</p>

      <p className="mt-3 text-sm leading-relaxed text-panel-text">
        아직 경과를 남기지 않았어요. 오늘 상태를 알려주시면 다음 관리 방법을 안내해 드려요.
      </p>

      <button
        type="button"
        onClick={onCheck}
        className="mt-4 w-full rounded-pill bg-card px-5 py-3 text-body-strong font-semibold text-fg"
      >
        상태 확인하기
      </button>
    </article>
  );
}

function PastCard({
  report,
  options,
  onOpen,
}: {
  report: SkinReportSummary;
  options: SkinReportOptions | undefined;
  onOpen: () => void;
}) {
  // 시안에서 위험 신호가 포함된 기록만 밝은 카드로 구분해 둔다.
  const isClinician = report.resultType === 'CLINICIAN_CHECK';

  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx(
        'w-full rounded-card px-5 py-5 text-left',
        isClinician ? 'bg-panel' : 'bg-card-raised',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={clsx(
            'text-body-strong font-semibold',
            isClinician ? 'text-panel-text' : 'text-fg',
          )}
        >
          {formatListDate(report.reportDate)}
        </span>
        <span
          className={clsx(
            'shrink-0 text-xs',
            isClinician ? 'font-semibold text-caution-ink' : 'text-fg-muted',
          )}
        >
          {isClinician
            ? '▲ 위험 신호 포함'
            : progressBadge(report.status, report.skinChange ?? null)}
        </span>
      </div>

      <dl
        className={clsx(
          'mt-4 flex flex-col gap-1.5 text-sm',
          isClinician ? 'text-panel-label' : 'text-fg-muted',
        )}
      >
        <Row label="부위" value={labelOf(options?.areas, report.primaryArea)} muted={isClinician} />
        <Row
          label="상태"
          muted={isClinician}
          value={[
            labelsOf(options?.appearances, report.appearances),
            labelsOf(options?.sensations, report.sensations),
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <Row
          label="상황"
          muted={isClinician}
          value={labelsOf(options?.situations, report.situations)}
        />
      </dl>

      {report.status === 'EXPIRED' && (
        <p className={clsx('mt-3 text-xs', isClinician ? 'text-panel-label' : 'text-fg-faint')}>
          입력 기간이 지나 이전 경험으로는 사용되지 않아요.
        </p>
      )}

      {report.status === 'COMPLETED' && report.skinChange && (
        <p className="sr-only">다음 날 경과: {SKIN_CHANGE_LABEL[report.skinChange]}</p>
      )}
    </button>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className={clsx('shrink-0', muted ? 'text-panel-label' : 'text-fg-faint')}>{label}</dt>
      <dd className="min-w-0 flex-1">{value}</dd>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-40 animate-pulse rounded-card bg-panel/30" />
      <div className="h-32 animate-pulse rounded-card bg-card-raised" />
      <div className="h-32 animate-pulse rounded-card bg-card-raised" />
    </div>
  );
}
