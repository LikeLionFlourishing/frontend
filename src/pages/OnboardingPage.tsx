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
import { PixelArt } from '@/components/PixelArt';
import {
  DECO_BLUR,
  DECO_OPACITY,
  DECO_BOTTOM_CELL,
  DECO_BOTTOM_GAP,
  DECO_TOP_CELL,
  DECO_TOP_GAP,
  ONBOARDING_DECO_BOTTOM,
  ONBOARDING_DECO_TOP,
} from '@/components/deco';
import { track } from '@/lib/analytics';
import { clsx } from '@/lib/clsx';
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
 * `PUT /me/onboarding` 이 받는 값은 동의와 알림뿐이라 점호 시각은 로컬에 남는다.
 * (serviceProfileStore 의 TODO 참고)
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
     * 따라 그대로 뒀다. (점호 시각은 설정 > 알림 설정에서 고칠 수 있다)
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

/** 시안(25:30540)의 4분할 소개. 문구와 아이콘 모두 시안 그대로다. */
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
       *
       * 로그인의 장식은 불투명하지만 여기 것은 옅다 — 시안 렌더에서 가장 진한 지점이
       * 원색이 아니라 배경과 섞인 값(#8CFFB6 → #B2FACC)이라 불투명도 0.63 이 나온다.
       */}
      <PixelArt
        bitmap={ONBOARDING_DECO_TOP}
        cell={DECO_TOP_CELL}
        gap={DECO_TOP_GAP}
        style={{
          left: `${(236 / 402) * 100}%`,
          top: 'calc(var(--safe-top) + 165px)',
          filter: `blur(${DECO_BLUR}px)`,
          opacity: DECO_OPACITY,
        }}
        className="pointer-events-none absolute"
      />
      <PixelArt
        bitmap={ONBOARDING_DECO_BOTTOM}
        cell={DECO_BOTTOM_CELL}
        gap={DECO_BOTTOM_GAP}
        tint="bg-[#81B690]"
        style={{
          left: `${(-96 / 402) * 100}%`,
          top: 'calc(var(--safe-top) + 478px)',
          filter: `blur(${DECO_BLUR}px)`,
          opacity: DECO_OPACITY,
        }}
        className="pointer-events-none absolute"
      />

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
          {errorMessage && <p className="mb-3 px-2 text-sm text-caution-500">{errorMessage}</p>}

          {/*
           * 시안 기준 79px 높이, 시작하기 버튼과 16px 띄어 놓는다.
           * 점호 시각은 그대로 저장하되 알림만 끄고 넘어가는 갈래다 —
           * 시각은 나중에 설정 > 알림 설정에서 켤 때 쓰인다.
           */}
          <button
            type="button"
            onClick={onSkipNotification}
            disabled={submitting}
            className="mb-4 flex h-[79px] w-full items-center justify-center rounded-pill bg-card text-xs text-fg-muted disabled:text-panel-label"
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
      {/* 시안 기준 제목 28px / 줄높이 36 */}
      <h1 className="whitespace-pre-line text-[28px] font-bold leading-9 text-fg">{title}</h1>
      {subtitle && <p className="mt-2 text-xs text-fg-muted">{subtitle}</p>}
      <div className="mt-[67px] flex flex-1 flex-col">{children}</div>
      <div className="safe-bottom bg-base pb-[53px] pt-4">{footer}</div>
    </>
  );
}
