import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, PackageCheck, PlusCircle, Search, Sparkles, Trophy } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { buildLeaderboard, getAvailableXP } from '../utils/xpEngine';

export const StudentDashboard: React.FC = () => {
  const { currentUser, items, claims, matches, notifications, users, redemptions, rewards } = useApp();

  const myReports = useMemo(
    () => items.filter((i) => i.reportedBy === currentUser?.userId),
    [items, currentUser]
  );

  const myClaims = useMemo(
    () => claims.filter((c) => c.claimantId === currentUser?.userId),
    [claims, currentUser]
  );

  const myMatches = useMemo(
    () =>
      matches.filter(
        (m) => m.lostOwnerId === currentUser?.userId || m.foundReporterId === currentUser?.userId
      ),
    [matches, currentUser]
  );

  const myNotifications = useMemo(
    () => notifications.filter((n) => n.userId === currentUser?.userId).slice(0, 4),
    [notifications, currentUser]
  );

  const myRewards = useMemo(
    () => rewards.filter((r) => r.userId === currentUser?.userId).slice(0, 4),
    [rewards, currentUser]
  );

  const leaderboard = useMemo(() => buildLeaderboard(users, { includePrivate: true }), [users]);
  const myRank = leaderboard.find((e) => e.userId === currentUser?.userId)?.rank ?? '—';
  const availableXP = currentUser ? getAvailableXP(currentUser.totalXP, redemptions, currentUser.userId) : 0;

  return (
    <AppShell
      title={`Welcome back, ${currentUser?.name || 'Student'}`}
      subtitle={`${currentUser?.department} · Student ID ${currentUser?.studentId}`}
    >
      {/* Quick Actions */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          to="/report-lost"
          className="p-4 rounded-xl bg-[#10243B] text-white hover:bg-[#193554] transition-colors flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-sm font-bold">Report Lost Item</p>
            <p className="text-xs text-slate-300 mt-0.5">Trigger instant AI matching</p>
          </div>
          <PlusCircle className="w-5 h-5 shrink-0" />
        </Link>

        <Link
          to="/report-found"
          className="p-4 rounded-xl bg-[#1769AA] text-white hover:bg-[#12558B] transition-colors flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-sm font-bold">Report Found Item</p>
            <p className="text-xs text-blue-100 mt-0.5">Earn +10 XP on valid report</p>
          </div>
          <PackageCheck className="w-5 h-5 shrink-0" />
        </Link>

        <Link
          to="/browse"
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-sm font-bold text-[#10243B]">Browse Items</p>
            <p className="text-xs text-slate-500 mt-0.5">{items.length} active campus listings</p>
          </div>
          <Search className="w-5 h-5 text-[#1769AA] shrink-0" />
        </Link>

        <Link
          to="/matches"
          className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-sm font-bold text-[#10243B]">View AI Matches</p>
            <p className="text-xs text-slate-500 mt-0.5">{myMatches.length} suggested matches</p>
          </div>
          <Sparkles className="w-5 h-5 text-[#16A36A] shrink-0" />
        </Link>
      </section>

      {/* 6 KPI Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Reports</p>
          <p className="text-2xl font-bold text-[#10243B] font-mono-num mt-1">{myReports.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Items Returned</p>
          <p className="text-2xl font-bold text-[#16A36A] font-mono-num mt-1">
            {currentUser?.successfulReturns ?? 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pending Claims</p>
          <p className="text-2xl font-bold text-amber-700 font-mono-num mt-1">
            {myClaims.filter((c) => c.verificationStatus === 'Pending').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">AI Matches</p>
          <p className="text-2xl font-bold text-[#1769AA] font-mono-num mt-1">{myMatches.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Available XP</p>
          <p className="text-2xl font-bold text-[#10243B] font-mono-num mt-1">{availableXP}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Campus Rank</p>
          <p className="text-2xl font-bold text-[#10243B] font-mono-num mt-1">#{myRank}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top AI Match Suggestions */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#10243B]">Potential AI Matches</h2>
            <Link to="/matches" className="text-xs font-semibold text-[#1769AA] hover:underline flex items-center gap-1">
              <span>Inspect all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {myMatches.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No active AI matches yet. Report a lost or found item to run smart similarity scoring.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myMatches.slice(0, 4).map((m) => {
                const lostItem = items.find((i) => i.itemId === m.lostItemId);
                const foundItem = items.find((i) => i.itemId === m.foundItemId);
                return (
                  <div key={m.matchId} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#10243B] truncate">
                        {foundItem?.title || lostItem?.title || 'Matched Item'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {m.tier} · {m.reasons.slice(0, 2).join(' · ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-mono-num font-bold text-[#16A36A]">{m.combinedScore}%</p>
                      <Link to="/matches" className="text-xs font-medium text-[#1769AA] hover:underline">
                        Review
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Notifications & XP Activity */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#10243B] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#1769AA]" />
                <span>Recent Notifications</span>
              </h2>
              <Link to="/notifications" className="text-xs font-semibold text-[#1769AA] hover:underline">
                View all
              </Link>
            </div>
            {myNotifications.length === 0 ? (
              <p className="text-sm text-slate-500">You are all caught up.</p>
            ) : (
              <div className="space-y-3">
                {myNotifications.map((n) => (
                  <div key={n.notificationId} className="text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                    <p className={n.isRead ? 'text-slate-600' : 'text-[#10243B] font-medium'}>{n.message}</p>
                    <p className="text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#10243B] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#16A36A]" />
                <span>Recent XP Activity</span>
              </h2>
              <Link to="/rewards" className="text-xs font-semibold text-[#1769AA] hover:underline">
                Redeem XP
              </Link>
            </div>
            {myRewards.length === 0 ? (
              <p className="text-sm text-slate-500">Report a found item or complete a return to earn XP.</p>
            ) : (
              <div className="space-y-2.5">
                {myRewards.map((r) => (
                  <div key={r.rewardId} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-700 truncate">{r.activity}</span>
                    <span className="font-mono-num font-bold text-[#16A36A] whitespace-nowrap">
                      +{r.points} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
};
