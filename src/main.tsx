import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ToastProvider } from './ui/Toast';
import { ThemeProvider } from './ui/ThemeProvider';
import { applyTheme, readTheme } from './styles/theme';
import { PaymentProvider } from './features/payments/PaymentContext';
import './styles/index.css';

applyTheme(readTheme()); // antes de pintar, evita piscar

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PaymentProvider>
          <App />
        </PaymentProvider>
      </ToastProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
