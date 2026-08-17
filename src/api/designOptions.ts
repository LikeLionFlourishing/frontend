import type { Appearance, BodyArea, CareAvailability, Sensation, Situation } from './schemas';

/*
 * 확정 시안(피부보고1 30:40620 / 피부보고2 30:38991)의 선택지.
 *
 * 2026-08-16 설계 정리로 **시안 어휘가 계약 enum 으로 되돌아왔다.**
 * 예전에는 시안에만 있는 값(턱·눈가·관자놀이, 야외 활동·스트레스…)을 `OTHER` 로
 * 접어 보내느라 대응표가 필요했지만, 지금은 부위 13종·상황 5종이 모두
 * 계약에 그대로 있다. 그래서 이 파일은 **화면에 필요한 것만** 들고 있다 —
 * 라벨, 얼굴 그림 위 좌표, 타일 그림·아이콘 이름.
 *
 * 값 자체는 계약 enum 을 그대로 쓴다. 옮겨 담는 변환이 없다.
 */

// --- 부위 (피부보고1) ---------------------------------------------------------

export interface AreaOption {
  value: BodyArea;
  label: string;
  /**
   * 얼굴 그림(180×259) 좌상단 기준 비율.
   * 시안 렌더에서 점을 픽셀로 찾아 back-solve 한 값이다.
   */
  x: number;
  y: number;
}

/**
 * 시안의 13종. 계약의 `WHOLE_FACE` 하나만 쓰지 않는다.
 *
 * `기타`는 얼굴 그림 위에 점이 없다 — 짚을 자리가 없는 값이라 칩으로만 고른다.
 * 좌우는 **보는 사람 기준**이다. `왼 볼`이 화면 왼쪽에 있다(시안의 L/R 표기와 같다).
 */
export const AREA_OPTIONS: AreaOption[] = [
  { value: 'LEFT_FOREHEAD', label: '좌측 이마', x: 0.228, y: 0.351 },
  { value: 'CENTER_FOREHEAD', label: '중앙 이마', x: 0.494, y: 0.336 },
  { value: 'RIGHT_FOREHEAD', label: '우측 이마', x: 0.75, y: 0.352 },
  { value: 'NOSE', label: '코', x: 0.493, y: 0.564 },
  { value: 'LEFT_CHEEK', label: '왼 볼', x: 0.294, y: 0.606 },
  { value: 'RIGHT_CHEEK', label: '오른 볼', x: 0.689, y: 0.598 },
  { value: 'AROUND_MOUTH', label: '입가', x: 0.494, y: 0.622 },
  { value: 'LEFT_CHIN', label: '왼 턱', x: 0.45, y: 0.703 },
  { value: 'RIGHT_CHIN', label: '오른 턱', x: 0.55, y: 0.703 },
  { value: 'LEFT_JAWLINE', label: '왼 턱선', x: 0.347, y: 0.755 },
  { value: 'RIGHT_JAWLINE', label: '오른 턱선', x: 0.653, y: 0.755 },
  { value: 'NECK', label: '목', x: 0.5, y: 0.857 },
  { value: 'OTHER', label: '기타', x: -1, y: -1 },
];

/** 얼굴 그림 위에 점을 찍지 않는 값. (`기타`) */
export function hasDot(option: AreaOption): boolean {
  return option.x >= 0;
}

// --- 겉모습 (피부보고1) -------------------------------------------------------

export interface AppearanceOption {
  value: Appearance;
  label: string;
  /** 타일 일러스트 파일명(`src/assets/appearance-*.png`) */
  image: string;
}

/*
 * 2026-08-18 시안에서 여섯 종이 **전부 교체**됐다(라벨·일러스트 모두).
 *   붉은 반점 → 붉어짐 / 작은 돌기 → 돌기와 울퉁불퉁함
 *   털 주변 붉은 돌기 → 고름이 찬 돌기 / 뾰루지 → (없어짐)
 *   각질·건조는 자리만 옮겼고 `번들거림/유분` 이 새로 들어왔다.
 *
 * `고름이 찬 돌기` 가 계약이 요구하던 진물·고름 자리다. 이 값이 선택되면
 * 관리 전 확인의 `PUS_OOZING_BLISTER` 가 미리 켜진다(schemas.ts seedPreCareChecks).
 *
 * 계약의 `AppearanceSelection` 은 enum 이 비어 있고 `/reference-data` 의 값으로만
 * 검증한다. 아래 value 는 서버가 여섯 값을 확정하기 전까지 쓰는 임시 이름이다.
 */
