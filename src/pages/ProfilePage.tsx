import React, { useMemo, useState } from 'react';
import { Award, Shield, UserCheck } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../data/campusLocations';
import { buildLeaderboard } from '../utils/xpEngine';

export const ProfilePage: React.FC = () => {
  const { currentUser, users, items, claims, rewards, updateProfile } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [department, setDepartment] = useState(currentUser?.department || DEPARTMENTS[0]);
  const [studentId, setStudentId] = useState(currentUser?.studentId || '');
  const [consent, setConsent] = useState(currentUser?.publicLeaderboardConsent ?? true);
  const [saved, setSaved] = useState(false);

  const myLost = useMemo(
    () => items.filter((i) => i.reportedBy === currentUser?.userId && i.type === 'lost'),
    [items, currentUser]
  );
  const myFound = useMemo(
    () => items.filter((i) => i.reportedBy === currentUser?.userId && i.type === 'found'),
    [items, currentUser]
  );
  const myClaims = useMemo(
    () => claims.filter((c) => c.claimantId === currentUser?.userId),
    [claims, currentUser]
  );
  const myRewards = useMemo(
    () => rewards.filter((r) => r.userId === currentUser?.userId),
    [rewards, currentUser]
  );

  const board = useMemo(() => buildLeaderboard(users, { includePrivate: true }), [users]);
  const myRank = board.find((b) => b.userId === currentUser?.userId)?.rank ?? '—';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      name,
      department,
      studentId,
      publicLeaderboardConsent: consent,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AppShell
      title="My Profile & Privacy Settings"
      subtitle="Manage academic details, leaderboard consent, and contribution history"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Profile Overview & Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-[#10243B] text-white flex items-center justify-center text-xl font-bold shrink-0">
              {currentUser?.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#10243B]">{currentUser?.name}</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {currentUser?.department} · {currentUser?.email}
              </p>
              <p className="text-xs font-semibold text-[#1769AA] mt-1">
                {currentUser?.totalXP ?? 0} Total XP · Rank #{myRank} · {currentUser?.successfulReturns ?? 0} Returns
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#10243B] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#1769AA]" />
              <span>Account & Privacy Preferences</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="prof-stuid" className="block text-xs font-medium text-slate-700 mb-1">
                  Student / Staff ID
                </label>
                <input
                  id="prof-stuid"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="prof-dept" className="block text-xs font-medium text-slate-700 mb-1">
                Department
              </label>
              <select
                id="prof-dept"
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

            <label className="flex items-start gap-2.5 p-3.5 rounded-lg bg-[#F6F8FB] border border-slate-200 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                <strong className="block text-[#10243B]">Public Leaderboard Consent</strong>
                Allow my name and Good Samaritan XP score to appear on the Campus Hero Leaderboard.
              </span>
            </label>

            <div className="flex items-center justify-between pt-2">
              {saved ? (
                <span className="text-xs font-semibold text-[#16A36A]">Settings saved</span>
              ) : (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> PII isolated from public queries
                </span>
              )}
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B]"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </div>

        {/* Right: Badges, Reports & History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-[#10243B] flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-[#16A36A]" />
              <span>Earned Badges</span>
            </h3>
            {currentUser?.badges.length ? (
              <div className="flex flex-wrap gap-2">
                {currentUser.badges.map((b) => (
                  <span
                    key={b}
                    className="text-xs font-semibold text-[#10243B] bg-[#F6F8FB] border border-slate-200 px-3 py-1.5 rounded-lg"
                  >
                    {b}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Complete your first verified return to unlock First Helper.</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h3 className="text-base font-bold text-[#10243B]">Contribution Summary</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#F6F8FB] rounded-lg">
                <p className="text-lg font-mono-num font-bold text-[#10243B]">{myLost.length}</p>
                <p className="text-xs text-slate-500">Lost Reports</p>
              </div>
              <div className="p-3 bg-[#F6F8FB] rounded-lg">
                <p className="text-lg font-mono-num font-bold text-[#10243B]">{myFound.length}</p>
                <p className="text-xs text-slate-500">Found Reports</p>
              </div>
              <div className="p-3 bg-[#F6F8FB] rounded-lg">
                <p className="text-lg font-mono-num font-bold text-[#10243B]">{myClaims.length}</p>
                <p className="text-xs text-slate-500">Claims</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-[#10243B] mb-3">Reward History</h3>
            {myRewards.length === 0 ? (
              <p className="text-xs text-slate-500">No XP transactions recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {myRewards.map((r) => (
                  <div key={r.rewardId} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2 last:border-0">
                    <span className="text-slate-700 truncate pr-2">{r.activity}</span>
                    <span className="font-mono-num font-bold text-[#16A36A] whitespace-nowrap">
                      +{r.points} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
