import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { newIdempotencyKey } from '@/api/client';
import { reports } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { AiLoading } from '@/components/AiLoading';
import { MedicalDisclaimer, ResultSection } from '@/components/ResultSection';
import { PrimaryButton, StepLayout } from '@/components/StepLayout';
import { labelOf, labelsOf, useReportOptions } from '@/hooks/useReportOptions';
import type { SkinReportDetail, SkinReportOptions } from '@/api/schemas';

/**
 * 3-4. 오늘의 관리 가이드.
 *
 * 시안의 결과01~05 는 각 카드를 펼친 상태다. 화면을 5개로 나누지 않고
 * 하나의 스택에서 카드를 펼치는 방식으로 구현한다.
 */
export function ReportResultPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const optionsQuery = useReportOptions();
  const reportQuery = useQuery({
    queryKey: queryKeys.report(reportId!),
    queryFn: () => reports.get(reportId!),
    enabled: Boolean(reportId),
  });

  const retry = useMutation({
    mutationFn: () => reports.retryCareGuide(reportId!, newIdempotencyKey()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId!) }),
  });

  if (reportQuery.isError || optionsQuery.isError) {
    return (
      <StepLayout title="기록을 찾을 수 없어요" onBack={() => navigate('/')}>
        <p className="text-sm text-fg-muted">
          {toUserMessage(reportQuery.error ?? optionsQuery.error)}
        </p>
      </StepLayout>
    );
  }

  if (reportQuery.isPending) {
    return <AiLoading title="불러오는 중" subtitle="잠시만 기다려 주세요." />;
  }

  if (optionsQuery.isPending) {
    return <AiLoading title="불러오는 중" subtitle="잠시만 기다려 주세요." />;
  }

  const report = reportQuery.data;
  const care = report.careResult;
  const isClinician = report.resultType === 'CLINICIAN_CHECK';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col bg-base">
      <header className="safe-top px-5 pb-2 pt-5">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="-ml-1 shrink-0 text-2xl leading-none text-fg"
            aria-label="홈으로"
          >
            ‹
          </button>
          <h1 className="text-2xl font-bold leading-snug text-fg">오늘의 관리 가이드</h1>
        </div>
        <p className="mt-2 text-sm text-fg-muted">
          {isClinician
            ? '오늘은 셀프케어보다 확인이 먼저입니다.'
            : '현재 상태와 검토된 관리 규칙을 바탕으로 안내드려요.'}
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-5 py-5">
        {isClinician ? (
          <ResultSection kind="CLINICIAN" text={care.clinicianMessage ?? undefined} />
        ) : (
          <>
            <SummaryCard report={report} options={optionsQuery.data} summary={care.summary} />
            <ResultSection kind="DO_TODAY" items={care.doToday} />
            <ResultSection kind="AVOID_TODAY" items={care.avoidToday} />
            <ResultSection kind="CHECK_NEXT" items={care.checkNext} />
          </>
        )}

        {/* AI 설명 생성에 실패하면 규칙의 기본 문구가 내려온다. 재생성은 딱 한 번만 허용된다. */}
        {care.aiGenerationStatus === 'FALLBACK' && !care.retryUsed && (
          <div className="rounded-card bg-card-raised px-5 py-4">
            <p className="text-sm text-fg-muted">
              안내 문구를 다시 만들 수 있어요. 관리 내용 자체는 바뀌지 않습니다.
            </p>
            <button
              type="button"
              onClick={() => retry.mutate()}
              disabled={retry.isPending}
              className="mt-3 rounded-pill bg-accent px-5 py-2 text-sm font-semibold text-panel-text disabled:opacity-50"
            >
              {retry.isPending ? '다시 만드는 중…' : '다시 만들기'}
            </button>
            {retry.isError && (
              <p className="mt-2 text-sm text-accent">{toUserMessage(retry.error)}</p>
            )}
          </div>
        )}

        {care.similarExperience && (
          <button
            type="button"
            onClick={() => navigate(`/records/${care.similarExperience!.reportId}`)}
            className="rounded-card bg-card-raised px-5 py-4 text-left"
          >
            <p className="text-body-strong font-semibold text-fg">유사 기록 보기</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              {care.similarExperience.displayText}
            </p>
          </button>
        )}

        <MedicalDisclaimer />
      </main>

      <footer className="safe-bottom sticky bottom-0 bg-base px-5 pb-4 pt-3">
        <PrimaryButton onClick={() => navigate('/', { replace: true })}>
          내일 상태 다시 확인하기
        </PrimaryButton>
      </footer>
    </div>
  );
}

/** 시안의 `현재 기록 요약` 카드. 탭하면 구조화 5필드를 펼친다. */
function SummaryCard({
  report,
  options,
  summary,
}: {
  report: SkinReportDetail;
  options: SkinReportOptions;
  summary: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const c = report.confirmed;

  const rows = [
    { label: '부위', value: labelOf(options.areas, c.primaryArea) },
    { label: '겉모습', value: labelsOf(options.appearances, c.appearances) },
    { label: '불편', value: labelsOf(options.sensations, c.sensations) },
    { label: '상황', value: labelsOf(options.situations, c.situations) },
    { label: '관리 상태', value: labelOf(options.careAvailability, c.careAvailability) },
  ];

  return (
    <section className="overflow-hidden rounded-card bg-panel">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full px-5 py-5 text-left"
      >
        <span className="block text-body-strong font-semibold text-panel-text">현재 기록 요약</span>
        <span className="mt-1 block text-sm text-panel-label">
          오늘의 피부 상태를 한눈에 확인해요
        </span>
      </button>

      {expanded && (
        <div className="border-t border-black/10 px-5 py-4">
          <p className="mb-4 text-sm leading-relaxed text-panel-text">{summary}</p>
          <dl className="flex flex-col gap-3">
            {rows.map((row) => (
              <div key={row.label} className="flex gap-4">
                <dt className="w-20 shrink-0 text-sm font-semibold text-panel-text">{row.label}</dt>
                <dd className="text-sm text-panel-label">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
