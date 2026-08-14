import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auth, onboarding } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { useAuthStore } from '@/stores/authStore';
import { PrimaryButton } from '@/components/StepLayout';
import { TimeWheel } from '@/components/TimeWheel';
import { Icon, type IconName } from '@/components/Icon';
import { Wordmark } from '@/components/Wordmark';
import { PixelArt } from '@/components/PixelArt';
import { ONBOARDING_TREE, TREE_CELL, TREE_GAP } from '@/components/onboardingTree';
import { clsx } from '@/lib/clsx';
import { useServiceProfileStore } from '@/stores/serviceProfileStore';
import type { NotificationPermission as ApiNotificationPermission } from '@/api/schemas';

/** 동의 문구 버전. 서버에 그대로 저장되므로 문구를 바꾸면 이 값도 올려야 한다. */
const CONSENT_VERSION = '2026-08-09';

type Step = 'scope' | 'consent' | 'notification';

const ORDER: Step[] = ['scope', 'consent', 'notification'];

/**
 * 최초 이용 (유저플로우 1 / 정보구조도 1. 온보딩).
 *
 * 문서 기준 세 화면이다 — 이용범위 안내 → 필수 동의 → 알림 설정.
 * 이 세 값이 `PUT /me/onboarding` 의 본문과 정확히 대응한다.
 *
 * 복무 정보·자주 겪는 환경·기상 권역은 문서의 온보딩에 없어서 여기서 뺐다.
 * 셋 다 설정 > 프로필 관리에서 그대로 편집할 수 있다.
 * (시안에는 온보딩 단계로 그려져 있으나 2026-08-15 기준 문서를 우선한다)
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('scope');
  const setSession = useAuthStore((s) => s.setSession);
  const checkInTime = useServiceProfileStore((s) => s.checkInTime);
  const patchProfile = useServiceProfileStore((s) => s.patch);

  const finish = useMutation({
    mutationFn: async (notificationEnabled: boolean) => {
      await onboarding.complete({
        consentVersion: CONSENT_VERSION,
        sensitiveDataConsent: true,
        notificationEnabled,
        notificationPermission: await requestPermission(notificationEnabled),
      });
      // 온보딩 완료 여부는 세션의 signupcompleted 로 판단하므로 다시 받아온다.
      return auth.currentSession();
    },
    onSuccess: (session) => {
      setSession(session);
      navigate('/', { replace: true });
    },
  });

  const index = ORDER.indexOf(step);
  const goNext = () => setStep(ORDER[index + 1] ?? 'notification');
  const goBack = () => (index === 0 ? navigate(-1) : setStep(ORDER[index - 1]!));

  if (step === 'scope') return <ScopeStep onStart={goNext} />;

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

      {step === 'consent' && <ConsentStep onNext={goNext} />}

      {step === 'notification' && (
        <NotificationStep
          value={checkInTime}
          onChange={(checkInTime) => patchProfile({ checkInTime })}
          onFinish={(enabled) => finish.mutate(enabled)}
          submitting={finish.isPending}
          errorMessage={finish.isError ? toUserMessage(finish.error) : null}
        />
      )}
    </div>
  );
}

/**
 * 알림을 켤 때만 브라우저 권한을 묻는다.
 * 켜지 않는 사용자에게 권한 팝업을 띄우면 그 자체가 거절로 기록된다.
 */
async function requestPermission(enabled: boolean): Promise<ApiNotificationPermission> {
  if (typeof Notification === 'undefined') return 'UNSUPPORTED';
  if (!enabled) return 'DEFAULT';

  const result = await Notification.requestPermission();
  if (result === 'granted') return 'GRANTED';
  if (result === 'denied') return 'DENIED';
  return 'DEFAULT';
}

// --- 화면 1. 서비스 이용범위 ------------------------------------------------------

const HIGHLIGHTS: { icon: IconName; title: string; caption: string }[] = [
  { icon: 'note', title: '상황 기록', caption: '불편과 직전 상황' },
  { icon: 'help', title: '관리 안내', caption: '오늘 가능한 행동' },
  { icon: 'face', title: '경과 확인', caption: '다음 날 변화' },
  { icon: 'clock', title: '이전 경험', caption: '비슷했던 기록' },
];

/** 나무 비트맵의 글자별 색. 일러스트 전용이라 팔레트에 넣지 않았다. */
const TREE_TINTS: Record<string, string> = {
  A: 'bg-accent',
  B: 'bg-[#81B690]',
  C: 'bg-[#424142]',
  D: 'bg-[#707070]',
  E: 'bg-[#728878]',
};

function ScopeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pt-6">
      <header className="mt-8">
        <Wordmark height={38} />
        <p className="mt-4 text-xs leading-relaxed text-fg-muted">
          피부 불편과 직전 상황을 기록하고,
          <br />
          오늘 가능한 관리 행동을 확인하는 서비스예요.
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

      <div className="grid grid-cols-4 pb-6">
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
      <p className="rounded-card bg-card-raised px-4 py-3 text-[11px] leading-relaxed text-fg-muted">
        피부질환 진단과 의약품 처방은 제공하지 않아요. 증상이 심해지면 의무실이나 의료진에게 확인해
        주세요.
      </p>

      <div className="pb-8 pt-6">
        <ArrowButton onClick={onStart}>시작하기</ArrowButton>
      </div>
    </div>
  );
}

// --- 화면 2. 필수 동의 ------------------------------------------------------------

/**
 * 계약이 받는 동의는 `sensitiveDataConsent` 하나뿐이지만, 문서는 두 항목을
 * 따로 보여주도록 되어 있다. 화면에서 나눠 받고 둘 다 받은 경우에만 진행한다.
 */
const CONSENTS = [
  {
    key: 'privacy',
    label: '(필수) 개인정보 수집·이용 동의',
    detail: '계정 정보와 피부 기록을 서비스 제공 목적으로 처리해요.',
  },
  {
    key: 'sensitive',
    label: '(필수) 민감정보 처리 동의',
    detail: '피부 상태 기록은 민감정보에 해당해요. 진단·처방 목적으로 쓰지 않아요.',
  },
] as const;

function ConsentStep({ onNext }: { onNext: () => void }) {
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const allAgreed = CONSENTS.every((c) => agreed[c.key]);

  return (
    <StepBody
      title={'서비스 이용을 위해\n동의가 필요해요'}
      footer={
        <PrimaryButton onClick={onNext} disabled={!allAgreed}>
          다음
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-3">
        {CONSENTS.map((item) => {
          const checked = Boolean(agreed[item.key]);
          return (
            <button
              key={item.key}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => setAgreed((prev) => ({ ...prev, [item.key]: !checked }))}
              className="flex items-start gap-3 rounded-card bg-panel px-4 py-4 text-left"
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'mt-0.5 size-6 shrink-0 rounded-full transition',
                  checked ? 'bg-info' : 'border border-panel-label bg-base',
                )}
              />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-panel-text">{item.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-panel-label">
                  {item.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 px-2 text-xs leading-relaxed text-fg-faint">
        두 항목 모두 동의해야 서비스를 이용할 수 있어요.
      </p>
    </StepBody>
  );
}

// --- 화면 3. 알림 설정 ------------------------------------------------------------

function NotificationStep({
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
      title={'피부 점호 알림을\n설정해주세요'}
      footer={
        <>
          {errorMessage && <p className="mb-3 px-2 text-sm text-caution-500">{errorMessage}</p>}
          <ArrowButton onClick={() => onFinish(true)} disabled={submitting}>
            {submitting ? '설정 중…' : '알림 받고 시작하기'}
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
