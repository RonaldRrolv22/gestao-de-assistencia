import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AppNoticeProvider from './components/AppNoticeProvider.tsx';
import './index.css';

// #region agent log
const DEBUG_INGEST =
  'http://127.0.0.1:7942/ingest/8708ad6b-cc5a-43ff-b2a2-d4996d444d0d';
function sendDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
) {
  fetch(DEBUG_INGEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '8ececf' },
    body: JSON.stringify({
      sessionId: '8ececf',
      runId: 'white-screen-pre',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
window.addEventListener('error', (event) => {
  sendDebugLog(
    'main.tsx:window.error',
    'Uncaught window error',
    { message: event.message, filename: event.filename, lineno: event.lineno, colno: event.colno },
    'global-error'
  );
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  sendDebugLog(
    'main.tsx:unhandledrejection',
    'Unhandled promise rejection',
    {
      reason:
        reason instanceof Error
          ? { name: reason.name, message: reason.message, stack: reason.stack?.slice(0, 500) }
          : String(reason),
    },
    'global-error'
  );
});
// #endregion

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppNoticeProvider>
      <App />
    </AppNoticeProvider>
  </StrictMode>,
);
