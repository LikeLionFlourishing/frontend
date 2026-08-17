import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newIdempotencyKey } from '@/api/client';
import type {
  Appearance,
  AppearanceSelection,
  BodyArea,
  CareAvailability,
  PreCareCheckSelection,
  SensationSelection,
  SituationSelection,
} from '@/api/schemas';

/**
 * 작성 중인 피부 보고.
 *
 * localStorage 에 유지하는 이유: 부대 통신 환경이 불안정하고 폰 사용 시간이 짧다.
 * AI 구조화가 실패하거나 앱을 나갔다 와도 사용자가 쓴 한 문장은 절대 잃지 않아야 한다.
 * (기능명세서 11.4 — "AI 처리에 실패해도 사용자가 작성한 내용이 사라지지 않아야 합니다")
 */
interface ReportDraft {
  reportDate: string | null;
  rawText: string;

  /*
   * 피부보고1·2 에서 사용자가 고른 값.
   *
   * 2026-08-16 개편으로 **화면 값이 곧 계약 값**이 됐다(부위 13종·상황 5종이
   * 모두 계약 enum 이다). 옛날처럼 어휘를 옮겨 담지 않고 그대로 복사한다.
   *
   * v2 에서 `sensations` 가 붉어짐·트러블·과피지 세 가지로 바뀌면서, 화면 전용으로
   * 두었던 `skinStates` 우회가 없어졌다. 피부보고2 에서 고른 값이 곧 보낼 값이다.
   */
  area: BodyArea | null;
  appearance: Appearance | null;
  designSituations: SituationSelection;
  care: CareAvailability | null;

  // 제출 직전에 확정되는 값. `보고 내용 확인` 화면이 이걸 보여준다.
  primaryArea: BodyArea | null;
  otherAreasNote: string | null;
  appearances: AppearanceSelection;
  sensations: SensationSelection;
  situations: SituationSelection;
  careAvailability: CareAvailability | null;

  // 3-3 관리 전 확인
  preCareChecks: PreCareCheckSelection;

  /**
   * 제출용 멱등 키. 제출을 시작할 때 한 번 만들고, 재시도해도 같은 값을 쓴다.
   * 새 보고를 시작할 때만 새로 발급한다.
   */
  idempotencyKey: string | null;
}

interface ReportDraftState extends ReportDraft {
  patch: (partial: Partial<ReportDraft>) => void;
  beginSubmit: () => string;
  reset: () => void;
}

const EMPTY: ReportDraft = {
  reportDate: null,
  rawText: '',
  area: null,
  appearance: null,
  designSituations: [],
  care: null,
  primaryArea: null,
  otherAreasNote: null,
  appearances: [],
  sensations: [],
  situations: [],
  careAvailability: null,
  preCareChecks: [],
  idempotencyKey: null,
};

export const useReportDraftStore = create<ReportDraftState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      patch: (partial) => set(partial),
      beginSubmit: () => {
        const existing = get().idempotencyKey;
        if (existing) return existing;
        const key = newIdempotencyKey();
        set({ idempotencyKey: key });
        return key;
      },
      reset: () => set({ ...EMPTY }),
    }),
    { name: 'jedaero.report-draft' },
  ),
);
