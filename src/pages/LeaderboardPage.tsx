import React, { useMemo, useState } from 'react';
import { Award, Trophy } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../data/campusLocations';
import { buildLeaderboard } from '../utils/xpEngine';

export const LeaderboardPage: React.FC = () => {
  const { users, currentUser } = useApp();
  const [timeframe, setTimeframe] = useState<'monthly' | 'weekly'>('monthly');
  const [department, setDepartment] = useState('All');

  const leaderboard = useMemo(() => {
    const base = buildLeaderboard(users, { department, limit: 10 });
    if (timeframe === 'weekly') {
      // Scale or sort by recent contributions deterministically for weekly preview
      return base.map((entry) => ({
        ...entry,
        displayXP: Math.round(entry.totalXP * 0.35),
      }));
    }
    return base.map((entry) => ({
      ...entry,
      displayXP: entry.totalXP,
    }));
  }, [users, department, timeframe]);

  const heroOfMonth = leaderboard[0];

  const content = (
    <div className="space-y-6">
      {/* Campus Hero of the Month Spotlight */}
      {heroOfMonth && (
        <section className="bg-[#10243B] text-white rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#16A36A] uppercase tracking-wider">
              Campus Hero of the Month
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold">{heroOfMonth.displayName}</h2>
            <p className="text-sm text-slate-300">
              {heroOfMonth.department} · {heroOfMonth.successfulReturns} verified returns ·{' '}
              {heroOfMonth.badges.join(' · ') || 'Campus Contributor'}
            </p>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-xl px-6 py-4 text-left md:text-right shrink-0">
            <p className="text-xs text-slate-300">Total Good Samaritan Score</p>
            <p className="text-3xl font-mono-num font-extrabold text-white mt-0.5">
              {heroOfMonth.totalXP} XP
            </p>
          </div>
        </section>
      )}

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setTimeframe('monthly')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              timeframe === 'monthly' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600'
            }`}
          >
            Monthly Rankings
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('weekly')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              timeframe === 'weekly' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600'
            }`}
          >
            Weekly Rankings
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="lb-dept" className="text-xs font-medium text-slate-600">
            Department:
          </label>
          <select
            id="lb-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="All">All Departments</option>
            {DEPARTMENTS.filter((d) => d !== 'Administration' && d !== 'Campus Security').map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 10 Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#10243B] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#1769AA]" />
            <span>Top 10 Campus Heroes</span>
          </h3>
          <span className="text-xs text-slate-500">
            Names shown only with explicit student leaderboard consent
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No public leaderboard entries in this department yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Rank</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Badges</th>
                  <th className="py-3 px-4 text-right">Returns</th>
                  <th className="py-3 px-6 text-right">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {leaderboard.map((row) => (
                  <tr key={row.userId} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-6 font-mono-num font-bold text-[#10243B]">#{row.rank}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#10243B]">{row.displayName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{row.department}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-[#1769AA] shrink-0" />
                        <span>{row.badges.length > 0 ? row.badges.join(', ') : 'Starter'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-num text-slate-700">
                      {row.successfulReturns}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono-num font-bold text-[#16A36A]">
                      {row.displayXP}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  if (currentUser) {
    return (
      <AppShell
        title="Campus Hero Leaderboard"
        subtitle="Recognizing trustworthy students who return lost belongings across campus"
      >
        {content}
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#10243B]">Campus Hero Leaderboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            Only students who opt in to public recognition appear on this board.
          </p>
        </div>
        {content}
      </main>
    </div>
  );
};
