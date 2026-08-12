import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auth, notifications } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { useAuthStore } from '@/stores/authStore';
import { ChoiceList } from '@/components/ChoiceList';
import { PrimaryButton } from '@/components/StepLayout';
import { DateField, SelectField } from '@/components/TextField';
import { TimeWheel } from '@/components/TimeWheel';
import {
  BRANCH_OPTIONS,
  ENVIRONMENT_OPTIONS,
  REGION_OPTIONS,
  estimateDischargeDate,
  useServiceProfileStore,
  type MilitaryBranch,
} from '@/stores/serviceProfileStore';

type Step = 'intro' | 'service' | 'environment' | 'region' | 'time';

const ORDER: Step[] = ['intro', 'service', 'environment', 'region', 'time'];

/**
 * 최초 온보딩.
 *
 * 동의는 회원가입 흐름에서 이미 저장했다(`PUT /me/onboarding`).
 * 여기서 받는 복무 정보·환경·권역·점호 시각은 **저장할 API 가 아직 없어서**
 * 로컬 프로필 스토어에 둔다. `serviceProfileStore` 의 TODO 참고.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('intro');
  const profile = useServiceProfileStore();

  const setSession = useAuthStore((s) => s.setSession);

  const finish = useMutation({
    // 계약에 있는 값은 알림 수신 여부뿐이다. 점호 시각은 서버가 '17:30' 으로 고정하고 있어
    // 사용자가 고른 시각은 로컬에만 남는다. (serviceProfileStore TODO 참고)
    mutationFn: async () => {
      await notifications.updateSettings(true);
      // 온보딩 완료 여부는 세션의 signupcompleted 로 판단하므로 다시 받아온다.
      return auth.currentSession();
    },
    onSuccess: (session) => {
      setSession(session);
      navigate('/', { replace: true });
    },
  });

  const index = ORDER.indexOf(step);
  const goNext = () => setStep(ORDER[index + 1] ?? 'time');
  const goBack = () => (index === 0 ? navigate(-1) : setStep(ORDER[index - 1]!));

  if (step === 'intro') return <IntroStep onStart={goNext} />;

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pt-6">
      <button
        type="button"
        onClick={goBack}
        className="-ml-1 mb-6 self-start text-2xl leading-none text-fg"
        aria-label="뒤로"
      >
        ‹
      </button>

      {step === 'service' && (
        <ServiceStep
          branch={profile.branch}
          enlistedOn={profile.enlistedOn}
          dischargeOn={profile.dischargeOn}
          onChange={profile.patch}
          onNext={goNext}
        />
      )}

      {step === 'environment' && (
        <EnvironmentStep
          value={profile.environments}
          onChange={(environments) => profile.patch({ environments })}
          onNext={goNext}
        />
      )}

      {step === 'region' && (
        <RegionStep
          value={profile.region}
          onChange={(region) => profile.patch({ region })}
          onNext={goNext}
        />
      )}

      {step === 'time' && (
        <TimeStep
          value={profile.checkInTime}
          onChange={(checkInTime) => profile.patch({ checkInTime })}
          onFinish={() => finish.mutate()}
          submitting={finish.isPending}
          errorMessage={finish.isError ? toUserMessage(finish.error) : null}
        />
      )}
    </div>
  );
}

// --- 1. 인트로 ----------------------------------------------------------------

const HIGHLIGHTS = [
  { title: '30초 기록', caption: '간단하게' },
  { title: '상황 기록', caption: '피부와 함께한 상황들' },
  { title: 'AI 가이드', caption: '지금 가능한 관리 행동' },
  { title: '경과확인', caption: '다음 날 변화 확인' },
];

function IntroStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pt-6">
      <p className="self-end text-sm text-fg-muted">1/2</p>

      <header className="mt-8">
        <h1 className="text-4xl font-bold leading-tight text-fg">
          관리하는
          <br />
          <span className="text-accent">행보관</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          오늘의 피부 상태를 간단하게 기록하고,
          <br />
          지금 필요한 관리 방법을 확인해보세요.
        </p>
      </header>

      <div className="mt-auto grid grid-cols-4 gap-2 pb-8">
        {HIGHLIGHTS.map((item) => (
          <div key={item.title} className="flex flex-col gap-2">
            <div className="aspect-square rounded-lg bg-panel" aria-hidden="true" />
            <p className="text-[11px] font-semibold text-fg">{item.title}</p>
            <p className="text-[10px] leading-tight text-fg-muted">{item.caption}</p>
          </div>
        ))}
      </div>

      <div className="pb-8">
        <ArrowButton onClick={onStart}>시작하기</ArrowButton>
      </div>
    </div>
  );
}

// --- 2. 복무 정보 --------------------------------------------------------------

function ServiceStep({
  branch,
  enlistedOn,
  dischargeOn,
  onChange,
  onNext,
}: {
  branch: MilitaryBranch | null;
  enlistedOn: string | null;
  dischargeOn: string | null;
  onChange: (partial: {
    branch?: MilitaryBranch;
    enlistedOn?: string;
    dischargeOn?: string;
  }) => void;
  onNext: () => void;
}) {
  const handleEnlisted = (value: string) => {
    // 전역예정일은 자동으로 채우되 사용자가 고칠 수 있게 둔다.
    const estimated = branch ? estimateDischargeDate(value, branch) : null;
    onChange({ enlistedOn: value, ...(estimated ? { dischargeOn: estimated } : {}) });
  };

  const handleBranch = (value: string) => {
    const next = value as MilitaryBranch;
    const estimated = enlistedOn ? estimateDischargeDate(enlistedOn, next) : null;
    onChange({ branch: next, ...(estimated ? { dischargeOn: estimated } : {}) });
  };

  const valid = Boolean(branch && enlistedOn && dischargeOn);

  return (
    <StepBody
      title={'복무 정보를\n입력해주세요.'}
      footer={
        <PrimaryButton onClick={onNext} disabled={!valid}>
          다음
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-3">
        <SelectField
          label="군종 선택"
          value={branch}
          onChange={handleBranch}
          options={BRANCH_OPTIONS}
        />
        <DateField label="입대일" value={enlistedOn} onChange={handleEnlisted} />
        <DateField
          label="전역예정일"
          value={dischargeOn}
          onChange={(v) => onChange({ dischargeOn: v })}
        />
      </div>

      <p className="mt-3 px-2 text-xs leading-relaxed text-fg-faint">
        전역예정일은 군종과 입대일로 자동 계산했어요. 다르면 직접 수정할 수 있어요.
      </p>
    </StepBody>
  );
}

// --- 3. 자주 겪는 환경 ----------------------------------------------------------

function EnvironmentStep({
  value,
  onChange,
  onNext,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  onNext: () => void;
}) {
  return (
    <StepBody
      title={'자주 겪는 군 생활 환경을\n선택해주세요.'}
      footer={
        <PrimaryButton onClick={onNext} disabled={value.length === 0}>
          다음
        </PrimaryButton>
      }
    >
      <ChoiceList
        mode="multi"
        choices={[...ENVIRONMENT_OPTIONS]}
        value={value}
        exclusiveValue="NONE"
        onChange={onChange}
      />
    </StepBody>
  );
}

// --- 4. 기상 권역 --------------------------------------------------------------

function RegionStep({
  value,
  onChange,
  onNext,
}: {
  value: string | null;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <StepBody
      title={'기상정보 권역을\n선택해주세요'}
      footer={
        <PrimaryButton onClick={onNext} disabled={!value}>
          다음
        </PrimaryButton>
      }
    >
      {/* 시안은 픽셀 지도에서 권역을 고르는 형태다. 지도 에셋이 나오면 교체한다. */}
      <ChoiceList mode="single" choices={[...REGION_OPTIONS]} value={value} onChange={onChange} />
    </StepBody>
  );
}

