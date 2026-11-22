import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProvider, useApp } from './context/AppContext';
import type { UserRole } from './types/campusfind';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { ReportItemPage } from './pages/ReportItemPage';
import { BrowseItemsPage } from './pages/BrowseItemsPage';
import { MatchesPage } from './pages/MatchesPage';
import { ClaimsPage } from './pages/ClaimsPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { BadgesPage } from './pages/BadgesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RewardsPage } from './pages/RewardsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SecurityDashboardPage } from './pages/SecurityDashboardPage';
import { CampusMapPage } from './pages/CampusMapPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HelpSupportPage } from './pages/HelpSupportPage';

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { currentUser, authReady } = useApp();
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center text-sm text-slate-500">
        Loading CampusFind...
      </div>
    );
  }
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

const RequireRole: React.FC<{ allowed: UserRole[]; children: React.ReactElement }> = ({
  allowed,
  children,
}) => {
  const { currentUser, authReady } = useApp();
  if (!authReady) return null;
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (!allowed.includes(currentUser.role)) {
    const fallback =
      currentUser.role === 'admin'
        ? '/admin'
        : currentUser.role === 'security'
          ? '/security'
          : '/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/browse" element={<BrowseItemsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/campus-map" element={<CampusMapPage />} />
      <Route path="/help" element={<HelpSupportPage />} />

      {/* Student & Authenticated Routes */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <StudentDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/report-lost"
        element={
          <RequireAuth>
            <ReportItemPage reportType="lost" />
          </RequireAuth>
        }
      />
      <Route
        path="/report-found"
        element={
          <RequireAuth>
            <ReportItemPage reportType="found" />
          </RequireAuth>
        }
      />
      <Route
        path="/matches"
        element={
          <RequireAuth>
            <MatchesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/my-reports"
        element={
          <RequireAuth>
            <MyReportsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/claims"
        element={
          <RequireAuth>
            <ClaimsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/notifications"
        element={
          <RequireAuth>
            <NotificationsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/badges"
        element={
          <RequireAuth>
            <BadgesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/rewards"
        element={
          <RequireAuth>
            <RewardsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />

      {/* Role-Protected Admin & Security Routes */}
      <Route
        path="/admin"
        element={
          <RequireRole allowed={['admin']}>
            <AdminDashboardPage />
          </RequireRole>
        }
      />
      <Route
        path="/analytics"
        element={
          <RequireRole allowed={['admin', 'security']}>
            <AnalyticsPage />
          </RequireRole>
        }
      />
      <Route
        path="/security"
        element={
          <RequireRole allowed={['security', 'admin']}>
            <SecurityDashboardPage />
          </RequireRole>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
