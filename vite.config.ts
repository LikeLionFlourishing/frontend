import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // 개발 중에는 /v1 요청을 프록시로 넘겨 same-origin 을 만든다.
  //
  // 이유 두 가지 (OpenAPI 명세의 인증 방식 때문에 반드시 필요):
  //  1. 세션 쿠키 이름이 `__Host-session` 이다. __Host- prefix 는 Secure + Path=/ +
  //     Domain 속성 없음을 요구하므로, 다른 오리진에서 받은 쿠키는 브라우저가 버린다.
  //  2. SameSite=Lax 쿠키는 cross-origin XHR/fetch 에 실리지 않는다.
  // 프록시로 same-origin 을 만들면 둘 다 우회 없이 해결된다.
  const apiTarget = env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080';

  return {
    plugins: [react()],
    resolve: { tsconfigPaths: true },
    server: {
      port: Number(process.env.PORT) || 5173,
      proxy: {
        '/v1': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          /*
           * 실백엔드는 상태변경 요청의 Origin 헤더를 검사해 배포 도메인만 허용한다.
           * 로컬에서 그 백엔드로 테스트할 때 브라우저 Origin(localhost)이 그대로 가면
           * 403 이 난다. VITE_DEV_PROXY_ORIGIN 을 주면 그 값으로 갈아끼워 통과시킨다.
           * (로컬 백엔드가 Origin 을 안 보면 이 값을 비워 두면 된다)
           */
          configure: (proxy) => {
            const origin = env.VITE_DEV_PROXY_ORIGIN;
            if (!origin) return;
            proxy.on('proxyReq', (proxyReq) => proxyReq.setHeader('origin', origin));
          },
        },
      },
    },
  };
});
