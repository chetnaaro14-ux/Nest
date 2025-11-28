import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ------------------------------------------------------------------
// POLYFILL: Bridge Vite environment to Node.js style process.env
// The @google/genai SDK requires process.env.API_KEY to be present.
// ------------------------------------------------------------------
const viteEnv = (import.meta as any).env || {};

(window as any).process = {
  env: {
    // API Key must be provided via environment variables (VITE_API_KEY)
    API_KEY: viteEnv.VITE_API_KEY || ''
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);