import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Bell,
  Compass,
  FileSearch,
  Gift,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PackageCheck,
  PlusCircle,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CampusFindLogoMark } from './Navbar';

interface NavItem {
  label: string;
  to: string;
  icon: React.FC<{ className?: string }>;
  badgeCount?: number;
}

export const AppShell: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => {
  const {
    currentUser,
    mode,
    aiStatus,
    unreadNotificationCount,
    logout,
    statusBanner,
    clearStatusBanner,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const studentNav: NavItem[] = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Report Lost', to: '/report-lost', icon: PlusCircle },
    { label: 'Report Found', to: '/report-found', icon: PackageCheck },
    { label: 'Browse Items', to: '/browse', icon: Search },
    { label: 'AI Matches', to: '/matches', icon: Sparkles },
    { label: 'My Reports', to: '/my-reports', icon: FileSearch },
    { label: 'My Claims', to: '/claims', icon: Compass },
    {
      label: 'Notifications',
      to: '/notifications',
      icon: Bell,
      badgeCount: unreadNotificationCount,
    },
    { label: 'Campus Heroes', to: '/leaderboard', icon: Trophy },
    { label: 'Badges', to: '/badges', icon: Award },
    { label: 'Rewards', to: '/rewards', icon: Gift },
    { label: 'Campus Map', to: '/campus-map', icon: MapPin },
    { label: 'My Profile', to: '/profile', icon: User },
    { label: 'Help & Support', to: '/help', icon: HelpCircle },
  ];

  const adminNav: NavItem[] = [
    { label: 'Overview', to: '/admin', icon: Shield },
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
    { label: 'Browse Reports', to: '/browse', icon: Search },
    { label: 'Claims & Disputes', to: '/claims', icon: Compass },
    { label: 'Campus Heroes', to: '/leaderboard', icon: Trophy },
    { label: 'Security Desk', to: '/security', icon: PackageCheck },
    { label: 'Campus Map', to: '/campus-map', icon: MapPin },
    { label: 'Notifications', to: '/notifications', icon: Bell, badgeCount: unreadNotificationCount },
    { label: 'Help & Support', to: '/help', icon: HelpCircle },
  ];

  const securityNav: NavItem[] = [
    { label: 'Security Dashboard', to: '/security', icon: Shield },
    { label: 'Claims Verification', to: '/claims', icon: Compass },
    { label: 'Browse Items', to: '/browse', icon: Search },
    { label: 'Campus Map', to: '/campus-map', icon: MapPin },
    { label: 'Notifications', to: '/notifications', icon: Bell, badgeCount: unreadNotificationCount },
    { label: 'My Profile', to: '/profile', icon: User },
    { label: 'Help & Support', to: '/help', icon: HelpCircle },
  ];

  const navItems =
    currentUser?.role === 'admin'
      ? adminNav
      : currentUser?.role === 'security'
        ? securityNav
        : studentNav;

  const handleSignOut = async () => {
    await logout();
    navigate('/auth');
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#10243B] text-white">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white whitespace-nowrap"
        >
          <CampusFindLogoMark />
          <span>CampusFind</span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-xs font-medium text-slate-300 truncate">{currentUser?.name}</p>
        <p className="text-xs text-slate-400 truncate">
          {currentUser?.role === 'admin'
            ? 'Administrator'
            : currentUser?.role === 'security'
              ? 'Campus Security Staff'
              : `${currentUser?.department || 'Student'} · ${currentUser?.totalXP ?? 0} XP`}
        </p>
      </div>

      <nav aria-label="Portal sidebar" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#1769AA] text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs font-mono-num font-semibold bg-[#16A36A] text-white rounded">
                  {item.badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <Link
          to="/profile"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings & Privacy</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open portal navigation"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#10243B] truncate">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500 whitespace-nowrap">
              {mode === 'live' ? 'Live Firebase' : 'Local Workspace'} ·{' '}
              {aiStatus.geminiConfigured ? 'Gemini AI Active' : 'Deterministic Matching'}
            </span>
            <Link
              to="/notifications"
              aria-label="View notifications"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="sr-only">{unreadNotificationCount} unread notifications</span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {statusBanner && (
            <div
              role="status"
              className={`mb-6 px-4 py-3 rounded-lg border flex items-center justify-between gap-4 text-sm ${
                statusBanner.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : statusBanner.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-blue-50 border-blue-200 text-[#10243B]'
              }`}
            >
              <span>{statusBanner.message}</span>
              <button
                type="button"
                onClick={clearStatusBanner}
                aria-label="Dismiss notification banner"
                className="text-xs font-medium underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
};
