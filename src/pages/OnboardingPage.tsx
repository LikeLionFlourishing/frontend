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
import { Icon, type IconName } from '@/components/Icon';
import { Wordmark } from '@/components/Wordmark';
import { PixelArt } from '@/components/PixelArt';
import { ONBOARDING_TREE, TREE_CELL, TREE_GAP } from '@/components/onboardingTree';
import { clsx } from '@/lib/clsx';
import {
  BRANCH_OPTIONS,
  ENVIRONMENT_OPTIONS,
  REGION_OPTIONS,
  applyServiceChange,
  useServiceProfileStore,
  type MilitaryBranch,
  type ServiceProfile,
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
    mutationFn: async (notificationEnabled: boolean) => {
      await notifications.updateSettings(notificationEnabled);
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
          onFinish={(notificationEnabled) => finish.mutate(notificationEnabled)}
          submitting={finish.isPending}
          errorMessage={finish.isError ? toUserMessage(finish.error) : null}
        />
      )}
    </div>
  );
}

// --- 1. 인트로 ----------------------------------------------------------------

const HIGHLIGHTS: { icon: IconName; title: string; caption: string }[] = [
  { icon: 'clock', title: '30초 기록', caption: '간단하게' },
  { icon: 'note', title: '상황 기록', caption: '피부와 함께한 상황들' },
  { icon: 'help', title: 'AI 가이드', caption: '지금 가능한 관리 행동' },
  { icon: 'face', title: '경과확인', caption: '다음 날 변화 확인' },
];

/** 나무 비트맵의 글자별 색. 일러스트 전용이라 팔레트에 넣지 않았다. */
const TREE_TINTS: Record<string, string> = {
  A: 'bg-accent',
  B: 'bg-[#81B690]',
  C: 'bg-[#424142]',
  D: 'bg-[#707070]',
  E: 'bg-[#728878]',
};

function IntroStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pt-6">
      <header className="mt-8">
        <Wordmark height={38} />
        <p className="mt-4 text-xs leading-relaxed text-fg-muted">
          오늘의 피부 상태를 간단하게 기록하고,
          <br />
          지금 필요한 관리 방법을 확인해보세요.
        </p>
      </header>

      {/* 시안의 픽셀 나무. 이미지가 아니라 도형이라 격자를 추출해 두었다. */}
      <PixelArt
        bitmap={ONBOARDING_TREE}
        cell={TREE_CELL}
        gap={TREE_GAP}
        tints={TREE_TINTS}
        className="mx-auto my-auto"
      />

      <div className="grid grid-cols-4 pb-8">
        {HIGHLIGHTS.map((item, index) => (
          <div
            key={item.title}
            className={clsx(
              'flex flex-col items-center gap-2 px-1 text-center',
              index > 0 && 'border-l border-panel',
            )}
          >
            <Icon name={item.icon} className="size-7 text-fg" />
            <p className="text-[11px] font-semibold text-fg">{item.title}</p>
            <p className="text-[10px] leading-tight text-fg-muted">{item.caption}</p>
          </div>
        ))}
      </div>

      {/*
       * 유저플로우 1-1 은 제공 범위와 함께 **제공하지 않는 것**을 명시하도록 되어 있다.
       * 진단·처방으로 오인되면 서비스 자체가 성립하지 않으므로 문구를 빼지 않는다.
       */}
      <p className="mt-6 rounded-card bg-card-raised px-4 py-3 text-[11px] leading-relaxed text-fg-muted">
        피부질환 진단과 의약품 처방은 제공하지 않아요. 증상이 심해지면 의무실이나 의료진에게 확인해
        주세요.
      </p>

      <div className="pb-8 pt-6">
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
  onChange: (partial: Partial<ServiceProfile>) => void;
  onNext: () => void;
}) {
  // 전역예정일은 자동으로 채우되 사용자가 고칠 수 있게 둔다. (설정 화면과 같은 규칙)
  const handleEnlisted = (enlistedOn: string) =>
    onChange(applyServiceChange({ branch, enlistedOn: null }, { enlistedOn }));

  const handleBranch = (value: string) =>
    onChange(applyServiceChange({ branch: null, enlistedOn }, { branch: value as MilitaryBranch }));

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
  onFinish: (notificationEnabled: boolean) => void;
  submitting?: boolean;
  errorMessage?: string | null;
}) {
  return (
    <StepBody
      title={'기본 피부점호\n시간을 설정해주세요'}
      footer={
        <>
          {errorMessage && <p className="mb-3 px-2 text-sm text-caution-500">{errorMessage}</p>}
          <ArrowButton onClick={() => onFinish(true)} disabled={submitting}>
            {submitting ? '설정 중…' : '시작하기'}
          </ArrowButton>

          {/* 유저플로우 1-3 은 알림을 끄고 시작하는 길을 함께 제시한다. */}
          <button
            type="button"
            onClick={() => onFinish(false)}
            disabled={submitting}
            className="mt-3 w-full py-3 text-center text-sm font-medium text-fg-faint underline underline-offset-4 disabled:opacity-50"
          >
            알림 없이 이용하기
          </button>
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
        className="grid size-11 place-items-center rounded-full bg-fg text-lg text-white"
      >
        →
      </span>
    </button>
  );
}
