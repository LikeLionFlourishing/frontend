import { useEffect, useMemo, useState } from 'react';

interface Props {
  title: string;
  subtitle: string;
  /** 3~10초가 걸리므로 정적 스피너만 두면 체감 시간이 길어진다. 단계 문구를 순차 노출한다. */
  stages?: string[];
}

const STAGE_INTERVAL_MS = 2500;

/**
 * 마크가 채워지는 상한(%).
 * 시안 마지막 프레임(로딩5)에도 맨 윗줄 몇 칸은 꺼져 있다.
 * 다 채우고 멈춰 있으면 오히려 멈춘 것처럼 보인다.
 */
const PROGRESS_CEILING = 98;

/** 진행 시간상수(초). 값이 클수록 천천히 차오른다. */
const PROGRESS_TAU = 5;

const PROGRESS_TICK_MS = 100;

export function AiLoading({ title, subtitle, stages }: Props) {
  /*
   * 호출부가 배열 리터럴을 넘기므로 렌더마다 참조가 바뀐다.
   * 그대로 의존성에 두면 부모가 리렌더될 때마다 타이머가 리셋돼 단계가 안 넘어간다.
   * 문자열로 합쳐 내용이 같으면 같은 배열을 쓰도록 고정한다. (단계 문구에 개행은 없다)
   */
  const stageKey = stages?.join('\n') ?? '';
  const stageList = useMemo(() => (stageKey ? stageKey.split('\n') : []), [stageKey]);

  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setStageIndex(0);
    if (stageList.length <= 1) return;

    const timer = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, stageList.length - 1));
    }, STAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [stageList]);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      // 남은 거리의 일정 비율씩 좁히는 형태라 끝없이 느려질 뿐 절대 멈추지 않는다.
      setProgress(PROGRESS_CEILING * (1 - Math.exp(-elapsed / PROGRESS_TAU)));
    }, PROGRESS_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const hasStages = stageList.length > 0;

  return (
    <div
      role="status"
      aria-busy="true"
      className="flex min-h-dvh flex-col items-center justify-center gap-12 bg-base px-8 text-center"
    >
      <BootMark fill={progress / 100} />

      <div className="flex flex-col gap-5">
        <h1 className="whitespace-pre-line text-2xl font-bold leading-snug text-fg">{title}</h1>

        {/*
         * 시안(로딩1~5)은 고정 문구 한 줄이다. 진행은 마크가 차오르는 것으로 보여준다.
         * 단계 문구는 그 아래 한 줄로만 덧붙인다 — 고정 문구를 갈아끼우면
         * 시안이 정한 안내가 화면에 아예 안 나온다.
         */}
        <p className="text-[11px] text-fg">{subtitle}</p>

        {hasStages && (
          // key 를 바꿔 문구가 교체될 때마다 등장 애니메이션을 다시 태운다
          <p key={stageIndex} className="animate-stage-in text-[11px] text-fg-faint">
            {stageList[stageIndex]}
          </p>
        )}
      </div>
    </div>
  );
}

/*
 * 픽셀 부츠 마크. Figma `로딩1~5` 의 `_레이어_1`(178×152) 에서 그대로 추출했다.
 * 22열 × 19행 격자에 195개 점, 점 6.06px / 간격 2.13px.
 * `#` 이 점이 있는 칸이다. 시안이 바뀌면 이 배열만 다시 뽑으면 된다.
 */
// prettier-ignore
const BOOT = [
  '..########............',
  '..########............',
  '..###.................',
  '..##.#####............',
  '..###.................',
  '..########............',
  '..######..............',
  '..########............',
  '..########............',
  '..########............',
  '...######.#...........',
  '..#..#######..........',
  '..###.#####.###.#####.',
  '..####.#######.#######',
  '.#####.######.########',
  '#.####################',
  '#.....................',
  '######################',
  '########...#####.#.#.#',
];

const ROWS = BOOT.length;
const COLS = BOOT[0]!.length;

/*
 * 켜진 점은 강조색과 같다. 꺼진 점의 회색은 이 일러스트에만 쓰여서 팔레트에 넣지 않았다.
 * (라이트 테마 개편 후에도 시안의 꺼진 점은 그대로 #5F5F5F 다)
 */
const DOT_ON = 'bg-accent';
const DOT_OFF = 'bg-[#5F5F5F]';

/**
 * 진행률에 따라 아래에서 위로 차오르는 마크.
 *
 * 별도 진행 바를 두지 않고 마크 자체가 진행 표시 역할을 한다. (시안 로딩1~5)
 */
function BootMark({ fill }: { fill: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid w-[178px] max-w-full gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
    >
      {BOOT.flatMap((line, row) =>
        [...line].map((cell, col) => {
          const key = `${row}-${col}`;
          if (cell !== '#') return <span key={key} className="aspect-square" />;

          // 바닥 줄이 가장 먼저(0 에 가깝게), 맨 윗줄이 가장 늦게(1) 켜진다.
          // 칸마다 아주 작은 편차를 줘서 경계가 자로 그은 듯 반듯하지 않게 한다.
          // (시안에서도 전환 구간의 한 줄이 드문드문 켜져 있다)
          const jitter = (((row * 31 + col * 17) % 7) - 3) / 120;
          const threshold = (ROWS - row) / ROWS + jitter;

          return (
            <span
              key={key}
              className={
                'aspect-square transition-colors duration-500 ' +
                (fill >= threshold ? DOT_ON : DOT_OFF)
              }
            />
          );
        }),
      )}
    </div>
  );
}
