import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reports } from '@/api/endpoints';
import { queryKeys } from '@/app/queryClient';
import { Icon, type IconName } from '@/components/Icon';
import { addMonths, buildMonthGrid, promotionDates, todayISO } from '@/lib/calendar';
import { clsx } from '@/lib/clsx';
import { markersOf, useCheckInScheduleStore } from '@/stores/checkInScheduleStore';
import { useServiceProfileStore } from '@/stores/serviceProfileStore';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * 월간 캘린더 (Figma 15:8832).
 *
 * 날짜 칸 위에 마커를 찍고, 칸을 누르면 그 날의 피부점호 설정으로 간다.
 * 아래 시트는 마커 범례이며 시안에서 늘 펼쳐진 상태다.
 */
export function CalendarPage() {
  const navigate = useNavigate();
  const today = todayISO();

  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y!, month: m! };
  });

  const byDate = useCheckInScheduleStore((s) => s.byDate);
  const enlistedOn = useServiceProfileStore((s) => s.enlistedOn);
  const dischargeOn = useServiceProfileStore((s) => s.dischargeOn);
  const defaultTime = useServiceProfileStore((s) => s.checkInTime);

  // 기록 횟수는 서버가 세어 주는 값이 없다. 목록을 넉넉히 받아 화면에서 센다.
  // TODO(백엔드): `GET /skin-reports/summary?month=` 같은 집계가 생기면 교체한다.
  const listQuery = useQuery({
    queryKey: [...queryKeys.reports, 'calendar'],
    queryFn: () => reports.list({ limit: 100 }),
  });

  const cells = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);

  const monthPrefix = `${cursor.year}-${String(cursor.month).padStart(2, '0')}`;
  const recordCount = (listQuery.data?.data ?? []).filter((r) =>
    r.reportDate.startsWith(monthPrefix),
  ).length;

  const promotions = useMemo(() => {
    const map = new Map<string, string>();
    for (const { iso, rank } of promotionDates(enlistedOn)) map.set(iso, rank);
    return map;
  }, [enlistedOn]);

  const move = (delta: number) => setCursor((c) => addMonths(c.year, c.month, delta));

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col bg-base">
      <header className="flex items-center gap-3 px-4 pt-2">
        <div className="size-[54px] shrink-0 rounded-full bg-panel-sheet" aria-hidden="true" />
        <div className="flex-1">
          {/* PLACEHOLDER: 이름은 복무 정보 저장 API 가 생기면 세션에서 읽는다. */}
          <p className="text-xs text-fg-muted">오늘도 관리해요</p>
          <p className="text-body-strong font-semibold text-fg">김멋사</p>
        </div>
        {/* 시안에 닫기 수단이 없다. 홈에서만 들어오는 화면이라 홈으로 되돌린다
            (`navigate(-1)` 은 링크로 바로 열었을 때 아무 일도 안 한다). */}
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="닫기"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-card-raised text-xl leading-none text-fg"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <MonthHeading
        year={cursor.year}
        month={cursor.month}
        recordCount={recordCount}
        loading={listQuery.isPending}
        onMove={move}
      />

      <div className="grid grid-cols-7 px-5 pt-3">
        {WEEKDAYS.map((label) => (
          <span key={label} className="text-center text-base font-medium text-fg-ghost">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 px-4 pt-1">
        {cells.map((cell) => (
          <DayCell
            key={cell.iso}
            day={cell.day}
            inMonth={cell.inMonth}
            isToday={cell.iso === today}
            markers={markersOf(byDate[cell.iso])}
            promotionRank={promotions.get(cell.iso)}
            isDischarge={cell.iso === dischargeOn}
            onClick={() => navigate(`/calendar/${cell.iso}`)}
          />
        ))}
      </div>

      <Legend defaultTime={defaultTime} />
    </div>
  );
}

// --- 상단 월 표시 --------------------------------------------------------------

function MonthHeading({
  year,
  month,
  recordCount,
  loading,
  onMove,
}: {
  year: number;
  month: number;
  recordCount: number;
  loading: boolean;
  onMove: (delta: number) => void;
}) {
  return (
    <div className="flex items-start px-3 pt-3">
      <p className="text-[96px] font-bold leading-none tracking-tight text-fg">
        {String(month).padStart(2, '0')}
      </p>

      <div className="ml-3 mt-5 flex-1">
        {/*
         * 시안에는 달 이동 수단이 없다. 달력이 그 달에 갇히면 못 쓰므로
         * `August` 오른쪽의 빈 영역에 화살표를 넣었다.
         */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xl font-bold leading-none text-fg">{MONTH_NAMES[month - 1]}</p>
          <div className="flex items-center">
            <MonthArrow direction={-1} onMove={onMove} />
            <MonthArrow direction={1} onMove={onMove} />
          </div>
        </div>

        <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-fg-muted">
          {`${month}월 기록\n총 기록 ${loading ? '—' : recordCount}회`}
        </p>
        <p className="sr-only">{year}년</p>
      </div>
    </div>
  );
}

function MonthArrow({ direction, onMove }: { direction: -1 | 1; onMove: (delta: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onMove(direction)}
      aria-label={direction < 0 ? '이전 달' : '다음 달'}
      className="grid size-8 place-items-center rounded-full text-xl leading-none text-fg-faint"
    >
      <span aria-hidden="true">{direction < 0 ? '‹' : '›'}</span>
    </button>
  );
}

// --- 날짜 칸 ------------------------------------------------------------------

function DayCell({
  day,
  inMonth,
  isToday,
  markers,
  promotionRank,
  isDischarge,
  onClick,
}: {
  day: number;
  inMonth: boolean;
  isToday: boolean;
  markers: { time: 'DEFAULT' | 'CUSTOM' | null; env: boolean };
  promotionRank: string | undefined;
  isDischarge: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!inMonth}
      className="flex h-[49px] flex-col items-center justify-end disabled:pointer-events-none"
    >
      {/* 마커 줄. 날짜가 위아래로 흔들리지 않도록 비어 있어도 자리를 지킨다. */}
      <span className="flex h-[18px] items-center justify-center gap-1">
        {promotionRank && <Icon name="medal" className="h-4 w-auto text-marker-medal" />}
        {isDischarge && <Icon name="flag" className="h-4 w-auto text-marker-flag" />}
        {markers.time === 'DEFAULT' && <Dot className="bg-marker-base" />}
        {markers.time === 'CUSTOM' && <Dot className="bg-marker-custom" />}
        {markers.env && <Dot className="bg-marker-env" />}
      </span>

      <span
        className={clsx(
          'flex h-[26px] w-[26px] items-center justify-center rounded-full text-base',
          !inMonth && 'text-fg-ghost',
          inMonth && !isToday && 'text-fg',
          isToday && 'bg-fg font-semibold text-white',
        )}
      >
        {day}
      </span>

      <span className="sr-only">
        {promotionRank && `${promotionRank} 진급일 `}
        {isDischarge && '전역 예정일 '}
        {markers.time === 'DEFAULT' && '기본 시각 점호 '}
        {markers.time === 'CUSTOM' && '시각 변경 '}
        {markers.env && '예상 환경 있음'}
      </span>
    </button>
  );
}

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={clsx('size-[13px] rounded-full', className)} />;
}

