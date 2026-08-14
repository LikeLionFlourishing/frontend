import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '@/api/endpoints';
import { ApiError, toUserMessage } from '@/api/problem';
import { PrimaryButton } from '@/components/StepLayout';
import { TextField } from '@/components/TextField';
import { useAuthStore } from '@/stores/authStore';

/**
 * 계정 만들기.
 *
 * 동의는 여기가 아니라 온보딩에서 받는다 — 문서(유저플로우 1)의 `최초 이용`이
 * 이용범위 → 동의 → 알림 순이고, `PUT /me/onboarding` 이 그 세 값을 함께 받는다.
 */
export function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

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
        <h1 className="text-[28px] font-bold text-fg">계정 만들기</h1>
        <p className="mt-2 text-xs text-fg-muted">이메일로 간단하게 시작하세요.</p>
      </header>

      <form
        className="mt-12 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (valid) register.mutate();
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
          placeholder="비밀번호를 다시 입력하세요"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          error={confirmError}
        />

        {register.isError && (
          <p className="px-2 text-sm text-caution-500">{registerError(register.error)}</p>
        )}

        <div className="pt-8">
          <PrimaryButton type="submit" disabled={(touched && !valid) || register.isPending}>
            {register.isPending ? '가입 중…' : '다음'}
          </PrimaryButton>
        </div>
      </form>

      <p className="mt-5 text-center text-sm text-fg-muted">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-semibold text-info">
          로그인
        </Link>
      </p>
    </div>
  );
}

function registerError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return '이미 가입된 이메일이에요. 로그인해 주세요.';
  }
  return toUserMessage(error);
}