// --- 5. 기본 점호 시각 ----------------------------------------------------------

function TimeStep({
  value,
  onChange,
  onFinish,
  submitting,
  errorMessage,
}: {
  value: string;
  onChange: (value: string) => void;
  onFinish: () => void;
  submitting?: boolean;
  errorMessage?: string | null;
}) {
  return (
    <StepBody
      title={'기본 피부점호\n시간을 설정해주세요'}
      footer={
        <>
          {errorMessage && <p className="mb-3 px-2 text-sm text-caution-500">{errorMessage}</p>}
          <ArrowButton onClick={onFinish} disabled={submitting}>
            {submitting ? '설정 중…' : '시작하기'}
          </ArrowButton>
        </>
      }
    >
      <div className="flex flex-1 items-center justify-center py-10">
        <TimeWheel value={value} onChange={onChange} />
      </div>

      <p className="px-2 text-center text-xs leading-relaxed text-fg-faint">
        부대마다 휴대전화를 쓸 수 있는 시간이 달라요.
        <br />
        나중에 설정에서 바꿀 수 있어요.
      </p>
    </StepBody>
  );
}

// --- 공통 ---------------------------------------------------------------------

function StepBody({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <>
      <h1 className="whitespace-pre-line text-2xl font-bold leading-snug text-fg">{title}</h1>
      <div className="mt-10 flex flex-1 flex-col">{children}</div>
      <div className="safe-bottom sticky bottom-0 bg-base pb-6 pt-4">{footer}</div>
    </>
  );
}

function ArrowButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center rounded-pill bg-accent px-6 py-4 text-body-strong font-semibold text-panel-text disabled:opacity-50"
    >
      <span className="flex-1 text-center">{children}</span>
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-full bg-card text-fg"
      >
        →
      </span>
    </button>
  );
}
