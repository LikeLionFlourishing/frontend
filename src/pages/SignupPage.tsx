import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { auth, onboarding } from '@/api/endpoints';
import { ApiError, toUserMessage } from '@/api/problem';
import { PrimaryButton } from '@/components/StepLayout';
import { TextField } from '@/components/TextField';
import { useAuthStore } from '@/stores/authStore';
import { clsx } from '@/lib/clsx';

/** 동의 문구 버전. 서버에 그대로 저장되므로 문구를 바꾸면 이 값도 올려야 한다. */
const CONSENT_VERSION = '2026-08-09';

type Step = 'account' | 'consent';

export function SignupPage() {
  const [step, setStep] = useState<Step>('account');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  return step === 'account' ? (
    <AccountStep
      email={email}
      password={password}
      passwordConfirm={passwordConfirm}
      onEmail={setEmail}
      onPassword={setPassword}
      onPasswordConfirm={setPasswordConfirm}
      onNext={() => setStep('consent')}
    />
  ) : (
    <ConsentStep email={email} password={password} onBack={() => setStep('account')} />
  );
}

// --- 계정 만들기 --------------------------------------------------------------

function AccountStep({
  email,
  password,
  passwordConfirm,
  onEmail,
  onPassword,
  onPasswordConfirm,
  onNext,
}: {
  email: string;
  password: string;
  passwordConfirm: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onPasswordConfirm: (v: string) => void;
  onNext: () => void;
}) {
  const [touched, setTouched] = useState(false);

  // 명세상 비밀번호는 12자 이상이다. 서버 422 를 보기 전에 여기서 막는다.
  const emailError = touched && !email.includes('@') ? '이메일 형식을 확인해 주세요.' : null;
  const passwordError =
    touched && password.length > 0 && password.length < 12
      ? '비밀번호는 12자 이상이어야 해요.'
      : null;
  const confirmError =
    touched && passwordConfirm.length > 0 && password !== passwordConfirm
      ? '비밀번호가 일치하지 않아요.'
      : null;

  const valid = email.includes('@') && password.length >= 12 && password === passwordConfirm;

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pt-16">
      <header>
        <h1 className="text-3xl font-bold text-fg">계정 만들기</h1>
        <p className="mt-2 text-sm text-fg-muted">이메일로 간단하게 시작하세요.</p>
      </header>

      <form
        className="mt-12 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (valid) onNext();
        }}
      >
        <TextField
          label="이메일"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="이메일을 입력하세요"
          value={email}
          onChange={onEmail}
          error={emailError}
        />
        <TextField
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          placeholder="영문, 숫자, 특수문자 포함 12자 이상"
          value={password}
          onChange={onPassword}
          error={passwordError}
        />
        <TextField
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호를 다시 입력하세요"
          value={passwordConfirm}
          onChange={onPasswordConfirm}
          error={confirmError}
        />

        <div className="pt-8">
          <PrimaryButton type="submit" disabled={touched && !valid}>
            다음
          </PrimaryButton>
        </div>
      </form>

      <p className="mt-5 text-center text-sm text-fg-muted">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-semibold text-accent">
          로그인
        </Link>
      </p>
    </div>
  );
}

// --- 동의 --------------------------------------------------------------------

interface ConsentItem {
  key: 'privacy' | 'terms' | 'marketing';
  label: string;
  required: boolean;
}

const CONSENTS: ConsentItem[] = [
  { key: 'privacy', label: '(필수) 개인정보 수집·이용 동의', required: true },
  { key: 'terms', label: '(필수) 서비스 이용약관 동의', required: true },
  { key: 'marketing', label: '(선택) 마케팅 정보 수신 동의', required: false },
];

function ConsentStep({
  email,
  password,
  onBack,
}: {
  email: string;
  password: string;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [agreed, setAgreed] = useState<Record<string, boolean>>({});

  const allRequiredAgreed = CONSENTS.filter((c) => c.required).every((c) => agreed[c.key]);

  const register = useMutation({
    mutationFn: async () => {
      const session = await auth.register({ email: email.trim(), password });
      // 세션이 생긴 직후라 CSRF 토큰을 먼저 심어야 다음 요청이 통과한다.
      setSession(session);

      await onboarding.complete({
        consentVersion: CONSENT_VERSION,
        sensitiveDataConsent: true,
        notificationEnabled: false,
        notificationPermission: 'DEFAULT',
      });
      return session;
    },
    onSuccess: () => navigate('/onboarding', { replace: true }),
  });

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pt-16">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 mb-6 self-start text-2xl leading-none text-fg"
        aria-label="뒤로"
      >
        ‹
      </button>

      <header>
        <h1 className="text-3xl font-bold leading-snug text-fg">
          서비스 이용을 위해
          <br />
          동의가 필요해요
        </h1>
        <p className="mt-3 text-sm text-fg-muted">
          모든 항목에 동의해야 서비스를 이용할 수 있어요.
        </p>
      </header>

      <div className="mt-12 flex flex-col gap-3">
        {CONSENTS.map((item) => {
          const checked = Boolean(agreed[item.key]);
          return (
            <div key={item.key} className="flex items-center gap-3 rounded-card bg-panel px-4 py-4">
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={item.label}
                onClick={() => setAgreed((prev) => ({ ...prev, [item.key]: !checked }))}
                className={clsx(
                  'size-6 shrink-0 rounded-full transition',
                  checked ? 'bg-accent' : 'bg-card',
                )}
              />
              <span className="flex-1 text-sm text-panel-text">{item.label}</span>
              <button type="button" className="shrink-0 text-xs text-panel-label">
                자세히
              </button>
            </div>
          );
        })}
      </div>

      {register.isError && (
        <p className="mt-4 px-2 text-sm text-caution-500">{registerError(register.error)}</p>
      )}

      <div className="mt-auto pb-6 pt-10">
        <PrimaryButton
          onClick={() => register.mutate()}
          disabled={!allRequiredAgreed || register.isPending}
        >
          {register.isPending ? '가입 중…' : '가입하기'}
        </PrimaryButton>

        <p className="mt-5 text-center text-sm text-fg-muted">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-semibold text-accent">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

function registerError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return '이미 가입된 이메일이에요. 로그인해 주세요.';
  }
  return toUserMessage(error);
}
