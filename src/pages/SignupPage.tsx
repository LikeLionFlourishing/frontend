import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '@/api/endpoints';
import { ApiError, toUserMessage } from '@/api/problem';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/StepLayout';
import { TextField } from '@/components/TextField';
import { clsx } from '@/lib/clsx';
import { Sentences } from '@/components/Sentences';
import { useAuthStore } from '@/stores/authStore';
import { useSignupConsentStore } from '@/stores/signupConsentStore';

/**
 * 회원가입. 확정 시안에서 두 화면이다 —
 * `계정 만들기`(25:30700, 버튼 `다음`) → `동의`(25:28767, 버튼 `가입하기`).
 *
 * 계정은 동의까지 받은 뒤에 만들어진다. 동의 값 자체는 보낼 곳이 온보딩 API 뿐이라
 * 스토어에 담아 두고 온보딩 마지막에 함께 보낸다.
 */
export function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState<'account' | 'consent'>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [touched, setTouched] = useState(false);

  const register = useMutation({
    mutationFn: () => auth.register({ email: email.trim(), password }),
    onSuccess: (session) => {
      // 세션이 생긴 직후라 CSRF 토큰을 먼저 심어야 다음 요청이 통과한다.
      setSession(session);
      navigate('/onboarding', { replace: true });
    },
  });

  const emailError = touched && !email.includes('@') ? '이메일 형식을 확인해 주세요.' : null;
  const passwordError =
    touched && password.length > 0 && !isValidPassword(password)
      ? '영문, 숫자, 특수문자를 포함해 12자 이상으로 입력해 주세요.'
      : null;
  const confirmError =
    touched && passwordConfirm.length > 0 && password !== passwordConfirm
      ? '비밀번호가 일치하지 않아요.'
      : null;

  const valid = email.includes('@') && isValidPassword(password) && password === passwordConfirm;

  if (step === 'consent') {
    return (
      <ConsentStep
        onSubmit={() => register.mutate()}
        submitting={register.isPending}
        errorMessage={register.isError ? registerError(register.error) : null}
      />
    );
  }

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col px-4">
      {/*
       * 시안 32:53082 — 제목 상단 165(상태바 44 제외 → 121), 글상자 높이 48.
       * 굵기는 **Medium** 이다. 인증·온보딩 화면은 보고 흐름과 달리 Bold 를 쓰지 않는다.
       * 부제는 제목 글상자 바로 아래(간격 0)에서 시작한다.
       */}
      <header className="pt-[121px]">
        <h1 className="h-[48px] text-[40px] font-medium leading-[48px] text-fg-muted">
          계정 만들기
        </h1>
        <p className="text-xs text-fg-muted">이메일로 간단하게 시작하세요.</p>
      </header>

      <form
        // 시안 — 부제 아래 95, 필드 사이 7
        className="mt-[95px] flex flex-col gap-[7px]"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (valid) setStep('consent');
        }}
      >
        <TextField
          label="이메일"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="이메일을 입력하세요"
          value={email}
          onChange={setEmail}
          error={emailError}
        />
        <TextField
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          placeholder="영문, 숫자, 특수문자 포함 12자 이상"
          value={password}
          onChange={setPassword}
          error={passwordError}
        />
        <TextField
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호를 다시 입력하세요."
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          error={confirmError}
        />

        <div className="mt-auto pt-[131px]">
          <PrimaryButton type="submit" disabled={touched && !valid}>
            다음
          </PrimaryButton>
        </div>
      </form>

      <p className="safe-bottom mt-[18px] pb-8 text-center text-xs text-fg-muted">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="text-body-strong text-info">
          로그인
        </Link>
      </p>
    </div>
  );
}

// --- 2단계. 동의 ------------------------------------------------------------------

/*
 * 2026-08-16 결정으로 **한 건만 받는다.**
 *
 * 이용약관은 개인정보 동의에 합쳐졌고, 마케팅 동의는 명세에 없던 항목이라 빠졌다.
 * 계약이 남기는 값도 `consentVersion` · `consentedAt` 하나뿐이라 이제 딱 맞는다.
 * (docs/명세-대조.md 2-8)
 */
const CONSENTS = [
  {
    key: 'privacy',
    label: '(필수) 개인정보 수집 이용동의',
    required: true,
    detail:
      '계정 정보와 피부 기록을 서비스 제공 목적으로 처리해요. 피부 상태 기록은 민감정보에 해당하며 진단·처방 목적으로 쓰지 않아요.',
  },
] as const;

