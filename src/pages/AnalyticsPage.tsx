import React, { useMemo } from 'react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';

export const AnalyticsPage: React.FC = () => {
  const { items, users } = useApp();

  const metrics = useMemo(() => {
    const totalLost = items.filter((i) => i.type === 'lost').length;
    const totalFound = items.filter((i) => i.type === 'found').length;
    const returned = items.filter((i) => i.status === 'Returned').length;
    const pending = items.filter((i) => i.status !== 'Returned' && i.status !== 'Closed').length;
    const total = totalLost + totalFound;
    const recoveryPct = total > 0 ? Math.round((returned / total) * 100) : 0;

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const it of items) {
      catMap.set(it.category, (catMap.get(it.category) || 0) + 1);
    }
    const categories = Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Department activity
    const deptMap = new Map<string, { returns: number; xp: number }>();
    for (const u of users.filter((usr) => usr.role === 'student')) {
      const prev = deptMap.get(u.department) || { returns: 0, xp: 0 };
      deptMap.set(u.department, {
        returns: prev.returns + u.successfulReturns,
        xp: prev.xp + u.totalXP,
      });
    }
    const departments = Array.from(deptMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.xp - a.xp);

    // Monthly series computed purely from actual items over the last 4 calendar months
    const now = new Date();
    const monthBuckets = Array.from({ length: 4 }, (_, offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (3 - offset), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: d.toLocaleString('en-US', { month: 'short' }),
        lost: 0,
        found: 0,
        returned: 0,
      };
    });

    for (const it of items) {
      const created = new Date(it.createdAt);
      if (Number.isNaN(created.getTime())) continue;
      const bucket = monthBuckets.find(
        (b) => b.key === `${created.getFullYear()}-${created.getMonth()}`
      );
      if (bucket) {
        if (it.type === 'lost') bucket.lost += 1;
        else bucket.found += 1;
        if (it.status === 'Returned') bucket.returned += 1;
      }
    }

    const returnedWithDuration = items.filter((i) => i.status === 'Returned' && i.updatedAt);
    let avgRecoveryLabel = '—';
    if (returnedWithDuration.length > 0) {
      const totalHours = returnedWithDuration.reduce((sum, item) => {
        const diffMs = Math.max(
          0,
          new Date(item.updatedAt as string).getTime() - new Date(item.createdAt).getTime()
        );
        return sum + diffMs / 36e5;
      }, 0);
      avgRecoveryLabel = `${(totalHours / returnedWithDuration.length).toFixed(1)} hrs`;
    }

    return {
      totalLost,
      totalFound,
      returned,
      pending,
      recoveryPct,
      avgRecoveryLabel,
      categories,
      departments,
      monthly: monthBuckets,
    };
  }, [items, users]);

  const maxMonthly = Math.max(...metrics.monthly.map((m) => Math.max(m.lost, m.found)), 1);
  const maxCat = Math.max(...metrics.categories.map((c) => c.count), 1);

  return (
    <AppShell
      title="Campus Recovery Analytics"
      subtitle="Operational visibility into lost trends, recovery rates, and department participation"
    >
      {/* KPI Row */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Active Lost</p>
          <p className="text-2xl font-mono-num font-bold text-amber-700 mt-1">{metrics.totalLost}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Active Found</p>
          <p className="text-2xl font-mono-num font-bold text-[#1769AA] mt-1">{metrics.totalFound}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Recovered</p>
          <p className="text-2xl font-mono-num font-bold text-[#16A36A] mt-1">{metrics.returned}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pending Cases</p>
          <p className="text-2xl font-mono-num font-bold text-[#10243B] mt-1">{metrics.pending}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Recovery Rate</p>
          <p className="text-2xl font-mono-num font-bold text-[#16A36A] mt-1">{metrics.recoveryPct}%</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Avg Recovery Time</p>
          <p className="text-2xl font-mono-num font-bold text-[#10243B] mt-1">{metrics.avgRecoveryLabel}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Monthly Reports Bar Chart */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#10243B]">Monthly Lost vs Found vs Recovered</h2>
              <p className="text-xs text-slate-500">Semester intake and resolution volume</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10243B]" /> Lost
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1769AA]" /> Found
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#16A36A]" /> Returned
              </span>
            </div>
          </div>

          <div className="h-56 flex items-end justify-between gap-2 sm:gap-6 px-1 sm:px-2 pt-4 border-b border-slate-200">
            {metrics.monthly.map((m) => (
              <div key={m.month} className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-44">
                  <div
                    className="w-2.5 sm:w-5 bg-[#10243B] rounded-t"
                    style={{ height: `${Math.round((m.lost / maxMonthly) * 100)}%` }}
                    title={`Lost: ${m.lost}`}
                  />
                  <div
                    className="w-2.5 sm:w-5 bg-[#1769AA] rounded-t"
                    style={{ height: `${Math.round((m.found / maxMonthly) * 100)}%` }}
                    title={`Found: ${m.found}`}
                  />
                  <div
                    className="w-2.5 sm:w-5 bg-[#16A36A] rounded-t"
                    style={{ height: `${Math.round((m.returned / maxMonthly) * 100)}%` }}
                    title={`Returned: ${m.returned}`}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600 pb-2">{m.month}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Most Commonly Lost Categories */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-[#10243B] mb-1">Most Reported Categories</h2>
          <p className="text-xs text-slate-500 mb-5">Active campus dataset distribution</p>

          <div className="space-y-4">
            {metrics.categories.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No reports recorded yet.</p>
            ) : (
              metrics.categories.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#10243B]">{cat.name}</span>
                    <span className="font-mono-num text-slate-600">{cat.count} reports</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1769AA] rounded-full"
                      style={{ width: `${Math.round((cat.count / maxCat) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Most Active Departments */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-bold text-[#10243B] mb-4">Most Active Departments (Good Samaritan Engagement)</h2>
        {metrics.departments.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No department participation recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.departments.map((dept) => (
              <div key={dept.name} className="p-4 rounded-lg bg-[#F6F8FB] border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#10243B]">{dept.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{dept.returns} verified returns</p>
                </div>
                <span className="text-sm font-mono-num font-bold text-[#16A36A]">{dept.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
};
