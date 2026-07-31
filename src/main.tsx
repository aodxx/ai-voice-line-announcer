import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AuthGate from './components/AuthGate.tsx';
import { initializeFirebaseAnalytics } from './lib/firebase';
import { installAuthenticatedFetch } from './lib/authenticated-fetch';
import './index.css';

installAuthenticatedFetch();
void initializeFirebaseAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
);
