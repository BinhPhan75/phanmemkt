import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AccountingProvider } from './utils/accountingState.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountingProvider>
      <App />
    </AccountingProvider>
  </StrictMode>,
);
