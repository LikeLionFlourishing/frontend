import type { Problem } from './schemas';

/**
 * 서버는 모든 오류를 application/problem+json (RFC 9457) 으로 돌려준다.
 * 화면에서는 `error.code` 로 분기하고, 사용자에게는 `error.detail` 을 보여준다.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly problem: Problem | null;
  readonly retryAfterSeconds: number | null;

  constructor(args: {
    status: number;
    code: string;
    message: string;
    problem: Problem | null;
    retryAfterSeconds?: number | null;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.problem = args.problem;
    this.retryAfterSeconds = args.retryAfterSeconds ?? null;
  }

  /** 필드 단위 오류를 인라인 에러로 뿌릴 때 사용한다. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of this.problem?.errors ?? []) out[e.field] = e.message;
    return out;
  }
}

export class NetworkError extends Error {
  constructor(message = '네트워크에 연결할 수 없어요.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** 사용자에게 그대로 노출해도 되는 문구. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.problem?.detail) return error.problem.detail;
    return FALLBACK_MESSAGE[error.code] ?? '잠시 후 다시 시도해 주세요.';
  }
  if (error instanceof NetworkError) return error.message;
  return '알 수 없는 오류가 발생했어요.';
}

const FALLBACK_MESSAGE: Record<string, string> = {
  AUTHENTICATION_REQUIRED: '다시 로그인해 주세요.',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호를 확인해 주세요.',
  VALIDATION_ERROR: '입력한 내용을 다시 확인해 주세요.',
};
