import { clsx } from '@/lib/clsx';

/*
 * 워드마크 `제대로`. Figma 온보딩(25:30569)의 벡터를 그대로 옮겼다.
 * 글꼴이 아니라 커스텀 레터링이라 텍스트로 재현할 수 없다.
 * 색은 currentColor 를 따르므로 배경에 맞춰 클래스로 바꾼다.
 */
const VIEW_BOX = '0 0 198 44.88';

const PATHS = [
  'M0 0H31.6301V6.50058H16.2312V15.9654H25.3873L29.341 19.9178V15.9654H35.3237V0H47.1329V44.88H35.3237V22.414H31.6301V44.88H20.237V22.414H16.2312V38.6394L9.98844 44.88H0V38.3794H4.78613V6.50058H0V0ZM49.9942 0H61.8555V44.88H49.9942V0Z',
  'M99.052 44.88H76.8902L69.3988 37.3913V0H98.4277V6.50058H81.4162V38.1714H99.052V44.88ZM102.121 0H113.931V17.8376H117.416V0H129.277V44.88H117.416V24.2862H113.931V44.88H102.121V0Z',
  'M194.879 31.6188H173.289V38.4314H198V44.932H136.613V38.4314H161.272V31.6188H146.601L140.358 25.3783V12.5331H181.613V6.50058H140.671V0H193.63V19.0337H152.324V25.1182H194.879V31.6188Z',
];

export function Wordmark({ height = 45, className }: { height?: number; className?: string }) {
  return (
    <svg
      role="img"
      aria-label="제대로"
      viewBox={VIEW_BOX}
      height={height}
      className={clsx('block w-auto text-fg', className)}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {PATHS.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}
