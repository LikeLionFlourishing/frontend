import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { auth } from '@/api/endpoints';
import { ApiError, toUserMessage } from '@/api/problem';
import { PrimaryButton } from '@/components/StepLayout';
import { TextField } from '@/components/TextField';
import { Wordmark } from '@/components/Wordmark';
import { PixelArt } from '@/components/PixelArt';
import {
  DECO_BOTTOM_CELL,
  DECO_BOTTOM_GAP,
  DECO_TOP_CELL,
  DECO_TOP_GAP,
  LOGIN_DECO_BOTTOM,
  LOGIN_DECO_TOP,
} from '@/components/deco';
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
    // 시안 기준 워드마크 상단 110 (25:30023)
    <div className="relative mx-auto flex min-h-dvh w-full max-w-app flex-col overflow-hidden px-4 pt-[calc(var(--safe-top)+110px)]">
      {/* 시안의 배경 픽셀 장식. 프레임 밖으로 걸치는 위치까지 그대로 따랐다. */}
      <PixelArt
        bitmap={LOGIN_DECO_TOP}
        cell={DECO_TOP_CELL}
        gap={DECO_TOP_GAP}
        style={{ left: `${(206 / 402) * 100}%`, top: 'calc(var(--safe-top) + 118px)' }}
        className="pointer-events-none absolute"
      />
      <PixelArt
        bitmap={LOGIN_DECO_BOTTOM}
        cell={DECO_BOTTOM_CELL}
        gap={DECO_BOTTOM_GAP}
        style={{ left: `${(-33 / 402) * 100}%`, top: 'calc(var(--safe-top) + 479px)' }}
        className="pointer-events-none absolute"
      />

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
        // 시안 — 문구 아래 122, 필드 사이 9
        className="relative mt-[122px] flex flex-col gap-[9px]"
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

        {/* 시안 기준 두 번째 필드 아래 186px 지점에 로그인 버튼 */}
        <div className="pt-[186px]">
          <PrimaryButton type="submit" disabled={!canSubmit}>
            {login.isPending ? '로그인 중…' : '로그인'}
          </PrimaryButton>
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
