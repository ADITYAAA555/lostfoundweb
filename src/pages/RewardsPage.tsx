import React, { useMemo } from 'react';
import { Gift, Ticket } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { getAvailableXP } from '../utils/xpEngine';

export const RewardsPage: React.FC = () => {
  const { currentUser, rewardCatalog, redemptions, rewards, redeemReward } = useApp();

  const availableXP = useMemo(
    () => (currentUser ? getAvailableXP(currentUser.totalXP, redemptions, currentUser.userId) : 0),
    [currentUser, redemptions]
  );

  const myRedemptions = useMemo(
    () => redemptions.filter((r) => r.userId === currentUser?.userId),
    [redemptions, currentUser]
  );

  const myTransactions = useMemo(
    () => rewards.filter((r) => r.userId === currentUser?.userId),
    [rewards, currentUser]
  );

  return (
    <AppShell
      title="Rewards & Good Samaritan Perks"
      subtitle="Simulated campus reward redemption backed by verified XP ledger"
    >
      {/* XP Balance Header */}
      <div className="bg-[#10243B] text-white rounded-xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-300">Available Redemption Balance</p>
          <p className="text-3xl font-mono-num font-extrabold mt-1">{availableXP} XP</p>
          <p className="text-xs text-slate-300 mt-1">
            Lifetime Earned: <span className="font-mono-num font-semibold">{currentUser?.totalXP ?? 0} XP</span> · Valid found report: +10 XP · Verified return: +100 XP · 5th return bonus: +100 XP
          </p>
        </div>
        <span className="text-xs text-slate-300 bg-white/10 px-3 py-2 rounded-lg">
          Prototype Simulation · No real monetary charges
        </span>
      </div>

      {/* Rewards Catalog */}
      <h2 className="text-lg font-bold text-[#10243B] mb-4">Available Campus Rewards</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {rewardCatalog.map((item) => {
          const canAfford = availableXP >= item.xpCost;
          return (
            <article key={item.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#1769AA] mb-1">
                  {item.category} · {item.partner}
                </p>
                <h3 className="text-base font-bold text-[#10243B] mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{item.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-mono-num font-bold text-[#10243B]">{item.xpCost} XP</p>
                  <p className="text-xs text-slate-500">{item.stockLabel}</p>
                </div>
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => redeemReward(item)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    canAfford
                      ? 'bg-[#1769AA] text-white hover:bg-[#12558B]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{canAfford ? 'Redeem' : 'Need more XP'}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Redemption History */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-[#10243B] flex items-center gap-2 mb-4">
            <Ticket className="w-4 h-4 text-[#1769AA]" />
            <span>My Redeemed Vouchers</span>
          </h2>
          {myRedemptions.length === 0 ? (
            <p className="text-sm text-slate-500">No vouchers redeemed yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {myRedemptions.map((red) => (
                <div key={red.redemptionId} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#10243B]">{red.rewardTitle}</p>
                    <p className="text-xs text-slate-500">
                      Code: <span className="font-mono-num font-bold text-[#1769AA]">{red.voucherCode}</span> ·{' '}
                      {new Date(red.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs font-mono-num font-semibold text-slate-600">
                    -{red.xpCost} XP · {red.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* XP Ledger */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-[#10243B] mb-4">Verified XP Ledger</h2>
          {myTransactions.length === 0 ? (
            <p className="text-sm text-slate-500">No XP entries recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {myTransactions.map((tx) => (
                <div key={tx.rewardId} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#10243B]">{tx.activity}</p>
                    <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-mono-num font-bold text-[#16A36A] whitespace-nowrap">
                    +{tx.points} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};
