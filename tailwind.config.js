/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Figma variable `단색`
        accent: {
          DEFAULT: '#8CFFB6',
          pressed: '#6FE39B',
          dim: '#8CFFB633',
        },
        // 페이지 배경은 순수 검정. 카드가 떠 보이게 하는 구조.
        // (`bg` 라는 이름은 `bg-bg` 로 충돌하므로 `base` 를 쓴다)
        base: '#000000',
        // 홈의 어두운 카드 계열
        card: {
          DEFAULT: '#1C1C1E',
          raised: '#2C2C2E',
        },
        // 입력창·선택지에 쓰이는 밝은 회색 패널 (Figma variable `ghl` 계열)
        // TODO: 정확한 hex 는 디자이너 확인 필요. 아래는 시안에서 추출한 근사값.
        panel: {
          DEFAULT: '#C7C7C9',
          strong: '#D5D5D5',
          text: '#1C1C1E',
          label: '#6E6E73',
        },
        fg: {
          DEFAULT: '#FFFFFF',
          muted: '#A1A1AA',
          faint: '#6E6E73',
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
