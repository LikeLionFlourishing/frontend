/*
 * 온보딩 인트로의 픽셀 나무.
 *
 * 시안에서 이미지가 아니라 Figma 도형(사각형 300개) 묶음이라 격자를 그대로 추출했다.
 * 글자는 색 구분이다 — A 강조 그린 / B 흐린 그린 / C 진회색 / D 중간회색 / E 회녹색.
 */

// prettier-ignore
export const ONBOARDING_TREE = [
  '..........BAAAB..........',
  '........AAAAAABBB........',
  '......AAAAABBBBBBBB......',
  '.....AAAAAABBBBBBBBB.....',
  '....BBBAAAAAAAAAAAAAA....',
  '...BBBBAAAAAAAAAAAAAAA...',
  '...BBBBBBBBAAABBBBAAAA...',
  '..BBBBBBBBBAAABBBBAAAAA..',
  '..BBBBBBBAAAAABBBBAAAAA..',
  '..BBBBBBAAAABBBAAAAAAAA..',
  '..AAAAAAAAAAABBAAAABBBB..',
  '..AAAAAAAAAAAAAAAAABBBB..',
  '..AAAAAAAAAAAAAAABBBBBB..',
  'CCCCCCCCCCCCCCAAABBBBBB..',
  '............CCCAAAAAAAA..',
  '............DCCCEEEEEEEA.',
  '............DDCCCCCCCCCCC',
  '............DD...........',
  '............DD...........',
  '............DD...........',
  '............DD...........',
  '............CCC..........',
  '............CCC..........',
  '............DD...........',
  '............DD...........',
] as const;

export const TREE_CELL = 8.48;
export const TREE_GAP = 2.24;
