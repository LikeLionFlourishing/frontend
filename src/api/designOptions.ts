import type { Appearance, BodyArea, CareAvailability, Situation } from './schemas';

/*
 * 확정 시안(피부보고1 25:31783 / 피부보고2 25:30577)의 선택지 어휘.
 *
 * 원래 라벨은 서버(`/reference-data/skin-report-options`)가 주는 값을 썼지만,
 * 시안이 **얼굴 그림 위 좌표**와 **타일 그림**에 묶인 고정 목록으로 바뀌면서
 * 화면이 목록을 알고 있어야 하게 됐다. 그래서 여기 한 곳에만 적어 둔다.
 *
 * 문제는 시안의 어휘가 계약 enum 과 1:1 이 아니라는 것이다. 아래 표의
 * `api` 가 실제로 서버에 보내는 값이고, 주석에 어긋나는 지점을 남겼다.
 * (docs/명세-대조.md 2-2 · 2-3)
 */

export interface DesignOption<T> {
  /** 화면 안에서만 쓰는 값 */
  value: string;
  label: string;
  /** 서버로 보낼 때 쓰는 계약 enum 값 */
  api: T;
}

// --- 부위 (피부보고1) ---------------------------------------------------------

/**
 * 얼굴 그림 위 점의 위치까지 함께 갖는다. 좌표는 시안의 이미지(180×259) 기준 비율이다.
 *
 * `OTHER` 로 보내는 셋(턱·눈가·관자놀이)은 계약에 대응하는 값이 없다.
 * 정보가 사라지지 않도록 `otherAreasNote` 에 라벨을 함께 실어 보낸다.
 */
export interface AreaOption extends DesignOption<BodyArea> {
  /** 얼굴 이미지 좌상단 기준 비율(0~1) */
  x: number;
  y: number;
}

/** 시안의 점 좌표(9px 원의 중심)를 이미지 상자(x 111~291, y 195~454) 기준 비율로 바꾼 값. */
export const AREA_OPTIONS: AreaOption[] = [
  { value: 'FOREHEAD', label: '이마', api: 'CENTER_FOREHEAD', x: 0.497, y: 0.454 },
  { value: 'LEFT_CHEEK', label: '왼 볼', api: 'LEFT_CHEEK', x: 0.303, y: 0.666 },
  { value: 'RIGHT_CHEEK', label: '오른 볼', api: 'RIGHT_CHEEK', x: 0.697, y: 0.658 },
  { value: 'NOSE', label: '코', api: 'NOSE', x: 0.497, y: 0.546 },
  { value: 'PHILTRUM', label: '인중', api: 'AROUND_MOUTH', x: 0.503, y: 0.624 },
  // 계약의 턱은 LEFT_CHIN / RIGHT_CHIN 뿐이라 좌우를 마음대로 정할 수 없다.
  { value: 'CHIN', label: '턱', api: 'OTHER', x: 0.503, y: 0.759 },
  { value: 'EYE_AREA', label: '눈가', api: 'OTHER', x: 0.808, y: 0.502 },
  { value: 'TEMPLE', label: '관자놀이', api: 'OTHER', x: 0.192, y: 0.502 },
];

/** 계약에 없는 부위를 골랐을 때 메모로 남길 문구. 정보를 잃지 않기 위한 장치다. */
export function areaNote(value: string | null): string | null {
  const option = AREA_OPTIONS.find((o) => o.value === value);
  if (!option || option.api !== 'OTHER') return null;
  return option.label;
}

export function areaFromApi(api: BodyArea | null): string | null {
  return AREA_OPTIONS.find((o) => o.api === api)?.value ?? null;
}

// --- 겉모습 (피부보고1) -------------------------------------------------------

export interface AppearanceOption extends DesignOption<Appearance> {
  /** 타일 일러스트 파일명(`src/assets/appearance-*.png`) */
  image: string;
}

/*
 * 시안에는 여섯 장뿐이라 계약의 `OOZING`(진물)·`CRUST`(딱지)를 고를 방법이 없다.
 * 다만 `관리 전 확인` 화면에서 사용자가 `고름·진물·물집이 보여요` 를 직접 고르므로
 * **의료진 확인 분기 자체는 정상 동작한다.** 미리 켜 주는 편의만 사라진다.
 */
export const APPEARANCE_OPTIONS: AppearanceOption[] = [
  { value: 'REDNESS', label: '붉은 반점', api: 'REDNESS', image: 'redness' },
  { value: 'SMALL_BUMPS', label: '작은 돌기', api: 'SMALL_BUMPS', image: 'small-bumps' },
  {
    value: 'RED_BUMPS_AROUND_HAIR',
    label: '털 주변 붉은 돌기',
    api: 'RED_BUMPS_AROUND_HAIR',
    image: 'red-bumps-around-hair',
  },
  {
    value: 'WHITE_TIPPED_BUMPS',
    label: '뾰루지',
    api: 'WHITE_TIPPED_BUMPS',
    image: 'white-tipped-bumps',
  },
  {
    value: 'ROUGHNESS_FLAKING',
    label: '각질/건조',
    api: 'ROUGHNESS_FLAKING',
    image: 'roughness-flaking',
  },
  { value: 'UNSURE', label: '기타', api: 'UNSURE', image: 'other' },
];

