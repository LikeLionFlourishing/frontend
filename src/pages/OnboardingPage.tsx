import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auth, onboarding } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { useAuthStore } from '@/stores/authStore';
import { ArrowButton, PrimaryButton } from '@/components/StepLayout';
import { ChoiceList } from '@/components/ChoiceList';
import { TimeWheel } from '@/components/TimeWheel';
import { SelectField, DateField } from '@/components/TextField';
import { Icon, type IconName } from '@/components/Icon';
import { Wordmark } from '@/components/Wordmark';
import { Mascot } from '@/components/Mascot';
import { PixelArt } from '@/components/PixelArt';
import {
  DECO_BLUR,
  DECO_BOTTOM_CELL,
  DECO_BOTTOM_GAP,
  DECO_TOP_CELL,
  DECO_TOP_GAP,
  ONBOARDING_DECO_BOTTOM,
  ONBOARDING_DECO_TOP,
} from '@/components/deco';
import { track } from '@/lib/analytics';
import { clsx } from '@/lib/clsx';
import {
  applyServiceChange,
  BRANCH_OPTIONS,
  ENVIRONMENT_OPTIONS,
  RANK_OPTIONS,
  useServiceProfileStore,
  type MilitaryBranch,
  type MilitaryRank,
  type ServiceProfile,
} from '@/stores/serviceProfileStore';
import { useSignupConsentStore } from '@/stores/signupConsentStore';
import type { NotificationPermission as ApiNotificationPermission } from '@/api/schemas';

type Step = 'intro' | 'service' | 'environments' | 'checkInTime';

const ORDER: Step[] = ['intro', 'service', 'environments', 'checkInTime'];

