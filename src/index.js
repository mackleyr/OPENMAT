// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import OnboardingProvider from './contexts/OnboardingContext';
import { CouponProvider } from './contexts/CouponContext';
import { ActivityProvider } from './contexts/ActivityContext';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <OnboardingProvider>
          <CouponProvider>
            <ActivityProvider>
              <App />
            </ActivityProvider>
          </CouponProvider>
        </OnboardingProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
