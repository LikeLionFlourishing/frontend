import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { reports } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { PrimaryButton, StepLayout } from '@/components/StepLayout';
import { labelOf, labelsOf, useReportOptions } from '@/hooks/useReportOptions';
import { formatDotDate } from '@/lib/date';
import {
  ACTION_COMPLETION_LABEL,
  CLINICIAN_CHECK_LABEL,
  SKIN_CHANGE_LABEL,
} from '@/lib/enumLabels';
import { Sentences } from '@/components/Sentences';
import type { FollowUp, SkinReportDetail, SkinReportOptions } from '@/api/schemas';

/**
 * 5-3. 기록 자세히 보기.
 *
 * 시안(32:54700)은 다섯 덩어리다 —
 * 내가 작성한 내용 · 관리 전 확인 내용 · 정리된 피부 상태 · 당시 안내된 내용 · 마지막 상태.
 *
 * 예전 시안에 있던 `피부 변화 기록` 타임라인은 지금 시안에 없어서 걷어냈다.
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
        <h1 className="text-[30px] font-bold leading-9 text-fg-muted">
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
                {/* 시안 32:54747. 좋아진 경우에만 문구가 있다 */}
                {followUp.skinChange === 'IMPROVED' && (
                  <p className="mt-2 text-xs leading-4 text-panel-label">
                    현재 상태가 좋아지고 있어요. 지금 관리 방법을 이어가 볼까요?
                  </p>
                )}
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

function followUpDetail(followUp: FollowUp): string {
  return followUp.kind === 'SELF_CARE'
    ? `관리 방법 실행 · ${ACTION_COMPLETION_LABEL[followUp.actionCompletion]}`
    : CLINICIAN_CHECK_LABEL[followUp.clinicianCheckStatus];
}
