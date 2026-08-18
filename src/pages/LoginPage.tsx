import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { auth } from '@/api/endpoints';
import { ApiError, toUserMessage } from '@/api/problem';
import { PrimaryButton } from '@/components/StepLayout';
import { TextField } from '@/components/TextField';
import { Wordmark } from '@/components/Wordmark';
import { useAuthStore } from '@/stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  /** 한 번이라도 제출을 눌렀는지. 빈 채로 누르면 그때부터 안내를 띄운다. */
  const [touched, setTouched] = useState(false);

  const login = useMutation({
    mutationFn: () => auth.login({ email: email.trim(), password }),
    onSuccess: (session) => {
      setSession(session);
      navigate(session.user.signupcompleted ? '/' : '/onboarding', { replace: true });
    },
  });

  if (user) return <Navigate to="/" replace />;

  const filled = email.trim().length > 0 && password.length > 0;
  /*
   * 시안(32:52918)의 로그인 버튼은 빈 화면에서도 초록이다. 회색으로 죽여 두면
   * 왜 못 누르는지 알려 주지 않은 채 막는 셈이라, 누를 수는 있게 두고
   * 비어 있으면 이유를 말한다. 회원가입의 `다음` 도 같은 규칙이다.
   */
  const canSubmit = filled && !login.isPending;

  return (
    // 시안 기준 워드마크 상단 110 (25:30023)
    <div className="relative mx-auto flex min-h-dvh w-full max-w-app flex-col overflow-hidden px-4 pt-[calc(var(--safe-top)+110px)]">
      <header className="relative">
        {/* 시안 32:52941 — 204×46 */}
        <Wordmark height={46} />
        {/* 시안의 설명 글상자는 두 줄에 28px (온보딩과 같다) */}
        <p className="mt-[19px] text-xs leading-[14px] text-fg-muted">
          오늘의 피부 상태를 간단하게 기록하고,
          <br />
          지금 필요한 관리 방법을 확인해보세요.
        </p>
      </header>

      <form
        // 시안 — 문구 아래 122, 필드 사이 9. flex-1 로 남는 세로를 흡수한다.
        className="relative mt-[122px] flex flex-1 flex-col gap-[9px]"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (canSubmit) login.mutate();
        }}
      >
        <TextField
          label="이메일"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="이메일을 입력하세요"
          surface="soft"
          value={email}
          onChange={setEmail}
        />
        <TextField
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호를 입력하세요"
          surface="soft"
          value={password}
          onChange={setPassword}
        />

        {login.isError && (
          <p className="px-2 text-sm text-caution-500">{loginError(login.error)}</p>
        )}

        {/*
         * 시안(874)에선 두 번째 필드 아래 186px 지점에 버튼이 온다.
         * 그 간격을 고정하면 화면이 짧을 때(예: 360×800) 버튼과 회원가입 링크가
         * 접혀 스크롤해야 보인다. mt-auto 로 남는 세로를 이 자리에 몰아 주면
         * 874 에선 186px 그대로, 더 짧은 화면에선 알아서 줄어 한 화면에 담긴다.
         * pt-10 은 화면이 아주 짧아도 버튼이 필드에 붙지 않게 하는 최소 간격이다.
         */}
        <div className="mt-auto pt-10">
          <PrimaryButton type="submit" disabled={login.isPending}>
            {login.isPending ? '로그인 중…' : '로그인'}
          </PrimaryButton>
          {touched && !filled && (
            <p className="mt-3 text-center text-sm text-caution-500">
              이메일과 비밀번호를 입력해 주세요.
            </p>
          )}
        </div>
      </form>

      <p className="safe-bottom relative mt-[14px] pb-[53px] text-center text-xs text-fg-muted">
        계정이 없으신가요?{' '}
        <Link
          to="/signup" // 시안 31:45929 — 밑줄 없이 SemiBold 16 / #346EFF
          className="text-body-strong text-info"
        >
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
