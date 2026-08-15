import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { reports } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { PrimaryButton, StepLayout } from '@/components/StepLayout';
import { labelOf, labelsOf, useReportOptions } from '@/hooks/useReportOptions';
import { daysBetween, formatDotDate } from '@/lib/date';
import {
  ACTION_COMPLETION_LABEL,
  CLINICIAN_CHECK_LABEL,
  SKIN_CHANGE_LABEL,
} from '@/lib/enumLabels';
import { clsx } from '@/lib/clsx';
import { Sentences } from '@/components/Sentences';
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
        <p className="text-sm text-fg-muted">
          <Sentences text={toUserMessage(reportQuery.error)} />
        </p>
      </StepLayout>
    );
  }

  if (reportQuery.isPending) {
    return (
      <div className="flex flex-col gap-4 px-5 pt-[calc(var(--safe-top)+24px)]">
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
    <div className="flex flex-col px-5 pt-[calc(var(--safe-top)+16px)]">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="-ml-1 shrink-0 text-2xl leading-none text-fg"
          aria-label="뒤로"
        >
          ‹
        </button>
        <h1 className="text-[28px] font-bold leading-9 text-fg">
          {formatDotDate(report.reportDate)} 기록
        </h1>
      </div>

      <div className="mt-7 flex flex-col gap-6 pb-10">
        <Section title="내가 작성한 내용">
          <Panel>
            <p className="text-xs leading-4 text-panel-text">{report.rawText}</p>
          </Panel>
        </Section>

        <Section title="관리 전 확인 내용">
          <Panel>
            <p className="text-xs leading-4 text-panel-text">
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

        <Section title="당시 안내된 내용">
          <Panel>
            {report.resultType === 'CLINICIAN_CHECK' ? (
              <p className="text-xs leading-4 text-panel-text">{care.clinicianMessage}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {[...care.doToday, ...care.avoidToday, ...care.checkNext].map((item) => (
                  <li key={item} className="text-xs leading-4 text-panel-text">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Section>

        <Section title="피부 변화 기록">
          <Timeline report={report} followUp={followUp} options={options} />
        </Section>

        <Section title="마지막 상태">
          <Panel>
            {followUp ? (
              <>
                <p className="text-body-strong font-semibold text-panel-text">
                  {SKIN_CHANGE_LABEL[followUp.skinChange]}
                </p>
                <p className="mt-2 text-xs leading-4 text-panel-label">
                  {followUpDetail(followUp)}
                </p>
              </>
            ) : (
              <p className="text-xs leading-4 text-panel-text">
                {report.status === 'EXPIRED'
                  ? '입력 기간이 지나 경과가 기록되지 않았어요.'
                  : '아직 경과를 기록하지 않았어요.'}
              </p>
            )}
          </Panel>
        </Section>

        {report.status === 'FOLLOW_UP_PENDING' && (
          <PrimaryButton onClick={() => navigate(`/follow-up/${report.id}`)}>
            지금 경과 남기기
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

// --- 구성 요소 ----------------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-fg">{title}</h2>
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
    // 선택값이라 비어 있으면 줄 자체를 빼는 편이 읽기 좋다.
    ...(c.otherAreasNote ? [{ label: '다른 부위', value: c.otherAreasNote }] : []),
    { label: '겉모습', value: labelsOf(options?.appearances, c.appearances) },
    { label: '불편', value: labelsOf(options?.sensations, c.sensations) },
    { label: '상황', value: labelsOf(options?.situations, c.situations) },
    { label: '관리 상태', value: labelOf(options?.careAvailability, c.careAvailability) },
  ];

  return (
    <dl className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex gap-4">
          <dt className="w-20 shrink-0 text-[13px] font-semibold text-panel-text">{row.label}</dt>
          <dd className="min-w-0 flex-1 text-xs text-panel-label">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * 시안의 `피부 변화 기록`.
 *
 * 왼쪽 레일에 점을 세우고, 오른쪽 패널 안에 항목을 쌓는다.
 * 항목은 2열이다 — 왼쪽은 상태·행동, 오른쪽은 그날의 변화 요약이다.
 * 시작일 점만 파랑이고 나머지는 회색이다.
 *
 * 지금은 [시작일 → 경과 1건] 두 지점뿐이다. 다일차 추적이 열리면 항목만 늘어난다.
 */
function Timeline({
  report,
  followUp,
  options,
}: {
  report: SkinReportDetail;
  followUp: FollowUp | null;
  options: SkinReportOptions | undefined;
}) {
  const c = report.confirmed;

  const entries = [
    ...(followUp
      ? [
          {
            key: 'follow-up',
            date: formatDotDate(followUp.submittedAt),
            caption: dayCaption(report.reportDate, followUp.submittedAt),
            state: SKIN_CHANGE_LABEL[followUp.skinChange],
            action: '관리 방법 실행',
            // TODO(백엔드): 시안의 `붉은기, 좁쌀 감소` 같은 변화 요약 문구가 계약에 없다.
            summary: '',
            actionResult:
              followUp.kind === 'SELF_CARE'
                ? ACTION_COMPLETION_LABEL[followUp.actionCompletion]
                : CLINICIAN_CHECK_LABEL[followUp.clinicianCheckStatus],
            start: false,
          },
        ]
      : []),
    {
      key: 'start',
      date: formatDotDate(report.reportDate),
      caption: '(시작일)',
      state: '불편해요',
      action: '보고 내용',
      summary: [
        labelsOf(options?.appearances, c.appearances),
        labelsOf(options?.sensations, c.sensations),
      ]
        .filter(Boolean)
        .join(', '),
      actionResult: '',
      start: true,
    },
  ];

  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col items-center pt-5">
        {entries.map((entry, index) => (
          <div key={entry.key} className="flex flex-1 flex-col items-center">
            <span
              className={clsx(
                'size-4 shrink-0 rounded-full',
                entry.start ? 'bg-info' : 'bg-panel-label',
              )}
            />
            {index < entries.length - 1 && <span className="w-0.5 flex-1 bg-panel" />}
          </div>
        ))}
      </div>

      <ol className="min-w-0 flex-1 rounded-card bg-panel px-4 py-4">
        {entries.map((entry, index) => (
          <li
            key={entry.key}
            className={clsx(index > 0 && 'mt-4 border-t border-panel-strong pt-4')}
          >
            <p className="text-body-strong font-semibold text-panel-text">
              {entry.date}{' '}
              <span className="text-xs font-normal text-panel-label">{entry.caption}</span>
            </p>

            <div className="mt-2 flex items-start justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-panel-text">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
                {entry.state}
              </span>
              <span className="min-w-0 text-right text-panel-label">{entry.summary}</span>
            </div>

            <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
              <span className="text-panel-text">{entry.action}</span>
              <span className="min-w-0 text-right text-panel-label">{entry.actionResult}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
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
