import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { pwaConfig } from './app/pwaConfig';
import { createRepository } from './lib/storage/repository';
import './styles/global.css';
import './styles/layout.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={pwaConfig.base}>
      <App repository={createRepository('ielts-wordflow')} />
    </BrowserRouter>
  </StrictMode>,
);
