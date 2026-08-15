import { useRef } from 'react';
import faceFront from '@/assets/face-front.png';
import { PrimaryButton } from '@/components/StepLayout';
import { clsx } from '@/lib/clsx';
import { AREA_OPTIONS, APPEARANCE_OPTIONS } from '@/api/designOptions';

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
  area: string | null;
  appearance: string | null;
  onChange: (partial: { area?: string; appearance?: string }) => void;
  onNext: () => void;
}

/**
 * 피부보고1 (시안 22:13847) — 부위와 겉모습을 한 화면에서 받는다.
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
      <div className="relative mx-auto mt-[62px] h-[259px] w-[180px]">
        {/*
         * 시안은 180×259 상자를 이미지로 꽉 채운다(가로가 조금 잘린다).
         * 점 좌표가 이 상자 기준이라 `contain` 으로 두면 전부 어긋난다.
         */}
        <img src={faceFront} alt="" className="h-full w-full object-cover" />

        {AREA_OPTIONS.map((option) => {
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
        className="mx-auto mt-[14px] flex h-[39px] min-h-0 items-center rounded-pill bg-panel-tile px-[33px] text-xs text-fg"
      >
        직접 선택하기
      </button>

      <h2 className="mt-[24px] text-body-strong text-fg">주로 불편한 부위</h2>

      {/* 시안 기준 칩 70×42, 가로 간격 4, 세로 간격 7 */}
      <div ref={chipsRef} className="mt-[9px] flex flex-wrap gap-x-1 gap-y-[7px]">
        {AREA_OPTIONS.map((option) => {
          const selected = area === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ area: option.value })}
              className={clsx(
                // 시안 기준 칩은 폭이 70 으로 고정이라 한 줄에 다섯 개가 들어간다
                'flex h-[42px] w-[70px] min-h-0 items-center justify-center rounded-pill text-xs transition',
                selected ? 'bg-info font-semibold text-white' : 'bg-panel-tile text-fg',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <h2 className="mt-[44px] text-[28px] font-bold leading-9 text-fg">겉모습은 어떤가요?</h2>
      <p className="mt-[4px] text-xs text-fg-muted">가장 비슷한 모습을 선택해주세요</p>

      {/* 시안 기준 타일 180×127, 간격 7 */}
      <div className="mt-[16px] grid grid-cols-2 gap-[7px]">
        {APPEARANCE_OPTIONS.map((option) => {
          const selected = appearance === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ appearance: option.value })}
              className={clsx(
                'flex h-[127px] flex-col items-center justify-end rounded-card pb-[22px] transition',
                selected ? 'bg-info' : 'bg-panel-tile',
              )}
            >
              <img
                src={appearanceImage(option.image)}
                alt=""
                className="mb-auto mt-[27px] h-[57px] w-auto object-contain"
              />
              <span
                className={clsx('text-[11px]', selected ? 'font-semibold text-white' : 'text-fg')}
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
