import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import './app.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>,
);
