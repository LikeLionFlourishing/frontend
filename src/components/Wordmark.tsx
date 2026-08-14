import { clsx } from '@/lib/clsx';

/**
 * 워드마크 `제대로`.
 *
 * TODO(디자인): 전용 로고 에셋 대기 중.
 * 이전 이름(`관리하는 행보관`)은 시안에서 텍스트가 아니라 이미지였고,
 * 그 이미지는 옛 이름 글자라 재사용할 수 없어 지웠다.
 * 새 워드마크가 나오면 흰색 글리프 + 알파 PNG 로 받아 마스크로 쓰면
 * 색을 토큰으로 제어할 수 있다(이전 구현과 동일한 방식).
 */
export function Wordmark({ height = 40, className }: { height?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="제대로"
      className={clsx('block font-bold leading-none tracking-tight text-brand', className)}
      style={{ fontSize: height }}
    >
      제대로
    </span>
  );
}
