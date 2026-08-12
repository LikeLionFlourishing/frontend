import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { reports } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { StepLayout } from '@/components/StepLayout';
import { labelOf, labelsOf, useReportOptions } from '@/hooks/useReportOptions';
import { daysBetween, formatDotDate } from '@/lib/date';
import {
  ACTION_COMPLETION_LABEL,
  CLINICIAN_CHECK_LABEL,
  SKIN_CHANGE_LABEL,
} from '@/lib/enumLabels';
import { clsx } from '@/lib/clsx';
import type { FollowUp, SkinReportDetail, SkinReportOptions } from '@/api/schemas';

/**
 * 5-3. 기록 자세히 보기.
 *
 * 시안의 `피부 변화 기록` 은 여러 날에 걸친 타임라인이지만,
 * 현재 API 는 보고 1건당 경과 1건만 지원한다(`PUT /skin-reports/{id}/follow-up`, 48시간 1회).
 * 그래서 여기서는 [시작일 → 경과 1건] 두 지점만 그린다.
 * 다일차 추적이 계약에 들어오면 이 컴포넌트에 항목만 늘리면 된다.
 */
export function RecordDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const optionsQuery = useReportOptions();
  const reportQuery = useQuery({
    queryKey: queryKeys.report(reportId!),
    queryFn: () => reports.get(reportId!),
    enabled: Boolean(reportId),
  });

  if (reportQuery.isError) {
    return (
      <StepLayout title="기록을 찾을 수 없어요" onBack={() => navigate('/records')}>
        <p className="text-sm text-fg-muted">{toUserMessage(reportQuery.error)}</p>
      </StepLayout>
    );
  }

  if (reportQuery.isPending) {
    return (
      <div className="safe-top flex flex-col gap-4 px-5 pt-6">
        <div className="h-9 w-52 animate-pulse rounded bg-card-raised" />
        <div className="h-24 animate-pulse rounded-card bg-card-raised" />
        <div className="h-48 animate-pulse rounded-card bg-card-raised" />
      </div>
    );
  }

  const report = reportQuery.data;
  const options = optionsQuery.data;
  const care = report.careResult;
  const followUp = report.followUp;

  return (
    <div className="safe-top flex flex-col px-5 pt-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="-ml-1 self-start text-2xl leading-none text-fg"
        aria-label="뒤로"
      >
        ‹
      </button>

      <h1 className="mt-2 text-3xl font-bold text-fg">{formatDotDate(report.reportDate)} 기록</h1>

      <div className="mt-7 flex flex-col gap-6 pb-10">
        <Section title="내가 작성한 내용">
          <Panel>
            <p className="text-sm leading-relaxed text-panel-text">{report.rawText}</p>
          </Panel>
        </Section>

        <Section title="관리 전 확인 내용">
          <Panel>
            <p className="text-sm leading-relaxed text-panel-text">
              {report.preCareChecks.includes('NONE')
                ? '해당되는 항목이 없어요.'
                : labelsOf(options?.preCareChecks, report.preCareChecks)}
            </p>
          </Panel>
        </Section>

        <Section title="정리된 피부 상태">
          <Panel>
            <StructuredRows report={report} options={options} />
          </Panel>
        </Section>

        <Section title="당시 안내받은 내용">
          <Panel>
            {report.resultType === 'CLINICIAN_CHECK' ? (
              <p className="text-sm leading-relaxed text-panel-text">{care.clinicianMessage}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {[...care.doToday, ...care.avoidToday, ...care.checkNext].map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-panel-text">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Section>

        <Section title="피부 변화 기록">
          <Timeline report={report} followUp={followUp} />
        </Section>

        <Section title="마지막 상태">
          <Panel>
            {followUp ? (
              <>
                <p className="text-body-strong font-semibold text-panel-text">
                  {SKIN_CHANGE_LABEL[followUp.skinChange]}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-panel-label">
                  {followUpDetail(followUp)}
                </p>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-panel-text">
                {report.status === 'EXPIRED'
                  ? '입력 기간이 지나 경과가 기록되지 않았어요.'
                  : '아직 경과를 기록하지 않았어요.'}
              </p>
            )}
          </Panel>
        </Section>

        {report.status === 'FOLLOW_UP_PENDING' && (
          <button
            type="button"
            onClick={() => navigate(`/follow-up/${report.id}`)}
            className="w-full rounded-pill bg-accent px-5 py-4 text-body-strong font-semibold text-panel-text"
          >
            지금 경과 남기기
          </button>
        )}
      </div>
    </div>
  );
}

// --- 구성 요소 ----------------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-body-strong font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-card bg-panel px-5 py-4">{children}</div>;
}

function StructuredRows({
  report,
  options,
}: {
  report: SkinReportDetail;
  options: SkinReportOptions | undefined;
}) {
  const c = report.confirmed;
  const rows = [
    { label: '부위', value: labelOf(options?.areas, c.primaryArea) },
    { label: '겉모습', value: labelsOf(options?.appearances, c.appearances) },
    { label: '불편', value: labelsOf(options?.sensations, c.sensations) },
    { label: '상황', value: labelsOf(options?.situations, c.situations) },
    { label: '관리 상태', value: labelOf(options?.careAvailability, c.careAvailability) },
  ];

  return (
    <dl className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex gap-4">
          <dt className="w-20 shrink-0 text-sm font-semibold text-panel-text">{row.label}</dt>
          <dd className="min-w-0 flex-1 text-sm text-panel-label">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Timeline({ report, followUp }: { report: SkinReportDetail; followUp: FollowUp | null }) {
  const entries = [
    ...(followUp
      ? [
          {
            key: 'follow-up',
            date: formatDotDate(followUp.submittedAt),
            caption: dayCaption(report.reportDate, followUp.submittedAt),
            title: SKIN_CHANGE_LABEL[followUp.skinChange],
            detail: followUpDetail(followUp),
            tone: followUp.skinChange === 'WORSENED' ? 'caution' : 'accent',
          } as const,
        ]
      : []),
    {
      key: 'start',
      date: formatDotDate(report.reportDate),
      caption: '(시작일)',
      title: '불편을 보고했어요',
      detail: report.rawText,
      tone: 'muted',
    } as const,
  ];

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.key} className="flex gap-4">
          <div className="flex flex-col items-center pt-1.5">
            <span
              className={clsx(
                'size-3 shrink-0 rounded-full',
                entry.tone === 'accent' && 'bg-accent',
                entry.tone === 'caution' && 'bg-caution-500',
                entry.tone === 'muted' && 'bg-panel-label',
              )}
            />
            {index < entries.length - 1 && <span className="w-px flex-1 bg-panel-label/50" />}
          </div>

          <div className={clsx('min-w-0 flex-1', index < entries.length - 1 && 'pb-6')}>
            <p className="text-sm text-fg-muted">
              {entry.date} <span className="text-fg-faint">{entry.caption}</span>
            </p>
            <p className="mt-1 text-body-strong font-semibold text-fg">{entry.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">{entry.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// --- 헬퍼 ---------------------------------------------------------------------

function dayCaption(startISO: string, currentISO: string): string {
  const diff = daysBetween(startISO, currentISO);
  return diff <= 0 ? '(당일)' : `(${diff + 1}일째)`;
}

function followUpDetail(followUp: FollowUp): string {
  return followUp.kind === 'SELF_CARE'
    ? `관리 방법 실행 · ${ACTION_COMPLETION_LABEL[followUp.actionCompletion]}`
    : CLINICIAN_CHECK_LABEL[followUp.clinicianCheckStatus];
}
