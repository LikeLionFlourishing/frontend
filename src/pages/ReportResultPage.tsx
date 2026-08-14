import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { newIdempotencyKey } from '@/api/client';
import { reports } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { AiLoading } from '@/components/AiLoading';
import { MedicalDisclaimer } from '@/components/ResultSection';
import { PrimaryButton, StepLayout } from '@/components/StepLayout';
import { labelOf, labelsOf, useReportOptions } from '@/hooks/useReportOptions';
import { track } from '@/lib/analytics';
import { formatDotDate } from '@/lib/date';
import { clsx } from '@/lib/clsx';
import { SUMMARY_SPARKLES } from '@/components/summarySparkles';
import type { SkinReportDetail, SkinReportOptions } from '@/api/schemas';

type CardKey = 'SUMMARY' | 'DO_TODAY' | 'AVOID_TODAY' | 'CHECK_NEXT' | 'SIMILAR';

interface CardMeta {
  key: CardKey;
  title: string;
  /** 카드 배경. 덱 순서대로 그린 → 남색으로 넘어간다. */
  surface: string;
  /** 어두운 배경이라 제목·설명을 흰색으로 뒤집어야 하는지 */
  onDark?: boolean;
  /** `public/illustrations/{art}.png`. 없는 카드도 있다. */
  art?: 'summary' | 'do' | 'avoid' | 'similar';
  /**
   * 카드 가운데에 번지는 빛 색. 시안의 카드는 단색이 아니라
   * 배경색 위에 다른 색조의 블롭이 하나 얹혀 있다(요약 카드만 단색).
   */
  glow?: string;
}

const CARDS: CardMeta[] = [
  { key: 'SUMMARY', title: '현재 기록 요약', surface: 'bg-guide-summary', art: 'summary' },
  { key: 'DO_TODAY', title: '오늘 할 일', surface: 'bg-guide-do', art: 'do', glow: '#8CE3B0' },
  {
    key: 'AVOID_TODAY',
    title: '오늘 피할 일',
    surface: 'bg-guide-avoid',
    art: 'avoid',
    glow: '#A8A7E2',
  },
  // 시안에서 이 카드만 일러스트가 비어 있다.
  {
    key: 'CHECK_NEXT',
    title: '다음에 확인 할 변화',
    surface: 'bg-guide-next',
    onDark: true,
    glow: '#72D5CA',
  },
  {
    key: 'SIMILAR',
    title: '유사 기록 보기',
    surface: 'bg-guide-similar',
    art: 'similar',
    glow: '#7F928B',
  },
];

/** 카드 가운데 블롭. 배경색 위에 얹히고 글자 아래에 깔린다. */
function CardGlow({ color }: { color: string | undefined }) {
  if (!color) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
      style={{ background: color }}
    />
  );
}

/**
 * 3-4. 오늘의 관리 가이드.
 *
 * 시안(결과 6종)은 겹쳐 쌓인 카드 덱 하나와 각 카드를 펼친 화면 5개다.
 * 화면을 나누지 않고 한 페이지에서 덱 ↔ 펼침을 오간다.
 */
