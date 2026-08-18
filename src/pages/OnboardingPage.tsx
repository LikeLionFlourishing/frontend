import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auth, onboarding } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { useAuthStore } from '@/stores/authStore';
import { ArrowButton } from '@/components/StepLayout';
import { TimeWheel } from '@/components/TimeWheel';
import { Icon, type IconName } from '@/components/Icon';
import { Wordmark } from '@/components/Wordmark';
import { Mascot } from '@/components/Mascot';
import { track } from '@/lib/analytics';
import { clsx } from '@/lib/clsx';
import { Sentences } from '@/components/Sentences';
import { useServiceProfileStore } from '@/stores/serviceProfileStore';
import { useSignupConsentStore } from '@/stores/signupConsentStore';
import type { NotificationPermission as ApiNotificationPermission } from '@/api/schemas';

type Step = 'intro' | 'checkInTime';

const ORDER: Step[] = ['intro', 'checkInTime'];

/**
 * 최초 이용 (확정 시안 25:30294 온보딩 / 25:30666 온보딩2).
 *
 * 2026-08-15 기획 결정으로 **복무 정보와 자주 겪는 환경이 범위에서 빠져**
 * 두 화면만 남았다 — 이용범위 안내 → 기본 점호 시각.
 * 같은 날 시안 재업로드에서 그 두 화면은 아예 사라졌다.
 * 동의는 이 흐름이 아니라 회원가입 안에서 받는다(시안의 `동의` 화면 버튼이 `가입하기`).
 *
 * v2 계약부터 **기본 피부 점호 시각을 여기서 서버에 저장한다.** v1 은
 * `NotificationSettings.time` 이 `const '17:30'` 이라 보낼 곳이 없었다.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('intro');
  const setSession = useAuthStore((s) => s.setSession);
  const profile = useServiceProfileStore();
  const consent = useSignupConsentStore();

  const finish = useMutation({
    /**
     * `wantsNotification` 이 거짓이면 시안의 `알림을 받지 않을게요` 를 누른 것이다.
     * 이때는 브라우저 권한창을 아예 띄우지 않는다 — 안 받겠다고 한 사람에게
     * 권한을 묻는 건 거절을 두 번 시키는 셈이다.
     */
    mutationFn: async (wantsNotification: boolean) => {
      const permission = wantsNotification ? await requestPermission() : await currentPermission();
      await onboarding.complete({
        consentVersion: consent.version,
        // 계약이 `true` 리터럴만 받는다. 필수 동의 없이는 가입 자체가 안 되므로 늘 참이다.
        sensitiveDataConsent: true,
        notificationEnabled: wantsNotification && permission === 'GRANTED',
        notificationPermission: permission,
        /*
         * 시각은 알림을 끈 사람도 보낸다. 계약이 이 값으로 다음 날 경과 입력
         * 가능 시점(`PendingFollowUp.availableFrom`)을 계산하기 때문이다.
         */
        notificationTime: profile.checkInTime,
        /*
         * 계약은 `시작하기` 를 누른 것 자체를 알림 수신 동의로 본다.
         * `notificationEnabled` 가 true 인데 이 값이 true 가 아니면 422 다.
         */
        ...(wantsNotification
          ? { notificationConsent: true, notificationConsentVersion: consent.version }
          : {}),
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
     * 시안의 온보딩2 화면에는 뒤로가기가 없다. 화면에 없는 것은 만들지 않는 원칙에
     * 따라 그대로 뒀다.
     *
     * 2026-08-16 시안에 없는 화면을 걷어내면서 `설정 > 알림 설정` 이 빠졌다.
     * v2 에서 시각 저장이 열렸지만, 설정 화면에서 **나중에 바꾸는 것**은 P1 이고
     * 서버가 `NotificationSettings.timeEditable: false` 로 알려 준다.
     * 잃은 건 여전히 **알림 on/off** 다. (docs/명세-대조.md 2-10)
     */
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-4 pt-[calc(var(--safe-top)+47px)]">
      {step === 'checkInTime' && (
        <CheckInTimeStep
          value={profile.checkInTime}
          onChange={(checkInTime) => profile.patch({ checkInTime })}
          onFinish={() => finish.mutate(true)}
          onSkipNotification={() => finish.mutate(false)}
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
  return toApiPermission(await Notification.requestPermission());
}

/** 권한창을 띄우지 않고 지금 상태만 읽는다. (`알림을 받지 않을게요`) */
async function currentPermission(): Promise<ApiNotificationPermission> {
  if (typeof Notification === 'undefined') return 'UNSUPPORTED';
  return toApiPermission(Notification.permission);
}

function toApiPermission(result: string): ApiNotificationPermission {
  if (result === 'granted') return 'GRANTED';
  if (result === 'denied') return 'DENIED';
  return 'DEFAULT';
}

// --- 화면 1. 서비스 이용범위 ------------------------------------------------------

/**
 * 시안 32:52939 의 **3분할** 소개. 문구와 아이콘 모두 시안 그대로다.
 * (예전 시안은 4분할이었는데 세 칸으로 줄었다 — 구분선도 두 개다)
 */
const HIGHLIGHTS: { icon: IconName; title: string; caption: string }[] = [
  { icon: 'clock', title: '기록하고', caption: '피부불편과 상황을 남겨요' },
  { icon: 'ai', title: '안내받고', caption: '관리방법을 확인해요' },
  { icon: 'progress', title: '경과확인', caption: '다음 날 변화 확인해요' },
];

function IntroStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="safe-top relative mx-auto flex min-h-dvh w-full max-w-app flex-col overflow-hidden px-4">
      {/* 시안 기준 워드마크 상단 140 (상태바 44 제외 → 96), 설명은 그 아래 22px */}
      <header className="relative pt-[96px]">
        <Wordmark height={45} />
        {/* 시안의 설명 글상자는 두 줄에 28px — 줄높이가 글자 크기보다 조금 크다 */}
        <p className="mt-[22px] text-xs leading-[14px] text-fg-muted">
          오늘의 피부 상태를 간단하게 기록하고,
          <br />
          지금 필요한 관리 방법을 확인해보세요.
        </p>
      </header>

      {/*
       * 마스코트 279×194. 시안에서 왼쪽 42 / 위 318 에 놓여 있어 가운데 정렬이 아니다.
       * (좌우 여백이 42 대 81 로 다르다. 화면 좌우 안여백 16 을 빼고 26 만큼 민다)
       */}
      <div className="relative ml-[26px] mt-[83px] w-[279px]">
        <Mascot className="w-full" />
      </div>

      <div className="relative mt-auto grid grid-cols-3 pb-[25px] pt-6">
        {HIGHLIGHTS.map((item, index) => (
          <div
            key={item.title}
            className={clsx(
              'flex flex-col items-center gap-2 px-1 text-center',
              // 시안의 세로선은 아이콘 줄 높이(58px)만큼만 그어져 있다
              index > 0 && 'border-l border-[#C2C3C4]',
            )}
          >
            <Icon name={item.icon} className="size-8 text-info" />
            <p className="text-body-strong text-fg-muted">{item.title}</p>
            {/* 시안에서 설명은 폭 77 안에서 두 줄로 접힌다 */}
            <p className="max-w-[80px] text-xs leading-[16px] text-fg-muted">{item.caption}</p>
          </div>
        ))}
      </div>

      {/* 시안 32:52952 — 370×35, 바탕 #EBEBEB, 글자 12px #346EFF 가운데 */}
      <p className="relative flex h-[35px] items-center justify-center rounded-[10px] bg-panel-soft text-xs text-info">
        의료행위 및 피부질환 진단·처방은 제공하지 않습니다.
      </p>

      {/* 시안 — 안내 띠 아래 24 */}
      <div className="safe-bottom relative mt-[24px] pb-[37px]">
        <ArrowButton onClick={onStart}>시작하기</ArrowButton>
      </div>
    </div>
  );
}

// --- 화면 2. 기본 점호 시각 --------------------------------------------------------

function CheckInTimeStep({
  value,
  onChange,
  onFinish,
  onSkipNotification,
  submitting,
  errorMessage,
}: {
  value: string;
  onChange: (value: string) => void;
  onFinish: () => void;
  onSkipNotification: () => void;
  submitting?: boolean;
  errorMessage?: string | null;
}) {
  return (
    <StepBody
      title={'기본 피부점호\n시간을 설정해주세요'}
      footer={
        <>
          {errorMessage && (
            <p className="mb-3 px-2 text-sm text-caution-500">
              <Sentences text={errorMessage} />
            </p>
          )}

          {/*
           * 시안 기준 79px 높이, 시작하기 버튼과 16px 띄어 놓는다.
           * 점호 시각은 그대로 저장하되 알림만 끄고 넘어가는 갈래다 —
           * 시각은 나중에 설정 > 알림 설정에서 켤 때 쓰인다.
           */}
          <button
            type="button"
            onClick={onSkipNotification}
            disabled={submitting}
            // 시안 32:53070 — 373×79, 모서리 30, 바탕 #D5D5D5 20%, 글자 SemiBold 16
            className="mb-4 flex h-[79px] w-full items-center justify-center rounded-[30px] bg-panel/20 text-body-strong text-fg-muted disabled:text-panel-label"
          >
            알림을 받지 않을게요
          </button>

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
      {/* 시안 32:53048 — 30px **Medium** / `검`. 인증·온보딩은 Bold 를 쓰지 않는다 */}
      <h1 className="whitespace-pre-line text-[30px] font-medium leading-9 text-fg-muted">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-xs text-fg-muted">{subtitle}</p>}
      <div className="mt-[67px] flex flex-1 flex-col">{children}</div>
      <div className="safe-bottom bg-base pb-[53px] pt-4">{footer}</div>
    </>
  );
}
