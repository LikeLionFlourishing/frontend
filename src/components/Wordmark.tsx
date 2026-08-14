import { clsx } from '@/lib/clsx';

/*
 * 워드마크 `관리하는 / 행보관`.
 *
 * 시안에서 이건 텍스트가 아니라 이미지다(Figma `image 28/29`). 서체를 특정할 수 없어
 * 폰트로는 재현되지 않는다. 원본은 흰색 글리프 + 알파라서 마스크로 쓰고 색만 입힌다.
 * 두 줄이 한 장에 들어 있던 것을 잘라 line1/line2 로 나눠 두었다.
 */
const LINES = [
  { src: '/brand/logo-line1.png', ratio: 706 / 132, tint: 'bg-fg' },
  { src: '/brand/logo-line2.png', ratio: 535 / 132, tint: 'bg-brand' },
] as const;

export function Wordmark({ height = 40, className }: { height?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="관리하는 행보관"
      className={clsx('flex flex-col gap-2', className)}
    >
      {LINES.map((line) => (
        <span
          key={line.src}
          aria-hidden="true"
          className={clsx('block', line.tint)}
          style={{
            height,
            width: height * line.ratio,
            maskImage: `url(${line.src})`,
            WebkitMaskImage: `url(${line.src})`,
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />
      ))}
    </span>
  );
}