export function ReportResultPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [opened, setOpened] = useState<CardKey | null>(null);

  const optionsQuery = useReportOptions();
  const reportQuery = useQuery({
    queryKey: queryKeys.report(reportId!),
    queryFn: () => reports.get(reportId!),
    enabled: Boolean(reportId),
  });

  // 결과를 실제로 본 시점에 한 번만 남긴다(보고 저장 성공과 열람은 다른 사건이다).
  const resultType = reportQuery.data?.resultType;
  useEffect(() => {
    if (resultType) track('CARE_RESULT_VIEWED', { resultType });
  }, [resultType]);

  const retry = useMutation({
    mutationFn: () => reports.retryCareGuide(reportId!, newIdempotencyKey()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId!) }),
  });

  if (reportQuery.isError || optionsQuery.isError) {
    return (
      <StepLayout title="기록을 찾을 수 없어요" onBack={() => navigate('/')}>
        <p className="text-sm text-fg-muted">
          {toUserMessage(reportQuery.error ?? optionsQuery.error)}
        </p>
      </StepLayout>
    );
  }

  if (reportQuery.isPending) {
    return <AiLoading title="불러오는 중" subtitle="잠시만 기다려 주세요." />;
  }

  if (optionsQuery.isPending) {
    return <AiLoading title="불러오는 중" subtitle="잠시만 기다려 주세요." />;
  }

  const report = reportQuery.data;
  const care = report.careResult;
  const isClinician = report.resultType === 'CLINICIAN_CHECK';

  const captionOf = (key: CardKey): string => {
    switch (key) {
      case 'SUMMARY':
        return '오늘의 피부 상태를 한눈에 확인해요';
      case 'DO_TODAY':
      case 'AVOID_TODAY':
        return '오늘의 피부 상태에 맞춰 관리해요';
      case 'CHECK_NEXT':
        return '피부 상태가 어떻게 변했는지 확인해보세요.';
      case 'SIMILAR':
        return `${care.similarExperience ? 1 : 0}건의 결과가 있어요`;
    }
  };

  // 의료진 확인 결과는 계약상 doToday/avoidToday/checkNext 가 비어 있다.
  // 덱을 그대로 쓰면 빈 카드만 남으므로 안내를 먼저 세운다. (F-04)
  const deck = isClinician
    ? CARDS.filter((c) => c.key === 'SUMMARY' || c.key === 'SIMILAR')
    : CARDS;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col bg-base">
      <header className="safe-top px-4 pb-4 pt-5">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => (opened ? setOpened(null) : navigate('/', { replace: true }))}
            className="-ml-1 shrink-0 text-2xl leading-none text-fg"
            aria-label={opened ? '카드 닫기' : '홈으로'}
          >
            ‹
          </button>
          <h1 className="text-[28px] font-bold leading-snug text-fg">오늘의 관리 가이드</h1>
        </div>
        <p className="mt-2 text-xs text-fg-muted">
          현재 상태와 비슷한 이전 기록을 바탕으로 추천드려요.
        </p>
      </header>

      <main className="flex-1 px-4 pb-6">
        {isClinician && !opened && (
          <div className="mb-4 rounded-card bg-caution/20 px-5 py-4">
            <p className="text-sm font-semibold text-fg">오늘은 셀프케어보다 확인이 먼저예요.</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{care.clinicianMessage}</p>
          </div>
        )}

        {opened ? (
          <OpenCard
            meta={deck.find((c) => c.key === opened)!}
            caption={captionOf(opened)}
            report={report}
            options={optionsQuery.data}
          />
        ) : (
          <Deck
            deck={deck}
            captionOf={captionOf}
            onOpen={(key) => {
              if (key === 'SIMILAR') track('SIMILAR_EXPERIENCE_VIEWED');
              setOpened(key);
            }}
          />
        )}

        {/* AI 설명 생성에 실패하면 규칙의 기본 문구가 내려온다. 재생성은 딱 한 번만 허용된다. */}
        {!opened && care.aiGenerationStatus === 'FALLBACK' && !care.retryUsed && (
          <div className="mt-4 rounded-card bg-card-raised px-5 py-4">
            <p className="text-sm text-fg-muted">
              안내 문구를 다시 만들 수 있어요. 관리 내용 자체는 바뀌지 않습니다.
            </p>
            <button
              type="button"
              onClick={() => retry.mutate()}
              disabled={retry.isPending}
              className="mt-3 rounded-pill bg-accent px-5 py-2 text-sm font-semibold text-panel-text disabled:opacity-50"
            >
              {retry.isPending ? '다시 만드는 중…' : '다시 만들기'}
            </button>
            {retry.isError && (
              <p className="mt-2 text-sm text-caution-500">{toUserMessage(retry.error)}</p>
            )}
          </div>
        )}

        {!opened && <MedicalDisclaimer />}
      </main>

      {!opened && (
        <footer className="safe-bottom sticky bottom-0 bg-base px-4 pb-4 pt-3">
          <PrimaryButton onClick={() => navigate('/', { replace: true })}>
            내일 상태 다시 확인하기
          </PrimaryButton>
        </footer>
      )}
    </div>
  );
}

// --- 접힌 덱 ------------------------------------------------------------------

/**
 * 시안 기준 카드 높이 257, 다음 카드까지 간격 158 → 99px 씩 겹친다.
 * 뒤 카드가 위로 올라와야 해서 z-index 를 순서대로 준다.
 */
const CARD_HEIGHT = 257;
const CARD_PITCH = 158;

function Deck({
  deck,
  captionOf,
  onOpen,
}: {
  deck: CardMeta[];
  captionOf: (key: CardKey) => string;
  onOpen: (key: CardKey) => void;
}) {
  return (
    <div className="relative" style={{ height: CARD_PITCH * (deck.length - 1) + CARD_HEIGHT }}>
      {deck.map((card, index) => (
        <button
          key={card.key}
          type="button"
          onClick={() => onOpen(card.key)}
          style={{ top: index * CARD_PITCH, height: CARD_HEIGHT, zIndex: index }}
          className={clsx(
            // 버튼은 내용을 세로 가운데로 두는 게 기본이라 명시적으로 위로 붙인다.
            'absolute inset-x-0 flex flex-col items-start justify-start overflow-hidden rounded-card pl-7 pr-6 pt-[25px] text-left',
            card.surface,
            card.onDark ? 'text-white' : 'text-fg',
          )}
        >
          <CardGlow color={card.glow} />
          {/* 시안 기준 제목 16 / 설명 11 */}
          <span className="relative block text-body-strong font-semibold">{card.title}</span>
          <span
            className={clsx(
              'relative mt-1 block text-[11px]',
              card.onDark ? 'text-white/80' : 'opacity-70',
            )}
          >
            {captionOf(card.key)}
          </span>
        </button>
      ))}
    </div>
  );
}

