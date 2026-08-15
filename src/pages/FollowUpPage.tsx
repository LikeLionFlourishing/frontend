import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { followUps, reports } from '@/api/endpoints';
import { ApiError, toUserMessage } from '@/api/problem';
import { queryClient, queryKeys } from '@/app/queryClient';
import { ChoiceList } from '@/components/ChoiceList';
import { SkinChangeTiles } from '@/components/SkinChangeTiles';
import { Sentences } from '@/components/Sentences';
import { PrimaryButton, StepLayout } from '@/components/StepLayout';
import {
  ACTION_COMPLETION_LABEL,
  CLINICIAN_CHECK_LABEL,
  SKIN_CHANGE_LABEL,
} from '@/lib/enumLabels';
import { track } from '@/lib/analytics';
import { formatDotDate } from '@/lib/date';
import type { FollowUp, SaveFollowUpRequest, SkinChange } from '@/api/schemas';

const ACTION_CHOICES = Object.entries(ACTION_COMPLETION_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const CLINICIAN_CHOICES = Object.entries(CLINICIAN_CHECK_LABEL).map(([value, label]) => ({
  value,
  label,
}));

/**
 * 다음 날 경과 확인 (확정 시안 25:35604 셀프케어 / 25:28735 의료진 확인).
 *
 * 두 질문을 한 화면에서 받는다. 둘째 질문(관리 실행 정도)은 두 분기 공통이고,
 * 첫 질문만 보고서의 `resultType` 에 따라 갈린다 —
 * 셀프케어는 표정 타일로 피부 변화를, 의료진 확인은 확인 여부를 묻는다.
 *
 * 저장은 입력 가능 시점부터 48시간 안에 **한 번만** 된다. 이미 저장된 경우
 * `GET` 이 값을 주므로 폼 대신 저장된 내용을 보여준다.
 */
export function FollowUpPage() {
  const navigate = useNavigate();
  const { reportId = '' } = useParams();

  const reportQuery = useQuery({
    queryKey: queryKeys.report(reportId),
    queryFn: () => reports.get(reportId),
    enabled: Boolean(reportId),
  });

  // 아직 안 남겼으면 404 다. 오류가 아니라 '작성 가능' 상태라서 재시도하지 않는다.
  const savedQuery = useQuery({
    queryKey: queryKeys.followUp(reportId),
    queryFn: () => followUps.get(reportId).catch(asNotSubmitted),
    enabled: Boolean(reportId),
    retry: false,
  });

  /*
   * 시안에서 두 분기가 묻는 것이 다르다.
   *  · 셀프케어(25:35604) — 피부 변화 타일 + 관리 실행 정도
   *  · 의료진 확인(25:28735) — 의료진 확인 여부 + 관리 실행 정도
   * 즉 의료진 분기는 피부 변화를 아예 묻지 않는다. (submit 주석 참고)
   */
  const [skinChange, setSkinChange] = useState<string | null>(null);
  const [clinicianCheck, setClinicianCheck] = useState<string | null>(null);
  /** 의료진 확인 분기의 첫 화면(피부변화확인)을 지났는지 */
  const [changeConfirmed, setChangeConfirmed] = useState(false);
  const [actionCompletion, setActionCompletion] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: SaveFollowUpRequest) => followUps.save(reportId, body),
    onSuccess: (followUp) => {
      track('FOLLOW_UP_SUBMITTED');
      queryClient.setQueryData(queryKeys.followUp(reportId), followUp);
      // 경과를 남기면 홈의 '경과 확인하기' 와 보고서 상태가 함께 바뀐다.
      queryClient.invalidateQueries({ queryKey: queryKeys.home });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports });
    },
  });

  if (reportQuery.isPending || savedQuery.isPending) return <FollowUpSkeleton />;

  if (reportQuery.isError) {
    return (
      <StepLayout title="오늘의 경과 확인" onBack={() => navigate(-1)}>
        <p className="text-sm text-fg-muted">{toUserMessage(reportQuery.error)}</p>
      </StepLayout>
    );
  }

  const report = reportQuery.data;
  const saved = savedQuery.data ?? null;
  const isClinician = report.resultType === 'CLINICIAN_CHECK';

  if (saved) {
    return (
      <SavedView followUp={saved} reportDate={report.reportDate} onClose={() => navigate('/')} />
    );
  }

  const submit = () => {
    if (!ready) return;

    save.mutate(
      isClinician
        ? {
            kind: 'CLINICIAN_CHECK',
            skinChange: skinChange as SkinChange,
            clinicianCheckStatus: clinicianCheck as 'CHECKED' | 'NOT_YET' | 'PREFER_NOT_TO_RECORD',
            /*
             * 시안의 의료진 확인 화면도 `관리 실행 정도`를 묻지만 계약에는 담을 자리가 없다.
             * 명세 F-05 가 `일반 관리 안내를 받지 않은 사용자에게 행동 실행 여부를
             * 묻지 않습니다` 라고 못박고 있어 **계약 쪽이 맞다.**
             * TODO(디자인): 시안에서 이 질문을 빼야 한다. (docs/명세-대조.md 2-4)
             */
          }
        : {
            kind: 'SELF_CARE',
            skinChange: skinChange as SkinChange,
            actionCompletion: actionCompletion as 'MOSTLY_DONE' | 'PARTLY_DONE' | 'NOT_DONE',
          },
    );
  };

  const ready = Boolean(skinChange && actionCompletion && (!isClinician || clinicianCheck));

  /*
   * 의료진 확인 분기는 두 화면이다. 시안의 `피부변화확인`(25:31859)이 먼저 오고
   * 그 다음이 `의료-경과확인`(25:28735)이다.
   *
   * 이렇게 본 근거: 의료진 확인 화면에는 피부 변화를 묻는 자리가 없는데
   * 계약의 ClinicianFollowUpRequest 는 skinChange 를 필수로 받는다.
   * 피부변화확인이 그 값을 채워 주는 앞 화면이라고 보면 앞뒤가 맞는다.
   * TODO(디자인): 이 순서가 맞는지 확인 필요. 아니라면 진입 경로를 알려줘야 한다.
   */
  if (isClinician && !changeConfirmed) {
    return (
      <StepLayout
        title={'어제와 비교해\n피부 상태가 어떤가요?'}
        subtitle="해당하는 항목을 선택해주세요."
        onBack={() => navigate(-1)}
        footer={
          <PrimaryButton onClick={() => setChangeConfirmed(true)} disabled={!skinChange}>
            다음
          </PrimaryButton>
        }
      >
        {/* 시안에서 이 화면의 표정만 검정이다. */}
        <SkinChangeTiles
          tone="ink"
          value={skinChange}
          onChange={setSkinChange}
          className="mt-[85px]"
        />
      </StepLayout>
    );
  }

  return (
    <StepLayout
      title="오늘의 경과 확인"
      subtitle={
        isClinician
          ? '기록 이후 의무실 또는 의료진에게 확인했나요?'
          : '전 날과 피부 상태를 비교해서 선택해주세요.'
      }
      onBack={() => navigate(-1)}
      footer={
        <>
          {save.isError && (
            <p className="mb-3 px-2 text-sm text-caution-500">
              <Sentences text={saveErrorMessage(save.error)} />
            </p>
          )}
          <PrimaryButton onClick={submit} disabled={!ready || save.isPending}>
            {save.isPending ? '저장 중…' : '기록 저장하기'}
          </PrimaryButton>
        </>
      }
    >
      {/*
       * 의료진 확인 결과는 첫 질문이 표정 타일이 아니라 라디오 목록이다.
       * (시안 25:28735 — `확인했어요 / 아직 확인하지 못했어요 / 기록하지 않을게요`)
       */}
      {isClinician ? (
        <ChoiceList
          mode="single"
          choices={CLINICIAN_CHOICES}
          value={clinicianCheck}
          onChange={setClinicianCheck}
        />
      ) : (
        <SkinChangeTiles value={skinChange} onChange={setSkinChange} />
      )}

      <div className="mt-[45px]">
        <ChoiceList
          mode="single"
          question={'안내받은 관리를\n어떻게 실행했나요?'}
          align="center"
          choices={ACTION_CHOICES}
          value={actionCompletion}
          onChange={setActionCompletion}
        />
      </div>
    </StepLayout>
  );
}

