import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installAnalyticsFlush } from './lib/analytics';
import './index.css';

async function bootstrap() {
  if (import.meta.env.VITE_USE_MSW === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  }

  installAnalyticsFlush();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
