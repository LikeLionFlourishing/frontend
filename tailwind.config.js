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
        // 로고 `제대로` 전용 파랑. 링크/진행에 쓰는 info 보다 진하다.
        brand: '#0248F6',
        // 페이지 배경. 확정 시안(2026-08-15)에서 흰색 → 옅은 회색으로 바뀌었다.
        // 카드·필드가 이 위에 미세한 명도차로 떠 보이는 구조.
        // (`bg` 라는 이름은 `bg-bg` 로 충돌하므로 `base` 를 쓴다)
        base: '#F1F1F1',
        /*
         * 카드 계열. 배경(#F1F1F1)보다 살짝 어두워서 눌린 것처럼 보이는 구조다.
         * hero 는 홈의 TODAY'S CHECK 한 장, raised 는 카드 안의 보조 타일.
         */
        card: {
          DEFAULT: '#ECECEC',
          hero: '#EEEEEE',
          raised: '#E6E6E6',
        },
        // 입력창·선택지·설정 카드에 쓰이는 회색 패널
        panel: {
          DEFAULT: '#D5D5D5',
          strong: '#C7C7C7',
          // 로그인·온보딩2 입력 필드. panel 보다 훨씬 밝아 배경과 거의 붙어 보인다.
          soft: '#EBEBEB',
          // 캘린더 범례 시트. panel 보다 반 톤 밝다.
          sheet: '#D9D9D9',
          // 피부보고1 의 부위 칩·겉모습 타일. card.raised 보다 세 톤 밝다.
          tile: '#E9E9E9',
          text: '#010101',
          label: '#6B6B6B',
        },
        fg: {
          DEFAULT: '#010101',
          muted: '#363636',
          faint: '#6B6B6B',
          // 캘린더의 요일 머리글·지난 달 날짜처럼 '읽히지 않아도 되는' 글자.
          // 대비가 매우 낮으므로 뜻이 담긴 글자에는 쓰지 않는다.
          ghost: '#E5E5E5',
        },
        /*
         * 캘린더 마커. 날짜 칸 위에 찍히는 점·아이콘 전용이다.
         * 정보 색(info)·강조색(accent)과 겹치면 의미가 흐려져 별도로 둔다.
         */
        marker: {
          base: '#004466', // 기본 설정 시간
          custom: '#FF7300', // 이 날만 바꾼 시간
          env: '#00A75C', // 예상 환경을 선택한 날
          medal: '#A3A3A3', // 진급일
          flag: '#453D3D', // 전역 예정일
        },
        /*
         * 결과 화면(오늘의 관리 가이드) 카드 덱 전용 색.
         * 요약 → 할 일 → 피할 일 → 확인할 변화 → 유사 기록 순으로
         * 그린에서 남색으로 넘어가는 그라데이션을 이룬다.
         */
        guide: {
          summary: '#8CFFB6',
          do: '#B7E8C2',
          avoid: '#90C3C9',
          next: '#346EFF',
          similar: '#3C6582',
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
