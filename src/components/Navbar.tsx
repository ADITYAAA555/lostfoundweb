import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CampusFindLogoMark: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="28" height="28" rx="7" fill="#10243B" />
    <circle cx="13" cy="13" r="5.5" stroke="#FFFFFF" strokeWidth="2.2" />
    <path d="M17.2 17.2L21.5 21.5" stroke="#16A36A" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const Navbar: React.FC = () => {
  const { currentUser } = useApp();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const portalPath =
    currentUser?.role === 'admin'
      ? '/admin'
      : currentUser?.role === 'security'
        ? '/security'
        : '/dashboard';

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Browse Items', to: '/browse' },
    { label: 'Campus Map', to: '/campus-map' },
    { label: 'Leaderboard', to: '/leaderboard' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#10243B] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1769AA] rounded-md"
        >
          <CampusFindLogoMark />
          <span>CampusFind</span>
        </Link>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors hover:text-[#10243B] ${
                isActive(link.to)
                  ? 'text-[#1769AA] underline underline-offset-8 decoration-2'
                  : 'text-slate-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <Link
              to={portalPath}
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B] transition-colors whitespace-nowrap shrink-0"
            >
              Open Portal
            </Link>
          ) : (
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B] transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                isActive(link.to)
                  ? 'bg-slate-100 text-[#1769AA]'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to={currentUser ? portalPath : '/auth'}
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-[#1769AA] rounded-lg mt-2"
          >
            {currentUser ? 'Open Portal' : 'Sign In / Register'}
          </Link>
        </div>
      )}
    </header>
  );
};
