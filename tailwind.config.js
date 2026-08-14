/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /*
         * 라이트 테마. 2026-08-14 시안 개편으로 다크에서 전면 전환했다.
         * 값은 Figma 렌더에서 직접 추출했다(변수 패널의 `단색`·`검` 은 옛 값이라 신뢰하지 않는다).
         */

        // 주요 CTA 전용. 화면당 하나가 원칙이다.
        accent: {
          DEFAULT: '#8CFFB6',
          pressed: '#6FE39B',
          dim: '#8CFFB633',
        },
        // 진행 표시·D-Day·알림처럼 '눈이 먼저 가야 하는 정보'. 개편에서 새로 들어왔다.
        info: {
          DEFAULT: '#346EFF',
          soft: '#E6ECFF',
        },
        // 로고 `행보관` 전용 파랑. 링크/진행에 쓰는 info 보다 진하다.
        brand: '#0248F6',
        // 페이지 배경은 순수 흰색. 카드가 미세한 명도차로 떠 보이는 구조.
        // (`bg` 라는 이름은 `bg-bg` 로 충돌하므로 `base` 를 쓴다)
        base: '#FFFFFF',
        // 홈의 카드 계열. raised 가 카드 안의 보조 타일이다.
        card: {
          DEFAULT: '#FBFBFB',
          raised: '#F1F1F1',
        },
        // 입력창·선택지·설정 카드에 쓰이는 회색 패널
        panel: {
          DEFAULT: '#D5D5D5',
          strong: '#C7C7C7',
          // 로그인 화면 입력 필드만 이 밝은 회색을 쓴다 (시안 기준)
          soft: '#F7F7F7',
          text: '#010101',
          label: '#6B6B6B',
        },
        fg: {
          DEFAULT: '#010101',
          muted: '#363636',
          faint: '#6B6B6B',
        },
        /*
         * 결과 화면(오늘의 관리 가이드) 카드 덱 전용 색.
         * 요약 → 할 일 → 피할 일 → 확인할 변화 → 유사 기록 순으로
         * 그린에서 남색으로 넘어가는 그라데이션을 이룬다.
         */
        guide: {
          summary: '#8CFFB6',
          do: '#B7E8C2',
          avoid: '#91C2C7',
          next: '#346EFF',
          similar: '#396582',
        },
        // 위험 신호·악화 표시. 강조색(그린)과 구분되어야 한다.
        caution: {
          DEFAULT: '#FFB86C',
          500: '#FFB86C',
          ink: '#8A4B00',
        },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Figma text style 대응
        label: ['12px', { lineHeight: '1', fontWeight: '100' }], // 보조
        body: ['12px', { lineHeight: '1', fontWeight: '400' }], // 본문 한글
        'body-strong': ['16px', { lineHeight: '1', fontWeight: '600' }], // 본문강조
      },
      borderRadius: {
        card: '20px',
        pill: '28px',
      },
      maxWidth: {
        app: '402px',
      },
      keyframes: {
        // 단계 문구가 바뀔 때 아래에서 올라오며 나타난다
        'stage-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'stage-in': 'stage-in 320ms ease-out',
      },
    },
  },
  plugins: [],
};