/*
 * 시안의 `동의` 화면에는 뒤로가기가 없다. 화면에 없는 것은 만들지 않는 원칙에 따라
 * 그대로 뒀다.
 * TODO(디자인): 이메일을 잘못 적었을 때 계정 만들기로 돌아갈 길이 필요한지 확인.
 */
function ConsentStep({
  onSubmit,
  submitting,
  errorMessage,
}: {
  onSubmit: () => void;
  submitting?: boolean;
  errorMessage?: string | null;
}) {
  const consent = useSignupConsentStore();
  const [detail, setDetail] = useState<(typeof CONSENTS)[number] | null>(null);

  const requiredAgreed = CONSENTS.filter((c) => c.required).every((c) => consent[c.key]);

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col px-4">
      {/* 시안 기준 제목 상단 130 (상태바 44 제외 → 86) */}
      <header className="pt-[86px]">
        <h1 className="text-[30px] font-medium leading-9 text-fg-muted">
          서비스 이용을 위해
          <br />
          동의가 필요해요
        </h1>
        <p className="mt-[10px] text-xs text-fg-muted">
          모든 항목에 동의해야 서비스를 이용할 수 있어요.
        </p>
      </header>

      {/* 시안 기준 행 369×83, 간격 8, 원 26px 이 좌측 25px 지점 */}
      <div className="mt-[98px] flex flex-col gap-2">
        {CONSENTS.map((item) => {
          const checked = consent[item.key];
          return (
            <div
              key={item.key}
              // 시안 31:45955 — 369×83, 모서리 26, 원 26, 라벨 SemiBold 16
              className="flex h-[83px] items-center rounded-[25px] bg-panel pl-[25px] pr-9"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => consent.patch({ [item.key]: !checked })}
                className="flex flex-1 items-center gap-[15px] text-left"
              >
                {/* 선택해도 원을 통째로 칠하지 않는다. 흰 원 안에 더 작은 파란 원이 들어간다. */}
                <span
                  aria-hidden="true"
                  className={clsx(
                    'grid size-[26px] shrink-0 place-items-center rounded-full border-2 bg-base transition',
                    checked ? 'border-info' : 'border-fg',
                  )}
                >
                  {checked && <span className="size-3.5 rounded-full bg-info" />}
                </span>
                <span className="text-body-strong text-fg-muted">{item.label}</span>
              </button>

              <button
                type="button"
                onClick={() => setDetail(item)}
                className="shrink-0 text-xs text-fg-muted"
              >
                자세히
              </button>
            </div>
          );
        })}
      </div>

      <div className="safe-bottom mt-auto pb-[29px] pt-6">
        {errorMessage && (
          <p className="mb-3 px-2 text-sm text-caution-500">
            <Sentences text={errorMessage} />
          </p>
        )}
        <PrimaryButton onClick={onSubmit} disabled={!requiredAgreed || submitting}>
          {submitting ? '가입 중…' : '가입하기'}
        </PrimaryButton>
        <p className="mt-[14px] text-center text-xs text-fg-muted">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-body-strong text-info">
            로그인
          </Link>
        </p>
      </div>

      <BottomSheet
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.label ?? ''}
        footer={<PrimaryButton onClick={() => setDetail(null)}>닫기</PrimaryButton>}
      >
        <p className="whitespace-pre-line text-sm leading-[18px] text-fg-muted">
          <Sentences text={detail?.detail ?? ''} />
        </p>
        {/* TODO(기획·법무): 확정된 약관 전문으로 교체. 지금은 처리 범위만 사실대로 적어 둔다. */}
        <p className="mt-4 text-xs leading-4 text-fg-faint">
          <Sentences text="약관 전문은 준비 중이에요. 확정되면 이 화면에서 전체 내용을 볼 수 있어요." />
        </p>
      </BottomSheet>
    </div>
  );
}

/**
 * 비밀번호 규칙. 계약(`RegisterRequest.password.minLength: 12`)을 따른다.
 *
 * 시안(25:30700)의 문구는 `8자 이상` 이지만 서버가 12자를 요구하므로
 * 8자로 두면 사용자가 이유를 모른 채 막힌다. 문구를 12자로 바꿔 맞췄다.
 * 시안 문구도 12자로 고쳐 달라고 디자인에 전달했다.
 */
function isValidPassword(value: string): boolean {
  return (
    value.length >= 12 &&
    /[A-Za-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function registerError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return '이미 가입된 이메일이에요. 로그인해 주세요.';
  }
  return toUserMessage(error);
}
