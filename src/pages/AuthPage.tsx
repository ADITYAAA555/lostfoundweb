import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, KeyRound, Shield, UserPlus } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../data/campusLocations';
import type { UserRole } from '../types/campusfind';

export const AuthPage: React.FC = () => {
  const {
    currentUser,
    loginWithEmail,
    registerAccount,
    resetLocalPassword,
    loginWithGoogle,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [role, setRole] = useState<UserRole>('student');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const navigateAfterAuth = (userRole: UserRole) => {
    if (redirectTarget) {
      navigate(redirectTarget);
    } else if (userRole === 'admin') {
      navigate('/admin');
    } else if (userRole === 'security') {
      navigate('/security');
    } else {
      navigate('/dashboard');
    }
  };

  if (currentUser) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-[#16A36A] mx-auto" />
            <h1 className="text-xl font-bold text-[#10243B]">Signed in as {currentUser.name}</h1>
            <p className="text-sm text-slate-600">
              Role: {currentUser.role.toUpperCase()} · {currentUser.department}
            </p>
            <button
              type="button"
              onClick={() => navigateAfterAuth(currentUser.role)}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B]"
            >
              Continue to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Enter your institutional email and password.');
      return;
    }
    const res = loginWithEmail(email, password);
    if (!res.ok) {
      setErrorMsg(res.error || 'Unable to sign in.');
      return;
    }
    navigateAfterAuth(res.role || 'student');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fullName.trim() || !email.trim() || !studentId.trim()) {
      setErrorMsg('Complete all required account registration fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    const res = registerAccount({
      name: fullName,
      email,
      studentId,
      department,
      role,
      password,
    });
    if (!res.ok) {
      setErrorMsg(res.error || 'Registration failed.');
      return;
    }
    navigateAfterAuth(role);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (!email.includes('@')) {
      setErrorMsg('Enter a valid institutional email address.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    const res = resetLocalPassword(email, newPassword);
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not reset password.');
      return;
    }
    setInfoMsg('Password updated. You can now sign in with your new password.');
    setNewPassword('');
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Login / Registration Card */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-6 w-fit">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
                tab === 'login' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
                tab === 'register' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('forgot');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
                tab === 'forgot' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reset Password
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMsg}
            </div>
          )}
          {infoMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              {infoMsg}
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h1 className="text-xl font-bold text-[#10243B]">Sign in to CampusFind</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Continue with your Google account for Live Firebase sync, or sign in with your registered CampusFind credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await loginWithGoogle();
                }}
                className="w-full py-2.5 px-4 text-sm font-semibold text-[#10243B] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
              >
                <Shield className="w-4 h-4 text-[#1769AA]" />
                <span>Continue with Google (Live Firebase)</span>
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200" />
                <span className="px-3 text-xs text-slate-400">or sign in with registered email</span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Institutional Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B] transition-colors"
              >
                Sign In
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <h1 className="text-xl font-bold text-[#10243B]">Create CampusFind Account</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Register a clean account to report belongings, manage campus locations, or verify handovers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="reg-stuid" className="block text-xs font-medium text-slate-700 mb-1">
                    Student / Staff ID
                  </label>
                  <input
                    id="reg-stuid"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="ID-2026-0001"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-medium text-slate-700 mb-1">
                    Institutional Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@institution.edu"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="reg-role" className="block text-xs font-medium text-slate-700 mb-1">
                    Account Role
                  </label>
                  <select
                    id="reg-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="security">Campus Security Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="reg-dept" className="block text-xs font-medium text-slate-700 mb-1">
                  Department
                </label>
                <select
                  id="reg-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-pass" className="block text-xs font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    id="reg-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="reg-pass2" className="block text-xs font-medium text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="reg-pass2"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B]"
              >
                Create Account
              </button>
            </form>
          )}

          {tab === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <h1 className="text-xl font-bold text-[#10243B]">Password Reset</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your registered institutional email and choose a new password.
                </p>
              </div>
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Institutional Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label htmlFor="forgot-pass" className="block text-xs font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  id="forgot-pass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#10243B] rounded-lg hover:bg-[#1a3656]"
              >
                Update Password
              </button>
            </form>
          )}
        </div>

        {/* Right: Access & Setup Guidance */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-[#1769AA] mb-1">Workspace & Live Firebase</p>
            <h2 className="text-lg font-bold text-[#10243B]">Clean Campus Setup</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              CampusFind starts completely clean without pre-loaded sample logins or default item listings. Create an account or connect with Google to begin.
            </p>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-4 rounded-lg bg-[#F6F8FB] border border-slate-200 space-y-1">
              <p className="font-bold text-[#10243B] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#1769AA]" />
                <span>Role-Based Access</span>
              </p>
              <p>
                Students report items and claim belongings. Campus Security Staff verify custody and handovers. Administrators edit the campus map, locations, categories, and moderation queue.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#F6F8FB] border border-slate-200 space-y-1">
              <p className="font-bold text-[#10243B] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#16A36A]" />
                <span>Private Ownership Protection</span>
              </p>
              <p>
                Identifying clues and exact drop spots remain hidden from public listings and are visible only to the reporter, security staff, and administrators.
              </p>
            </div>
          </div>

          {tab !== 'register' && (
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className="w-full py-2.5 px-4 text-xs font-semibold text-[#1769AA] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Register a New Account
            </button>
          )}
        </aside>
      </main>
    </div>
  );
};
