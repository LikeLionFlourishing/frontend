import { useLayoutEffect, useRef } from 'react';
import { clsx } from '@/lib/clsx';

interface Props {
  /** `HH:mm` */
  value: string;
  onChange: (value: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 10, 20, 30, 40, 50];

const ITEM_HEIGHT = 48;

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
    <div className="relative flex items-center justify-center gap-3">
      {/* 선택 하이라이트 밴드 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-12 -translate-y-1/2 rounded-card bg-panel"
      />

      <Column values={HOURS} selected={hour} onSelect={setHour} label="시" />
      <span className="relative z-10 text-2xl font-bold text-panel-text">:</span>
      <Column values={MINUTES} selected={minute} onSelect={setMinute} label="분" />
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

  // 선택 값을 가운데 밴드로 맞춘다.
  // 첫 렌더는 즉시(auto) 맞춰야 한다. smooth 로 두면 애니메이션이 시작되기 전 화면이
  // 맨 위(00)로 보인다.
  useLayoutEffect(() => {
    const index = values.indexOf(selected);
    if (index < 0 || !ref.current) return;

    ref.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: mounted.current ? 'smooth' : 'auto',
    });
    mounted.current = true;
  }, [selected, values]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      className="relative z-10 h-36 w-24 snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ paddingBlock: ITEM_HEIGHT }}
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
              'flex w-full snap-center items-center justify-center text-2xl transition',
              isSelected ? 'font-bold text-accent' : 'text-fg-muted',
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
