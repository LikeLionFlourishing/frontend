import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { followUps, reports } from '@/api/endpoints';
import { ApiError, toUserMessage } from '@/api/problem';
import { queryClient, queryKeys } from '@/app/queryClient';
import { ChoiceList } from '@/components/ChoiceList';
import { PrimaryButton, StepLayout } from '@/components/StepLayout';
import {
  ACTION_COMPLETION_LABEL,
  CLINICIAN_CHECK_LABEL,
  SKIN_CHANGE_LABEL,
} from '@/lib/enumLabels';
import { formatDotDate } from '@/lib/date';
import type { FollowUp, SaveFollowUpRequest, SkinChange } from '@/api/schemas';

const SKIN_CHANGE_CHOICES = (Object.keys(SKIN_CHANGE_LABEL) as SkinChange[]).map((value) => ({
  value,
  label: SKIN_CHANGE_LABEL[value],
}));

const ACTION_CHOICES = Object.entries(ACTION_COMPLETION_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const CLINICIAN_CHOICES = Object.entries(CLINICIAN_CHECK_LABEL).map(([value, label]) => ({
  value,
  label,
}));

/**
 * 다음 날 경과 확인 (Figma 15:4468 일반 관리 / 15:4586 의료진 확인).
 *
 * 두 질문을 한 화면에서 받는다. 첫 질문은 두 분기 공통(`skinChange`),
 * 둘째 질문만 보고서의 `resultType` 에 따라 갈린다.
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

  const [skinChange, setSkinChange] = useState<string | null>(null);
  const [secondAnswer, setSecondAnswer] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: SaveFollowUpRequest) => followUps.save(reportId, body),
    onSuccess: (followUp) => {
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

  const secondQuestion = isClinician
    ? '기록 이후 의무실 또는\n의료진에게 확인했나요?'
    : '안내받은 관리를\n어떻게 실행했나요?';

  const submit = () => {
    if (!skinChange || !secondAnswer) return;

    save.mutate(
      isClinician
        ? {
            kind: 'CLINICIAN_CHECK',
            skinChange: skinChange as SkinChange,
            clinicianCheckStatus: secondAnswer as 'CHECKED' | 'NOT_YET' | 'PREFER_NOT_TO_RECORD',
          }
        : {
            kind: 'SELF_CARE',
            skinChange: skinChange as SkinChange,
            actionCompletion: secondAnswer as 'MOSTLY_DONE' | 'PARTLY_DONE' | 'NOT_DONE',
          },
    );
  };

  const ready = Boolean(skinChange && secondAnswer);

  return (
    <StepLayout
      title="오늘의 경과 확인"
      subtitle="전 날과 피부 상태를 비교해서 선택해주세요."
      onBack={() => navigate(-1)}
      footer={
        <>
          {save.isError && (
            <p className="mb-3 px-2 text-sm text-caution-500">{saveErrorMessage(save.error)}</p>
          )}
          <PrimaryButton onClick={submit} disabled={!ready || save.isPending}>
            {save.isPending ? '저장 중…' : '기록 저장하기'}
          </PrimaryButton>
        </>
      }
    >
      <ChoiceList
        mode="single"
        choices={SKIN_CHANGE_CHOICES}
        value={skinChange}
        onChange={setSkinChange}
      />

      <div className="mt-10">
        <ChoiceList
          mode="single"
          question={secondQuestion}
          align="center"
          choices={isClinician ? CLINICIAN_CHOICES : ACTION_CHOICES}
          value={secondAnswer}
          onChange={setSecondAnswer}
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
    <div className="safe-top mx-auto flex w-full max-w-app flex-col gap-3 px-5 pt-10">
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
