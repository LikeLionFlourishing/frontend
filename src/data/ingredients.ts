/**
 * 결과 화면 `04 INGREDIENT GUIDE` 의 추천 성분.
 *
 * **문구는 확정 시안(25:30820)에 적힌 것을 그대로 옮긴 것이고, 서버가 주는 값이 아니다.**
 * 계약에 성분 필드가 없어서 화면을 완성하려고 임시로 여기에 둔다.
 *
 * TODO(백엔드): `careResult.ingredients` 로 내려주면 이 파일을 지운다.
 *   { name, effect, description }[]
 *
 * TODO(기획·법무): 성분 안내는 화장품법 제13조(부당한 표시·광고) 검토가 필요하다.
 *   특정 제품 추천이 아니라 성분 정보 제공이라는 점, 효능을 단정하지 않는 문구인지
 *   확인받아야 한다. 지금 문구는 시안 그대로다.
 */
export interface RecommendedIngredient {
  name: string;
  /** 이름 옆에 작게 붙는 한 줄 */
  effect: string;
  description: string;
}

export const RECOMMENDED_INGREDIENTS: RecommendedIngredient[] = [
  {
    name: '판테놀',
    effect: '진정 피부 장벽 케어',
    description: '현재 기록된 붉어짐 가려움 등 피부 자극 상태 고려',
  },
  {
    name: '세라마이드',
    effect: '보습 피부 장벽 보호',
    description: '건조함과 외부 자극으로부터 피부 보호 도움',
  },
  {
    name: '마데카소사이드',
    effect: '민감 피부 진정',
    description: '자극 받은 피부 진정과 회복을 도와주는 성분',
  },
];
