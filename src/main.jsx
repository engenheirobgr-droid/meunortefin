import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const serviceWorkerUrl = `${import.meta.env.BASE_URL}service-worker.js`;
    navigator.serviceWorker.register(serviceWorkerUrl, {
      scope: import.meta.env.BASE_URL
    }).catch((error) => {
      console.error('Service worker registration failed', error);
    });
  });
}
