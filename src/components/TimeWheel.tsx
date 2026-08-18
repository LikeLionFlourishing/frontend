import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const scrollTimer = useRef<number | undefined>(undefined);
  // 손으로 굴리는 중엔 아래 useLayoutEffect 의 자동 보정 스크롤을 눌러 둔다.
  const isScrolling = useRef(false);

  /*
   * `active` = 지금 밴드 한가운데 온 칸. **강조(파랑)는 이 값을 따른다.**
   *
   * 비선택 숫자색(#D5D5D5)이 밴드 배경색과 똑같아서, 스크롤이 멎을 때까지
   * 강조를 미루면 밴드 안 숫자가 배경에 묻혀 안 보인다. 그래서 스크롤 도중에도
   * 가운데 칸을 실시간으로 파랗게 칠하고, 부모(onSelect)로의 확정만 멎은 뒤 보낸다.
   */
  const [active, setActive] = useState(() => Math.max(0, values.indexOf(selected)));

  // 선택 값을 가운데 밴드로 맞춘다. (첫 렌더·부모발 변경·클릭)
  // 첫 렌더는 즉시(auto). smooth 로 두면 애니메이션 전 맨 위(00)가 잠깐 보인다.
  useLayoutEffect(() => {
    const index = values.indexOf(selected);
    if (index < 0 || !ref.current || isScrolling.current) return;

    ref.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: mounted.current ? 'smooth' : 'auto',
    });
    setActive(index);
    mounted.current = true;
  }, [selected, values]);

  /*
   * 이 컴포넌트는 스크롤 컨테이너다. 굴리면 가운데 온 칸을 그때그때 강조하고,
   * 멎으면 그 값을 선택으로 확정한다. (scrollend 는 사파리 지원이 늦어 못 믿어서
   * 120ms 디바운스로 대신한다)
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      isScrolling.current = true;
      const index = Math.max(
        0,
        Math.min(values.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)),
      );
      setActive(index); // 강조는 즉시 따라간다 — 밴드 안 숫자가 묻히지 않게
      window.clearTimeout(scrollTimer.current);
      scrollTimer.current = window.setTimeout(() => {
        isScrolling.current = false;
        const value = values[index];
        if (value !== undefined && value !== selected) onSelect(value);
      }, 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.clearTimeout(scrollTimer.current);
    };
  }, [values, selected, onSelect]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      className={clsx(
        'flex-1 snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        // iOS 관성 스크롤. 손을 떼면 여운을 남기며 미끄러진다.
        '[-webkit-overflow-scrolling:touch]',
        // 위아래 가장자리를 투명으로 흐린다. 이웃 숫자가 컨테이너에서 뚝 잘리지 않고
        // 원통이 돌아가듯 페이드인·아웃 되어 굴리는 움직임이 매끈해 보인다.
        '[mask-image:linear-gradient(to_bottom,transparent,#000_18%,#000_82%,transparent)]',
        '[-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_18%,#000_82%,transparent)]',
      )}
      style={{ height: ITEM_HEIGHT * 3, paddingBlock: ITEM_HEIGHT }}
    >
      {values.map((v, i) => {
        // 강조는 밴드 한가운데 온 칸(active)을 따른다. 스크롤 도중에도 즉시 반응한다.
        const isSelected = i === active;
        return (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(v)}
            style={{ height: ITEM_HEIGHT }}
            className={clsx(
              // transition 을 두지 않는다. 색이 150ms 걸려 물들면 빠르게 굴릴 때
              // 가운데 온 숫자가 밴드색(#D5D5D5)과 같은 회색인 채로 지나가 묻힌다.
              // 네이티브 피커처럼 즉시 파랑으로 바뀌게 둔다.
              'flex w-full snap-center items-center justify-center leading-none',
              /*
               * 고른 값 46px 파랑, 이웃 30px 회색. 둘 다 Regular.
               *
               * 이웃 색은 시안값(#D5D5D5)이 아니라 #A5A5A5 를 쓴다. 시안값은
               * 밴드 배경(#D5D5D5)과 완전히 같은 색이라, 빠르게 굴릴 때 밴드를
               * 지나가는 숫자들이 배경에 묻혀 사라진다. 밴드 밖(밝은 배경)과
               * 밴드 안(진한 회색) 양쪽에서 다 읽히는 중간 회색으로 낮췄다.
               */
              isSelected ? 'text-[46px] text-info' : 'text-[30px] text-[#A5A5A5]',
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
