import { useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon, type IconName } from '@/components/Icon';
import { clsx } from '@/lib/clsx';
import {
  DAILY_ENVIRONMENT_OPTIONS,
  EMPTY_SCHEDULE,
  useCheckInScheduleStore,
  type AlarmMode,
  type DateSchedule,
} from '@/stores/checkInScheduleStore';
import { useServiceProfileStore } from '@/stores/serviceProfileStore';

/**
 * 날짜별 피부점호 설정 (Figma 15:8798 기본 / 15:9011 시각 변경).
 *
 * 저장은 로컬 스토어로 간다 — 날짜별 예외를 받는 API 가 아직 없다.
 * `checkInScheduleStore` 의 TODO 참고.
 */
export function DateCheckInPage() {
  const navigate = useNavigate();
  const { date = '' } = useParams();

  const defaultTime = useServiceProfileStore((s) => s.checkInTime);
  const saved = useCheckInScheduleStore((s) => s.byDate[date]);
  const save = useCheckInScheduleStore((s) => s.save);

  const [draft, setDraft] = useState<DateSchedule>(saved ?? EMPTY_SCHEDULE);

  const patch = (partial: Partial<DateSchedule>) => setDraft((d) => ({ ...d, ...partial }));

  const selectAlarm = (alarm: AlarmMode) =>
    // 다른 시각을 처음 고르면 기본 시각에서 출발한다. 빈 값으로 두면 저장이 막힌다.
    patch({ alarm, time: alarm === 'CUSTOM' ? (draft.time ?? defaultTime) : null });

  const toggleEnvironment = (value: string) =>
    patch({
      environments:
        // '특별히 없음' 은 다른 항목과 같이 고를 수 없다.
        value === 'NONE'
          ? draft.environments.includes('NONE')
            ? []
            : ['NONE']
          : draft.environments.includes(value)
            ? draft.environments.filter((v) => v !== value)
            : [...draft.environments.filter((v) => v !== 'NONE'), value],
    });

  const [, month = '', day = ''] = date.split('-');

  // 이 화면은 캘린더에서만 들어온다. `navigate(-1)` 은 링크로 바로 열었을 때
  // 아무 일도 안 하므로 목적지를 명시한다.
  const close = () => navigate('/calendar');

  const onSave = () => {
    save(date, draft);
    close();
  };

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-app flex-col bg-base px-4 pt-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[28px] font-bold leading-tight text-fg">날짜별 피부점호 설정</h1>
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-card-raised text-xl leading-none text-fg"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <p className="-ml-1 mt-1 text-[96px] font-bold leading-none tracking-tight text-info">
        {month}.{day}
      </p>

      <SectionTitle index={1} title="피부 점호 알림 시간" />

      <div
        role="radiogroup"
        aria-label="피부 점호 알림 시간"
        className="mt-2 flex flex-col gap-[7px]"
      >
        <OptionCard
          selected={draft.alarm === 'DEFAULT'}
          title="평소 시간에 알림"
          caption="기본 시간 적용"
          trailing={<span className="text-body-strong font-semibold text-info">{defaultTime}</span>}
          onSelect={() => selectAlarm('DEFAULT')}
        />

        <OptionCard
          selected={draft.alarm === 'CUSTOM'}
          title="다른 시간에 알림"
          caption="원하는 시간을 선택합니다"
          onSelect={() => selectAlarm('CUSTOM')}
        >
          <TimeField
            value={draft.time ?? defaultTime}
            onChange={(time) => patch({ time })}
            label={`${month}월 ${day}일 알림 시간`}
          />
        </OptionCard>

        <OptionCard
          selected={draft.alarm === 'OFF'}
          title="이날 알림 받지 않기"
          caption="해당 날짜에는 알림이 가지 않아요."
          onSelect={() => selectAlarm('OFF')}
        />
      </div>

      <SectionTitle index={2} title="예상 환경" hint="(복수 선택 가능)" />

      <div className="mt-2 grid grid-cols-2 gap-[7px]">
        {DAILY_ENVIRONMENT_OPTIONS.map((option) => (
          <EnvironmentTile
            key={option.value}
            icon={option.icon}
            label={option.label}
            selected={draft.environments.includes(option.value)}
            onToggle={() => toggleEnvironment(option.value)}
          />
        ))}
      </div>

      {/*
       * `sticky` 를 쓰지 않는다. 시각 변경 카드가 펼쳐지면 내용이 화면보다 길어지는데,
       * 그때 버튼이 마지막 타일 위를 덮는다. 시안대로 흐름 맨 끝에 둔다.
       */}
      <div className="safe-bottom mt-auto pb-6 pt-6">
        <button
          type="button"
          onClick={onSave}
          className="h-[79px] w-full rounded-pill bg-accent text-body-strong font-semibold text-panel-text"
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

// --- 조각 --------------------------------------------------------------------

function SectionTitle({ index, title, hint }: { index: number; title: string; hint?: string }) {
  return (
    <h2 className="mt-7 flex items-baseline gap-2 px-1 text-body-strong font-semibold text-fg">
      {index}.{title}
      {hint && <span className="text-xs font-normal text-fg-muted">{hint}</span>}
    </h2>
  );
}

function OptionCard({
  selected,
  title,
  caption,
  trailing,
  children,
  onSelect,
}: {
  selected: boolean;
  title: string;
  caption: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <div className="rounded-3xl bg-panel-soft px-4 py-[18px] shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="flex w-full items-center gap-3 text-left"
      >
        <span
          aria-hidden="true"
          className={clsx(
            'grid size-[17px] shrink-0 place-items-center rounded-full border-[1.5px] border-fg',
            selected && 'bg-fg',
          )}
        />
        <span className="flex-1">
          <span className="block text-body-strong font-semibold text-fg">{title}</span>
          <span className="mt-1 block text-xs text-fg-muted">{caption}</span>
        </span>
        {trailing}
      </button>

      {/* 선택했을 때만 펼쳐지는 보조 입력 (시안 15:9011) */}
      {selected && children && <div className="ml-[29px] mt-3">{children}</div>}
    </div>
  );
}

function TimeField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="time"
        step={600}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg bg-card-raised px-4 text-body-strong font-semibold text-fg outline-none focus-visible:ring-2 focus-visible:ring-info"
      />
    </>
  );
}

function EnvironmentTile({
  icon,
  label,
  selected,
  onToggle,
}: {
  icon: IconName;
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={clsx(
        'flex h-[92px] items-center gap-[7px] rounded-[18px] pl-[18px] pr-2 text-left transition',
        selected ? 'bg-info text-white' : 'bg-panel-soft text-fg',
      )}
    >
      <Icon name={icon} className="h-6 w-auto shrink-0" />
      {/* 11px 은 시안 값이다. 12px 이면 `보호장비 장시간 착용` 이 두 줄로 접힌다. */}
      <span className="text-[11px] leading-snug">{label}</span>
    </button>
  );
}
