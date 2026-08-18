import { useEffect, useLayoutEffect, useRef } from 'react';
import { clsx } from '@/lib/clsx';

interface Props {
  /** `HH:mm` */
  value: string;
  onChange: (value: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 10, 20, 30, 40, 50];

/*
 * 시안(25:30666) 실측값.
 * 밴드 185×65 두 개가 가운데(x=201)에서 맞닿고, 위아래로 한 칸씩 흐린 값이 보인다.
 * 선택값 글자 상자 55px, 흐린 값 36px, 두 값의 중심 간격이 약 87px 이다.
 */
const BAND_HEIGHT = 65;
const ITEM_HEIGHT = 87;

/**
 * 기본 피부점호 시각 선택기.
 *
 * 부대마다 휴대전화를 받는 시각이 다르므로 사용자가 직접 고를 수 있어야 한다.
 * (공식 일과 후 사용 시간은 18:00~21:00 이고, 부대·근무 형태에 따라 편차가 크다)
 */
export function TimeWheel({ value, onChange }: Props) {
  const [hourText = '17', minuteText = '30'] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  const setHour = (h: number) => onChange(`${pad(h)}:${pad(minute)}`);
  const setMinute = (m: number) => onChange(`${pad(hour)}:${pad(m)}`);

  return (
    <div className="relative w-full">
      {/*
       * 선택 밴드는 두 조각이다. 시안에서 시·분이 각각 별도 사각형이라
       * 맞닿는 가운데에만 라운드가 겹쳐 보인다.
       * 시안 32:53072 — 185×65, 모서리 **16**
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 gap-px"
        style={{ height: BAND_HEIGHT }}
      >
        <span className="flex-1 rounded-[16px] bg-panel" />
        <span className="flex-1 rounded-[16px] bg-panel" />
      </div>

      <div className="relative flex">
        <Column values={HOURS} selected={hour} onSelect={setHour} label="시" />
        {/* 콜론은 두 밴드가 맞닿는 지점 위에 뜬다 */}
        <span className="pointer-events-none absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 items-center text-[46px] font-normal leading-none text-fg-muted">
          :
        </span>
        <Column values={MINUTES} selected={minute} onSelect={setMinute} label="분" />
      </div>
    </div>
  );
}

function Column({
  values,
  selected,
  onSelect,
  label,
}: {
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  // 스크롤로 selected 를 바꾸면 그 변경이 아래 useLayoutEffect 를 다시 깨워
  // scrollTo 가 걸린다. 사용자가 손으로 굴리는 중엔 그 자동 보정을 눌러 둔다.
  const scrolling = useRef<number | undefined>(undefined);

  // 선택 값을 가운데 밴드로 맞춘다.
  // 첫 렌더는 즉시(auto) 맞춰야 한다. smooth 로 두면 애니메이션이 시작되기 전 화면이
  // 맨 위(00)로 보인다.
  useLayoutEffect(() => {
    const index = values.indexOf(selected);
    if (index < 0 || !ref.current || scrolling.current !== undefined) return;

    ref.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: mounted.current ? 'smooth' : 'auto',
    });
    mounted.current = true;
  }, [selected, values]);

  /*
   * 이 컴포넌트는 스크롤 컨테이너다. 예전엔 선택이 클릭으로만 바뀌어서,
   * 휠처럼 굴리면 숫자만 움직이고 파란 선택값은 밴드 밖으로 밀려나 깨져 보였다.
   * 굴려서 가운데 온 값을 그때그때 선택으로 확정한다.
   *
   * scrollend 는 사파리 지원이 늦어 못 믿는다. 스크롤이 멎고 120ms 뒤
   * 가장 가까운 칸을 계산해 확정하는 방식으로 대신한다.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      window.clearTimeout(scrolling.current);
      scrolling.current = window.setTimeout(() => {
        scrolling.current = undefined;
        const index = Math.round(el.scrollTop / ITEM_HEIGHT);
        const value = values[Math.max(0, Math.min(values.length - 1, index))];
        if (value !== undefined && value !== selected) onSelect(value);
      }, 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.clearTimeout(scrolling.current);
    };
  }, [values, selected, onSelect]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      className="flex-1 snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ height: ITEM_HEIGHT * 3, paddingBlock: ITEM_HEIGHT }}
    >
      {values.map((v) => {
        const isSelected = v === selected;
        return (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(v)}
            style={{ height: ITEM_HEIGHT }}
            className={clsx(
              'flex w-full snap-center items-center justify-center leading-none transition',
              // 시안 32:53075 — 고른 값 46px 파랑, 이웃 30px #D5D5D5. 둘 다 Regular 다
              isSelected ? 'text-[46px] text-info' : 'text-[30px] text-panel',
            )}
          >
            {pad(v)}
          </button>
        );
      })}
    </div>
  );
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}