// --- 펼친 카드 ----------------------------------------------------------------

function OpenCard({
  meta,
  caption,
  report,
  options,
}: {
  meta: CardMeta;
  caption: string;
  report: SkinReportDetail;
  options: SkinReportOptions;
}) {
  return (
    <section className="overflow-hidden rounded-card">
      <div
        className={clsx(
          'relative overflow-hidden px-6 pb-8 pt-6',
          meta.surface,
          meta.onDark ? 'text-white' : 'text-fg',
        )}
      >
        <CardGlow color={meta.glow} />

        {/* 요약 카드에만 있는 반짝임. 일러스트 위에 겹쳐 놓는다. */}
        {meta.key === 'SUMMARY' &&
          SUMMARY_SPARKLES.map((s, i) => (
            <svg
              key={i}
              viewBox={s.viewBox}
              aria-hidden="true"
              fill="currentColor"
              className={clsx('absolute', s.blue ? 'text-info' : 'text-fg')}
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.width}%` }}
            >
              {s.paths.map((d, j) => (
                <path key={j} d={d} />
              ))}
            </svg>
          ))}

        <h2 className="text-[28px] font-bold leading-tight">{meta.title}</h2>
        <p className={clsx('mt-1 text-xs', meta.onDark ? 'text-white/80' : 'opacity-70')}>
          {caption}
        </p>

        {/*
          일러스트 원본은 흰 배경이 포함된 PNG 다. multiply 로 얹으면 흰색이 사라지고
          카드 색이 그대로 배어 나온다 — 시안에서 일러스트가 카드 색으로 물들어 보이는 것과 같다.
        */}
        {meta.art ? (
          <img
            src={`/illustrations/${meta.art}.png`}
            alt=""
            aria-hidden="true"
            className="relative mx-auto mt-4 h-56 w-auto object-contain mix-blend-multiply"
          />
        ) : (
          <div className="h-56" aria-hidden="true" />
        )}
      </div>

      <div className="bg-card-raised px-6 py-6">
        <CardBody card={meta.key} report={report} options={options} />
      </div>
    </section>
  );
}

function CardBody({
  card,
  report,
  options,
}: {
  card: CardKey;
  report: SkinReportDetail;
  options: SkinReportOptions;
}) {
  const care = report.careResult;

  if (card === 'SUMMARY') {
    const c = report.confirmed;
    const rows = [
      { label: '부위', value: labelOf(options.areas, c.primaryArea) },
      { label: '겉모습', value: labelsOf(options.appearances, c.appearances) },
      { label: '불편', value: labelsOf(options.sensations, c.sensations) },
      { label: '상황', value: labelsOf(options.situations, c.situations) },
      { label: '관리 상태', value: labelOf(options.careAvailability, c.careAvailability) },
    ];
    return (
      <dl className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-6">
            <dt className="w-16 shrink-0 text-sm font-semibold text-fg">{row.label}</dt>
            <dd className="text-sm text-fg-muted">{row.value || '—'}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (card === 'SIMILAR') {
    const similar = care.similarExperience;
    if (!similar) return <Empty>비슷한 이전 기록이 아직 없어요.</Empty>;
    return (
      <ul className="flex flex-col gap-5">
        <li>
          <p className="text-body-strong font-semibold text-fg">
            {formatDotDate(similar.reportDate)}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">{similar.displayText}</p>
        </li>
      </ul>
    );
  }

  const items =
    card === 'DO_TODAY' ? care.doToday : card === 'AVOID_TODAY' ? care.avoidToday : care.checkNext;

  if (items.length === 0) return <Empty>오늘은 안내할 항목이 없어요.</Empty>;

  /*
   * 시안은 항목마다 굵은 제목 + 설명 두 줄이지만 계약은 문자열 배열이다.
   * 서버가 주는 문장을 그대로 한 줄로 세운다. (아래 TODO 참고)
   */
  return (
    <ul className="flex flex-col gap-5">
      {items.map((item, i) => (
        <li key={i} className="text-body-strong font-semibold leading-relaxed text-fg">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-fg-muted">{children}</p>;
}
