import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 동의 문구 버전. 서버에 그대로 저장되므로 문구를 바꾸면 이 값도 올려야 한다.
 *
 * 서버가 받고 있는 활성 버전과 같아야 한다. 다르면 `PUT /me/onboarding` 이 422
 * (`CONSENT_VERSION_NOT_ACCEPTED`) 로 막혀 온보딩을 끝낼 수 없다.
 */
export const CONSENT_VERSION = '2026-08-16';

/**
 * 회원가입 2단계(시안 25:28767)에서 받은 동의.
 *
 * 계정은 `가입하기` 에서 만들어지지만, 동의 값을 보낼 곳은 `PUT /me/onboarding` 뿐이라
 * 온보딩 마지막까지 들고 가야 한다. 중간에 앱이 닫혀도 잃지 않도록 저장해 둔다.
 *
 * 2026-08-16 결정으로 동의가 한 건이 되면서 계약의 `sensitiveDataConsent` 와
 * 정확히 맞아떨어졌다. 예전에 적어 둔 `항목별 저장 필드가 필요하다` 는 요청은 없어졌다.
 */
interface SignupConsentState {
  version: string;
  /** (필수) 개인정보 수집 이용동의 */
  privacy: boolean;
  patch: (partial: Partial<Omit<SignupConsentState, 'patch' | 'reset'>>) => void;
  reset: () => void;
}

const EMPTY = {
  version: CONSENT_VERSION,
  privacy: false,
};

export const useSignupConsentStore = create<SignupConsentState>()(
  persist(
    (set) => ({
      ...EMPTY,
      patch: (partial) => set(partial),
      reset: () => set({ ...EMPTY }),
    }),
    {
      name: 'jedaero.signup-consent',
      /*
       * 저장해 둔 초안에는 예전 문구 버전이 들어 있다. 그 값을 새 버전으로 바꿔치기하면
       * 사용자가 본 적 없는 문구에 동의한 것으로 기록되므로, 초안을 버리고 다시 받는다.
       * 회원가입 2단계와 온보딩 완료 사이에 있던 사람만 동의를 다시 확인하게 된다.
       */
      version: 1,
      migrate: () => ({ ...EMPTY }),
    },
  ),
);
