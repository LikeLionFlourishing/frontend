import type { ReactNode } from 'react';
import { clsx } from '@/lib/clsx';

export type SectionKind = 'SUMMARY' | 'DO_TODAY' | 'AVOID_TODAY' | 'CHECK_NEXT' | 'CLINICIAN';

const SECTION_META: Record<SectionKind, { title: string; caption: string }> = {
  SUMMARY: { title: '현재 기록 요약', caption: '오늘의 피부 상태를 한눈에 확인해요' },
  DO_TODAY: { title: '오늘 할 일', caption: '오늘 피부 상태에 맞춰 관리해요' },
  AVOID_TODAY: { title: '오늘 피할 일', caption: '오늘 피부 상태에 맞춰 관리해요' },
  CHECK_NEXT: { title: '이런 변화가 생기면 확인하기', caption: '내일 다시 살펴볼 기준이에요' },
  CLINICIAN: {
    title: '의무실·의료진 확인이 먼저예요',
    caption: '오늘은 일반적인 셀프케어보다 확인이 우선입니다',
  },
};

interface Props {
  kind: SectionKind;
  items?: string[];
  text?: string;
  children?: ReactNode;
}

/**
 * 결과 화면의 단일 섹션.
 *
 * 경과 확인의 6개 분기(거의 괜찮아짐 / 나아짐 / 비슷함 / 더 불편해짐 / 다른 부위 / 잘 모르겠음)는
 * 화면 6개가 아니라 이 섹션들의 조합이다. 서버가 어떤 섹션을 어떤 순서로 보여줄지
 * 내려주면 화면 코드를 고치지 않고 분기를 바꿀 수 있다.
 */
export function ResultSection({ kind, items, text, children }: Props) {
  const meta = SECTION_META[kind];
  const hasContent = (items && items.length > 0) || text || children;
  if (!hasContent) return null;

  const isClinician = kind === 'CLINICIAN';

  return (
    <section
      className={clsx(
        'rounded-card px-5 py-5',
        isClinician ? 'bg-accent text-panel-text' : 'bg-card-raised text-fg',
      )}
    >
      <h2 className="text-body-strong font-semibold">{meta.title}</h2>
      <p className={clsx('mt-1 text-sm', isClinician ? 'text-panel-label' : 'text-fg-muted')}>
        {meta.caption}
      </p>

      {text && <p className="mt-4 text-sm leading-[18px]">{text}</p>}

      {items && items.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-[18px]">
              <span aria-hidden="true" className={isClinician ? '' : 'text-accent'}>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {children}
    </section>
  );
}

/** 결과 화면 하단 고정 문구. 진단 서비스가 아님을 매번 명시한다. */
export function MedicalDisclaimer() {
  return (
    <p className="px-2 py-3 text-center text-xs leading-4 text-fg-faint">
      이 안내는 진단이 아닙니다. 검토된 관리 규칙에 따른 일반적인 셀프케어 안내입니다.
    </p>
  );
}
