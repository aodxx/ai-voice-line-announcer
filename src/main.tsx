import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary.tsx';
import AuthGate from './components/AuthGate.tsx';
import { initializeFirebaseAnalytics } from './lib/firebase';
import { installAuthenticatedFetch } from './lib/authenticated-fetch';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('ไม่พบ root element สำหรับเริ่มแอป');
}

try {
  installAuthenticatedFetch();
  void initializeFirebaseAnalytics();

  rootElement.dataset.rendered = 'true';
  createRoot(rootElement).render(
    <StrictMode>
      <AppErrorBoundary>
        <AuthGate>
          <App />
        </AuthGate>
      </AppErrorBoundary>
    </StrictMode>,
  );
} catch (error) {
  console.error('Application bootstrap failed', error);
  rootElement.dataset.rendered = '';
  rootElement.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;background:#020617;color:white;padding:24px;text-align:center;font-family:system-ui,sans-serif">
      <div>
        <h1>เปิดแอปไม่สำเร็จ</h1>
        <p>เกิดข้อผิดพลาดขณะเริ่มระบบ</p>
        <pre style="white-space:pre-wrap;color:#fca5a5">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    </main>
  `;
}
