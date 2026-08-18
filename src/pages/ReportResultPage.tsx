import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { newIdempotencyKey } from '@/api/client';
import { reports } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { AiLoading } from '@/components/AiLoading';
import { ClinicianModal } from '@/components/ClinicianModal';
import causeUnknownIcon from '@/assets/icon-cause-unknown.svg';
import { MedicalDisclaimer } from '@/components/ResultSection';
import { StepLayout } from '@/components/StepLayout';
import { Sentences, splitSentences } from '@/components/Sentences';
import { labelOf, labelsOf, useReportOptions } from '@/hooks/useReportOptions';
import { track } from '@/lib/analytics';
import { clsx } from '@/lib/clsx';
import { formatShortDate } from '@/lib/date';
import type { GuideSection, SkinReportDetail, SkinReportOptions } from '@/api/schemas';

type CardKey = 'SUMMARY' | 'DO_TODAY' | 'AVOID_TODAY' | 'CHECK_NEXT' | 'SIMILAR' | 'INGREDIENTS';

/** 화면 쪽 이름과 계약의 `GuideSection.key` 를 잇는다. */
const SECTION_KEY: Record<CardKey, GuideSection['key']> = {
  SUMMARY: 'CURRENT_SUMMARY',
  DO_TODAY: 'DO_TODAY',
  AVOID_TODAY: 'AVOID_TODAY',
  CHECK_NEXT: 'CHECK_NEXT',
  SIMILAR: 'SIMILAR_EXPERIENCE',
  INGREDIENTS: 'RECOMMENDED_INGREDIENTS',
};

/**
 * 카드의 **생김새**만 담는다.
 *
 * 제목·설명은 v2 부터 서버가 `careResult.guideSections` 로 준다.
 * 여기에 하드코딩해 두면 규칙표가 바뀔 때 화면만 옛 문구로 남는다.
 */
interface CardMeta {
  key: CardKey;
  /** 카드 좌상단의 `00 CURRENT LOG` 표기 */
  index: string;
  eyebrow: string;
  /** 머리말 색. 시안에서 카드마다 다르다. */
  eyebrowHex: string;
  /** 카드 배경 클래스. 덱 순서대로 그린 → 남색으로 넘어간다. */
  surface: string;
  /** 같은 색의 hex. 그라데이션 바깥쪽 색으로 쓴다. */
  surfaceHex: string;
  /**
   * 카드 가운데에 번지는 빛 색. 시안의 카드는 단색이 아니라
   * 배경색 위에 다른 색조의 블롭이 하나 얹혀 있다.
   */
  glow?: string;
}

const CARDS: CardMeta[] = [
  {
    key: 'SUMMARY',
    eyebrowHex: '#4AA76C',
    index: '00',
    eyebrow: 'CURRENT LOG',
    surface: 'bg-guide-summary',
    surfaceHex: '#8CFFB6',
    glow: '#A1FF8D',
  },
  {
    key: 'DO_TODAY',
    eyebrowHex: '#4AA76C',
    index: '01',
    eyebrow: 'TODAY',
    surface: 'bg-guide-do',
    surfaceHex: '#B7E8C2',
    glow: '#8CFEB6',
  },
  {
    key: 'AVOID_TODAY',
    eyebrowHex: '#004953',
    index: '02',
    eyebrow: 'AVOID',
    surface: 'bg-guide-avoid',
    surfaceHex: '#90C3C9',
    glow: '#9AAED9',
  },
  {
    key: 'CHECK_NEXT',
    eyebrowHex: '#142C6A',
    index: '03',
    eyebrow: 'WATCH',
    surface: 'bg-guide-next',
    surfaceHex: '#3770FF',
    glow: '#6A96FF',
  },
  {
    /*
     * 2026-08-16 결정으로 `이전 유사 경험`(F-06, P0)이 돌아왔다.
     * 추천 성분과 둘 중 하나가 아니라 **둘 다** 둔다.
     */
    key: 'SIMILAR',
    eyebrowHex: '#142C6A',
    index: '04',
    eyebrow: 'SIMILAR',
    surface: 'bg-guide-similar',
    surfaceHex: '#9DF2E4',
    glow: '#709CFC',
  },
  {
    key: 'INGREDIENTS',
    eyebrowHex: '#2231D0',
    index: '05',
    eyebrow: 'INGREDIENT GUIDE',
    surface: 'bg-guide-ingredient',
    surfaceHex: '#A6C5FF',
    glow: '#D5E4FF',
  },
];