// --- 상황 (피부보고2) ---------------------------------------------------------

export interface SituationOption extends DesignOption<Situation> {
  icon: string;
}

/*
 * 시안 12종 중 네 가지(야외 활동·식습관 변화·스트레스·피부접촉 환경)는
 * 계약에 대응 값이 없어 전부 `OTHER` 로 접힌다. 서버는 그 넷을 구분하지 못한다.
 *
 * 반대로 계약의 `DELAYED_WASHING`(세안 지연)은 시안에 타일이 없다.
 * 결과·이력 화면의 예시에는 `상황: 세안 지연` 이 나오므로, 그건 사용자가 고르는 게
 * 아니라 AI 가 한 문장에서 뽑아 주는 값으로 본다. (docs/명세-대조.md 2-9)
 *
 * 아이콘은 열둘 중 열하나가 서로 다르다. `보호장비 착용`·`스트레스` 만
 * 시안에서도 같은 그림(등짐 진 사람)을 함께 쓴다.
 */
export const SITUATION_OPTIONS: SituationOption[] = [
  { value: 'SHAVING', label: '면도', api: 'SHAVING', icon: 'razor' },
  { value: 'OUTDOOR', label: '야외 활동', api: 'OTHER', icon: 'outdoor' },
  {
    value: 'TRAINING',
    label: '훈련/운동',
    api: 'SWEAT_OR_DUST_AFTER_TRAINING',
    icon: 'workout',
  },
  { value: 'SWEAT', label: '땀/과피지', api: 'SWEAT_OR_DUST_AFTER_TRAINING', icon: 'sweat' },
  { value: 'DIET_CHANGE', label: '식습관 변화', api: 'OTHER', icon: 'diet' },
  {
    value: 'PROTECTIVE_GEAR',
    label: '보호장비 착용',
    api: 'PROTECTIVE_GEAR_OR_MASK',
    icon: 'protectiveGear',
  },
  { value: 'NEW_PRODUCT', label: '새 제품 사용', api: 'NEW_PRODUCT', icon: 'newProduct' },
  // `피부 만짐` 과 같은 계약 값으로 접힌다. 서버는 둘을 구분하지 못한다.
  { value: 'SQUEEZED', label: '여드름을 짬', api: 'TOUCHED_OR_SQUEEZED', icon: 'squeeze' },
  { value: 'STRESS', label: '스트레스', api: 'OTHER', icon: 'protectiveGear' },
  {
    value: 'SLEEP_DEPRIVATION',
    label: '수면 부족',
    api: 'SLEEP_DEPRIVATION',
    icon: 'sleep',
  },
  { value: 'SKIN_CONTACT', label: '피부접촉 환경', api: 'OTHER', icon: 'skinContact' },
  { value: 'TOUCHED', label: '피부 만짐', api: 'TOUCHED_OR_SQUEEZED', icon: 'touch' },
];

export const SITUATION_NONE = { value: 'NONE_RECALLED', label: '특별히 떠오르는 상황 없음' };

// --- 관리 가능 상태 (피부보고2) -----------------------------------------------

/*
 * 시안(25:30587 / 25:30591)에는 타일이 **둘뿐**이다.
 * 계약의 `CAN_CARE_BEFORE_SLEEP`·`ADDITIONAL_CARE_DIFFICULT` 를 고를 방법이 없어서
 * `지금 관리할 수 없는 사람` 이 그 사실을 알릴 자리가 사라졌다.
 * 관리 규칙표가 그 둘로 갈라지는 규칙을 갖고 있다면 못 쓴다. (docs/명세-대조.md 2-9)
 */
export const CARE_OPTIONS: DesignOption<CareAvailability>[] = [
  { value: 'BEFORE_WASH', label: '세안 전', api: 'BEFORE_WASH_CAN_WASH_LATER' },
  { value: 'ALREADY_WASHED', label: '세안 완료', api: 'ALREADY_WASHED' },
];

// --- 현재 피부 상태 (피부보고2) -----------------------------------------------

/*
 * 시안의 이 질문은 계약의 `sensations`(가려움·따가움·통증…)과 **다른 질문**이다.
 * 사실상 피부 타입을 묻고 있어서 옮길 자리가 없다.
 *
 * 억지로 `sensations` 에 밀어 넣으면 AI 가 한 문장에서 뽑아 둔 `따가움` 같은 값을
 * 덮어써 버린다. 그래서 **보내지 않고** 화면에서만 쓴다.
 * 저장할 필드(`skinType`)를 요청해 뒀다. (docs/명세-대조.md 2-2)
 */
export const SKIN_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'DRY', label: '건조함' },
  { value: 'OILY', label: '유분많음' },
  { value: 'DEHYDRATED', label: '속건조,당김' },
  { value: 'SENSITIVE', label: '민감함' },
];

/** 화면 값 → 계약 `situations`. 같은 enum 으로 접히는 값은 하나로 합친다. */
export function toSituations(values: string[]): Situation[] {
  if (values.includes(SITUATION_NONE.value)) return ['NONE_RECALLED'];

  const mapped = values
    .map((v) => SITUATION_OPTIONS.find((o) => o.value === v)?.api)
    .filter((v): v is Situation => Boolean(v));

  const unique = [...new Set(mapped)];
  return unique.length > 0 ? unique : ['NONE_RECALLED'];
}
