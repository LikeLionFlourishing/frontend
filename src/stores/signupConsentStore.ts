import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 동의 문구 버전. 서버에 그대로 저장되므로 문구를 바꾸면 이 값도 올려야 한다. */
export const CONSENT_VERSION = '2026-08-15';

/**
 * 회원가입 2단계(시안 22:10802)에서 받은 동의.
 *
 * 계정은 `가입하기` 에서 만들어지지만, 동의 값을 보낼 곳은 `PUT /me/onboarding` 뿐이라
 * 온보딩 마지막까지 들고 가야 한다. 중간에 앱이 닫혀도 잃지 않도록 저장해 둔다.
 *
 * TODO(백엔드): 계약의 `sensitiveDataConsent` 하나로는 세 항목을 구분해 남길 수 없다.
 * 특히 `marketing` 은 선택 항목이라 별도 필드가 필요하다.
 */
interface SignupConsentState {
  version: string;
  /** (필수) 개인정보 수집 이용동의 */
  privacy: boolean;
  /** (필수) 서비스 이용약관 동의 */
  terms: boolean;
  /** (선택) 마케팅 정보 수신 동의 */
  marketing: boolean;
  patch: (partial: Partial<Omit<SignupConsentState, 'patch' | 'reset'>>) => void;
  reset: () => void;
}

const EMPTY = {
  version: CONSENT_VERSION,
  privacy: false,
  terms: false,
  marketing: false,
};

export const useSignupConsentStore = create<SignupConsentState>()(
  persist(
    (set) => ({
      ...EMPTY,
      patch: (partial) => set(partial),
      reset: () => set({ ...EMPTY }),
    }),
    { name: 'jedaero.signup-consent' },
  ),
);