// --- 범례 시트 ----------------------------------------------------------------

/**
 * 마커 범례.
 *
 * 시안은 가운데 열에 `17:30` / `19:30` / `야외활동` 같은 값을 적어 두었는데,
 * 실제로는 날짜마다 다른 값이라 하나로 못 적는다. 기본 시각만 실제 값을 쓰고
 * 나머지는 마커의 뜻을 적었다.
 */
function Legend({ defaultTime }: { defaultTime: string }) {
  const rows: { icon?: IconName; dot?: string; name: string; description: string }[] = [
    { dot: 'bg-marker-base', name: defaultTime, description: '기본 설정 시간' },
    { dot: 'bg-marker-custom', name: '다른 시간', description: '이 날만 변경함' },
    { dot: 'bg-marker-env', name: '예상 환경', description: '환경을 선택한 날' },
    { icon: 'medal', name: '', description: '진급일' },
    { icon: 'flag', name: '', description: '전역 예정일' },
  ];

  return (
    <section
      aria-label="마커 범례"
      className="safe-bottom mt-auto min-h-[291px] rounded-t-[28px] bg-panel-sheet px-10 pb-8 pt-[13px]"
    >
      <div aria-hidden="true" className="mx-auto h-[3px] w-[53px] rounded-full bg-fg" />

      {/* 행 간격 38px 은 시안 값이다. 마커 크기가 제각각이라 행 높이를 고정한다. */}
      <ul className="mt-[40px] flex flex-col">
        {rows.map((row) => (
          <li key={row.description} className="flex h-[38px] items-center">
            <span className="flex w-[35px] shrink-0 items-center">
              {row.dot && <span className={clsx('size-[19px] rounded-full', row.dot)} />}
              {row.icon === 'medal' && (
                <Icon name="medal" className="h-6 w-auto text-marker-medal" />
              )}
              {row.icon === 'flag' && <Icon name="flag" className="h-7 w-auto text-marker-flag" />}
            </span>
            <span className="w-[89px] shrink-0 text-body-strong font-semibold text-fg">
              {row.name}
            </span>
            <span className="text-xs text-fg-muted">{row.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
