// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CouponProvider } from './contexts/CouponContext';
import { ActivityProvider } from './contexts/ActivityContext';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <CouponProvider>
        <ActivityProvider>
          <App />
        </ActivityProvider>
      </CouponProvider>
    </BrowserRouter>
  </React.StrictMode>
);
