import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { home as homeApi, reports } from '@/api/endpoints';
import { ApiError, toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { AiLoading } from '@/components/AiLoading';
import { StepLayout } from '@/components/StepLayout';
import { useReportOptions } from '@/hooks/useReportOptions';
import { track } from '@/lib/analytics';
import { useReportDraftStore } from '@/stores/reportDraftStore';
import { ConfirmStep, type ConfirmValues } from './report/ConfirmStep';
import { PreCareStep } from './report/PreCareStep';
import { Sentences } from '@/components/Sentences';
import { RawTextStep } from './report/RawTextStep';
import { SkinStatusStep } from './report/SkinStatusStep';
import { Report1Step } from './report/Report1Step';
import { Report2Step } from './report/Report2Step';
import {
  APPEARANCE_OPTIONS,
  AREA_OPTIONS,
  CARE_OPTIONS,
  SITUATION_OPTIONS,
} from '@/api/designOptions';
import { seedPreCareChecks } from '@/api/schemas';
import type { ReportInterpretation } from '@/api/schemas';

/**
 * 0 은 `오늘 피부 상태`(유저플로우 3-2). 인디케이터에는 포함되지 않는다.
 * 1~4 가 시안의 인디케이터 4칸이다 — 한 문장 → 피부보고1 → 피부보고2 → 보고 내용 확인.
 */
type Step = 0 | 1 | 2 | 3 | 4 | 5;

const TOTAL_STEPS = 4;

const STEP_HEADER: Record<Step, { title: string; subtitle: string }> = {
  0: { title: '오늘 피부는 어땠나요?', subtitle: '오늘 하루 피부 상태를 알려주세요.' },
  1: {
    title: '오늘 피부 어땠나요?',
    subtitle: '무슨 일이 있었는지, 어디가 어떻게 불편한지 편하게 작성해 주세요.',
  },
  2: { title: '어느 부위가 불편한가요?', subtitle: '해당 부위를 선택해주세요' },
  3: { title: '오늘 있었던\n상황이 있나요?', subtitle: '해당하는 항목을 모두 선택해주세요.' },
  4: { title: '이렇게 정리했어요', subtitle: '잘못된 내용은 수정해주세요' },
  5: { title: '다음 중 지금 해당하는\n변화가 있나요?', subtitle: '해당하는 항목을 선택해주세요.' },
};

export function ReportFlowPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(0);
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
      }),
    onSuccess: (result) => {
      const ok = result.processingStatus === 'SUCCESS';
      track(ok ? 'AI_STRUCTURING_SUCCEEDED' : 'AI_STRUCTURING_FAILED', { aiSucceeded: ok });
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
          // 글 없이 선택만으로 온 경우 계약의 minLength 1 을 못 채운다. 고른 값으로 대신 채운다.
          rawText: draft.rawText.trim() || describeSelections(),
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
      track('REPORT_SUBMITTED', {
        resultType: report.resultType,
        // 글 없이 선택만으로 기록했는지
        inputAssistUsed: draft.rawText.trim().length === 0,
      });
      draft.reset();
      navigate(`/report/result/${report.id}`, { replace: true });
    },
  });

  function applyInterpretation(result: ReportInterpretation) {
    setAiFailed(result.processingStatus === 'FAILED');

    const proposed = result.proposed;
    draft.patch({
      // 사용자가 직접 고른 값이 AI 추출값보다 우선한다. (F-02 수동 선택값 우선순위)
      primaryArea: proposed.primaryArea,
      appearances: proposed.appearances,
      otherAreasNote: proposed.otherAreasNote,
      sensations: proposed.sensations,
      situations: proposed.situations,
      careAvailability: proposed.careAvailability,

      /*
       * 피부보고1·2 는 AI 가 뽑아 준 값에서 출발한다.
       * 2026-08-16 부터 화면 값과 계약 값이 같아서 옮겨 담을 것이 없다.
       */
      area: draft.area ?? proposed.primaryArea,
      appearance: draft.appearance ?? proposed.appearances[0] ?? null,
      care: draft.care ?? proposed.careAvailability ?? undefined,
    });
  }

  /**
   * `어떻게 써야할지 잘 모르겠어요` 로 들어와 글을 한 줄도 안 쓴 경우의 원문.
   *
   * 계약이 `rawText` 를 필수·최소 1자로 받는다. 빈 문자열을 보내면 422 다.
   * 나중에 이력 상세의 `내가 작성한 내용` 에 그대로 보이므로,
   * 사용자가 쓴 것처럼 꾸미지 않고 **고른 값을 나열했다는 사실을 드러낸다.**
   */
  function describeSelections(): string {
    const parts = [
      AREA_OPTIONS.find((o) => o.value === draft.area)?.label,
      APPEARANCE_OPTIONS.find((o) => o.value === draft.appearance)?.label,
      draft.designSituations
        .map((v) => SITUATION_OPTIONS.find((o) => o.value === v)?.label)
        .filter(Boolean)
        .join(', ') || null,
      CARE_OPTIONS.find((o) => o.value === draft.care)?.label,
    ].filter(Boolean);

    return parts.length > 0 ? `선택으로 입력: ${parts.join(' · ')}` : '선택으로 입력';
  }

  /**
   * 피부보고1·2 에서 고른 값을 제출용 자리로 옮긴다.
   *
   * 2026-08-16 개편으로 부위·겉모습·상황·관리 상태는 **화면 값이 곧 계약 값**이라
   * 그대로 복사한다. 옛날처럼 `OTHER` 로 접히거나 메모로 새는 값이 없다.
   */
  function applyDesignSelections() {
    draft.patch({
      ...(draft.area ? { primaryArea: draft.area } : {}),
      ...(draft.appearance ? { appearances: [draft.appearance] } : {}),
      situations: draft.designSituations,
      /*
       * `불편`(sensations)은 AI 가 한 문장에서 뽑아 둔 값을 그대로 둔다.
       * 피부보고2 의 `현재 피부 상태`(붉어짐·트러블·과피지)는 계약의 감각 enum 과
       * 값이 달라 아직 보낼 수 없다. enum 이 열리면 여기서 바로 넘긴다.
       * (docs/명세-대조.md 2-12)
       */
      ...(draft.sensations.length === 0 ? { sensations: ['NONE' as const] } : {}),
      ...(draft.care ? { careAvailability: draft.care } : {}),
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
          <Sentences text={toUserMessage(optionsQuery.error ?? homeQuery.error)} />
        </p>
      </StepLayout>
    );
  }

  // --- 스텝 ---------------------------------------------------------------

  const header = STEP_HEADER[step];

  const goBack = () => {
    if (step === 0) navigate('/');
    else setStep((s) => (s - 1) as Step);
  };

  const confirmValues: ConfirmValues = {
    primaryArea: draft.primaryArea,
    otherAreasNote: draft.otherAreasNote,
    appearances: draft.appearances,
    sensations: draft.sensations,
    situations: draft.situations,
    careAvailability: draft.careAvailability,
  };

  return (
    <StepLayout
      /*
       * 인디케이터는 점 4개다 — 한 문장(1) · 피부보고1(2) · 피부보고2(3) · 보고 내용 확인(4).
       * 다만 **한 문장(1) 화면에는 시안에 인디케이터가 없다**(25:28832). 진입 화면(0)과
       * 관리 전 확인(5)도 마찬가지다. 그래서 실제로 그리는 건 2~4 뿐이다.
       */
      {...(step >= 2 && step <= 4 ? { step, totalSteps: TOTAL_STEPS } : {})}
      onBack={goBack}
      title={header.title}
      subtitle={header.subtitle}
    >
      {step === 0 && (
        <SkinStatusStep
          onFine={() => saveNoDiscomfort.mutate()}
          onDiscomfort={() => {
            track('REPORT_STARTED');
            setStep(1);
          }}
          savingFine={saveNoDiscomfort.isPending}
          errorMessage={saveNoDiscomfort.isError ? toUserMessage(saveNoDiscomfort.error) : null}
        />
      )}

      {step === 1 && (
        <RawTextStep
          value={draft.rawText}
          onChange={(rawText) => draft.patch({ rawText })}
          onNext={() => interpret.mutate()}
          /*
           * 시안의 `어떻게 써야할지 잘 모르겠어요`.
           * 예전에는 점 패턴만 있는 별도 화면을 열었는데, 바로 다음 화면인
           * 피부보고1 이 같은 질문을 그림 타일로 다시 물어서 중복이었다.
           * (게다가 거기서 고른 값은 피부보고1 선택에 덮여 사라졌다)
           * 이제는 글 없이 선택만으로 갈 수 있게 피부보고1 로 곧장 보낸다.
           */
          onOpenAssist={() => {
            track('INPUT_ASSIST_OPENED');
            setStep(2);
          }}
          submitting={interpret.isPending}
          errorMessage={interpret.isError ? interpretErrorMessage(interpret.error) : null}
        />
      )}

      {step === 2 && (
        <Report1Step
          area={draft.area}
          appearance={draft.appearance}
          onChange={(partial) => draft.patch(partial)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Report2Step
          situations={draft.designSituations}
          care={draft.care}
          skinStates={draft.skinStates}
          // 시안 어휘의 `situations` 는 계약의 같은 이름과 값 집합이 달라 따로 담는다.
          onChange={({ situations, care, skinStates }) =>
            draft.patch({
              ...(situations ? { designSituations: situations } : {}),
              ...(care ? { care } : {}),
              ...(skinStates ? { skinStates } : {}),
            })
          }
          onNext={() => {
            applyDesignSelections();
            setStep(4);
          }}
        />
      )}

      {step === 4 && (
        <ConfirmStep
          options={optionsQuery.data}
          values={confirmValues}
          aiFailed={aiFailed}
          onChange={(partial) => draft.patch(partial)}
          onConfirm={() => {
            // 유저플로우 6. 진물 연동 — 미리 선택만 하고 확정은 다음 화면에서 사용자가 한다.
            draft.patch({
              preCareChecks: seedPreCareChecks(draft.appearances, draft.preCareChecks),
            });
            setStep(5);
          }}
        />
      )}

      {step === 5 && (
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