// --- 이미 남긴 경우 --------------------------------------------------------------

/**
 * 경과는 한 번만 저장된다. 다시 들어왔을 때 폼을 또 보여주면
 * 고칠 수 있다는 인상을 주고, 저장하면 409 가 난다.
 */
function SavedView({
  followUp,
  reportDate,
  onClose,
}: {
  followUp: FollowUp;
  reportDate: string;
  onClose: () => void;
}) {
  const secondRow =
    followUp.kind === 'SELF_CARE'
      ? { label: '안내받은 관리', value: ACTION_COMPLETION_LABEL[followUp.actionCompletion] }
      : { label: '의료진 확인', value: CLINICIAN_CHECK_LABEL[followUp.clinicianCheckStatus] };

  return (
    <StepLayout
      title="경과를 남겼어요"
      subtitle={`${formatDotDate(reportDate)} 기록의 경과입니다.`}
      onBack={onClose}
      footer={<PrimaryButton onClick={onClose}>홈으로</PrimaryButton>}
    >
      <dl className="flex flex-col gap-3">
        <SavedRow label="피부 상태" value={SKIN_CHANGE_LABEL[followUp.skinChange]} />
        <SavedRow label={secondRow.label} value={secondRow.value} />
      </dl>

      <p className="mt-6 px-2 text-xs leading-relaxed text-fg-faint">
        경과는 기록당 한 번만 남길 수 있어요.
      </p>
    </StepLayout>
  );
}

function SavedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-pill bg-panel px-5 py-4">
      <dt className="text-xs text-panel-label">{label}</dt>
      <dd className="text-body-strong font-semibold text-panel-text">{value}</dd>
    </div>
  );
}

function FollowUpSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-3 px-5 pt-[calc(var(--safe-top)+40px)]">
      <div className="h-9 w-48 animate-pulse rounded-pill bg-card-raised" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-[72px] animate-pulse rounded-pill bg-card-raised" />
      ))}
    </div>
  );
}

// --- 오류 처리 -------------------------------------------------------------------

/** 아직 안 남긴 상태(404)를 '값 없음' 으로 바꾼다. 그 밖의 오류는 그대로 던진다. */
function asNotSubmitted(error: unknown): null {
  if (error instanceof ApiError && error.status === 404) return null;
  throw error;
}

function saveErrorMessage(error: unknown): string {
  // 409 는 이미 다른 내용으로 저장된 경우다. 계약상 덮어쓸 수 없다.
  if (error instanceof ApiError && error.status === 409) {
    return '이미 경과를 남긴 기록이에요. 화면을 새로고침하면 남긴 내용을 볼 수 있어요.';
  }
  return toUserMessage(error);
}