/**
 * 원인 미파악 안내 (시안 32:53392).
 *
 * 결과 화면과 같은 덱 위에 배너 하나가 더 붙은 형태다.
 * **AI 문구 생성이 풀백된 경우**(`aiGenerationStatus === 'FALLBACK'`)에 뜬다.
 * 이때는 성분 안내(05)도 함께 감춘다 — 시안에 카드가 다섯 장뿐이다.
 */
function CauseUnknownBanner() {
  return (
    // 시안 32:53408 — 369×100, 모서리 14, 바탕 #FCFFA3
    <div className="mb-[26px] rounded-[14px] bg-[#FCFFA3] px-[21px] pb-[25px] pt-[25px]">
      <p className="flex items-center gap-[10px] text-body-strong text-fg">
        <img src={causeUnknownIcon} alt="" className="size-[24px] shrink-0" />
        원인을 특정하기 어려워요
      </p>
      <p className="mt-[10px] text-xs leading-[14px] text-fg">
        현재 기록만으로는 피부 상태의 원인을 파악하기 어려워요
      </p>
    </div>
  );
}

/**
 * 카드에 번지는 빛.
 *
 * 시안의 카드는 단색이 아니라 가운데가 밝은 방사형 그라데이션이다.
 * 흐린 원을 얹는 방식은 가장자리가 도넛처럼 남아서, 렌더에서 뽑은 중심색·바깥색으로
 * `radial-gradient` 를 직접 그린다. 글자 아래에 깔린다.
 */
