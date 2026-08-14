import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { home as homeApi, reports } from '@/api/endpoints';
import { ApiError, toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { AiLoading } from '@/components/AiLoading';
import { StepLayout } from '@/components/StepLayout';
import { useReportOptions } from '@/hooks/useReportOptions';
import { useReportDraftStore } from '@/stores/reportDraftStore';
import { ConfirmStep, type ConfirmValues } from './report/ConfirmStep';
import { PreCareStep } from './report/PreCareStep';
import { RawTextStep } from './report/RawTextStep';
import { AppearanceAssistStep } from './report/AppearanceAssistStep';
import { SkinStatusStep } from './report/SkinStatusStep';
import type { ReportInterpretation } from '@/api/schemas';

/** 0 은 `오늘 피부 상태`(유저플로우 3-2). 인디케이터에는 포함되지 않는다. */
type Step = 0 | 1 | 2 | 3;

const TOTAL_STEPS = 4; // 시안의 인디케이터는 결과까지 포함해 4단계다.

const STEP_HEADER: Record<Step, { title: string; subtitle: string }> = {
  0: { title: '오늘 피부는 어땠나요?', subtitle: '오늘 하루 피부 상태를 알려주세요.' },
  1: {
    title: '오늘 피부 어땠나요?',
    subtitle: '무슨 일이 있었는지, 어디가 어떻게 불편한지 편하게 작성해 주세요.',
  },
  2: { title: '이렇게 정리했어요', subtitle: '잘못된 내용은 수정해주세요' },
  3: { title: '다음 중 지금 해당하는\n변화가 있나요?', subtitle: '해당하는 항목을 선택해주세요.' },
};

export function ReportFlowPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(0);
  /*
   * 참고 일러스트 보조 입력. 1단계에서 분기하지만 시안의 인디케이터상 2번째 칸이다.
   * 단계 번호를 늘리지 않고 별도 상태로 둔다.
   */
  const [assisting, setAssisting] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);

  const draft = useReportDraftStore();
  const optionsQuery = useReportOptions();

  // reportDate 는 기기 시간이 아니라 서버 기준 오늘(Asia/Seoul)이어야 한다.
  const homeQuery = useQuery({ queryKey: queryKeys.home, queryFn: homeApi.get });

  // `괜찮아요` 는 한 번의 선택으로 저장되고 끝난다.
  const saveNoDiscomfort = useMutation({
    mutationFn: () => homeApi.saveNoDiscomfort(homeQuery.data!.serverDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.home });
      navigate('/', { replace: true });
    },
  });

  const interpret = useMutation({
    mutationFn: () =>
      reports.interpret({
        rawText: draft.rawText,
        ...(draft.manualPrimaryArea || draft.manualAppearances.length > 0
          ? {
              manualSelections: {
                ...(draft.manualPrimaryArea ? { primaryArea: draft.manualPrimaryArea } : {}),
                ...(draft.manualAppearances.length > 0
                  ? { appearances: draft.manualAppearances }
                  : {}),
              },
            }
          : {}),
      }),
    onSuccess: (result) => {
      applyInterpretation(result);
      setStep(2);
    },
  });

  const submit = useMutation({
    mutationFn: () => {
      const key = draft.beginSubmit();
      return reports.create(
        {
          reportDate: homeQuery.data!.serverDate,
          rawText: draft.rawText,
          confirmed: {
            primaryArea: draft.primaryArea!,
            otherAreasNote: draft.otherAreasNote,
            appearances: draft.appearances,
            sensations: draft.sensations,
            situations: draft.situations,
            careAvailability: draft.careAvailability!,
          },
          preCareChecks: draft.preCareChecks,
        },
        key,
      );
    },
    onSuccess: (report) => {
      draft.reset();
      navigate(`/report/result/${report.id}`, { replace: true });
    },
  });

  function applyInterpretation(result: ReportInterpretation) {
    setAiFailed(result.processingStatus === 'FAILED');

    const proposed = result.proposed;
    draft.patch({
      // 사용자가 직접 고른 값이 AI 추출값보다 우선한다. (F-02 수동 선택값 우선순위)
      primaryArea: draft.manualPrimaryArea ?? proposed.primaryArea,
      appearances:
        draft.manualAppearances.length > 0 ? draft.manualAppearances : proposed.appearances,
      otherAreasNote: proposed.otherAreasNote,
      sensations: proposed.sensations,
      situations: proposed.situations,
      careAvailability: proposed.careAvailability,
    });
  }

  // --- 로딩·에러 ------------------------------------------------------------

  if (interpret.isPending) {
    return (
      <AiLoading
        title={'피부 기록을\n정리하고 있어요.'}
        subtitle="오늘의 상태를 바탕으로 관리 방법을 준비하고 있어요."
        stages={[
          '보고 내용을 정리하고 있어요.',
          '상황을 확인하고 있어요.',
          '조금만 기다려 주세요.',
        ]}
      />
    );
  }

  if (submit.isPending) {
    return (
      <AiLoading
        title={'피부 기록을\n정리하고 있어요.'}
        subtitle="오늘의 상태를 바탕으로 관리 방법을 준비하고 있어요."
        stages={[
          '검토된 관리 규칙을 확인하고 있어요.',
          '오늘의 관리 방법을 준비하고 있어요.',
          '거의 다 됐어요.',
        ]}
      />
    );
  }

  if (optionsQuery.isPending || homeQuery.isPending) {
    return <AiLoading title="불러오는 중" subtitle="잠시만 기다려 주세요." />;
  }

  if (optionsQuery.isError || homeQuery.isError) {
    return (
      <StepLayout title="문제가 생겼어요" onBack={() => navigate('/')}>
        <p className="text-sm text-fg-muted">
          {toUserMessage(optionsQuery.error ?? homeQuery.error)}
        </p>
      </StepLayout>
    );
  }

  // --- 스텝 ---------------------------------------------------------------

  const header = assisting
    ? { title: '겉모습은 어떤가요?', subtitle: '가장 비슷한 모습을 선택해주세요' }
    : STEP_HEADER[step];

  const goBack = () => {
    if (assisting) setAssisting(false);
    else if (step === 0) navigate('/');
    else setStep((s) => (s - 1) as Step);
  };

  const confirmValues: ConfirmValues = {
    primaryArea: draft.primaryArea,
    appearances: draft.appearances,
    sensations: draft.sensations,
    situations: draft.situations,
    careAvailability: draft.careAvailability,
  };

  return (
    <StepLayout
      /*
       * 개편 시안에서 진행 인디케이터는 `한 문장 피부보고`(1단계) 에만 그려져 있다.
       * 나머지 단계 프레임에는 인디케이터 그룹 자체가 없어 그대로 따랐다.
       * TODO(디자인): 흐름 중간에 진행 표시가 사라지는 게 의도인지 확인 필요.
       */
      {...(assisting
        ? { step: 2, totalSteps: TOTAL_STEPS }
        : step === 1
          ? { step, totalSteps: TOTAL_STEPS }
          : {})}
      onBack={goBack}
      title={header.title}
      subtitle={header.subtitle}
    >
      {step === 0 && (
        <SkinStatusStep
          onFine={() => saveNoDiscomfort.mutate()}
          onDiscomfort={() => setStep(1)}
          savingFine={saveNoDiscomfort.isPending}
          errorMessage={saveNoDiscomfort.isError ? toUserMessage(saveNoDiscomfort.error) : null}
        />
      )}

      {assisting && (
        <AppearanceAssistStep
          options={optionsQuery.data}
          value={draft.manualAppearances}
          onChange={(manualAppearances) =>
            // 수동 선택값은 AI 추출값보다 우선한다. (F-02)
            draft.patch({ manualAppearances, appearances: manualAppearances })
          }
          onNext={() => {
            setAssisting(false);
            setStep(2);
          }}
        />
      )}

      {step === 1 && !assisting && (
        <RawTextStep
          value={draft.rawText}
          onChange={(rawText) => draft.patch({ rawText })}
          onNext={() => interpret.mutate()}
          onOpenAssist={() => setAssisting(true)}
          submitting={interpret.isPending}
          errorMessage={interpret.isError ? interpretErrorMessage(interpret.error) : null}
        />
      )}

      {step === 2 && (
        <ConfirmStep
          options={optionsQuery.data}
          values={confirmValues}
          aiFailed={aiFailed}
          onChange={(partial) => draft.patch(partial)}
          onConfirm={() => setStep(3)}
          onRewrite={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <PreCareStep
          options={optionsQuery.data}
          value={draft.preCareChecks}
          onChange={(preCareChecks) => draft.patch({ preCareChecks })}
          onSubmit={() => submit.mutate()}
          submitting={submit.isPending}
          errorMessage={submit.isError ? toUserMessage(submit.error) : null}
        />
      )}
    </StepLayout>
  );
}

/** 구조화 불가(422)는 재입력을 유도하고, 그 외에는 재시도를 안내한다. */
function interpretErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 422) {
    return '피부 상태를 조금 더 구체적으로 적어주세요.';
  }
  return `${toUserMessage(error)} 다시 시도해 주세요. 작성한 내용은 그대로 남아 있어요.`;
}
