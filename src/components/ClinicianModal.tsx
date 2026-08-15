import { useEffect, useRef } from 'react';
import { Sentences } from '@/components/Sentences';

/**
 * 의료진 확인 안내 (확정 시안 25:28667).
 *
 * 결과가 `CLINICIAN_CHECK` 일 때 결과 화면 위에 먼저 뜬다.
 * 시안은 뒤를 흐리게 깔고 파란 카드를 띄우는 모달이다 — 결과 카드 덱은
 * 카드를 눌러야 보이므로, 배너로 두면 스크롤 밖에 있을 때 안 읽힌다.
 *
 * 실측(시안 렌더 픽셀, 402 기준):
 *   카드      x 24 · y 148 · 346×410
 *   바탕      #3A75FC 에 중앙 약간 위로 밝은 청록빛(#4B95EB) 번짐
 *   버튼      흰색 15% · 높이 58 · 카드 안쪽 여백 21
 *   뒤 배경   어둡게 덮지 않고 흐리게만 (실측 240 → 233, 거의 원색)
 */
export function ClinicianModal({ message, onClose }: { message: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // 안내를 읽어야 하는 화면이라 열리면 바로 닫기 버튼에 초점을 준다.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinician-modal-title"
      className="fixed inset-0 z-50 flex items-start justify-center backdrop-blur-[10px]"
    >
      {/*
       * 시안에서 뒤 배경은 어두워지지 않는다. 흐림만으로 앞뒤를 가른다.
       * 다만 흐림을 지원하지 않는 환경에서 글이 겹쳐 읽히지 않도록 아주 옅게만 덮는다.
       */}
      <button
        type="button"
        aria-label="닫기"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/5"
      />

      {/*
       * 시안(402 기준)은 카드가 x 24 · 폭 346 이라 오른쪽에 32 가 남는다.
       * 폭을 고정하면 402 보다 좁은 화면에서 그만큼 오른쪽이 잘려 나가므로,
       * 좌우 여백을 먼저 두고 카드는 346 을 **최대값**으로만 쓴다.
       * 402 에서는 24 / 346 / 32 로 시안과 같아지고, 좁아지면 카드가 함께 줄어든다.
       */}
      <div className="relative mx-auto w-full max-w-app px-6">
        <div className="relative mt-[148px] w-full max-w-[346px] overflow-hidden rounded-card bg-[#3A75FC] px-[22px] pb-[26px] pt-[23px] text-white">
          {/* 카드 중앙 위쪽의 밝은 번짐. 시안의 타원(176×99)을 그라데이션으로 옮겼다 */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 62% 30% at 63% 44%, #4B95EB 0%, rgba(58,117,252,0) 70%)',
            }}
          />

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="닫기"
            /*
             * `z-10` 이 없으면 눌리지 않는다. 아래 `잠깐,` 제목의 상자가 이 버튼 자리까지
             * 걸치는데, 제목도 positioned 인 데다 DOM 상 뒤에 있어 위에 깔리기 때문이다.
             */
            className="absolute right-[18px] top-[18px] z-10 grid size-8 place-items-center text-white"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* 시안 기준 글상자 222×77 — `잠깐,` 28px, 아랫줄 16px */}
          <h2 id="clinician-modal-title" className="relative">
            <span className="block text-[28px] font-bold leading-[38px]">잠깐,</span>
            <span className="mt-[2px] block text-body-strong font-semibold">
              확인이 필요한 변화가 있어요
            </span>
          </h2>

          {/* 시안 기준 본문 상단 355 (카드 안쪽 207), 12px / 줄높이 15.5 */}
          <div className="relative mt-[184px] flex flex-col gap-[14px] text-xs leading-4">
            <p>
              <Sentences text="현재 변화는 일반적인 관리 안내로 대응하기 어려울 수 있습니다." />
            </p>
            <p>
              <Sentences text={message} />
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative mt-[30px] flex h-[58px] w-full items-center justify-center rounded-pill bg-white/15 text-body-strong font-semibold text-white"
          >
            확인했어요
          </button>
        </div>
      </div>
    </div>
  );
}
