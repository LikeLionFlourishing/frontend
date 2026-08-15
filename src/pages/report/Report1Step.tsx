import { useRef } from 'react';
import faceFront from '@/assets/face-front.png';
import { PrimaryButton } from '@/components/StepLayout';
import { clsx } from '@/lib/clsx';
import { AREA_OPTIONS, APPEARANCE_OPTIONS, hasDot } from '@/api/designOptions';
import type { Appearance, BodyArea } from '@/api/schemas';

/* 타일 일러스트는 파일명이 값과 1:1 이라 한 번에 읽어 온다. */
const APPEARANCE_IMAGES = import.meta.glob<string>('@/assets/appearance-*.png', {
  eager: true,
  import: 'default',
});

function appearanceImage(name: string): string | undefined {
  const key = Object.keys(APPEARANCE_IMAGES).find((k) => k.endsWith(`appearance-${name}.png`));
  return key ? APPEARANCE_IMAGES[key] : undefined;
}

interface Props {
  area: BodyArea | null;
  appearance: Appearance | null;
  onChange: (partial: { area?: BodyArea; appearance?: Appearance }) => void;
  onNext: () => void;
}

/**
 * 피부보고1 (시안 30:40620) — 부위와 겉모습을 한 화면에서 받는다.
 *
 * 2026-08-16 개편으로 부위가 8종 → **13종** 이 되고 전부 계약 enum 이 됐다.
 *
 * 얼굴 그림 위의 점과 아래 칩은 같은 값을 가리킨다. 어느 쪽을 눌러도 같이 선택된다.
 * 그림만으로는 정확히 못 짚는 사람을 위해 `직접 선택하기` 로 칩 목록을 펼친다.
 */
export function Report1Step({ area, appearance, onChange, onNext }: Props) {
  // 시안에서 칩 목록은 늘 보이지만, `직접 선택하기` 는 거기로 화면을 옮겨 준다.
  const chipsRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col">
      {/* 얼굴 그림 180×259. 점은 그림 좌상단 기준 비율로 얹는다. */}
      <div className="relative mx-auto mt-[23px] h-[259px] w-[180px]">
        {/*
         * 상자(180×259)보다 그림이 가로로 넓어서 `cover` 로 두면 **귀가 잘린다.**
         * 시안은 자르지 않고 폭에 맞춰 넣는다 — 렌더에서 얼굴이 177×234 로
         * 에셋 비율(0.754)을 그대로 유지하고 위아래로만 여백이 남는다.
         * 점 좌표는 이 상자 기준 비율이라 `contain` 이어도 그대로 맞는다.
         */}
        <img src={faceFront} alt="" className="h-full w-full object-contain" />

        {AREA_OPTIONS.filter(hasDot).map((option) => {
          const selected = area === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={selected}
              onClick={() => onChange({ area: option.value })}
              style={{ left: `${option.x * 100}%`, top: `${option.y * 100}%` }}
              className={clsx(
                'absolute size-[9px] min-h-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition',
                selected ? 'bg-info' : 'bg-white',
              )}
            />
          );
        })}

        {/* 시안의 좌우 표시. 보는 사람 기준이라 `왼 볼`이 화면 왼쪽이다. */}
        <span className="absolute -left-[73px] top-[227px] text-body-strong text-fg">L</span>
        <span className="absolute -right-[70px] top-[227px] text-body-strong text-fg">R</span>
      </div>

      <button
        type="button"
        onClick={() => chipsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        // 시안 31:47618 — 132×39, 모서리 16, 바탕 #ECECEC
        className="mx-auto mt-[14px] flex h-[39px] min-h-0 items-center rounded-[16px] bg-card px-[33px] text-xs text-fg shadow-neu"
      >
        직접 선택하기
      </button>

      <h2 className="mt-[27px] text-body-strong leading-[19px] text-fg">주로 불편한 부위</h2>

      {/*
       * 시안 31:47678 — 칩은 글자 길이와 무관하게 **한 줄에 다섯 개인 고정 격자**다.
       * (x = 16 · 90 · 165 · 239 · 314, 폭 70~71, 높이 42, 모서리 19)
       * 글자 폭에 맞춰 늘리면 `코` 는 작고 `오른 턱선` 은 커져서 줄이 어긋난다.
       */}
      <div ref={chipsRef} className="mt-[9px] grid grid-cols-5 gap-x-[4.5px] gap-y-[7px]">
        {AREA_OPTIONS.map((option) => {
          const selected = area === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ area: option.value })}
              className={clsx(
                // 고른 칩만 16px SemiBold 로 커진다(시안 I31:47691;64:794)
                'flex h-[42px] min-h-0 items-center justify-center rounded-[19px] transition',
                selected
                  ? 'bg-info text-body-strong text-[#F1F1F1]'
                  : 'bg-card text-xs text-fg shadow-neu',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* 시안 변수 `웹 소제목` — Bold 30 (StepLayout 의 제목과 같은 규격) */}
      <h2 className="mt-[34px] text-[30px] font-bold leading-9 text-fg-muted">
        겉모습은 어떤가요?
      </h2>
      <p className="mt-[4px] text-xs leading-[14px] text-fg">가장 비슷한 모습을 선택해주세요</p>

      {/* 시안 31:47639 — 타일 180×127, 모서리 11, 가로 간격 9, 세로 간격 7 */}
      <div className="mt-[15px] grid grid-cols-2 gap-x-[9px] gap-y-[7px]">
        {APPEARANCE_OPTIONS.map((option) => {
          const selected = appearance === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ appearance: option.value })}
              className={clsx(
                'flex h-[127px] flex-col items-center justify-end rounded-[11px] pb-[19px] transition',
                selected ? 'bg-info' : 'bg-panel-tile shadow-neu',
              )}
            >
              <img
                src={appearanceImage(option.image)}
                alt=""
                className="mb-auto mt-[27px] h-[57px] w-auto object-contain"
              />
              {/* 고른 타일만 16px SemiBold 로 커진다(시안 31:47655 vs 31:47640) */}
              <span
                className={clsx(selected ? 'text-body-strong text-white' : 'text-xs text-fg-muted')}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-[84px] pb-[65px]">
        <PrimaryButton onClick={onNext} disabled={!area || !appearance}>
          다음
        </PrimaryButton>
      </div>
    </div>
  );
}
