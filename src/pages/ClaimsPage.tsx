import React, { useMemo, useState } from 'react';
import { CheckCircle2, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';

export const ClaimsPage: React.FC = () => {
  const { currentUser, claims, rawItemsForPrivileged, reviewClaim } = useApp();
  const [tab, setTab] = useState<'review' | 'mine'>(
    currentUser?.role === 'admin' || currentUser?.role === 'security' ? 'review' : 'mine'
  );
  const [noteByClaim, setNoteByClaim] = useState<Record<string, string>>({});

  const mySubmittedClaims = useMemo(
    () => claims.filter((c) => c.claimantId === currentUser?.userId),
    [claims, currentUser]
  );

  const claimsToReview = useMemo(() => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'security') {
      return claims;
    }
    return claims.filter((c) => c.itemOwnerId === currentUser?.userId);
  }, [claims, currentUser]);

  const activeList = tab === 'mine' ? mySubmittedClaims : claimsToReview;

  return (
    <AppShell
      title="Claims & Ownership Verification"
      subtitle="Verify private identifying features before releasing campus belongings"
    >
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('mine')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
              tab === 'mine' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600'
            }`}
          >
            My Submitted Claims ({mySubmittedClaims.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('review')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
              tab === 'review' ? 'bg-white text-[#10243B] shadow-sm' : 'text-slate-600'
            }`}
          >
            Verification Queue ({claimsToReview.length})
          </button>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#1769AA]" />
          <span>Students cannot self-approve claims; verification requires finder, security, or admin review.</span>
        </p>
      </div>

      {activeList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
          No claims in this queue yet.
        </div>
      ) : (
        <div className="space-y-4">
          {activeList.map((claim) => {
            const item = rawItemsForPrivileged.find((i) => i.itemId === claim.itemId);
            const isReviewer =
              currentUser?.role === 'admin' ||
              currentUser?.role === 'security' ||
              currentUser?.userId === claim.itemOwnerId;
            const isClosed =
              claim.verificationStatus === 'Completed' || claim.verificationStatus === 'Rejected';

            return (
              <article key={claim.claimId} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Claim ID {claim.claimId} · Submitted {new Date(claim.createdAt).toLocaleString()}
                    </p>
                    <h2 className="text-lg font-bold text-[#10243B] mt-0.5">
                      {item?.title || 'Campus Item'}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Claimant: {claim.claimantName || claim.claimantId} ({claim.claimantDepartment || 'Student'})
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold ${
                      claim.verificationStatus === 'Completed' ||
                      claim.verificationStatus === 'Admin Approved' ||
                      claim.verificationStatus === 'Security Verified'
                        ? 'text-[#16A36A]'
                        : claim.verificationStatus === 'Rejected' || claim.verificationStatus === 'Disputed'
                          ? 'text-red-700'
                          : 'text-amber-700'
                    }`}
                  >
                    Status: {claim.verificationStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Claimant Narrative</p>
                    <p className="text-slate-700 bg-[#F6F8FB] p-3 rounded-lg border border-slate-200">
                      {claim.answers}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">
                      Submitted Private Identifying Detail
                    </p>
                    <p className="text-slate-700 bg-[#F6F8FB] p-3 rounded-lg border border-slate-200">
                      {claim.privateDetailAttempt}
                    </p>
                  </div>
                </div>

                {isReviewer && item?.privateFeatures && (
                  <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-[#10243B]">
                    <span className="font-bold">Finder/Vault Ground-Truth Private Feature: </span>
                    {item.privateFeatures}
                  </div>
                )}

                {claim.reviewNote && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Reviewer note: </span>
                    {claim.reviewNote}
                  </p>
                )}

                {tab === 'review' && isReviewer && !isClosed && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <input
                      type="text"
                      value={noteByClaim[claim.claimId] || ''}
                      onChange={(e) =>
                        setNoteByClaim((prev) => ({ ...prev, [claim.claimId]: e.target.value }))
                      }
                      placeholder="Optional verification note (e.g., Matched transit card digits & Student ID)..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {currentUser?.userId === claim.itemOwnerId && (
                        <button
                          type="button"
                          onClick={() =>
                            reviewClaim(claim.claimId, 'Finder Approved', noteByClaim[claim.claimId])
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Finder Approve</span>
                        </button>
                      )}

                      {(currentUser?.role === 'admin' || currentUser?.role === 'security') && (
                        <button
                          type="button"
                          onClick={() =>
                            reviewClaim(
                              claim.claimId,
                              currentUser.role === 'security' ? 'Security Verified' : 'Admin Approved',
                              noteByClaim[claim.claimId]
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B]"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            {currentUser.role === 'security' ? 'Security Verify ID' : 'Admin Approve'}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          reviewClaim(
                            claim.claimId,
                            'Completed',
                            noteByClaim[claim.claimId] || 'Handover verified & item returned'
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#16A36A] rounded-lg hover:bg-[#128656]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Returned (+100 XP)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          reviewClaim(claim.claimId, 'Disputed', noteByClaim[claim.claimId])
                        }
                        className="px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                      >
                        Flag Dispute
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          reviewClaim(claim.claimId, 'Rejected', noteByClaim[claim.claimId])
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
};