/**
 * 최초 이용 (확정 시안 22:12300 / 22:12730 / 22:12708 / 22:12677).
 *
 * 네 화면이다 — 이용범위 안내 → 복무 정보 → 자주 겪는 환경 → 기본 점호 시각.
 * 동의는 이 흐름이 아니라 회원가입 안에서 받는다(시안의 `동의` 화면 버튼이 `가입하기`).
 *
 * `PUT /me/onboarding` 이 받는 값은 동의와 알림뿐이라, 여기서 받은 복무 정보·환경·
 * 점호 시각은 로컬 스토어에 남는다. (serviceProfileStore 의 TODO 참고)
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('intro');
  const setSession = useAuthStore((s) => s.setSession);
  const profile = useServiceProfileStore();
  const consent = useSignupConsentStore();

  const finish = useMutation({
    mutationFn: async () => {
      /*
       * 시안의 마지막 화면에는 `알림 없이 시작하기` 같은 갈래가 없다.
       * 점호 시각을 직접 고른 사람은 알림을 받겠다는 뜻으로 보고 권한을 묻되,
       * 거절하면 알림 수신은 끈 상태로 저장한다.
       */
      const permission = await requestPermission();
      await onboarding.complete({
        consentVersion: consent.version,
        // 계약이 `true` 리터럴만 받는다. 필수 동의 없이는 가입 자체가 안 되므로 늘 참이다.
        sensitiveDataConsent: true,
        notificationEnabled: permission === 'GRANTED',
        notificationPermission: permission,
      });
      // 온보딩 완료 여부는 세션의 signupcompleted 로 판단하므로 다시 받아온다.
      return auth.currentSession();
    },
    onSuccess: (session) => {
      track('ONBOARDING_COMPLETED');
      setSession(session);
      navigate('/', { replace: true });
    },
  });

  const goNext = () => setStep(ORDER[ORDER.indexOf(step) + 1] ?? 'checkInTime');

  if (step === 'intro') return <IntroStep onStart={goNext} />;

  return (
    /*
     * 시안의 온보딩2 세 화면에는 뒤로가기가 없다. 화면에 없는 것은 만들지 않는 원칙에
     * 따라 그대로 뒀다. (입력을 고치려면 설정 > 프로필 관리로 가야 한다)
     * TODO(디자인): 4단계 흐름에 되돌아갈 길이 없어도 되는지 확인 필요.
     */
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col px-4 pt-[47px]">
      {step === 'service' && (
        <ServiceStep
          branch={profile.branch}
          enlistedOn={profile.enlistedOn}
          dischargeOn={profile.dischargeOn}
          rank={profile.rank}
          onChange={(partial) => profile.patch(partial)}
          onNext={goNext}
        />
      )}

      {step === 'environments' && (
        <EnvironmentStep
          value={profile.environments}
          onChange={(environments) => profile.patch({ environments })}
          onNext={goNext}
        />
      )}

      {step === 'checkInTime' && (
        <CheckInTimeStep
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

/** 알림 권한을 묻고 계약이 쓰는 값으로 옮긴다. */
async function requestPermission(): Promise<ApiNotificationPermission> {
  if (typeof Notification === 'undefined') return 'UNSUPPORTED';

  const result = await Notification.requestPermission();
  if (result === 'granted') return 'GRANTED';
  if (result === 'denied') return 'DENIED';
  return 'DEFAULT';
}

// --- 화면 1. 서비스 이용범위 ------------------------------------------------------

/** 시안(22:12547)의 4분할 소개. 문구와 아이콘 모두 시안 그대로다. */
const HIGHLIGHTS: { icon: IconName; title: string; caption: string }[] = [
  { icon: 'clock', title: '30초 기록', caption: '간단하게' },
  { icon: 'situation', title: '상황 기록', caption: '피부와 함께한 상황들' },
  { icon: 'ai', title: 'AI 가이드', caption: '지금 가능한 관리 행동' },
  { icon: 'progress', title: '경과확인', caption: '다음 날 변화 확인' },
];

function IntroStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="safe-top relative mx-auto flex min-h-dvh w-full max-w-app flex-col overflow-hidden px-4">
      {/*
       * 배경 픽셀 장식. 로그인과 같은 격자를 더 넓게 자른 뒤 흐리게 깐 것이라
       * 에셋이 아니라 격자 + CSS 블러로 그린다.
       */}
      <PixelArt
        bitmap={ONBOARDING_DECO_TOP}
        cell={DECO_TOP_CELL}
        gap={DECO_TOP_GAP}
        style={{ left: `${(236 / 402) * 100}%`, top: 165, filter: `blur(${DECO_BLUR}px)` }}
        className="pointer-events-none absolute"
      />
      <PixelArt
        bitmap={ONBOARDING_DECO_BOTTOM}
        cell={DECO_BOTTOM_CELL}
        gap={DECO_BOTTOM_GAP}
        tint="bg-[#81B690]"
        style={{ left: `${(-96 / 402) * 100}%`, top: 478, filter: `blur(${DECO_BLUR}px)` }}
        className="pointer-events-none absolute"
      />

      {/* 시안 기준 워드마크 상단 140 (상태바 44 제외 → 96), 설명은 그 아래 22px */}
      <header className="relative pt-[96px]">
        <Wordmark height={45} />
        <p className="mt-[22px] text-xs leading-relaxed text-fg-muted">
          오늘의 피부 상태를 간단하게 기록하고,
          <br />
          지금 필요한 관리 방법을 확인해보세요.
        </p>
      </header>

      {/* 마스코트 216×150. `?` 는 별도 텍스트라 겹쳐 놓는다. */}
      <div className="relative mx-auto mt-[108px] w-[216px]">
        <Mascot className="w-full" />
        <span
          aria-hidden="true"
          className="absolute left-[103px] top-0 text-[96px] font-bold leading-[115px] text-fg"
        >
          ?
        </span>
      </div>

      <div className="relative mt-auto grid grid-cols-4 pb-[25px] pt-6">
        {HIGHLIGHTS.map((item, index) => (
          <div
            key={item.title}
            className={clsx(
              'flex flex-col items-center gap-2 px-1 text-center',
              // 시안의 세로선은 아이콘 줄 높이(58px)만큼만 그어져 있다
              index > 0 && 'border-l border-[#B8CDBF]',
            )}
          >
            <Icon name={item.icon} className="size-8 text-fg" />
            <p className="text-[13px] font-semibold text-fg">{item.title}</p>
            <p className="text-[11px] leading-tight text-fg-muted">{item.caption}</p>
          </div>
        ))}
      </div>

      <div className="safe-bottom relative pb-[53px]">
        <ArrowButton onClick={onStart}>시작하기</ArrowButton>
      </div>
    </div>
  );
}

// --- 화면 2. 복무 정보 ------------------------------------------------------------

function ServiceStep({
  branch,
  enlistedOn,
  dischargeOn,
  rank,
  onChange,
  onNext,
}: {
  branch: MilitaryBranch | null;
  enlistedOn: string | null;
  dischargeOn: string | null;
  rank: MilitaryRank | null;
  onChange: (partial: Partial<ServiceProfile>) => void;
  onNext: () => void;
}) {
  return (
    <StepBody
      title={'복무 정보를\n입력해주세요.'}
      footer={
        <PrimaryButton onClick={onNext} disabled={!branch || !enlistedOn || !rank}>
          다음
        </PrimaryButton>
      }
    >
      {/* 시안 기준 라벨 위 여백 9px, 필드 사이 피치 101px */}
      <div className="flex flex-col gap-[9px]">
        <SelectField
          label="군종 선택"
          value={branch}
          options={BRANCH_OPTIONS}
          onChange={(value) =>
            onChange(
              applyServiceChange({ branch, enlistedOn }, { branch: value as MilitaryBranch }),
            )
          }
        />
        <DateField
          label="입대일"
          value={enlistedOn}
          onChange={(value) =>
            onChange(applyServiceChange({ branch, enlistedOn }, { enlistedOn: value }))
          }
        />
        {/* 전역예정일은 군종 + 입대일로 계산된다. 시안에도 아이콘 없이 값만 있다. */}
        <DateField label="전역예정일" value={dischargeOn} onChange={() => {}} readOnly />
        <SelectField
          label="현재 직급"
          value={rank}
          options={RANK_OPTIONS}
          onChange={(value) => onChange({ rank: value as MilitaryRank })}
        />
      </div>
    </StepBody>
  );
}

// --- 화면 3. 자주 겪는 환경 --------------------------------------------------------

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
        size="compact"
        choices={[...ENVIRONMENT_OPTIONS]}
        value={value}
        onChange={onChange}
        exclusiveValue="NONE"
      />
    </StepBody>
  );
}

// --- 화면 4. 기본 점호 시각 --------------------------------------------------------

function CheckInTimeStep({
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
          <ArrowButton circle="light" onClick={onFinish} disabled={submitting}>
            {submitting ? '설정 중…' : '시작하기'}
          </ArrowButton>
        </>
      }
    >
      {/* 시안 기준 밴드 중심이 화면 상단에서 431px 지점이다 */}
      <div className="flex flex-1 items-center justify-center">
        <TimeWheel value={value} onChange={onChange} />
      </div>
    </StepBody>
  );
}

// --- 공통 ---------------------------------------------------------------------

function StepBody({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <>
      {/* 시안 기준 제목 28px / 줄높이 36 */}
      <h1 className="whitespace-pre-line text-[28px] font-bold leading-9 text-fg">{title}</h1>
      {subtitle && <p className="mt-2 text-xs text-fg-muted">{subtitle}</p>}
      <div className="mt-[67px] flex flex-1 flex-col">{children}</div>
      <div className="safe-bottom bg-base pb-[53px] pt-4">{footer}</div>
    </>
  );
}
