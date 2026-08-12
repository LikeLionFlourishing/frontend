import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { auth } from '@/api/endpoints';
import { ApiError, toUserMessage } from '@/api/problem';
import { PrimaryButton } from '@/components/StepLayout';
import { TextField } from '@/components/TextField';
import { useAuthStore } from '@/stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () => auth.login({ email: email.trim(), password }),
    onSuccess: (session) => {
      setSession(session);
      navigate(session.user.signupcompleted ? '/' : '/onboarding', { replace: true });
    },
  });

  if (user) return <Navigate to="/" replace />;

  const canSubmit = email.trim().length > 0 && password.length > 0 && !login.isPending;

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pt-16">
      <header>
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

      <form
        className="mt-12 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) login.mutate();
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
        />
        <TextField
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={setPassword}
        />

        {login.isError && (
          <p className="px-2 text-sm text-caution-500">{loginError(login.error)}</p>
        )}

        <div className="pt-4">
          <PrimaryButton type="submit" disabled={!canSubmit}>
            {login.isPending ? '로그인 중…' : '로그인'}
          </PrimaryButton>
        </div>
      </form>

      <p className="mt-5 text-center text-sm text-fg-muted">
        계정이 없으신가요?{' '}
        <Link to="/signup" className="font-semibold text-accent">
          회원가입
        </Link>
      </p>

      {/*
        시안에는 `익명으로 시작하기` 버튼이 있으나 API 명세가
        "익명 사용자는 MVP 범위에서 제외합니다" 로 못박고 있어 넣지 않았다.
        기획·백엔드에서 범위가 정해지면 여기에 추가한다.
      */}
    </div>
  );
}

function loginError(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return '이메일 또는 비밀번호를 확인해 주세요.';
  }
  return toUserMessage(error);
}
