import React from 'react';
import { Award, CheckCircle2, Lock } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { BADGE_CATALOG } from '../utils/xpEngine';

export const BadgesPage: React.FC = () => {
  const { currentUser } = useApp();
  const returnsCount = currentUser?.successfulReturns ?? 0;

  return (
    <AppShell
      title="Achievements & Badges"
      subtitle="Earn Good Samaritan milestones through verified item returns"
    >
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Your Verified Returns</p>
          <p className="text-2xl font-mono-num font-bold text-[#10243B]">{returnsCount} returns</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Unlocked Badges</p>
          <p className="text-2xl font-mono-num font-bold text-[#16A36A]">
            {currentUser?.badges.length ?? 0} / {BADGE_CATALOG.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BADGE_CATALOG.map((badge) => {
          const unlocked = currentUser?.badges.includes(badge.name) ?? false;
          const pct = Math.min(100, Math.round((returnsCount / badge.requiredReturns) * 100));

          return (
            <article
              key={badge.id}
              className={`bg-white border rounded-xl p-6 flex flex-col justify-between ${
                unlocked ? 'border-[#16A36A]' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-slate-500">{badge.tier} Tier</span>
                  {unlocked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16A36A]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      unlocked ? 'bg-emerald-50 text-[#16A36A]' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-[#10243B]">{badge.name}</h2>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-4">{badge.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Progress</span>
                  <span className="font-mono-num">
                    {Math.min(returnsCount, badge.requiredReturns)} / {badge.requiredReturns} returns
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${unlocked ? 'bg-[#16A36A]' : 'bg-[#1769AA]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
};