export const APPEARANCE_OPTIONS: AppearanceOption[] = [
  { value: 'REDNESS', label: '붉어짐', image: 'redness' },
  { value: 'BUMPS_UNEVEN', label: '돌기와 울퉁불퉁함', image: 'bumps-uneven' },
  { value: 'PUS_BUMPS', label: '고름이 찬 돌기', image: 'pus-bumps' },
  { value: 'ROUGHNESS_FLAKING', label: '각질/건조', image: 'roughness-flaking' },
  { value: 'OILY_SHINE', label: '번들거림/유분', image: 'oily-shine' },
  { value: 'OTHER', label: '기타', image: 'other' },
];

// --- 직전 상황 (피부보고2) -----------------------------------------------------

export interface SituationOption {
  value: Situation;
  label: string;
  icon: string;
}

/**
 * 시안의 5종 + `해당 상황 없음`. 전부 계약 enum 그대로다.
 *
 * 관리 규칙표가 다루는 다섯 가지로 좁힌 결과라, 예전처럼 여러 값이 하나로
 * 접히거나 `OTHER` 로 새는 일이 없다.
 * v2 에서 `DELAYED_WASHING` · `SLEEP_DEPRIVATION` · `OTHER` 가 계약에서도 빠졌고,
 * `TOUCHED_OR_SQUEEZED` → `SQUEEZED_ACNE`,
 * `SWEAT_OR_DUST_AFTER_TRAINING` → `SWEAT_OR_SEBUM` 로 이름이 바뀌었다.
 *
 * 시안 배치가 3×2 라 이 순서가 곧 화면 순서다.
 */
export const SITUATION_OPTIONS: SituationOption[] = [
  { value: 'PROTECTIVE_GEAR_OR_MASK', label: '보호장비 착용', icon: 'mask' },
  { value: 'SHAVING', label: '면도', icon: 'razor' },
  { value: 'SQUEEZED_ACNE', label: '여드름을 짬', icon: 'squeeze' },
  { value: 'NEW_PRODUCT', label: '새 제품 사용', icon: 'cart' },
  { value: 'SWEAT_OR_SEBUM', label: '땀/과피지', icon: 'sweat' },
  { value: 'NONE_RECALLED', label: '해당 상황 없음', icon: 'noneCircle' },
];

/** 다른 값과 함께 고를 수 없다. 계약의 `not: { contains: NONE_RECALLED, minItems: 2 }`. */
export const SITUATION_NONE: Situation = 'NONE_RECALLED';

// --- 관리 가능 상태 (피부보고2) -----------------------------------------------

export interface CareOption {
  value: CareAvailability;
  label: string;
}

/*
 * 2026-08-16 기획 확정: **세안 전 · 세안 완료 · 세안 불가능** 세 가지다.
 * (시안은 앞의 둘만, 계약은 네 가지라 양쪽 다 확정안과 달랐다)
 *
 * **계약은 고치지 않고 있는 값에 얹는다.** `세안 불가능` 은 계약의
 * `ADDITIONAL_CARE_DIFFICULT`(오늘은 추가 관리가 어려움)로 보낸다 —
 * 문구는 다르지만 `오늘 더 손댈 수 없는 상태` 라는 점에서 같은 자리다.
 *
 * 계약에 남는 `CAN_CARE_BEFORE_SLEEP` 은 화면에서 고를 수 없다. 계약이 값을
 * 갖고 있어도 안 보내면 그만이라 저장에는 문제가 없지만, 관리 규칙표가 이 값으로
 * 분기하는 행을 두고 있다면 그 행은 영영 안 걸린다. (백엔드 확인 필요 — 계약이
 * 아니라 규칙표 쪽 문제다)
 *
 * 격자가 2열이라 두 줄이 된다(2 + 1). 아래 `현재 피부 상태` 와 같은 모양이다.
 */
export const CARE_OPTIONS: CareOption[] = [
  { value: 'BEFORE_WASH_CAN_WASH_LATER', label: '세안 전' },
  { value: 'ALREADY_WASHED', label: '세안 완료' },
  { value: 'ADDITIONAL_CARE_DIFFICULT', label: '세안 불가능' },
];

// --- 현재 피부 상태 (피부보고2) -----------------------------------------------

/*
 * `현재 피부 상태` — 계약의 `SensationSelection` 그대로다.
 *
 * v1 은 감각 7종(가려움·따가움·통증…)이라 화면 값을 보낼 수 없었고, 그동안
 * `skinStates` 라는 화면 전용 필드에 담아 두고 서버에는 안 보냈다.
 * v2 에서 계약이 이 세 가지로 바뀌면서 그 우회가 사라졌다 — 고른 값이 곧 보낼 값이다.
 */
export const SENSATION_OPTIONS: { value: Sensation; label: string }[] = [
  { value: 'REDNESS', label: '붉어짐' },
  { value: 'BREAKOUT', label: '트러블' },
  { value: 'EXCESS_SEBUM', label: '과피지' },
];
