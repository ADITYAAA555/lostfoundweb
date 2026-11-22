import React, { useMemo, useState } from 'react';
import { CheckCircle2, Lock, PackageCheck, Shield } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';

export const SecurityDashboardPage: React.FC = () => {
  const {
    rawItemsForPrivileged,
    handovers,
    claims,
    registerSecurityHandover,
    confirmSecurityCollection,
    reviewClaim,
  } = useApp();

  const [selectedItemId, setSelectedItemId] = useState('');
  const [storageLocation, setStorageLocation] = useState('Main Gate Vault B · Drawer 03');
  const [collectorId, setCollectorId] = useState('');

  const eligibleForIntake = useMemo(
    () =>
      rawItemsForPrivileged.filter(
        (i) => i.type === 'found' && i.status !== 'Returned' && i.status !== 'Closed'
      ),
    [rawItemsForPrivileged]
  );

  const pendingClaims = useMemo(
    () => claims.filter((c) => c.verificationStatus !== 'Completed' && c.verificationStatus !== 'Rejected'),
    [claims]
  );

  const handleLogHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedItemId || eligibleForIntake[0]?.itemId;
    if (!targetId || !storageLocation.trim()) return;
    await registerSecurityHandover({ itemId: targetId, storageLocation });
  };

  return (
    <AppShell
      title="University Security Custody Console"
      subtitle="Register valuable handed-over items, manage locked storage, verify owners, and confirm collection"
    >
      {/* Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Items in Custody</p>
          <p className="text-2xl font-mono-num font-bold text-[#10243B] mt-1">
            {handovers.filter((h) => h.status !== 'Collected').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Claims Under Review</p>
          <p className="text-2xl font-mono-num font-bold text-amber-700 mt-1">{pendingClaims.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Collected & Returned</p>
          <p className="text-2xl font-mono-num font-bold text-[#16A36A] mt-1">
            {handovers.filter((h) => h.status === 'Collected').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Custody Logs</p>
          <p className="text-2xl font-mono-num font-bold text-[#10243B] mt-1">{handovers.length}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Intake Handover Form */}
        <form onSubmit={handleLogHandover} className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-[#10243B] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#1769AA]" />
            <span>Register Handed-Over Item</span>
          </h2>
          <p className="text-xs text-slate-600">
            Generates a unique custody reference ID (`SEC-YYYY-XXXX`) and restricts storage location visibility to authorized security staff.
          </p>

          <div>
            <label htmlFor="sec-item" className="block text-xs font-medium text-slate-700 mb-1">
              Found Item Report
            </label>
            <select
              id="sec-item"
              value={selectedItemId || eligibleForIntake[0]?.itemId || ''}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {eligibleForIntake.map((it) => (
                <option key={it.itemId} value={it.itemId}>
                  {it.title} ({it.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sec-vault" className="block text-xs font-medium text-slate-700 mb-1">
              Restricted Storage Location
            </label>
            <input
              id="sec-vault"
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g., Central Desk Vault A · Drawer 07"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={eligibleForIntake.length === 0}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#10243B] rounded-lg hover:bg-[#1a3656] disabled:opacity-50"
          >
            Generate Reference ID & Log Custody
          </button>
        </form>

        {/* Active Claims Verification */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-[#10243B] flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-[#16A36A]" />
            <span>Ownership Verification Queue</span>
          </h2>

          {pendingClaims.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No pending claims awaiting security review.</p>
          ) : (
            <div className="space-y-3">
              {pendingClaims.map((claim) => {
                const item = rawItemsForPrivileged.find((i) => i.itemId === claim.itemId);
                return (
                  <div key={claim.claimId} className="p-4 rounded-lg bg-[#F6F8FB] border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#10243B]">{item?.title || claim.itemId}</p>
                      <span className="text-xs font-semibold text-amber-700">{claim.verificationStatus}</span>
                    </div>
                    <p className="text-xs text-slate-700">
                      Claimant: {claim.claimantName || claim.claimantId} · Submitted Proof: {claim.privateDetailAttempt}
                    </p>
                    {item?.privateFeatures && (
                      <p className="text-xs text-[#1769AA] font-medium">
                        Vault Private Record: {item.privateFeatures}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => reviewClaim(claim.claimId, 'Security Verified', 'ID checked at Security Desk')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1769AA] rounded-lg"
                      >
                        Verify Owner ID
                      </button>
                      <button
                        type="button"
                        onClick={() => reviewClaim(claim.claimId, 'Completed', 'Collected from Security Desk')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#16A36A] rounded-lg"
                      >
                        Confirm Collection (+100 XP)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Custody & Collection Records Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[#10243B] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#1769AA]" />
            <span>Custody & Handover Records</span>
          </h2>
          <input
            type="text"
            value={collectorId}
            onChange={(e) => setCollectorId(e.target.value)}
            placeholder="Optional Student ID for collection log..."
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Reference ID</th>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Restricted Storage</th>
                <th className="py-3 px-4">Receiving Officer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {handovers.map((ho) => {
                const item = rawItemsForPrivileged.find((i) => i.itemId === ho.itemId);
                return (
                  <tr key={ho.handoverId}>
                    <td className="py-3.5 px-6 font-mono-num font-bold text-[#10243B]">{ho.referenceCode}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#10243B]">{item?.title || ho.itemId}</td>
                    <td className="py-3.5 px-4 text-slate-600">{ho.storageLocation}</td>
                    <td className="py-3.5 px-4 text-slate-600">{ho.receivingStaffName}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#1769AA]">{ho.status}</td>
                    <td className="py-3.5 px-6 text-right">
                      {ho.status !== 'Collected' ? (
                        <button
                          type="button"
                          onClick={() => confirmSecurityCollection(ho.handoverId, collectorId || undefined)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#16A36A] rounded-lg hover:bg-[#128656]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Collected</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Collected {ho.collectionDate ? new Date(ho.collectionDate).toLocaleDateString() : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
};
