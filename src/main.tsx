import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AppNoticeProvider from './components/AppNoticeProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppNoticeProvider>
      <App />
    </AppNoticeProvider>
  </StrictMode>,
);
