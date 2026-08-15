import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newIdempotencyKey } from '@/api/client';
import type {
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
   * 피부보고1·2 에서 사용자가 고른 **시안 어휘** 값.
   * 계약 enum 과 1:1 이 아니라 제출 직전에 designOptions 로 옮긴다.
   */
  area: string | null;
  appearance: string | null;
  designSituations: string[];
  care: string | null;
  skinStates: string[];

  // 위 값을 계약 모양으로 옮긴 결과. `보고 내용 확인` 화면이 이걸 보여준다.
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
  skinStates: [],
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