function CardGlow({ color, surface }: { color: string | undefined; surface: string }) {
  if (!color) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse 80% 65% at 50% 60%, ${color} 0%, ${surface} 72%)`,
      }}
    />
  );
}

/**
 * 3-4. 오늘의 관리 가이드 (확정 시안 25:30820 · 25:30990 · 25:31161 · 25:31332 · 25:31503).
 *
 * 카드 다섯 장이 겹쳐 쌓여 있고, 누른 카드만 그 자리에서 펼쳐진다.
 * 펼쳐도 덱을 떠나지 않는다 — 위아래 카드가 접힌 띠로 계속 보인다.
 */
export function ReportResultPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [opened, setOpened] = useState<CardKey | null>(null);
  /** 의료진 확인 안내는 화면에 들어오자마자 한 번 뜨고, 닫으면 다시 뜨지 않는다. */
  const [showClinician, setShowClinician] = useState(true);

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
          <Sentences text={toUserMessage(reportQuery.error ?? optionsQuery.error)} />
        </p>
      </StepLayout>
    );
  }

  if (reportQuery.isPending || optionsQuery.isPending) {
    return <AiLoading title="불러오는 중" subtitle="잠시만 기다려 주세요." />;
  }

  const report = reportQuery.data;
  const care = report.careResult;
  const isClinician = report.resultType === 'CLINICIAN_CHECK';

  /*
   * AI 문구가 풀백으로 내려온 경우. 시안 `원인 미파악`(32:53392)이 이 상태다.
   * 규칙의 기본 문구만 있어서 원인을 짚어 주지 못하고, 성분 안내도 감춘다.
   */
  const isFallback = care.aiGenerationStatus === 'FALLBACK';

  // 의료진 확인 결과는 계약상 doToday/avoidToday/checkNext 가 비어 있다.
  // 덱을 그대로 쓰면 빈 카드만 남으므로 안내를 먼저 세운다. (F-04)
  const baseDeck = isClinician
    ? CARDS.filter((c) => c.key === 'SUMMARY' || c.key === 'INGREDIENTS')
    : CARDS;
  const deck = isFallback ? baseDeck.filter((c) => c.key !== 'INGREDIENTS') : baseDeck;

  return (
    <div className="flex flex-col">
      <header className="px-4 pb-2 pt-[calc(var(--safe-top)+20px)]">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => (opened ? setOpened(null) : navigate('/', { replace: true }))}
            className="-ml-1 shrink-0 text-2xl leading-none text-fg"
            aria-label={opened ? '카드 닫기' : '홈으로'}
          >
            ‹
          </button>
          <h1 className="text-[30px] font-bold leading-9 text-fg-muted">오늘의 관리 가이드</h1>
        </div>
        <p className="mt-2 text-xs text-fg-muted">
          현재 상태와 비슷한 이전 기록을 바탕으로 추천드려요.
        </p>
      </header>

      <main className="pl-[14px] pr-[17px]">
        {isFallback && <CauseUnknownBanner />}

        <Deck
          deck={deck}
          opened={opened}
          onToggle={(key) => {
            if (key !== opened && key === 'INGREDIENTS') track('SIMILAR_EXPERIENCE_VIEWED');
            setOpened(key === opened ? null : key);
          }}
          report={report}
          options={optionsQuery.data}
        />

        {/* AI 설명 생성에 실패하면 규칙의 기본 문구가 내려온다. 재생성은 딱 한 번만 허용된다. */}
        {isFallback && !care.retryUsed && (
          <div className="mt-4 rounded-card bg-card-raised px-5 py-4">
            <p className="text-sm text-fg-muted">
              <Sentences text="안내 문구를 다시 만들 수 있어요. 관리 내용 자체는 바뀌지 않습니다." />
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
              <p className="mt-2 text-sm text-caution-500">
                <Sentences text={toUserMessage(retry.error)} />
              </p>
            )}
          </div>
        )}

        <MedicalDisclaimer />
      </main>

      {/* 시안(25:28667)은 결과 위에 모달로 먼저 띄운다. 배너로 두면 스크롤 밖에서 안 읽힌다 */}
      {isClinician && showClinician && (
        <ClinicianModal
          // 계약상 nullable 이다. 비어 오면 시안에 적힌 문구를 그대로 쓴다.
          message={care.clinicianMessage ?? CLINICIAN_FALLBACK}
          onClose={() => setShowClinician(false)}
        />
      )}
    </div>
  );
}

// --- 덱 ----------------------------------------------------------------------

/** 접힌 카드끼리 겹치는 양(px). 시안에서 다음 카드가 앞 카드 아래쪽을 덮는다. */
/** 시안(25:28667)에 적힌 안내. 서버가 `clinicianMessage` 를 비워 보낼 때 쓴다. */
const CLINICIAN_FALLBACK =
  '피부를 임의로 짜거나 새로운 제품을 추가하지 말고 가능한 시점에 의무실 또는 의료진에게 확인해 주세요.';

/**
 * 앞 카드를 덮는 깊이.
 *
 * 시안 실측(30:39213)에서 접힌 카드 사이 간격이 120 이다. 카드 안쪽 여백을
 * 시안대로 두면 자연 높이가 144 가 나오므로 23 을 당겨 121 을 만든다.
 * 겹치는 20 이 뒤 카드의 둥근 윗모서리를 채워 모서리 틈을 없앤다.
 */
const OVERLAP = 23;

function Deck({
  deck,
  opened,
  onToggle,
  report,
  options,
}: {
  deck: CardMeta[];
  opened: CardKey | null;
  onToggle: (key: CardKey) => void;
  report: SkinReportDetail;
  options: SkinReportOptions;
}) {
  return (
    <div className="flex flex-col">
      {deck.map((card, index) => {
        const isOpen = card.key === opened;
        const section = report.careResult.guideSections.find(
          (g) => g.key === SECTION_KEY[card.key],
        );
        const title = section?.title ?? '';
        /*
         * `유사 기록` 은 계약상 **한 건 또는 null** 이라 건수를 여기서 만든다.
         * 시안(31:46336)은 `3건의 결과가 있어요` 로 세 건을 그렸지만 계약이
         * 최고점 1건만 주므로 시안을 접고 1건 기준으로 쓴다. (2026-08-16 결정)
         */
        const caption =
          card.key === 'SIMILAR'
            ? report.careResult.similarExperience
              ? '가장 비슷한 기록 1건'
              : '아직 비슷한 기록이 없어요'
            : (section?.description ?? '');
        return (
          <section
            key={card.key}
            style={{ marginTop: index === 0 ? 0 : -OVERLAP, zIndex: index }}
            className={clsx(
              // 시안 31:46245 — 371×386, 모서리 25, 위로 드리우는 그림자
              'relative overflow-hidden rounded-[25px] shadow-[0_-3px_15.2px_rgba(0,0,0,0.25)]',
              card.surface,
              // 시안은 파란 카드(03)에서도 제목이 흰색이 아니라 검정(#030303)이다
              'text-fg',
            )}
          >
            <CardGlow color={card.glow} surface={card.surfaceHex} />

            <button
              type="button"
              onClick={() => onToggle(card.key)}
              aria-expanded={isOpen}
              // 시안 실측(31:46225): 안쪽 왼쪽 27 · 라벨 위 17 · 제목 +37 · 부제 +30
              className="relative flex w-full flex-col items-start px-[27px] pb-[40px] pt-[17px] text-left"
            >
              {/* 머리말 색은 카드마다 다르다(시안 31:46241 등). 흐리게 깔지 않는다 */}
              <span className="flex gap-2 text-xs" style={{ color: card.eyebrowHex }}>
                <span>{card.index}</span>
                <span>{card.eyebrow}</span>
              </span>
              {/* 시안 변수 `본문강조한글` = SemiBold 20 */}
              <span className="mt-[23px] block text-[20px] font-semibold leading-[23px]">
                {title}
              </span>
              {caption && <span className="mt-[7px] block text-xs leading-[17px]">{caption}</span>}
            </button>

            {isOpen && (
              // 시안 기준 안쪽 여백 좌 27(머리말과 같은 줄), 아래 36
              <div className="relative px-[27px] pb-[36px]">
                <CardBody card={card} report={report} options={options} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// --- 카드 내용 ----------------------------------------------------------------

function CardBody({
  card,
  report,
  options,
}: {
  card: CardMeta;
  report: SkinReportDetail;
  options: SkinReportOptions;
}) {
  const care = report.careResult;

  if (card.key === 'SUMMARY') {
    const c = report.confirmed;
    const rows = [
      { label: '부위', value: labelOf(options.areas, c.primaryArea) },
      { label: '겉모습', value: labelsOf(options.appearances, c.appearances) },
      { label: '불편', value: labelsOf(options.sensations, c.sensations) },
      { label: '상황', value: labelsOf(options.situations, c.situations) },
      { label: '관리 상태', value: labelOf(options.careAvailability, c.careAvailability) },
    ];
    return (
      /* 시안 31:46229 — 첫 줄이 카드 위에서 197, 줄 간격 31.7, 값 열은 카드 왼쪽에서 120 */
      <dl className="flex flex-col gap-[13px] pt-[54px]">
        {rows.map((row) => (
          <div key={row.label} className="flex">
            <dt className="w-[93px] shrink-0 text-body-strong leading-[19px]">{row.label}</dt>
            <dd className="text-xs leading-[19px]">{row.value || '—'}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (card.key === 'SIMILAR') {
    /*
     * 시안은 세 건을 보여주지만 계약의 `similarExperience` 는 **한 건 또는 null** 이다.
     * (명세 F-06 도 `유사도 5점 이상 1건` 이라 계약이 명세를 따랐다)
     * 목록으로 열릴 때까지 있는 만큼만 그린다. (docs/명세-대조.md 2-12)
     */
    const found = care.similarExperience ? [care.similarExperience] : [];
    if (found.length === 0) {
      /*
       * 유사도 5점(부위 +3 · 상황 +2 …) 문턱이 높아 기록이 쌓이기 전에는 자주 비어 있다.
       * 카드를 감추면 6장 덱의 칸 간격이 어긋나므로 자리는 두고 문구만 바꾼다.
       */
      return (
        <p className="pt-[53px] text-xs leading-[17px]">
          아직 비슷한 기록이 없어요. 기록이 쌓이면 여기에 보여 드릴게요.
        </p>
      );
    }
    return (
      /* 시안 31:46341 — 첫 줄이 카드 위에서 196, 항목 간격 55, 날짜 SemiBold 16 / 설명 12 */
      <ul className="flex flex-col gap-[16px] pt-[53px]">
        {found.map((it) => (
          <li key={it.reportId}>
            <p className="text-body-strong">{formatShortDate(it.reportDate)}</p>
            <p className="text-xs leading-[17px]">{it.displayText}</p>
          </li>
        ))}
      </ul>
    );
  }

  if (card.key === 'INGREDIENTS') {
    if (care.recommendedIngredients.length === 0) {
      return <p className="pt-[39px] text-xs leading-[17px]">추천할 성분이 없어요.</p>;
    }
    return (
      /*
       * v2 부터 서버가 준다. 시안에는 이름 옆에 배지(`진정 피부 장벽 케어`)가 있지만
       * 계약의 `RecommendedIngredient` 에는 그 자리에 해당하는 필드가 없다
       * (name · description · cautionNote 뿐)이라 배지는 그리지 않는다.
       */
      <NumberedList
        items={care.recommendedIngredients.map((it) => ({
          title: it.name,
          description: [it.description, it.cautionNote].filter(Boolean).join(' '),
        }))}
      />
    );
  }

  const items =
    card.key === 'DO_TODAY'
      ? care.doToday
      : card.key === 'AVOID_TODAY'
        ? care.avoidToday
        : care.checkNext;

  if (items.length === 0) {
    return <p className="pt-6 text-sm opacity-70">오늘은 안내할 항목이 없어요.</p>;
  }

  /*
   * 시안은 항목마다 굵은 제목 + 설명 한 줄이지만 계약은 문자열 배열 하나다.
   * 문장이 둘 이상이면 첫 문장을 제목으로, 나머지를 설명으로 나눈다.
   * TODO(백엔드): `{ title, description }` 으로 내려주면 이 추측이 필요 없다.
   */
  return (
    <NumberedList
      items={items.map((item) => {
        const [head = item, ...rest] = splitSentences(item);
        return { title: head, description: rest.join(' ') };
      })}
    />
  );
}

function NumberedList({
  items,
}: {
  items: { title: string; badge?: string; description?: string }[];
}) {
  return (
    /* 시안 31:46252 — 첫 항목이 카드 위에서 182, 항목 간격 64.44 */
    <ol className="flex flex-col gap-[22px] pt-[39px]">
      {items.map((item, i) => (
        // 시안 — 번호 원과 글자 사이 10
        <li key={item.title} className="flex gap-[10px]">
          <span
            aria-hidden="true"
            // 시안 31:46265 — 24px 원, 어두운 채움에 Regular 16 / #D5D5D5 숫자
            className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-fg text-body-strong font-normal text-panel"
          >
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-body-strong">
              {item.title}
              {item.badge && <span className="ml-2 text-xs font-normal">{item.badge}</span>}
            </p>
            {item.description && (
              /* 시안 31:46255 — 제목 아래 4, Regular 12 / 줄높이 16.5, 흐리게 깔지 않는다 */
              <p className="mt-1 text-xs leading-[16.5px]">{item.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
