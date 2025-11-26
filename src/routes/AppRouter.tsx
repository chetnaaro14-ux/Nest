import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from '../components/auth/AuthPage';
import ResetPasswordPage from '../components/auth/ResetPasswordPage';
import AppLayout from '../components/layout/AppLayout';
import DashboardPage from '../components/dashboard/DashboardPage';
import TripDetailPage from '../components/trip/TripDetailPage';

export const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="trips/:tripId" element={<TripDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </HashRouter>
  );
};