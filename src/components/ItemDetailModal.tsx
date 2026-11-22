import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Lock, MapPin, Package, Shield, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ItemReport } from '../types/campusfind';
import { validateClaimInput } from '../utils/validation';

export const ItemDetailModal: React.FC<{
  item: ItemReport | null;
  onClose: () => void;
  defaultOpenClaim?: boolean;
}> = ({ item, onClose, defaultOpenClaim = false }) => {
  const { currentUser, submitClaim, submitModerationReport } = useApp();
  const navigate = useNavigate();

  const [showClaimForm, setShowClaimForm] = useState(defaultOpenClaim);
  const [answers, setAnswers] = useState('');
  const [privateDetailAttempt, setPrivateDetailAttempt] = useState('');
  const [evidenceURL, setEvidenceURL] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagSubmitted, setFlagSubmitted] = useState(false);

  if (!item) return null;

  const isPrivileged =
    currentUser &&
    (currentUser.role === 'admin' ||
      currentUser.role === 'security' ||
      currentUser.userId === item.reportedBy);

  const canClaim =
    currentUser &&
    currentUser.userId !== item.reportedBy &&
    item.status !== 'Returned' &&
    item.status !== 'Closed';

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    const validation = validateClaimInput({ answers, privateDetailAttempt });
    if (!validation.valid) {
      setClaimError(Object.values(validation.errors)[0]);
      return;
    }
    setClaimError(null);
    try {
      await submitClaim({
        itemId: item.itemId,
        answers,
        privateDetailAttempt,
        evidenceURL,
      });
      setClaimSubmitted(true);
      setShowClaimForm(false);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Unable to submit claim.');
    }
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (flagReason.trim().length < 5) return;
    await submitModerationReport({ targetItemId: item.itemId, reason: flagReason });
    setFlagSubmitted(true);
    setShowFlagForm(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {item.type === 'lost' ? 'Lost Report' : 'Found Report'} · {item.status}
              {item.isDemo ? ' · Demo Record' : ''}
            </p>
            <h2 id="item-modal-title" className="text-lg font-bold text-[#10243B] truncate">
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close item details"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {item.imageURL ? (
            <div className="aspect-[16/9] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={item.imageURL}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[16/9] rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Package className="w-10 h-10" />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-slate-200 text-sm">
            <div>
              <p className="text-xs text-slate-500">Category</p>
              <p className="font-medium text-[#10243B]">{item.category}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Brand</p>
              <p className="font-medium text-[#10243B]">{item.brand || 'Unbranded'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Color</p>
              <p className="font-medium text-[#10243B]">{item.color}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Campus Zone</p>
              <p className="font-medium text-[#10243B] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#1769AA] shrink-0" />
                <span className="truncate">{item.location}</span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#10243B] mb-1.5">Public Description</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{item.description}</p>
            <p className="text-xs text-slate-500 mt-2">
              Reported by {item.reporterDisplay} · Event time:{' '}
              {new Date(item.eventDate || item.createdAt).toLocaleString()}
            </p>
          </div>

          {isPrivileged && item.privateFeatures ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#10243B] mb-1">
                <Lock className="w-3.5 h-3.5 text-[#1769AA]" />
                <span>Private Identifying Details (Restricted Access)</span>
              </div>
              <p className="text-sm text-slate-700">{item.privateFeatures}</p>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
              <Shield className="w-4 h-4 text-[#1769AA] shrink-0 mt-0.5" />
              <span>
                Private identifying features are hidden from public view and used exclusively to verify ownership claims.
              </span>
            </div>
          )}

          {claimSubmitted && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A36A] shrink-0" />
              <span>Ownership claim submitted. Track verification progress in My Claims.</span>
            </div>
          )}

          {showClaimForm && (
            <form onSubmit={handleClaimSubmit} className="space-y-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-[#10243B]">Submit Ownership Verification Claim</h3>
              {claimError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {claimError}
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Where and when did you lose or leave this item?
                </label>
                <textarea
                  rows={3}
                  value={answers}
                  onChange={(e) => setAnswers(e.target.value)}
                  placeholder="Describe the exact circumstances, time window, and surrounding context..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Private identifying feature (contents, serial/pass digits, sticker, engraving, lockscreen)
                </label>
                <input
                  type="text"
                  value={privateDetailAttempt}
                  onChange={(e) => setPrivateDetailAttempt(e.target.value)}
                  placeholder="Enter a detail only the true owner would know"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supporting proof URL (optional receipt or photo link)
                </label>
                <input
                  type="url"
                  value={evidenceURL}
                  onChange={(e) => setEvidenceURL(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClaimForm(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B]"
                >
                  Submit Verification Claim
                </button>
              </div>
            </form>
          )}

          {showFlagForm && (
            <form onSubmit={handleFlagSubmit} className="space-y-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
              <label className="block text-xs font-semibold text-amber-900">
                Report suspicious or duplicate listing to Admins
              </label>
              <textarea
                rows={2}
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Explain why this report requires moderation..."
                className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFlagForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 rounded-lg"
                >
                  Submit Flag
                </button>
              </div>
            </form>
          )}

          {flagSubmitted && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Moderation flag logged for admin review.
            </p>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          {currentUser ? (
            <button
              type="button"
              onClick={() => setShowFlagForm((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-amber-700"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Report suspicious listing</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500">Sign in to claim or report items</span>
          )}

          <div className="flex items-center gap-3">
            {!currentUser ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/auth');
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B]"
              >
                Sign In to Claim Item
              </button>
            ) : canClaim && !showClaimForm && !claimSubmitted ? (
              <button
                type="button"
                onClick={() => setShowClaimForm(true)}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#1769AA] rounded-lg hover:bg-[#12558B]"
              >
                Claim This Item
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
