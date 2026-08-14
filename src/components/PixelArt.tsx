import type { CSSProperties } from 'react';
import { clsx } from '@/lib/clsx';

interface Props {
  /** `#` 이 칠해지는 칸. 모든 줄의 길이가 같아야 한다. */
  bitmap: readonly string[];
  /** 한 칸의 한 변(px) */
  cell: number;
  /** 칸 사이 간격(px) */
  gap: number;
  /** 단색일 때 칸 색. tailwind 배경 클래스. */
  tint?: string;
  /**
   * 다색일 때 글자→클래스 매핑. 비트맵이 `#` 대신 A/B/C… 를 쓰는 경우에 넘긴다.
   * 매핑에 없는 글자는 빈 칸으로 둔다.
   */
  tints?: Record<string, string>;
  className?: string;
  /** 배치용. 격자 자체의 크기는 bitmap 과 cell 로 정해진다. */
  style?: CSSProperties;
}

/**
 * 시안의 픽셀 장식을 그대로 그린다.
 *
 * 이미지가 아니라 Figma 도형이라 격자를 추출해 두었다(`loginDeco.ts` 등).
 * 색을 클래스로 받으므로 테마가 바뀌어도 에셋을 다시 받을 필요가 없다.
 */
export function PixelArt({
  bitmap,
  cell,
  gap,
  tint = 'bg-accent',
  tints,
  className,
  style,
}: Props) {
  const cols = bitmap[0]?.length ?? 0;

  return (
    <div
      aria-hidden="true"
      className={clsx('grid', className)}
      style={{
        ...style,
        gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
        gap: `${gap}px`,
      }}
    >
      {bitmap.flatMap((line, row) =>
        [...line].map((c, col) => (
          <span
            key={`${row}-${col}`}
            style={{ width: cell, height: cell }}
            className={tints ? tints[c] : c === '#' ? tint : undefined}
          />
        )),
      )}
    </div>
  );
}
