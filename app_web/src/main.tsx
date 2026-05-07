import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ToasterProvider } from './components/Toaster';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ToasterProvider>
        <App />
      </ToasterProvider>
    </HashRouter>
  </React.StrictMode>
);
